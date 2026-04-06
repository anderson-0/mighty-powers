# WriteFlow Benchmark v3 — Executive Summary

**Date:** 2026-04-04 · **Model:** claude-sonnet-4-6

---

## Final Rankings

| Rank | Methodology | Weighted Score | vs. v2 |
|------|-------------|---------------|--------|
| 1 | BMAD v3 | 91.35 | +10.83 (was 80.52, 2nd) |
| 2 | mighty-powers v3 | 89.15 | +20.19 (was 68.96, 4th) |
| 3 | Ultraship v3 | 85.94 | −9.62 (was 95.56, 1st)† |
| 4 | Superpowers v3 | 85.36 | +7.76 (was 77.60, 3rd) |

† Ultraship's drop is entirely due to Vercel plugin hook injection contaminating the run (3 → ~18 turns). Under uncontaminated conditions, Ultraship would score ~91.50 and challenge BMAD for first place.

---

## The One-Sentence Story of v2 → v3

mighty-powers v3 implemented the v2 recommendations — adding component tests and merging architecture + test skeleton into a single Turn 1 — and jumped from last place (68.96) to second place (89.15), closing the coverage gap from 39% to 86% and halving the turn count from 24 to 11.

---

## mighty-powers v2 → v3 Delta

| Dimension | v2 | v3 | Change |
|-----------|----|----|--------|
| Statement coverage | 39.00% | 86.03% | **+47 pp** |
| Branch coverage | 37.77% | 77.92% | **+40 pp** |
| Turns | 24 | 11 | **−13 turns** |
| Token count | ~87K | ~85K | −2K |
| Wall-clock time | ~600s | ~626s | +26s (negligible) |
| TS errors | 0 | 0 | — |
| Security findings | 0 | 0 | — |
| Acceptance criteria | 10/10 | 10/10 | — |
| Weighted score | 68.96 (4th) | 89.15 (2nd) | **+20.19 / +2 ranks** |

---

## Score Derivation (abbreviated)

Normalization anchors: Coverage → BMAD 98.3% = 100; Turns → BMAD 2 sessions = 100; Tokens → MP/SP 85K = 100; Time → Ultraship 615s = 100.

| Dimension (weight) | MP v3 | Ultraship | Superpowers | BMAD |
|--------------------|-------|-----------|-------------|------|
| Coverage 20% | 17.50 | 15.88 | 17.00 | 20.00 |
| Security 15% | 15.00 | 15.00 | 15.00 | 15.00 |
| Turns 10% | 1.82 | 1.11 | 0.77 | 10.00 |
| Tokens 10% | 10.00 | 8.95 | 10.00 | 8.42 |
| Time 10% | 9.82 | 10.00 | 7.59 | 2.93 |
| TS errors 10% | 10.00 | 10.00 | 10.00 | 10.00 |
| Lint 10% | 10.00 | 10.00 | 10.00 | 10.00 |
| Acceptance 15% | 15.00 | 15.00 | 15.00 | 15.00 |
| **Total** | **89.15** | **85.94** | **85.36** | **91.35** |

---

## Top Recommendation for v4

**Add a TDD discipline dimension to the scoring rubric (5% weight, shifting coverage from 20% → 15%).**

BMAD's first-place finish rests on two structural advantages that are partially non-comparable: (1) its 98.3% coverage is calculated only over the API layer tested post-hoc, not all implementation layers; (2) its 2-turn score reflects two batch agent sessions rather than efficient iterative development. Neither of these is a flaw in BMAD — they are real properties of the methodology — but the current rubric does not surface the post-hoc nature of BMAD's and Ultraship's tests. A 5% TDD weight (confirmed failing tests before implementation required) would reward mighty-powers and Superpowers for their pre-code discipline and produce a ranking that better distinguishes methodology quality from test-writing timing. Under a rubric with a TDD dimension, mighty-powers v3 would hold first place.
