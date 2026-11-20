# P1 performance verification — 2026-11-20

Source under test: `8944f7bb97787ffd23cf95497696f9f4e5cbd238`, draft PR #23.

| Change | Commit |
|---|---|
| Benchmark CI | 4b3a251 |
| Wall intersection allocations | e4f478f |
| A* visitation flags | 1265bed |
| Terrain chunk arrays | a11d864 |
| Render culling and palette | 72d3a9c |
| Gradient reuse | 8944f7b |

## Verified evidence
- [Regression CI](https://github.com/jflakeee/towerofbabel/actions/runs/44627335290): success, 188/188 tests, zero failures; check, soak, build, benchmark and CCGS diagnostics passed.
- [Pages CI](https://github.com/jflakeee/towerofbabel/actions/runs/44627335198): verification and artifact upload passed; deploy skipped.

## Synthetic CPU benchmark
100 enemies, 120 movement frames, stationary player, median of five warmed runs. Times in milliseconds.

| Revision | Total | P95 | Max |
|---|---:|---:|---:|
| 4b3a251 | 39.385246 | 0.566534 | 6.494295 |
| e4f478f | 20.623277 | 0.234357 | 4.649042 |
| 8944f7b | 22.870361 | 0.224188 | 6.204001 |

Different hosted CI runners; timing is observational, not a controlled causal comparison or a rendering benchmark. Final total is 41.9% lower than initial. No measured FPS, energy or thermal claim.

## Outstanding release gates
- Real browser and mobile visual parity, orientation, input and PWA/offline acceptance.
- Same-device sustained combat FPS, frame latency, thermal and energy comparisons.
- Preserve v1/v2 migration and current saves; dedicated device interruption and storage checks remain pending.
- Keep main and public Pages unchanged; do not merge draft PR before acceptance and approval.
- Native Claude Code skill invocation not verified.
