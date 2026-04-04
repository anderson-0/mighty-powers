# WriteFlow Benchmark v2 — Executive Summary

**Date:** 2026-04-04 | **Model:** claude-sonnet-4-6 | **Spec:** WriteFlow v2

---

- **Ultraship wins the v2 weighted score (95.56/100)**, driven by a 3-turn, 43K-token execution that achieved 84.61% coverage and 0 security findings — outperforming on every efficiency dimension while maintaining quality parity with BMAD and Superpowers on every criterion except TypeScript errors.

- **mighty-powers v2 improved significantly from v1 (68.96 vs ~45.3)**: coverage jumped from 13.82% to 39.00% (+25 pp), regressions dropped from 1 to 0, TDD tightened to strict per-feature red-green-commit, and the architecture artifact (149 lines, written before any code) became the direct mechanism for eliminating the v1 AI route regression — but the methodology still trails BMAD by 11.56 weighted points, primarily on coverage aggregate and turn count.

- **The isolation fix exposed a real v1 contamination**: Ultraship gained 4 TypeScript errors in v2 that were absent in v1, strongly suggesting that mighty-powers' quality hooks were active during Ultraship's v1 run and caught those errors. Competing methodology v1 scores were partially inflated by mighty-powers infrastructure.

- **Architecture artifacts are the strongest single leading indicator of implementation quality**: the two methodologies with formal architecture docs written before coding (mighty-powers v2, BMAD) both produced 0 TS errors and 0 regressions; the methodology with no planning artifact (Ultraship) produced 4 TS errors; the methodology with a structural plan but no formal artifact (Superpowers) produced 0 TS errors — consistent with the artifact being the mechanism, not just correlation.

- **TDD does not predict coverage; post-hoc testing can match it**: Ultraship's post-hoc test suite (written by a finalization agent after all code was complete) achieved 85.22% branch coverage — exceeding BMAD's TDD-driven 72.72%. Coverage metrics measure test scope, not test quality or design influence; the rubric's coverage weight (20%) would be better split into coverage (15%) and TDD discipline (5%) as distinct signals.

- **BMAD remains the best quality-per-turn methodology (80.52, 10 turns)** but is the worst quality-per-token performer; Ultraship is the best quality-per-token by 2.5x. For cost-sensitive production builds, Ultraship's 3-turn model dominates; for organizations that value planning artifacts and audit trails, BMAD's 30% planning / 70% implementation ratio continues to produce zero-rework execution.

- **mighty-powers v3 highest-leverage targets**: (1) per-layer coverage reporting to correctly represent API route test quality, (2) a "library integration gotchas" section in the architecture template to prevent TS errors from third-party type mismatches, and (3) a testability triage step before test authoring to set accurate coverage expectations — these three changes alone would bring mighty-powers v3's reported quality metrics into direct competition with BMAD on all weighted dimensions except turn count.
