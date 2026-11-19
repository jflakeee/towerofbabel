# P2 content and economy — review plan

Status: proposal, not approved balance or implementation. Derived from current-design.md, ccgs-systems-map.md and src/content.js.

Existing: 3 heroes, 15 skill IDs (including class-specific), 30 base equipment names across 3 slots, 5 rarities, 9 option definitions, 5 gem kinds x 3 tiers, enhancement +0..5, 5 tower floors, 20 chaos stages, continuous exploration. Arena is a free isolated dual-boss preview (300 seconds), not a reward-bearing mode.

| Step | Deliverable | Acceptance |
|---|---|---|
| P2-01 | Inventory and system dependencies | Preserve current design; no balance changes |
| P2-02 | Seeded economy audit | Measure loot, gold/material sources and sinks, upgrade costs, time/distance and difficulty progression without changing rates |
| P2-03 | Growth and build audit | Compare hero/skill policies and equipment progression; distinguish simulation from player experience |
| P2-04 | Arena economy proposal | Define entry, rewards, settlement, retry and migration; no assumed original-game rates; approval required before implementation |
| P2-05 | Approved implementation and regression | Atomic entry/settlement, replay prevention, failure recovery, preview isolation, v1/v2 compatibility |

Retain existing tower/chaos gameplay, continuous saves, reward IDs and free preview. No real-money mechanisms or new currency assumed. Main and public deployment remain unchanged. P0/P1 actual mobile acceptance remains outstanding. Native Claude Code invocation not verified.
