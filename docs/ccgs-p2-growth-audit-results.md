# P2 economy and growth audit

Source: CI run 44628284047, commit d39ca3883c7d7d5702ccf2b04203e4b9bc296c87; both jobs succeeded. Five seeds per hero and movement scenario, fresh profiles, 120-second cap, automatic abilities, no settlement.

| Movement | Hero | Mean seconds | Kills | Shards | Level | Loot | Survived cap |
|---|---|---:|---:|---:|---:|---:|---:|
| Stationary | Knight | 56.18 | 47.4 | 60 | 3.2 | 1.4 | 0/5 |
| Stationary | Mage | 61.29 | 52.8 | 69 | 3 | 1.8 | 0/5 |
| Stationary | Ranger | 77.35 | 68.2 | 89.8 | 3.2 | 2.4 | 1/5 |
| Alternating | Knight | 118.31 | 110.2 | 137.2 | 5.2 | 3 | 4/5 |
| Alternating | Mage | 83.64 | 71.4 | 89.4 | 3.4 | 2 | 2/5 |
| Alternating | Ranger | 70.12 | 60.8 | 69.8 | 3 | 1 | 0/5 |

Movement reverses performance ranking; do not change hero stats on this evidence alone. Alternating input rotates 90 degrees every 3 seconds, not actual player behavior. Stationary allows automatic dodge movement. Surviving runs are right-censored. Shards are accrued, not settled. Need more seeds, movement policies, equipment builds and skill strategies before tuning. No mobile verification.

Economy CI 44627905543: 100000 normal and 100000 guaranteed rare samples; mean hypothetical liquidation 26.4154 and 55.02505 shards; permanent upgrades cost 2625 each. No actual drop-per-minute inference. No production balance changes. Arena economy requires explicit approval.
