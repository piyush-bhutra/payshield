# PayShield: Product Requirements Document

Digital Payment Fraud Awareness and Detection (VIT AI Innovate-A-Thon, Question 18)
Version 1.0 | Event: 24 Oct 2026 5:00 PM (online) to 25 Oct 2026 5:00 PM (SJT-G07)

---

## 1. Overview

**One-line pitch:** PayShield checks a suspicious message or payment before the user clicks, pays or shares anything, and explains in plain language why it is risky and what to do next.

**Problem (from Q18):** Students and first-time digital payment users struggle to identify phishing messages, suspicious payment requests and potentially fraudulent transaction patterns.

**Intended users:**
- First-year students and first-time UPI/net-banking users.
- Family members who receive "KYC expired" or "account blocked" messages.
- Student media or awareness clubs who want a teaching aid.

**Product type:** Web app (React or similar frontend) plus a Python REST API. An awareness aid, not a guarantee.

---

## 2. Delivery tiers

The rule for this project: **Tier 1 must be complete and demo-ready before any Tier 2 work starts.** Tier 1 is what the teacher needs to accept the submission with no objections.

| Tier | Purpose | Status rule |
|---|---|---|
| **Tier 1: Baseline (submission-safe)** | Meets every Q18 deliverable and every item in the Common Submission Checklist | Mandatory |
| **Tier 2: Improvements** | Raises UX, innovation and credibility | Only after Tier 1 is committed and tagged `v1-baseline` |
| **Tier 3: Resume-level (post-hackathon)** | Real datasets, deployment, LLM layer | Not for the hackathon |

---

## 3. Requirement traceability (what the teacher checks)

### 3.1 Q18 expected deliverables

| Q18 deliverable | PayShield feature | Tier |
|---|---|---|
| Suspicious-message or transaction analysis interface | Web UI with "Check a Message" and "Check a Transaction" tabs | 1 |
| Risk indicators and understandable warning messages | Risk badge, score, triggered signals with plain-language explanations, highlighted phrases | 1 |
| Basic fraud detection model or rule-based engine | Config-driven rule engine plus TF-IDF + Logistic Regression classifier | 1 |
| Demonstration using synthetic or anonymized data | Synthetic message dataset and simulated transaction dataset, one-click sample loader | 1 |
| Explain potential risks and safe next steps | "What to do now" checklist per risk level and scam type | 1 |

### 3.2 Common submission checklist

| Checklist item | Where it is covered | Tier |
|---|---|---|
| Report file, PPT and demo | `docs/report.pdf`, `docs/PayShield.pptx`, live demo | 1 |
| Problem definition and intended users | Report section 1, slide 1 | 1 |
| Architecture / workflow diagram | Report section 3, slide 3 (diagram in section 6 below) | 1 |
| Dataset source, labels, preprocessing, split | Report section 4 (see section 9 below) | 1 |
| Working prototype or labelled proof of concept | Running app, README with one-command run | 1 |
| Evaluation with metrics and representative test cases, including failures | `eval/evaluate.py` outputs, test table with failures (section 12) | 1 |
| Responsible-AI discussion | Section 13, slide 6 | 1 |
| Short demo plus implemented vs planned | Demo script (section 15), slide 7 | 1 |

### 3.3 Judging criteria

| Criterion | How PayShield addresses it |
|---|---|
| Innovation and creativity | Hybrid rules + ML with side-by-side explanation, Indian payment context (UPI collect requests, fake KYC, VIT suspension phishing), scam-type labelling |
| Functionality and implementation | Both tabs working end to end, tests passing, reproducible evaluation |
| User experience and design | Polished dark fintech-style UI with a purposeful animation set (scan effect, animated gauge, staggered result reveal), plain-language output, colour + icon + text risk badges, highlighted phrases, one-click example chips, mobile friendly, reduced-motion support |
| Technical complexity | Rule engine with config, ML pipeline, score fusion, transaction anomaly rules, evaluation harness |
| SDG alignment and presentation | SDG 16.4, 9, 8, 4 (section 13.3), 7-slide deck following the suggested flow |

---

## 4. Scope

### 4.1 In scope (Tier 1)
- Message analysis (hero feature) and transaction analysis (rule-based, secondary).
- Synthetic data only. No real personal or confidential data anywhere.
- Fully offline: no external API calls, no LLM, no URL fetching.
- Local run on a laptop inside a Python virtual environment.

### 4.2 Out of scope (all tiers for the hackathon)
- Live bank, UPI or SMS integration. We will **not** claim any.
- Automatic blocking, reporting or deleting of messages.
- Opening or fetching any URL found in a message.
- Collecting or storing real user messages.

---

## 5. Functional requirements

Priority: **P0** = Tier 1 (mandatory), **P1** = Tier 2, **P2** = Tier 3.

### 5.1 Message analysis

| ID | Requirement | Pri |
|---|---|---|
| FR-M1 | User can paste a message into a text area and optionally enter a sender (number, short code or email/domain). | P0 |
| FR-M2 | System returns a risk label (Low / Medium / High) and a score from 0 to 100. | P0 |
| FR-M3 | System returns the list of triggered signals. Each has an id, title, plain-language explanation, weight, and the matched text. | P0 |
| FR-M4 | System detects these signal categories: urgency/threat, credential or OTP/PIN request, suspicious link (shortener, raw IP, lookalike domain, non-HTTPS, unusual TLD), prize/refund/cashback bait, sender mismatch, brand impersonation, payment-pressure ("send Rs 1 to receive money", collect-request lures). | P0 |
| FR-M5 | System recognises legitimate patterns that look scary (e.g. "Do not share this OTP with anyone") and does not penalise them. | P0 |
| FR-M6 | System returns the character offsets of matched phrases so the UI can highlight them in the message. | P0 |
| FR-M7 | System returns advice (safe next steps) matched to the risk level and triggered signals. | P0 |
| FR-M8 | URLs are analysed as strings only. The system never opens, fetches or resolves them. | P0 |
| FR-M9 | System labels the likely scam type (Fake KYC, Account suspension, Lottery/prize, OTP theft, Refund/cashback, Collect-request scam, Other, or None). | P0 |
| FR-M10 | "Why this score?" breakdown shows rule score, ML probability and the fusion formula. | P0 |
| FR-M11 | "Teach me" tip: a one-line "how to spot this next time" for each triggered signal. | P1 |
| FR-M12 | User can mark a result as wrong ("This was safe" / "This was a scam"); feedback is stored locally in `feedback.jsonl`. | P1 |

### 5.2 Transaction analysis

| ID | Requirement | Pri |
|---|---|---|
| FR-T1 | User can enter a transaction: amount, payee name or ID, new payee (yes/no), hour of day, type (pay / collect_request / transfer), number of transactions in the last hour. | P0 |
| FR-T2 | System returns risk label, score, triggered signals with reasons, and advice. | P0 |
| FR-T3 | Rules cover: large amount, new payee with large amount, odd hours (00:00 to 05:00), rapid repeated transactions, collect request from a new payee, unusual amount pattern. | P0 |
| FR-T4 | Result is shown with the same result component as the message tab. | P0 |
| FR-T5 | User can upload a CSV of simulated transactions and see a flagged table. | P1 |

### 5.3 Cross-cutting

| ID | Requirement | Pri |
|---|---|---|
| FR-C1 | One-click sample loader populates demo messages and transactions (at least 6 message samples and 4 transaction samples, mixing scam and legitimate). | P0 |
| FR-C2 | Evaluation script regenerates all metrics, the confusion matrix and the test table from the repo data with one command. | P0 |
| FR-C3 | The UI always displays: "Awareness aid, not a guarantee." | P0 |
| FR-C4 | Rules, weights, keywords and advice live in `signals.json`, not hard-coded. | P0 |
| FR-C5 | Clear loading, empty and error states in the UI. | P0 |
| FR-C6 | Animated analysis sequence: scanning effect while analysing, then gauge count-up, badge reveal, highlight and signal stagger (spec in section 11.1). | P0 |
| FR-C7 | Three one-click example chips on the landing view (fake KYC, real bank alert, tricky case) that fill the input and run the analysis. | P0 |

---

## 6. Architecture

```
 [Frontend (React)]
        |  REST/JSON
        v
 [FastAPI backend]  -- runs inside .venv
   |-- Preprocess: normalise text, extract URLs, numbers, sender domain
   |-- Rule engine: signals.json -> matched signals, weights, highlight offsets
   |-- ML classifier: TF-IDF + Logistic Regression -> scam probability
   |-- Fusion: 0.4 * rule_score + 0.6 * ml_probability * 100 (+ safety floor)
   |-- Transaction rules: threshold rules -> signals, score
   `-- Advice builder: risk level + signals -> next steps
        |
        v
 JSON response: label, score, scam_type, signals, highlights, advice, breakdown
```

**Stack**
- Backend: Python 3.11 (3.10+ acceptable), FastAPI, Uvicorn, Pydantic, scikit-learn, pandas, joblib, matplotlib, pytest.
- Frontend: built by GPT Astra (React + Vite + Tailwind, Framer Motion for animation, lucide-react for icons, self-hosted fonts via @fontsource). Node dependencies stay inside `frontend/node_modules`.
- No database. Files only (CSV, JSON, joblib, jsonl).

### 6.1 Virtual environment rule (mandatory)
- The backend always runs inside a project virtual environment at `./.venv`. No `pip install` against the global or system Python, ever.
- Create: `python -m venv .venv`
- Activate: Windows PowerShell `.venv\Scripts\Activate.ps1`, Windows cmd `.venv\Scripts\activate.bat`, macOS/Linux `source .venv/bin/activate`
- Verify before installing: `python -c "import sys; print(sys.prefix)"` must print a path ending in `.venv`.
- Install: `python -m pip install -r requirements.txt`
- Run: `python -m uvicorn backend.app.main:app --reload --port 8000`
- All commands in docs and scripts use `python -m ...` so they bind to the active environment.
- `.venv/` is in `.gitignore`. `requirements.txt` has pinned versions.
- Optional: a `scripts/check_env.py` that exits with an error if run outside a venv.

---

## 7. Detection design

### 7.1 Message rule signals (initial `signals.json`)

Each signal has: `id`, `title`, `weight`, `patterns` (keywords/regex), `explanation`, `tip`, `advice`.

| Signal id | What it looks for | Weight |
|---|---|---|
| `credential_request` | Asks for OTP, PIN, CVV, password, card number, Aadhaar/PAN, "share/confirm/verify your ..." (suppressed if the message only warns "do not share") | 30 |
| `suspicious_link` | URL shorteners (bit.ly, tinyurl, cutt.ly, etc.), raw IP URLs, non-HTTPS, odd TLDs (.xyz, .top, .click), hyphen-stuffed or lookalike domains (e.g. `vit-ac-in-login.com`, `sbi-secure-kyc.top`) | 25 |
| `urgency_threat` | "immediately", "within 24 hours", "last warning", "will be suspended/blocked/closed", "act now" | 15 |
| `account_threat` | Suspension, block, KYC expiry, "account will be deactivated" | 15 |
| `prize_bait` | Lottery, "you have won", unclaimed refund, cashback, reward points expiring | 15 |
| `payment_pressure` | "Send Rs 1 to receive money", "approve the collect request to get paid", "pay a small fee to release" | 20 |
| `sender_mismatch` | Message claims to be a bank, UPI app, VIT or government body but sender is a personal 10-digit number or an unrelated/free-mail domain | 20 |
| `brand_impersonation` | Mentions of SBI, HDFC, ICICI, Paytm, PhonePe, Google Pay, VIT, income tax etc. combined with any of the above signals | 10 |
| `generic_greeting` | "Dear customer", "Dear user" combined with a link or request | 5 |

- Rule score = sum of triggered weights, capped at 100.
- **Legitimate-pattern handling (FR-M5):** if the message contains "do not share", "never share", "valid for N minutes" and no link, `credential_request` is suppressed and a small negative adjustment (-10) is applied. Transaction alerts that only report a completed debit/credit with no link and no request produce no signals.
- **Scam type** is chosen from the highest-weight combination: e.g. `account_threat` + `suspicious_link` = Account suspension / Fake KYC; `prize_bait` = Lottery/prize; `payment_pressure` = Collect-request scam; `credential_request` alone = OTP theft.

### 7.2 ML classifier
- Features: TF-IDF on word 1-2 grams, lowercased, min_df=1 or 2, plus the sender-type token (appended to text) if useful.
- Model: Logistic Regression (`class_weight="balanced"`, `random_state=42`).
- Split: 70 / 15 / 15 train / validation / test, stratified, seed 42.
- Output: probability of "scam". Saved to `backend/app/ml/model.joblib` (git-ignored, regenerated with `python -m backend.app.ml.train`).
- Top contributing words are exposed in the "Why this score?" panel for transparency (Tier 2 if time is short).

### 7.3 Fusion
```
final_score = min(100, round(0.4 * rule_score + 0.6 * ml_probability * 100))
safety floor: if credential_request AND suspicious_link both fire, final_score = max(final_score, 70)
Low: < 35    Medium: 35 to 65    High: > 65
```
The response includes `rule_score`, `ml_probability`, and the weights so the UI can show the breakdown. Thresholds are constants in one place.

**Weight change (24 Oct 2026):** v1 used 0.6 rules / 0.4 ML. After the pre-registered v1 result on the held-out GPT batch, weights were re-chosen by leave-one-source-out over claude, gemini and gpt: 0.4 / 0.6 had the best average F1 (0.877) with a false-alarm rate under 15% (8.4%). Details in `docs/report_notes.md`. Field names and types are unchanged; only the `rule_weight` / `ml_weight` values in `breakdown` change.

### 7.4 Transaction rules

| Signal id | Condition | Weight |
|---|---|---|
| `large_amount` | amount >= 25,000 (>= 10,000 gets half weight) | 25 |
| `new_payee_large` | new payee AND amount >= 5,000 | 25 |
| `odd_hours` | hour between 0 and 5 | 15 |
| `rapid_repeat` | 3 or more transactions in the last hour | 20 |
| `collect_request_new_payee` | type is collect_request AND payee is new | 30 |
| `round_amount_pressure` | exact round amount just under a common limit (e.g. 9,999 / 49,999) | 10 |

Score is the sum of weights, capped at 100. Same Low / Medium / High thresholds.

---

## 8. API specification

Base URL `http://localhost:8000`. JSON. CORS allows `http://localhost:5173` and `http://localhost:3000`.

### POST `/api/analyze/message`
```json
// request
{ "text": "Dear customer your SBI KYC expires today. Click bit.ly/sbi-kyc now to avoid block", "sender": "+919876543210" }

// response
{
  "risk_label": "High",
  "score": 92,
  "scam_type": "Fake KYC",
  "rule_score": 90,
  "ml_probability": 0.93,
  "breakdown": { "rule_weight": 0.4, "ml_weight": 0.6, "safety_floor_applied": false },
  "signals": [
    { "id": "suspicious_link", "title": "Shortened link", "detail": "Shortened links hide the real destination.", "weight": 25, "matched": ["bit.ly/sbi-kyc"], "tip": "Banks do not send shortened links for KYC." }
  ],
  "highlights": [ { "start": 48, "end": 62, "signal_id": "suspicious_link" } ],
  "advice": ["Do not click the link.", "Never share OTP, PIN or CVV.", "Report at cybercrime.gov.in or call 1930."]
}
```

### POST `/api/analyze/transaction`
```json
// request
{ "amount": 49999, "payee": "Rahul Traders", "is_new_payee": true, "hour": 2, "type": "collect_request", "recent_txn_count_1h": 3 }

// response
{ "risk_label": "High", "score": 100, "signals": [ { "id": "collect_request_new_payee", "title": "...", "detail": "...", "weight": 30, "matched": [] } ], "advice": ["..."] }
```

### GET `/api/samples`
```json
{ "messages": [ { "id": "m1", "label": "scam", "text": "...", "sender": "..." } ], "transactions": [ { "id": "t1", "label": "scam", "amount": 49999, "payee": "...", "is_new_payee": true, "hour": 2, "type": "collect_request", "recent_txn_count_1h": 3 } ] }
```

### POST `/api/feedback` (Tier 2)
```json
{ "kind": "message", "input": { }, "predicted": "High", "user_says": "safe" }
```
Appends to `feedback.jsonl`. Returns `{ "status": "ok" }`.

### GET `/api/health`
Returns `{ "status": "ok", "model_loaded": true }`.

**Errors:** 422 for validation errors (standard FastAPI), 400 with `{ "error": "..." }` for empty text. Text length capped at 2000 characters.

---

## 9. Data plan

### 9.1 Messages
- `data/messages.csv`: columns `text,sender,label,scam_type`. About 100 rows: ~50 scam across Fake KYC, Account suspension (including VIT-style), Lottery/prize, OTP theft, Refund/cashback, Collect-request; ~50 legitimate (bank debit/credit alerts, own-action OTPs with warnings, delivery updates, university notices, e-commerce receipts).
- All written by the team. All names, numbers and links are fake (use reserved/example domains and clearly fictitious numbers). No real people, accounts or institutions' internal data.
- Optional (Tier 2): augment with a public SMS spam/phishing dataset, cited in the report.
- `data/adversarial_tests.csv`: 15 to 20 hand-written hard cases kept out of training. Include: legitimate messages with scary words or links, scams with no links, scams with polite wording, mixed-language (Hinglish) messages, very short messages, and messages with typos. Some are expected to fail, and that is reported honestly.

### 9.2 Transactions
- `data/generate_transactions.py` simulates ~200 transactions with a fixed seed. Normal behaviour: small amounts, known payees, daytime. Injected anomalies: large amounts, new payee plus large amount, 1 to 4 AM, bursts, collect requests from new payees. Labels are derived from the injection step.
- The generation method is documented in the report.

### 9.3 Split and leakage
- Messages: 70/15/15 stratified, seed 42, no duplicate text across splits. Adversarial set is a fourth, fully separate test set.
- Be explicit in the report that the dataset is small and synthetic, so scores are indicative and not production claims.

---

## 10. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Explainability | Every verdict traces to named signals and a visible score breakdown. No unexplained verdicts. |
| NFR-2 | Privacy | Synthetic data only. Messages are not stored by default. No third-party calls. Feedback log (Tier 2) is local and excludes sender details. |
| NFR-3 | Safety | URLs never fetched. System never blocks or acts on the user's behalf. Always shows next-step advice. |
| NFR-4 | Performance | Message and transaction analysis respond in under 1 second on a laptop. Model loads once at startup. |
| NFR-5 | Usability | Plain language (no jargon like "heuristic"), risk shown as colour plus icon plus text, advice always visible for Medium and High. Readable on a projector (body text at least 16px, results much larger). |
| NFR-6 | Accessibility | Keyboard navigable, visible focus, WCAG AA contrast, labels on all inputs, no information by colour alone, readable on mobile. |
| NFR-7 | Reproducibility | Fixed seeds, pinned `requirements.txt`, venv-based setup, one command each to run the app, train the model and run the evaluation. |
| NFR-8 | Maintainability | Rules, weights and advice in `signals.json`. Thresholds in one constants file. Type hints and pydantic models. |
| NFR-9 | Testability | pytest suite: at least 5 scam and 5 legitimate messages, 4 transaction cases, API endpoint tests. |
| NFR-10 | Honesty | UI and report state it is an awareness aid. Report lists limitations and implemented vs planned. |
| NFR-11 | Portability | Runs on Windows 10/11, macOS and Linux with Python 3.10+. Runs on a low-spec laptop (no GPU, no large models). |
| NFR-12 | Visual polish | One cohesive design system (colour tokens, two fonts, consistent spacing), a limited animation budget, no gimmicks. Animations use transform/opacity only, stay smooth on a low-spec laptop, and honour `prefers-reduced-motion`. Animation never delays the result by more than about 1.2 s. |

---

## 11. UX requirements (input for the frontend)

- **Header:** logo, name "PayShield", tagline "Check before you click, pay or share".
- **Tabs:** "Check a Message" (default) and "Check a Transaction".
- **Message tab:** textarea, sender input, Analyze button, Load sample dropdown, Clear button.
- **Result card:**
  1. Risk badge (Low = green with check icon, Medium = amber with warning icon, High = red with alert icon) and score gauge 0 to 100.
  2. Scam-type chip.
  3. Message with highlighted phrases (hover/focus shows the signal name).
  4. Signal list: title, explanation, weight bar, matched text.
  5. "Why this score?" expandable: rule score, ML probability, formula.
  6. "What to do now" checklist.
  7. Disclaimer line.
- **Transaction tab:** form with validation (amount > 0, hour 0 to 23), same result card minus highlights.
- **States:** loading spinner, empty state with instructions, error banner ("Could not reach the server. Is the backend running?").
- **Mock mode:** the frontend can run against local mock data when the backend is down, controlled by an env flag (`VITE_USE_MOCK=true`).
- **Config:** API base URL from `VITE_API_BASE_URL` (default `http://localhost:8000`).

### 11.1 Visual design and motion (Tier 1, judged under "User Experience and Design")

**Why it is Tier 1:** UX and design is a scored criterion, and the frontend is built in parallel by a separate tool, so it does not slow the backend. The rule is "polished but simple": one page, one cohesive look, a fixed animation budget.

**Look and feel**
- Modern fintech-security mood: dark navy base, glass-style cards, one teal/cyan accent used sparingly, risk colours emerald / amber / rose.
- One subtle animated background layer (slow gradient glow or faint grid). No particles, no canvas or video effects.
- Two self-hosted fonts (display + body). Large hero heading, generous spacing, projector-readable sizes.
- Single page: hero with animated shield logo, example chips, checker card with tabs, result area, a three-step "How it works" strip (Paste, Analyze, Act), disclaimer footer.

**Animation budget (nothing beyond this list)**
1. Page load: staggered fade/slide-in, shield logo stroke-draw.
2. Tab switch: sliding indicator and crossfade.
3. Analyze: scanning light sweep over the message with a caption, minimum about 1.2 s so it feels intentional.
4. Result reveal in sequence: badge spring-in, gauge arc sweep with number count-up, scam-type chip, highlights lighting up one by one, signal cards stagger, advice items ticking in.
5. High risk: badge glow pulses a couple of times then stops (no flashing, no shaking).
6. Micro-interactions: card hover lift, button states, animated expand for "Why this score?", weight bars filling.
7. `prefers-reduced-motion`: scan, pulses and stagger are replaced by a simple fade.

**Explicit exclusions:** particle systems, 3D, sound, autoplaying video, looping alarms, extra pages, extra animation libraries.

---

## 12. Evaluation plan

Run `python eval/evaluate.py`, which writes to `eval/results/`:

1. **Message metrics on the held-out test split:** accuracy, precision, recall, F1 for the scam class, and a confusion matrix image (`confusion_matrix_messages.png`).
2. **Comparison table (message test split and adversarial set):** keyword-only baseline vs rules only vs ML only vs hybrid.
3. **Adversarial set results:** per-case table with columns: message (shortened), expected, predicted, score, correct (Y/N), notes. **Failures stay in the table** and are discussed.
4. **Transaction evaluation:** precision, recall, F1 on labelled synthetic anomalies, plus the false alarms listed.
5. **Fallback / uncertainty behaviour:** a Medium label is the "review carefully" zone; report how many items land in Medium and what the advice says there.
6. **Files:** `metrics.json`, `test_table.csv`, `test_table.md`, `confusion_matrix_messages.png`, `confusion_matrix_transactions.png`.

Minimum test table for the report: 12 or more message cases (including at least 3 legitimate and 2 tricky) and 6 or more transaction cases.

---

## 13. Responsible AI and SDG alignment

### 13.1 Risks and mitigations
| Risk | Mitigation |
|---|---|
| False positive (real bank alert flagged) | Legitimate-pattern handling, explanations so the user can judge, Medium zone, advice says "verify through the official app/number" |
| False negative (clever scam passes) | Disclaimer, "when in doubt, don't pay or share" advice on every Low result, adversarial failures reported |
| Language and style bias (English, formal text) | Hinglish cases in adversarial set, limitation stated, multilingual data listed as future work |
| Over-trust in the tool | UI disclaimer, no "safe" guarantee wording; Low is shown as "Low risk signals found" |
| Privacy | Synthetic data, offline, no message retention, no URL fetching |
| Misuse (testing scam wording against the detector) | Rules are visible by design for education; no generation of scam text |
| Security | Input length cap, no file execution, URLs treated as text, CORS restricted to localhost |

### 13.2 Human oversight
The tool only advises. The user decides. Feedback (Tier 2) and the adversarial review show how humans correct the system.

### 13.3 SDG alignment
- **SDG 16 (Peace, Justice and Strong Institutions), target 16.4:** reduces fraud-related illicit financial flows by helping users avoid scams.
- **SDG 9 (Industry, Innovation, Infrastructure):** supports trustworthy digital payment infrastructure.
- **SDG 8 (target 8.10):** supports safe access to financial services for first-time users.
- **SDG 4 (Quality Education):** builds digital and financial literacy through "teach me" tips.

---

## 14. Repository structure

```
payshield/
├── README.md
├── requirements.txt
├── .gitignore
├── scripts/
│   └── check_env.py            # fails if not in a venv
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── config.py           # thresholds, weights, paths
│   │   ├── fusion.py
│   │   ├── transactions.py
│   │   ├── advice.py
│   │   ├── rules/
│   │   │   ├── signals.json
│   │   │   └── engine.py
│   │   └── ml/
│   │       ├── train.py
│   │       └── predict.py
│   └── tests/
│       ├── test_engine.py
│       ├── test_transactions.py
│       └── test_api.py
├── data/
│   ├── messages.csv
│   ├── adversarial_tests.csv
│   ├── transactions.csv
│   └── generate_transactions.py
├── eval/
│   ├── evaluate.py
│   └── results/
├── frontend/                   # built by GPT Astra
└── docs/
    ├── PRD.md
    ├── report.pdf
    └── PayShield.pptx
```

---

## 15. Plan, definition of done and demo

### 15.1 Timeline (starting about 18:30, 24 Oct)

| Phase | Window | Output | Tier |
|---|---|---|---|
| 0. Repo and venv skeleton | 18:30 to 19:00 | Git repo, `.venv`, FastAPI health endpoint, README | 1 |
| 1. Rule engine | 19:00 to 20:30 | `signals.json`, `engine.py`, `/analyze/message` | 1 |
| 2. Data and ML | 20:30 to 21:45 | `messages.csv`, adversarial set, trained model, fusion | 1 |
| 3. Transaction module | 21:45 to 22:30 | Simulator, rules, endpoint | 1 |
| 4. Integration | 22:30 to 23:30 | Frontend wired to the live API | 1 |
| 5. Evaluation | 23:30 to 00:15 | Metrics, confusion matrices, test table | 1 |
| Tag `v1-baseline` | 00:15 | Everything above committed and tagged | 1 |
| 6. Report and PPT | morning, freeze by 08:00 | Report PDF and 7-slide deck | 1 |
| 7. Tier 2 improvements | only if time remains | See 15.4 | 2 |

Frontend work by GPT Astra runs in parallel from Phase 1 using mock data.

### 15.2 Definition of done for Tier 1 (the "teacher-admissible" checklist)
- [ ] Fresh clone plus venv setup plus `python -m uvicorn ...` runs the API with no errors.
- [ ] Frontend starts and talks to the API; both tabs return results.
- [ ] Sample loader works; at least 6 message and 4 transaction samples.
- [ ] Every result shows label, score, signals with explanations, highlights (messages), advice and the disclaimer.
- [ ] Scam type shown for messages.
- [ ] Animated result sequence works (scan, gauge count-up, badge, highlights, signal stagger) and degrades to a simple fade under reduced motion.
- [ ] Example chips run a full analysis in one click.
- [ ] UI stays smooth on the demo laptop and is readable on a projector; `npm run build` succeeds.
- [ ] No URL is ever fetched (verified by code review and a test).
- [ ] `pytest` passes.
- [ ] `python eval/evaluate.py` regenerates all result files.
- [ ] Test table includes failures and 2 or more ambiguous cases.
- [ ] Report, PPT and demo cover all 7 flow sections and the checklist.
- [ ] Implemented vs future work stated plainly.
- [ ] All data is synthetic and says so.

### 15.3 Demo script (about 3 minutes)
1. Problem in one sentence (10 s).
2. Paste a fake KYC scam, show High, highlights, signals, advice (45 s).
3. Paste a legitimate bank OTP message, show Low (20 s).
4. Paste a tricky case, show Medium and explain the "review carefully" behaviour (25 s).
5. Transaction tab: 2 AM collect request to a new payee, show High (30 s).
6. Open "Why this score?" and show the rule + ML breakdown (20 s).
7. Show the evaluation table including one honest failure (20 s).
8. Implemented vs future work (10 s).

### 15.4 Tier 2 improvements (in this order)
1. "Teach me" tips per signal (FR-M11).
2. Feedback button and log (FR-M12).
3. Top ML terms shown in the breakdown.
4. CSV upload with a flagged transactions table (FR-T5).
5. Hinglish keyword coverage.
6. Light/dark theme toggle and extra micro-interactions beyond the Tier 1 animation budget.
7. Public dataset augmentation with citation.

### 15.5 Tier 3 (post-hackathon, mention as future work only)
Real phishing datasets with proper evaluation, lightweight multilingual model, LLM plain-English explainer, browser extension or WhatsApp bot, URL reputation lookups, cloud deployment.

---

## 16. Risks and mitigations (project)

| Risk | Impact | Mitigation |
|---|---|---|
| Small dataset gives inflated metrics | Judges doubt credibility | Adversarial set, honest limitation note, baseline comparison |
| Frontend and API contract drift | Integration delay | Contract in section 8 is the single source of truth; frontend mock mode |
| Environment problems on the laptop | Lost time | venv rule, pinned requirements, `check_env.py`, setup tested at Phase 0 |
| Time overrun | Incomplete Tier 1 | Cut order: Tier 2 first, then the transaction tab becomes "future work" |
| Demo-day failure | Bad demo | Pre-recorded screen capture as backup, sample loader, offline-only design |
| Animation over-engineering | Time lost, janky UI on a low-spec laptop | Fixed animation budget (section 11.1), transform/opacity only, approval after each frontend step, cut order: polish extras before any functionality |

---

## 17. Glossary
- **Signal:** a named indicator (e.g. suspicious link) that adds risk points.
- **Rule score:** sum of triggered signal weights, 0 to 100.
- **ML probability:** classifier's estimated chance the message is a scam, 0 to 1.
- **Fusion:** combining rule score and ML probability into the final score.
- **Collect request:** a UPI request that asks the user to approve a payment out of their account, often abused by scammers who say it will "receive" money.
