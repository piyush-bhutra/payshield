# Report notes

Running log of results and decisions for the report. Numbers here are not edited after the fact.

## Pre-registered v1 result: GPT held-out (24 Oct 2026)

Setup: rules frozen after the Gemini error analysis, fusion weights 0.6 rules / 0.4 ML ("v1"),
model trained on claude + gemini, tested once on the unseen gpt batch (50 scam, 50 legit).
"Flagged" for the hybrid = Medium or High (score >= 35).

| Method | Accuracy | Recall (scam) | Notes |
| --- | --- | --- | --- |
| Hybrid v1 (Medium or High) | 0.66 | 0.38 | |
| ML alone (p >= 0.5) | 0.85 | 0.94 | 12 false alarms |
| Rules alone | | 0.14 | |

Takeaway: rules written from Claude and Gemini examples barely transfer to GPT's wording, and
with a 0.6 rule weight they drag the hybrid below ML alone. Any weight change after this point is
chosen with leave-one-source-out over all three sources and reported as a change from v1.

## Change from v1: fusion weights 0.6/0.4 -> 0.4/0.6 (24 Oct 2026)

Chosen after seeing the v1 GPT result, so this is a post-hoc change, not a held-out result.
Method: leave-one-source-out over claude, gemini, gpt (train on two, test on the third), rules and
thresholds unchanged, flagged = Medium or High. Rule: best average F1 with a false-alarm rate of
at most about 15% of legit messages.

Per fold:

| Test source | Weights | Precision | Recall | F1 | False-alarm rate |
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

Averaged over the three folds:

| Weights | Precision | Recall | F1 | False-alarm rate |
| --- | --- | --- | --- | --- |
| 0.6/0.4 (v1) | 0.911 | 0.736 | 0.790 | 6.6% |
| 0.5/0.5 | 0.913 | 0.786 | 0.826 | 7.1% |
| **0.4/0.6 (chosen)** | 0.911 | 0.858 | **0.877** | 8.4% |
| 0.3/0.7 | 0.798 | 0.993 | 0.885 | 25.3% |

Why not 0.3/0.7: slightly higher F1 but flags about a quarter of legit messages (32% on gpt).

Caveats:
- The claude and gemini folds are optimistic: rule patterns were added after studying Gemini's misses.
  The gpt fold is the fairest of the three.
- Even at 0.4/0.6, hybrid recall on gpt (0.66) stays below ML alone (0.94 in v1), which in turn
  raised more false alarms (12 vs 4 of 50 legit).
- The adversarial set was not used for this choice; it is scored once, on the final model, in Phase 5.

## Final independent test: adversarial set (24 Oct 2026)

Run once, after rules, weights (0.4 rules / 0.6 ML), thresholds and data were frozen:
`python -m backend.app.ml.train --all` trained the final model on all 320 messages
(claude 120, gemini 100, gpt 100) and scored the 20 hand-written adversarial cases, which were
never used for training or tuning. Only text and sender type are model inputs; the notes column
is for humans. Nothing was changed after seeing these results.

Correct = scam flagged Medium or High, legit left Low.

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

| Method (20 cases) | Accuracy | Precision | Recall | F1 | Confusion [[TN,FP],[FN,TP]] |
| --- | --- | --- | --- | --- | --- |
| Rules alone (>= 35) | 0.65 | 0.80 | 0.40 | 0.53 | [[9,1],[6,4]] |
| ML alone (p >= 0.5) | 0.90 | 0.90 | 0.90 | 0.90 | [[9,1],[1,9]] |
| **Hybrid, Medium or High (headline)** | **0.85** | **0.82** | **0.90** | **0.86** | [[8,2],[1,9]] |
| Hybrid, High only | 0.55 | 1.00 | 0.10 | 0.18 | [[10,0],[9,1]] |

Failures (kept in the report):
- a010 (scam, missed, score 31, rule score 0): an investment-tips scam with "guaranteed returns"
  and a wa.me messaging link. No rule fired: investment scams are not covered, the wa.me link is
  not a shortener or look-alike domain, and the "message a personal number" rule did not match
  because the number sits inside the link after a dot, which that pattern treats as a sentence end.
- a011 (legit, false alarm, score 36, rule score 25): a genuine ICICI fraud alert. "URGENT" and
  "immediately" fired urgency_threat (15), which with the bank name fired brand_impersonation (10);
  the ML gave 0.43. The rules have no notion of a reassuring line like "we will never ask for your
  PIN", which a genuine bank adds.
- a020 (legit, false alarm, score 37, rule score 45): a genuine electricity disconnection notice
  that mirrors a scam in the seed data. account_threat fired on the disconnection wording, and
  because "Electricity Board" is in the brand list but its sender code (VK-SEBOARD) is not among
  the listed sender hints, sender_mismatch (20) and brand_impersonation (10) fired too.
  Both legit failures land in Medium ("review carefully"), not High.

Notes:
- Only 1 of 10 scams reached High. ML probabilities stay between about 0.3 and 0.7 with 320
  training rows, so the "High only" definition is not usable as the headline; Medium is the
  "review carefully" zone the PRD describes.
- With 20 cases, one message moves accuracy by 5 points. These numbers are indicative only.
