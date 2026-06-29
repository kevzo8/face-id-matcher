# InsightFace Dirty Data Test — Mixed Same/Cross-Person Pairs

Provider: `insightface`, threshold: `0.7`, models: `buffalo_l`

Date: 2026-06-26

## Overview

40 pairs generated from Kaggle dataset: 27 same-person + 13 cross-person (deterministic random shuffle).

**Note:** 2 persons (Rômulo, Gülten Çayırcı) were excluded because their folder names contain non-ASCII characters
that cause file read errors in InsightFace/OpenCV. For batch processing, ensure folder names use only ASCII characters.

## Results

### Confusion Matrix

| | Predicted PASS ✅ | Predicted FAIL ❌ | Error |
|:-:|:-----------------:|:-----------------:|:-----:|
| **Actually SAME** | **27** | **0** | **0** |
| **Actually DIFFERENT** | **0** | **13** | **0** |

**Perfect score: 40/40 — zero errors, zero false accepts, zero false rejects.**

| Metric | Value |
|:-------|:-----:|
| False Accept Rate (FAR) | **0%** (0/13 cross-person passed) |
| False Reject Rate (FRR) | **0%** (0/27 same-person failed) |
| Accuracy | **100%** (40/40) |

### Score Distribution

| Type | Min | Max | Median |
|:----:|:---:|:---:|:------:|
| Same-person | 36.0% (Diego) | 78.5% (Mykhailo) | 48.9% |
| Cross-person | 0.0% | **8.7%** (Weslley vs Vitalijs) | 1.2% |

### Gap Analysis

```
Same-person scores:    36.0% ─────────────────────────── 78.5%
                                  ^ 27.3 point gap
Cross-person scores:   0.0% ─── 8.7%
                         ╰──────────────────────────────╯
                        Threshold 0.7 (distance 0.7)
```

The separation is clear: **worst same-person (36.0%) is 4x higher than best cross-person (8.7%)**.

## Conclusion

**InsightFace at threshold 0.7 achieves 100% accuracy on this dirty test (40/40).** The algorithm shows a massive gap between same-person and cross-person similarity scores (36.0% vs 8.7%), making threshold selection trivial.

For production batch processing:
- Ensure input image paths contain **only ASCII characters** (no accented/Unicode folder names)
- The batch processor will gracefully handle missing/corrupt files, but preprocessing to clean filenames is recommended
