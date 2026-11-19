# Tower of Babel — systems map

Source-based /map-systems equivalent; native Claude Code invocation not verified. Current design: docs/current-design.md (distance-based continuous exploration). No game changes.

| ID | System | Source | Direct module dependencies | Priority for verification |
|---|---|---|---|---|
| S01 | Combat, profile v2, rewards | src/engine.js | exploration, content, world | P0 |
| S02 | Exploration, gate placement, retention | src/exploration.js | none | P0 |
| S03 | World, collision, pathfinding, difficulty | src/world.js | exploration | P1 |
| S04 | Transactions, settlement, advancement | src/transactions.js | world, automation, content, engine | P0 |
| S05 | Equipment, gems, policies | src/content.js | none | P0 |
| S06 | Auto combat and skill selection | src/automation.js | content, engine, world | P1 |
| S07 | Persistence and recovery | src/storage.js | none | P0 |
| S08 | Mobile joystick | src/input.js | none | P0 |
| S09 | Performance diagnostics | src/diagnostics.js | none | P1 |
| S10 | UI, rendering and lifecycle orchestration | src/app.js | all nine source modules | P0 |
| S11 | Offline cache and build | sw.js, scripts/build.mjs | browser service worker APIs; Node filesystem/crypto | P0 |

Import direction: app -> transactions -> automation -> engine -> world -> exploration. Engine and automation also consume content; app integrates storage, input and diagnostics. No cycles observed among these explicit static module imports. Runtime callbacks and shared profile/game data introduce additional coupling; this table is not a full call graph.

## Verification sequence
1. P0-A: profile v1/v2 migration, corrupted/future save protection, writer lock and revision conflicts. Existing storage.test.js and run-start.test.js are referenced by current-design.md.
2. P0-B: guardian settlement, failed persistence, retry, duplicate rewards, continuous growth and backup restoration (continuous.test.js, transactions.test.js).
3. P0-C: exploration state, gate location consistency, retention and legacy migration; run npm run test:soak.
4. P0-D: mobile pointer handoff, app interruption and offline update; input.test.js, ui.test.js, offline.test.js, build.test.js plus real Safari/Chrome.
5. P1: sustained device performance, obstacle routing, automation policy.
6. P2: formal arena economy only after design approval; current stage settlement rejects non-stage encounter.

Execute npm run check, npm test, npm run test:soak, npm run build. Test filenames above derive from current design documentation, not fresh test executions. Do not merge or deploy until verified. Main remains protected.
