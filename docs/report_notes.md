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
