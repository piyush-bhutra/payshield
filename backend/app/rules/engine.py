"""Message rule engine: reads signals.json and turns a message into triggered signals,
a rule score (0-100), highlight offsets and a likely scam type.

URLs are treated as plain text only. Nothing here opens, fetches or resolves a link.
"""
import json
import re
from dataclasses import dataclass

from backend.app.config import SIGNALS_PATH
from backend.app.schemas import Highlight, Signal

RULES: dict = json.loads(SIGNALS_PATH.read_text(encoding="utf-8"))


def _compile(patterns: list[str]) -> list[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


MESSAGE_SIGNALS: dict = RULES["message_signals"]
SIGNAL_PATTERNS = {sid: _compile(spec["patterns"]) for sid, spec in MESSAGE_SIGNALS.items() if "patterns" in spec}
LEGIT_PATTERNS = _compile(RULES["legit_patterns"])
BRANDS = [(b, re.compile(b["pattern"], re.IGNORECASE)) for b in RULES["brands"]]
SHORTENERS = set(RULES["shorteners"])
SUSPICIOUS_TLDS = set(RULES["suspicious_tlds"])
KNOWN_TLDS = SUSPICIOUS_TLDS | set(RULES["common_tlds"])

# Signals that make a brand mention suspicious (PRD 7.1 brand_impersonation).
RISKY_FOR_BRAND = {"credential_request", "suspicious_link", "urgency_threat", "account_threat",
                   "prize_bait", "payment_pressure", "sender_mismatch"}

# Raw IP first, then domain names. Scheme and path are optional.
URL_RE = re.compile(
    r"(?:https?://)?\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:/\S*)?"
    r"|(?:https?://)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:/\S*)?",
    re.IGNORECASE,
)
RAW_IP_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")

Span = tuple[int, int, str]  # (start, end, matched text)


@dataclass
class RuleResult:
    rule_score: int
    signals: list[Signal]
    highlights: list[Highlight]
    scam_type: str


def find_urls(text: str) -> list[tuple[Span, str, list[str]]]:
    """Find URL-like strings. Returns (span, host, reasons) for each; reasons is empty for clean links."""
    found = []
    for m in URL_RE.finditer(text):
        url = m.group().rstrip(".,;:!?)'\"")
        if not url:
            continue
        scheme = url.split("://")[0].lower() if "://" in url else ""
        host = url.split("://")[-1].split("/")[0].split(":")[0].lower()
        tld = host.rsplit(".", 1)[-1]
        is_ip = bool(RAW_IP_RE.match(host))
        # Bare words like "Ltd.Your" are not links: require a scheme, www., an IP or a known ending.
        if not (scheme or host.startswith("www.") or is_ip or tld in KNOWN_TLDS):
            continue
        reasons = []
        if host in SHORTENERS:
            reasons.append("shortener")
        if is_ip:
            reasons.append("raw_ip")
        if scheme == "http":
            reasons.append("not_https")
        if tld in SUSPICIOUS_TLDS:
            reasons.append("odd_tld")
        hyphens = host.count("-")
        if hyphens >= 2 or (hyphens and any(w in host for w in RULES["lookalike_words"])):
            reasons.append("lookalike")
        found.append(((m.start(), m.start() + len(url), url), host, reasons))
    return found


def _regex_spans(patterns: list[re.Pattern], text: str) -> list[Span]:
    return [(m.start(), m.end(), m.group()) for p in patterns for m in p.finditer(text)]


def _make_signal(sid: str, spans: list[Span], matched: list[str] | None = None, extra: str = "") -> Signal:
    spec = MESSAGE_SIGNALS[sid]
    detail = spec["explanation"] + (f" {extra}" if extra else "")
    if matched is None:
        matched = list(dict.fromkeys(s[2] for s in sorted(spans)))
    return Signal(id=sid, title=spec["title"], detail=detail, weight=spec["weight"], matched=matched, tip=spec["tip"])


def _resolve_highlights(spans_by_signal: dict[str, list[Span]]) -> list[Highlight]:
    """Non-overlapping highlights; when spans overlap, the higher-weight signal wins."""
    candidates = sorted(
        ((s, e, sid) for sid, spans in spans_by_signal.items() for s, e, _ in spans),
        key=lambda c: (-MESSAGE_SIGNALS[c[2]]["weight"], c[0]),
    )
    kept: list[tuple[int, int, str]] = []
    for s, e, sid in candidates:
        if all(e <= ks or s >= ke for ks, ke, _ in kept):
            kept.append((s, e, sid))
    return [Highlight(start=s, end=e, signal_id=sid) for s, e, sid in sorted(kept)]


def _scam_type(signal_ids: set[str], text: str) -> str:
    for rule in RULES["scam_types"]:
        if set(rule["requires"]) <= signal_ids and (
            "text" not in rule or re.search(rule["text"], text, re.IGNORECASE)
        ):
            return rule["type"]
    return "Other" if signal_ids else "None"


def analyze_message(text: str, sender: str | None = None) -> RuleResult:
    """Run every message rule on `text` (and optional `sender`) and return the rule-based verdict."""
    spans: dict[str, list[Span]] = {}
    for sid, patterns in SIGNAL_PATTERNS.items():
        hits = _regex_spans(patterns, text)
        if hits:
            spans[sid] = hits

    urls = find_urls(text)
    bad_urls = [(span, reasons) for span, _, reasons in urls if reasons]
    if bad_urls:
        spans["suspicious_link"] = [span for span, _ in bad_urls]

    # FR-M5: "Do not share this OTP" style warnings with no link are a legitimate pattern.
    adjustment = 0
    if not urls and _regex_spans(LEGIT_PATTERNS, text):
        spans.pop("credential_request", None)
        adjustment = RULES["legit_adjustment"]

    # Generic greeting only counts together with a link or a request.
    if "generic_greeting" in spans and not ({"suspicious_link", "credential_request", "payment_pressure"} & spans.keys() or urls):
        spans.pop("generic_greeting")

    brand_hits = [(b, _regex_spans([p], text)) for b, p in BRANDS]
    brand_hits = [(b, h) for b, h in brand_hits if h]

    signals: list[Signal] = []
    if sender and sender.strip() and brand_hits:
        s = sender.lower()
        if not any(hint in s for b, _ in brand_hits for hint in b["sender_hints"]):
            signals.append(_make_signal("sender_mismatch", [], matched=[sender.strip()]))

    present = spans.keys() | {sig.id for sig in signals}
    if brand_hits and present & RISKY_FOR_BRAND:
        spans["brand_impersonation"] = [h for _, hits in brand_hits for h in hits]

    for sid, sid_spans in spans.items():
        extra = ""
        if sid == "suspicious_link":
            reasons = dict.fromkeys(r for _, rs in bad_urls for r in rs)
            extra = " ".join(RULES["link_checks"][r] for r in reasons)
        signals.append(_make_signal(sid, sid_spans, extra=extra))

    signals.sort(key=lambda sig: -sig.weight)
    rule_score = max(0, min(100, sum(sig.weight for sig in signals) + adjustment))
    ids = {sig.id for sig in signals}
    return RuleResult(
        rule_score=rule_score,
        signals=signals,
        highlights=_resolve_highlights(spans),
        scam_type=_scam_type(ids, text),
    )
