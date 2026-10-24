import type {
  Breakdown,
  Highlight,
  MessageRequest,
  MessageResponse,
  RiskLabel,
  Signal,
  TransactionRequest,
  TransactionResponse,
} from "../types/api";

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "cutt.ly", "t.co", "goo.gl", "is.gd", "ow.ly", "rb.gy", "shorturl.at", "tiny.cc", "t.ly"
]);

const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "click", "link", "live", "buzz", "online", "site", "icu", "rest", "loan", "win", "work", "tk", "ml", "ga", "gq", "cf"
]);

const LOOKALIKE_WORDS = [
  "login", "secure", "verify", "kyc", "update", "reward", "bonus", "account", "bank", "sbi", "hdfc", "icici", "paytm", "phonepe", "vit"
];

const URL_REGEX = /(?:https?:\/\/)?(?:\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})(?::\d+)?(?:\/\S*)?/gi;
const RAW_IP_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

interface Span {
  start: number;
  end: number;
  matched: string;
}

export function mockAnalyzeMessage(req: MessageRequest): MessageResponse {
  const text = req.text.trim();
  const sender = req.sender?.trim() || "";

  const spansBySignal: Record<string, Span[]> = {};

  const findPatterns = (signalId: string, regexes: RegExp[]) => {
    const hits: Span[] = [];
    for (const rx of regexes) {
      const re = new RegExp(rx.source, rx.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        hits.push({
          start: match.index,
          end: match.index + match[0].length,
          matched: match[0],
        });
      }
    }
    if (hits.length > 0) {
      spansBySignal[signalId] = hits;
    }
  };

  // 1. Credential request
  findPatterns("credential_request", [
    /\b(share|send|confirm|verify|update|provide|enter|tell|give|submit|reply with)\b[^.\n]{0,40}\b(otp|pin|cvv|password|passcode|card (number|details)|aadhaa?r|pan (card|number|details)|bank details|login details|net ?banking details)\b/i,
    /\b(otp|cvv|pin)\b[^.\n]{0,25}\b(share|send|tell|reply|forward)\b/i,
  ]);

  // 2. Suspicious links
  const badUrlSpans: Span[] = [];
  const linkReasons: string[] = [];
  let urlMatch: RegExpExecArray | null;
  const urlRegexCopy = new RegExp(URL_REGEX.source, "gi");

  while ((urlMatch = urlRegexCopy.exec(text)) !== null) {
    let rawUrl = urlMatch[0].replace(/[.,;:!?)]+$/, "");
    if (!rawUrl) continue;

    const host = rawUrl.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].toLowerCase();
    const tld = host.split(".").pop() || "";
    const isIp = RAW_IP_REGEX.test(host);
    const isShortener = SHORTENERS.has(host);
    const isBadTld = SUSPICIOUS_TLDS.has(tld);
    const hyphens = (host.match(/-/g) || []).length;
    const isLookalike = hyphens >= 2 || (hyphens > 0 && LOOKALIKE_WORDS.some(w => host.includes(w)));
    const isHttp = /^http:\/\//i.test(rawUrl);

    const reasons: string[] = [];
    if (isShortener) reasons.push("Shortened link (hides real destination)");
    if (isIp) reasons.push("Raw IP address");
    if (isBadTld) reasons.push("Unusual domain extension often used in phishing");
    if (isLookalike) reasons.push("Look-alike domain pattern");
    if (isHttp) reasons.push("Insecure (HTTP) link");

    if (reasons.length > 0) {
      badUrlSpans.push({
        start: urlMatch.index,
        end: urlMatch.index + rawUrl.length,
        matched: rawUrl,
      });
      linkReasons.push(...reasons);
    }
  }

  if (badUrlSpans.length > 0) {
    spansBySignal["suspicious_link"] = badUrlSpans;
  }

  // 3. Urgency / threat
  findPatterns("urgency_threat", [
    /\b(immediately|urgently|urgent|asap|right now|act now|at the earliest)\b/i,
    /\bwithin \d+\s?(hours?|hrs?|minutes?|mins?|days?)\b/i,
    /\b(last|final) (warning|chance|reminder|notice)\b/i,
    /\b(expires?|expiring|ends?) (today|tonight|soon)\b/i,
    /\b(today itself|before midnight)\b/i,
  ]);

  // 4. Account threat
  findPatterns("account_threat", [
    /\bkyc\b[^.\n]{0,30}\b(expir\w*|pending|incomplete|not updated|update required|suspended|blocked)/i,
    /\b(will|shall|may) be (suspended|blocked|deactivated|closed|frozen|terminated|disabled|barred)\b/i,
    /\b(has been|is|was) (temporarily )?(suspended|blocked|deactivated|frozen|disabled)\b/i,
    /\bavoid (being )?(account )?(block\w*|suspension|deactivation|closure)/i,
  ]);

  // 5. Prize / refund / cashback bait
  findPatterns("prize_bait", [
    /\b(you('ve| have)? won|lucky draw|lottery|jackpot|prize money|winner)\b/i,
    /\b(unclaimed|pending|claim( your)?)\b[^.\n]{0,25}\b(refund|cashback|reward|prize|bonus)/i,
    /\breward points?\b[^.\n]{0,30}\bexpir\w*/i,
    /\b(income tax|it) refund\b/i,
    /\b(get|win|earn) (an? )?(assured )?cashback\b/i,
  ]);

  // 6. Payment pressure
  findPatterns("payment_pressure", [
    /\b(send|pay|transfer)\b[^.\n]{0,20}(rs\.?|inr|₹)\s?[\d,]+[^.\n]{0,40}\b(receive|get|release|unlock|activate|claim)\b/i,
    /\b(approve|accept)\b[^.\n]{0,40}\b(collect request|payment request|upi request)\b/i,
    /\b(enter|use) (your )?(upi )?pin\b[^.\n]{0,30}\b(receive|get|credit)/i,
    /\b(processing|registration|release|clearance|verification|delivery|handling) (fee|charge)s?\b/i,
    /\bscan\b[^.\n]{0,20}\bqr\b[^.\n]{0,30}\b(receive|get)\b/i,
  ]);

  // 7. Generic greeting
  findPatterns("generic_greeting", [
    /\bdear (customer|user|sir|madam|sir\/madam|account ?holder|valued customer|member|client|beneficiary)\b/i,
  ]);

  // FR-M5: Legitimate pattern handling (e.g., "Do not share OTP" with no links)
  let legitAdjustment = 0;
  const hasNoUrls = badUrlSpans.length === 0;
  const isLegitOtpWarning = /\b(do not|don't|dont|never|not to) share\b/i.test(text) ||
    /\bvalid (for|till|upto|up to) \d+\s?(min|mins|minutes|hrs?|hours?)\b/i.test(text);

  if (hasNoUrls && isLegitOtpWarning) {
    delete spansBySignal["credential_request"];
    legitAdjustment = -10;
  }

  // Generic greeting suppressed unless accompanied by request or link
  if (spansBySignal["generic_greeting"] && !spansBySignal["credential_request"] && !spansBySignal["suspicious_link"] && !spansBySignal["payment_pressure"]) {
    delete spansBySignal["generic_greeting"];
  }

  // Brand detection
  const brands = [
    { name: "SBI", rx: /\bsbi\b|\bstate bank\b/i, hints: ["sbi"] },
    { name: "HDFC Bank", rx: /\bhdfc\b/i, hints: ["hdfc"] },
    { name: "ICICI Bank", rx: /\bicici\b/i, hints: ["icici"] },
    { name: "Axis Bank", rx: /\baxis bank\b/i, hints: ["axis"] },
    { name: "Paytm", rx: /\bpaytm\b/i, hints: ["paytm"] },
    { name: "PhonePe", rx: /\bphone ?pe\b/i, hints: ["phonepe", "phnpe"] },
    { name: "Google Pay", rx: /\bgoogle ?pay\b|\bgpay\b/i, hints: ["google", "gpay"] },
    { name: "VIT", rx: /\bvit\b|\bvellore institute\b/i, hints: ["vit"] },
    { name: "Amazon", rx: /\bamazon\b/i, hints: ["amazon", "amzn"] },
  ];

  const matchedBrands = brands.filter(b => b.rx.test(text));
  const hasRiskySignals = Object.keys(spansBySignal).some(s =>
    ["credential_request", "suspicious_link", "urgency_threat", "account_threat", "prize_bait", "payment_pressure"].includes(s)
  );

  const signals: Signal[] = [];

  // Sender mismatch
  if (sender && matchedBrands.length > 0) {
    const sLower = sender.toLowerCase();
    const isOfficialHint = matchedBrands.some(b => b.hints.some(h => sLower.includes(h)));
    if (!isOfficialHint) {
      signals.push({
        id: "sender_mismatch",
        title: "Sender does not match",
        detail: "The message claims to be from an organisation, but it was sent from a personal number or an unrelated address.",
        weight: 20,
        matched: [sender],
        tip: "Banks send SMS from verified short codes (e.g. VM-SBIINB), not personal mobile numbers or free email services.",
      });
    }
  }

  // Brand impersonation
  if (matchedBrands.length > 0 && (hasRiskySignals || signals.some(s => s.id === "sender_mismatch"))) {
    const brandHits: Span[] = [];
    for (const b of matchedBrands) {
      let bMatch: RegExpExecArray | null;
      const bRegex = new RegExp(b.rx.source, "gi");
      while ((bMatch = bRegex.exec(text)) !== null) {
        brandHits.push({
          start: bMatch.index,
          end: bMatch.index + bMatch[0].length,
          matched: bMatch[0],
        });
      }
    }
    if (brandHits.length > 0) {
      spansBySignal["brand_impersonation"] = brandHits;
    }
  }

  // Map spans to signals
  const SIGNAL_DEFINITIONS: Record<string, { title: string; weight: number; detail: string; tip?: string }> = {
    credential_request: {
      title: "Asks for OTP, PIN or password",
      weight: 30,
      detail: "The message asks you to share or enter a secret such as an OTP, PIN, CVV or password. Banks and UPI apps never ask for these.",
      tip: "Anyone asking for your OTP or PIN is trying to take money out, not put it in.",
    },
    suspicious_link: {
      title: "Suspicious link",
      weight: 25,
      detail: `The link does not look like an official website. ${linkReasons.join(". ")}`,
      tip: "Banks and universities do not send shortened or look-alike links. Type the official address yourself.",
    },
    urgency_threat: {
      title: "Creates urgency",
      weight: 15,
      detail: "The message pushes you to act fast so you do not stop and think.",
      tip: "Real organisations give you time. Pressure to act 'now' is a classic scam trick.",
    },
    account_threat: {
      title: "Threatens your account",
      weight: 15,
      detail: "The message says your account, card or KYC will be blocked or suspended to scare you into acting.",
      tip: "If you are worried about your account, check it in the official app, not through the message.",
    },
    prize_bait: {
      title: "Prize, refund or cashback bait",
      weight: 15,
      detail: "The message promises a prize, refund, cashback or reward you did not expect.",
      tip: "If you did not enter a contest or ask for a refund, the 'reward' is bait.",
    },
    payment_pressure: {
      title: "Pay to receive money",
      weight: 20,
      detail: "The message asks you to pay, approve a request or enter your PIN in order to 'receive' money. You never need to pay or enter a PIN to receive money.",
      tip: "Entering your UPI PIN always sends money out. It is never needed to receive money.",
    },
    generic_greeting: {
      title: "Generic greeting",
      weight: 5,
      detail: "The message starts with 'Dear customer' or similar and asks you to act. Your real bank knows your name.",
      tip: "A generic greeting plus a link or request is a common phishing pattern.",
    },
    brand_impersonation: {
      title: "Uses a trusted name",
      weight: 10,
      detail: "The message uses the name of a bank, payment app, university or government body together with other warning signs.",
      tip: "Scammers borrow trusted names. The name alone proves nothing.",
    },
  };

  for (const [sid, spans] of Object.entries(spansBySignal)) {
    const def = SIGNAL_DEFINITIONS[sid];
    if (def) {
      signals.push({
        id: sid,
        title: def.title,
        detail: def.detail,
        weight: def.weight,
        matched: Array.from(new Set(spans.map(s => s.matched))),
        tip: def.tip,
      });
    }
  }

  // Sort signals by weight descending
  signals.sort((a, b) => b.weight - a.weight);

  // Compute rule score
  const totalWeight = signals.reduce((acc, s) => acc + s.weight, 0);
  const rule_score = Math.max(0, Math.min(100, totalWeight + legitAdjustment));

  // Build highlights (non-overlapping, higher weight wins)
  const candidateSpans: { start: number; end: number; signal_id: string; weight: number }[] = [];
  for (const [sid, spans] of Object.entries(spansBySignal)) {
    const weight = SIGNAL_DEFINITIONS[sid]?.weight || 10;
    for (const span of spans) {
      candidateSpans.push({
        start: span.start,
        end: span.end,
        signal_id: sid,
        weight,
      });
    }
  }

  // Sort candidates by weight desc, then start asc
  candidateSpans.sort((a, b) => b.weight - a.weight || a.start - b.start);

  const keptHighlights: Highlight[] = [];
  for (const cand of candidateSpans) {
    const overlaps = keptHighlights.some(
      h => cand.start < h.end && cand.end > h.start
    );
    if (!overlaps) {
      keptHighlights.push({
        start: cand.start,
        end: cand.end,
        signal_id: cand.signal_id,
      });
    }
  }
  keptHighlights.sort((a, b) => a.start - b.start);

  // ML probability estimation
  // In synthetic mock mode, we estimate ML probability consistently from triggered signal weights
  const ml_probability = rule_score === 0 ? 0.02 : Math.min(0.99, Number((rule_score / 100 * 0.95 + 0.05).toFixed(2)));

  // Fusion calculation
  const rule_weight = 0.6;
  const ml_weight = 0.4;
  let final_score = Math.min(100, Math.round(rule_weight * rule_score + ml_weight * ml_probability * 100));

  // Safety floor check: if credential_request AND suspicious_link both fire, final_score = max(final_score, 70)
  const hasCred = signals.some(s => s.id === "credential_request");
  const hasLink = signals.some(s => s.id === "suspicious_link");
  const safety_floor_applied = hasCred && hasLink && final_score < 70;
  if (safety_floor_applied) {
    final_score = 70;
  }

  // Determine risk label
  let risk_label: RiskLabel = "Low";
  if (final_score > 65) {
    risk_label = "High";
  } else if (final_score >= 35) {
    risk_label = "Medium";
  } else {
    risk_label = "Low";
  }

  // Determine scam type
  let scam_type = "None";
  if (risk_label !== "Low") {
    const sIds = new Set(signals.map(s => s.id));
    if (sIds.has("account_threat") && /kyc/i.test(text)) {
      scam_type = "Fake KYC";
    } else if (sIds.has("account_threat")) {
      scam_type = "Account suspension";
    } else if (sIds.has("prize_bait") && /refund|cashback|reward points?/i.test(text)) {
      scam_type = "Refund/cashback";
    } else if (sIds.has("prize_bait")) {
      scam_type = "Lottery/prize";
    } else if (sIds.has("payment_pressure")) {
      scam_type = "Collect-request scam";
    } else if (sIds.has("credential_request")) {
      scam_type = "OTP theft";
    } else {
      scam_type = "Other";
    }
  }

  // Build advice list
  const advice: string[] = [];
  if (signals.some(s => s.id === "suspicious_link")) {
    advice.push("Do not click the link. Open the official app or type the official website yourself.");
  }
  if (signals.some(s => s.id === "credential_request")) {
    advice.push("Never share OTP, PIN, CVV or passwords with anyone.");
  }
  if (signals.some(s => s.id === "payment_pressure")) {
    advice.push("Do not approve collect requests or enter your UPI PIN to receive money.");
  }
  if (signals.some(s => s.id === "urgency_threat")) {
    advice.push("Slow down. Do not act on a deadline set by a message.");
  }
  if (signals.some(s => s.id === "account_threat")) {
    advice.push("Check your account status only in the official app or by calling the number on your card.");
  }
  if (signals.some(s => s.id === "prize_bait")) {
    advice.push("Ignore unexpected prizes or refunds. Real refunds go back to your account automatically.");
  }

  if (risk_label === "High") {
    advice.push("Do not reply, click, pay or share anything.");
    advice.push("If you already shared details or paid, call your bank immediately.");
    advice.push("Report at cybercrime.gov.in or call national helpline 1930.");
  } else if (risk_label === "Medium") {
    advice.push("Review carefully before you act.");
    advice.push("Verify through the official app or the number on your card, not the contact details in this message.");
  } else {
    advice.push("Low risk signals found, but this is not a guarantee.");
    advice.push("When in doubt, don't pay or share.");
  }

  const uniqueAdvice = Array.from(new Set(advice));

  const breakdown: Breakdown = {
    rule_weight,
    ml_weight,
    safety_floor_applied,
  };

  return {
    risk_label,
    score: final_score,
    scam_type,
    rule_score,
    ml_probability,
    breakdown,
    signals,
    highlights: keptHighlights,
    advice: uniqueAdvice,
  };
}

export function mockAnalyzeTransaction(req: TransactionRequest): TransactionResponse {
  const signals: Signal[] = [];

  // PRD 7.4 Rules:
  // 1. collect_request_new_payee (weight 30)
  if (req.type === "collect_request" && req.is_new_payee) {
    signals.push({
      id: "collect_request_new_payee",
      title: "Collect request from a new payee",
      detail: "Approving a collect request sends money out of your account. Scammers send requests to new payees claiming it will receive money.",
      weight: 30,
      matched: [req.payee],
      tip: "Entering your UPI PIN always sends money. You never enter a PIN to receive funds.",
    });
  }

  // 2. new_payee_large (weight 25)
  if (req.is_new_payee && req.amount >= 5000) {
    signals.push({
      id: "new_payee_large",
      title: "High value payment to a new payee",
      detail: `Transferring ₹${req.amount.toLocaleString("en-IN")} to an unknown or first-time recipient carries higher risk.`,
      weight: 25,
      matched: [`₹${req.amount}`],
      tip: "Send a small test amount (like ₹1) first when paying an unknown individual.",
    });
  }

  // 3. large_amount (weight 25 or 12)
  if (req.amount >= 25000) {
    signals.push({
      id: "large_amount",
      title: "Unusually large transaction amount",
      detail: `Transaction amount ₹${req.amount.toLocaleString("en-IN")} is significantly higher than standard daily student expenses.`,
      weight: 25,
      matched: [`₹${req.amount}`],
      tip: "Double check the recipient's verified UPI handle before confirming large transfers.",
    });
  } else if (req.amount >= 10000) {
    signals.push({
      id: "large_amount",
      title: "Moderate high-value transaction",
      detail: `Transaction amount ₹${req.amount.toLocaleString("en-IN")} is above typical micro-payment levels.`,
      weight: 12,
      matched: [`₹${req.amount}`],
      tip: "Verify recipient name shown on the UPI confirmation screen before typing PIN.",
    });
  }

  // 4. odd_hours (weight 15)
  if (req.hour >= 0 && req.hour <= 5) {
    signals.push({
      id: "odd_hours",
      title: "Late-night transaction timing",
      detail: `Initiated at ${req.hour.toString().padStart(2, "0")}:00 hrs (between midnight and 5 AM). Fraudsters frequently operate during late hours when users are fatigued.`,
      weight: 15,
      matched: [`${req.hour}:00 hrs`],
      tip: "Wait until daytime to verify urgent late-night financial requests.",
    });
  }

  // 5. rapid_repeat (weight 20)
  if (req.recent_txn_count_1h >= 3) {
    signals.push({
      id: "rapid_repeat",
      title: "Rapid repeated transactions",
      detail: `${req.recent_txn_count_1h} transactions conducted in the past hour. Burst activity can indicate credential theft or panic transfers.`,
      weight: 20,
      matched: [`${req.recent_txn_count_1h} transactions`],
      tip: "Pause immediately if someone is asking you to make multiple back-to-back payments.",
    });
  }

  // 6. round_amount_pressure (weight 10)
  const isRoundLimit = [9999, 19999, 24999, 49999, 99999].includes(Math.round(req.amount));
  if (isRoundLimit) {
    signals.push({
      id: "round_amount_pressure",
      title: "Amount just below standard limit",
      detail: `₹${req.amount.toLocaleString("en-IN")} is set just below banking or verification thresholds (e.g., ₹50,000 PAN limit).`,
      weight: 10,
      matched: [`₹${req.amount}`],
      tip: "Amounts like ₹49,999 or ₹9,999 are deliberately chosen by scammers to evade scrutiny.",
    });
  }

  signals.sort((a, b) => b.weight - a.weight);

  const rawScore = signals.reduce((acc, s) => acc + s.weight, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  let risk_label: RiskLabel = "Low";
  if (score > 65) {
    risk_label = "High";
  } else if (score >= 35) {
    risk_label = "Medium";
  } else {
    risk_label = "Low";
  }

  const advice: string[] = [];
  if (req.type === "collect_request") {
    advice.push("Decline this collect request immediately if you were expecting to receive funds.");
  }
  if (req.is_new_payee) {
    advice.push("Confirm the payee identity directly on an independent phone number before proceeding.");
  }
  if (risk_label === "High") {
    advice.push("Do not approve this transaction or enter your UPI PIN.");
    advice.push("If you feel pressured or suspect fraud, report at 1930 or your bank's fraud desk.");
  } else if (risk_label === "Medium") {
    advice.push("Review transaction parameters carefully before entering your PIN.");
  } else {
    advice.push("Standard transaction parameters. Always check recipient name on your payment app.");
    advice.push("When in doubt, do not pay.");
  }

  return {
    risk_label,
    score,
    signals,
    advice: Array.from(new Set(advice)),
  };
}
