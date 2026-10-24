# PayShield evaluation

All numbers come from runs already recorded in [report_notes.md](report_notes.md). Nothing here was re-run.
All data is synthetic. With a few hundred messages, every score is indicative, not a production claim.

Flagged means a scam scored Medium or High (score >= 35) unless a table says otherwise.
Final score = min(100, round(0.4 x rule_score + 0.6 x ml_probability x 100)), raised to 70 when both
credential_request and suspicious_link fire.

## (a) Datasets

Messages (`data/messages.csv`, built by `data/validate_dataset.py` from `data/raw/`): 320 rows, 0 dropped as invalid or duplicate.

| Source | Scam | Legit | Total |
| --- | --- | --- | --- |
| claude (seed) | 60 | 60 | 120 |
| gemini | 50 | 50 | 100 |
| gpt | 50 | 50 | 100 |
| **Total** | **160** | **160** | **320** |

| Scam type | claude | gemini | gpt | Total |
| --- | --- | --- | --- | --- |
| Account suspension | 10 | 7 | 8 | 25 |
| Collect-request scam | 7 | 10 | 6 | 23 |
| Fake KYC | 10 | 4 | 10 | 24 |
| Lottery/prize | 7 | 10 | 4 | 21 |
| OTP theft | 8 | 8 | 8 | 24 |
| Other | 10 | 3 | 8 | 21 |
| Refund/cashback | 8 | 8 | 6 | 22 |
| None (legit) | 60 | 50 | 50 | 160 |

Adversarial set (`data/adversarial_tests.csv`): 20 hand-written hard cases, 10 scam and 10 legit, never trained or tuned on.
Scam types: Other 4, Fake KYC 2, Account suspension 1, Collect-request scam 1, Lottery/prize 1, Refund/cashback 1.

Transactions (`data/transactions.csv`, `data/generate_transactions.py`, seed 42): 202 rows, 160 normal and
42 with injected anomalies (6 kinds x 7: large amount, new payee + large amount, 1-4 AM, bursts, collect
request from a new payee, amount just under a limit). Labels come from the injection step.

## (b) Pre-registered v1 result: GPT held out

Rules frozen, weights 0.6 rules / 0.4 ML ("v1"), model trained on claude + gemini, tested once on gpt (50 scam, 50 legit).

| Method | Accuracy | Recall (scam) | Notes |
| --- | --- | --- | --- |
| Hybrid v1 (Medium or High) | 0.66 | 0.38 | |
| ML alone (p >= 0.5) | 0.85 | 0.94 | 12 false alarms |
| Rules alone | | 0.14 | |

## (c) Leave-one-source-out: choosing the fusion weights

Train on two sources, test on the third. Rules and thresholds unchanged. Chosen after v1, so this is a
post-hoc change from v1, not a held-out result.

| Test source | Weights (rules/ML) | Precision | Recall | F1 | False-alarm rate |
| --- | --- | --- | --- | --- | --- |
| claude | 0.6/0.4 | 0.981 | 0.867 | 0.920 | 1.7% |
| claude | 0.5/0.5 | 0.965 | 0.917 | 0.940 | 3.3% |
| claude | 0.4/0.6 | 0.966 | 0.933 | 0.949 | 3.3% |
| claude | 0.3/0.7 | 0.833 | 1.000 | 0.909 | 20.0% |
| gemini | 0.6/0.4 | 0.889 | 0.960 | 0.923 | 12.0% |
| gemini | 0.5/0.5 | 0.891 | 0.980 | 0.933 | 12.0% |
| gemini | 0.4/0.6 | 0.875 | 0.980 | 0.925 | 14.0% |
| gemini | 0.3/0.7 | 0.806 | 1.000 | 0.893 | 24.0% |
| gpt | 0.6/0.4 | 0.864 | 0.380 | 0.528 | 6.0% |
| gpt | 0.5/0.5 | 0.885 | 0.460 | 0.605 | 6.0% |
| gpt | 0.4/0.6 | 0.892 | 0.660 | 0.759 | 8.0% |
| gpt | 0.3/0.7 | 0.754 | 0.980 | 0.852 | 32.0% |

| Weights | Avg precision | Avg recall | Avg F1 | Avg false-alarm rate |
| --- | --- | --- | --- | --- |
| 0.6/0.4 (v1) | 0.911 | 0.736 | 0.790 | 6.6% |
| 0.5/0.5 | 0.913 | 0.786 | 0.826 | 7.1% |
| **0.4/0.6 (chosen)** | 0.911 | 0.858 | **0.877** | 8.4% |
| 0.3/0.7 | 0.798 | 0.993 | 0.885 | 25.3% |

Rule: best average F1 with a false-alarm rate of at most about 15%. 0.3/0.7 was rejected for flagging a
quarter of legit messages. The claude and gemini folds are optimistic because rule patterns were added
after studying Gemini's misses; the gpt fold is the fairest.

## (d) Final independent test: adversarial set

Final model trained on all 320 messages (`python -m backend.app.ml.train --all`), weights 0.4/0.6, run
once. Nothing was changed after seeing these results. Correct = scam flagged Medium or High, legit left Low.

| id | label | rule score | ML prob | final score | risk | correct |
| --- | --- | --- | --- | --- | --- | --- |
| a001 | scam | 0 | 0.65 | 39 | Medium | Y |
| a002 | scam | 15 | 0.59 | 41 | Medium | Y |
| a003 | scam | 20 | 0.55 | 41 | Medium | Y |
| a004 | scam | 0 | 0.59 | 36 | Medium | Y |
| a005 | scam | 50 | 0.37 | 42 | Medium | Y |
| a006 | scam | 95 | 0.61 | 74 | High | Y |
| a007 | scam | 15 | 0.58 | 41 | Medium | Y |
| a008 | scam | 50 | 0.72 | 63 | Medium | Y |
| a009 | scam | 40 | 0.54 | 48 | Medium | Y |
| a010 | scam | 0 | 0.52 | 31 | Low | N |
| a011 | legit | 25 | 0.43 | 36 | Medium | N |
| a012 | legit | 0 | 0.28 | 17 | Low | Y |
| a013 | legit | 0 | 0.46 | 27 | Low | Y |
| a014 | legit | 0 | 0.41 | 24 | Low | Y |
| a015 | legit | 0 | 0.42 | 25 | Low | Y |
| a016 | legit | 0 | 0.43 | 26 | Low | Y |
| a017 | legit | 0 | 0.45 | 27 | Low | Y |
| a018 | legit | 20 | 0.33 | 28 | Low | Y |
| a019 | legit | 0 | 0.55 | 33 | Low | Y |
| a020 | legit | 45 | 0.31 | 37 | Medium | N |

| Method (20 cases) | Accuracy | Precision | Recall | F1 |
| --- | --- | --- | --- | --- |
| **Hybrid, Medium or High** | **0.85** | **0.82** | **0.90** | **0.86** |
| ML alone (p >= 0.5) | 0.90 | 0.90 | 0.90 | 0.90 |
| Rules alone (rule score >= 35) | 0.65 | 0.80 | 0.40 | 0.53 |
| Hybrid, High only | 0.55 | 1.00 | 0.10 | 0.18 |

Confusion matrices (rows = actual, columns = predicted):

Hybrid (Medium or High)

| | Predicted legit | Predicted scam |
| --- | --- | --- |
| Actual legit | 8 | 2 |
| Actual scam | 1 | 9 |

ML only

| | Predicted legit | Predicted scam |
| --- | --- | --- |
| Actual legit | 9 | 1 |
| Actual scam | 1 | 9 |

Rules only

| | Predicted legit | Predicted scam |
| --- | --- | --- |
| Actual legit | 9 | 1 |
| Actual scam | 6 | 4 |

## (e) Known limitations

- **a010, investment-tips scam missed (score 31).** No signal covers investment scams. Its wa.me link is
  not a shortener or look-alike domain, and the "message a personal number" rule misses a number inside a
  link because it treats the dot as a sentence end.
- **a011, genuine ICICI fraud alert flagged Medium (score 36).** Urgent wording plus the bank name fire
  urgency and brand signals; the rules do not credit reassuring lines such as "we will never ask for your PIN".
- **a020, genuine electricity disconnection notice flagged Medium (score 37).** The threat wording matches a
  scam pattern, and its sender code is not in the brand's sender list, so sender mismatch fires too.
- **Hinglish and Tamil-English rules are not implemented** (PRD Tier 2). Mixed-language scams rely on the ML alone.
- **High-only recall is very low** (0.10 on the adversarial set). With 320 training messages the model's
  probabilities stay between about 0.3 and 0.7, so most scams land in Medium ("review carefully"), not High.
- **Small adversarial set.** 20 cases: one message moves accuracy by 5 points.
- **Synthetic, LLM-written data.** Rules were partly written from Gemini's misses, and the hybrid still
  recalls fewer GPT scams than ML alone did in v1; scores on real messages would likely be lower.

These failures were left unfixed on purpose: changing rules after seeing the adversarial results would
make that test meaningless.
