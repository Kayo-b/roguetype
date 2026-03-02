# TERMINAL//ROGUE — Design Specification

> A Balatro-style typing roguelike. Build a loadout of scripts and exploits that transform how every keystroke scores. Skill floor: typing. Skill ceiling: synergy.

---

## Core Philosophy

Every run is a build. Scoring is two-dimensional — **Output × Amplifier** — so scripts interact multiplicatively and feel exponential. You are not just a fast typist; you are a system operator assembling a payload from whatever the black market has available. The prompts are your attack surface. The timer is the firewall.

---

## 1. Scoring Engine

### Two-Axis Model: Output × Amplifier

| Axis | Symbol | Role |
|---|---|---|
| Output | `OUT` | flat numeric value generated per scoring event |
| Amplifier | `AMP` | floating multiplier that scales Output |
| **Score gained** | | `OUT × AMP` |

Every script and upgrade interacts with *either* `OUT` (additive) or `AMP` (additive to the multiplier), or both (rare). Never merged into one number. This is what makes synergy exponential.

### Scoring Events

Scoring fires on **word completion**, not per character.

| Event | Effect |
|---|---|
| Word typed correctly | `+10 OUT + (word_length × 2)` |
| Word typed clean (zero backspaces) | `+15 OUT` flat bonus |
| Burst — 3 clean words in a row | `+0.2 AMP` (stackable) |
| Streak broken by backspace | AMP resets to base `1.0` |
| Full prompt cleared | `OUT × 1.5` applied once as completion bonus |

`AMP` starts at `1.0` each operation and resets each operation. `OUT` bonuses accumulate within the operation.

### Score Popup (per word)
```
+180 OUT  ×  3.4 AMP  =  612
```

Animates upward, fades in 800ms.

---

## 2. Run Structure — Sectors and Operations

### Sectors

A **Sector** is a threat tier. Each contains **3 Operations**:
```
Sector 1 → Probe → Intrude → [FIREWALL BOSS] → Shop
...
Sector 8 → Final Sector — Boss is ROOT_SYSTEM
```

Total run: **8 Sectors × 3 Operations = 24 rounds**. Shop opens after every Firewall Boss.

### Operation Types

| Type | Skippable | Notes |
|---|---|---|
| Probe | Yes (+3 credits) | Low target, easier prompt pool |
| Intrude | Yes (+3 credits) | Medium target |
| Firewall Boss | No | Named modifier active |

### Sector Scaling

| Sector | Score Target | Time Limit | Prompt Pool |
|---|---|---|---|
| 1 | 500 | 60s | common short words |
| 2 | 1,200 | 55s | medium words |
| 3 | 2,800 | 50s | mixed case + digits |
| 4 | 6,000 | 48s | compound words |
| 5 | 13,000 | 45s | bash commands, tech terms |
| 6 | 28,000 | 42s | reversed tokens, camelCase |
| 7 | 60,000 | 40s | symbol-heavy sequences |
| 8 | 140,000 | 38s | all pools, boss-modified |

---

## 3. Scripts (Passive Loadout — Core System)

Persistent run-long passives. Start with **5 script slots** (expandable to 7).

### Rarity Tiers

| Tier | Label | Character |
|---|---|---|
| 1 | Utility | Simple single-axis effect |
| 2 | Advanced | Dual-axis or conditional |
| 3 | Exploit | Strong, build-defining |
| 4 | Zero-Day | One per run max, run-warping |

### Utility Scripts

| Script | Effect |
|---|---|
| `keylogger.sh` | `+5 OUT` per word typed |
| `packet_sniffer` | `+0.1 AMP` per clean word |
| `idle_daemon` | `+0.05 AMP` per second remaining when operation clears |
| `throttle_hook` | `+0.2 AMP` when WPM exceeds 60 |
| `null_handler` | Backspace no longer breaks streak |

### Advanced Scripts

| Script | Effect |
|---|---|
| `fork_bomb.sh` | Every 5th word doubles current AMP for that word's score event |
| `brute_force` | Prompt cleared in under 20s → `+3 AMP` for rest of operation |
| `parity_check` | Even character count words give `+20 OUT` instead of base |
| `stack_overflow` | Each operation cleared adds `+0.1 AMP` permanently for the run |
| `watchdog.timer` | `+0.1 AMP` per 5 seconds elapsed (rewards deliberate typists) |

### Exploit Scripts

| Script | Effect |
|---|---|
| `cascade.exploit` | Word scored under 2s re-triggers the previous word's OUT |
| `fragile_payload` | AMP starts at `×3` but resets to `×1` on any backspace |
| `zero_fault` | Zero-backspace operation clear → final score `×2` |
| `overclock.bin` | All AMP additions doubled, time limit reduced 10s |
| `deep_scan` | Words 8+ chars grant `+2 AMP` instead of OUT |

### Zero-Day Scripts

| Script | Effect |
|---|---|
| `singularity.0day` | Once per operation: word typed in under 1s sets `AMP = AMP²` (cap: ×50) |
| `echo_chamber` | Every script's effect triggers twice — script slots reduced by 2 |

### Synergy Paths

| Path | Scripts |
|---|---|
| Clean typing | `packet_sniffer` + `zero_fault` + `null_handler` |
| Raw speed | `throttle_hook` + `overclock.bin` + `brute_force` |
| Long word farm | `deep_scan` + `keylogger.sh` + `stack_overflow` |
| Chaos | `fragile_payload` + `singularity.0day` |

---

## 4. Consumables

### Commands (single-use, effect this operation)

| Command | Effect |
|---|---|
| `--flush-amp` | Reset AMP to 1.0, add current AMP as flat OUT bonus for remaining words |
| `--payload-burst` | Next 5 words score triple OUT |
| `--spoof-script` | Copy a random Script's effect for this operation |
| `--extend-timeout` | +10s to timer |
| `--recompile` | Reroll one Script in loadout to same rarity (free) |
| `--inject` | Next word gives `+1 AMP` regardless of backspaces |

**Command slots: 2**

### Patches (permanent run upgrades, stack per purchase)

| Patch | Event | Per Stack |
|---|---|---|
| `patch_clean.bin` | Clean word bonus | `+5 OUT` |
| `patch_burst.bin` | Burst trigger | `+0.1 AMP` |
| `patch_finish.bin` | Completion bonus | `+0.1` multiplier |
| `patch_deep.bin` | Long word bonus | `+3 OUT` |
| `patch_recover.bin` | Streak reset | AMP drops 0.5 instead of full reset |

**Patch slots: 2**

---

## 5. Firewall Bosses

Every 3rd operation. Modifier visible before entry. Failing ends the run.

| Firewall Name | Modifier |
|---|---|
| `SCRAMBLER` | Prompt tokens randomly shuffled each prompt |
| `BIT_FLIP` | AMP gains become OUT gains and vice versa |
| `READONLY` | Backspace disabled |
| `BLACKOUT` | No score feedback until operation ends |
| `BLOAT` | Score target 2× normal |
| `THROTTLE` | Time limit halved, credit reward doubled |
| `MIRROR` | All words reversed |
| `AMNESIA` | Prompt hidden after 3 seconds |
| `NULL_AMP` | No AMP gains — score purely from OUT |
| `GC_SWEEP` | AMP resets to 1.0 every 10 seconds |

### Final Boss — `ROOT_SYSTEM`

3 random Firewall modifiers simultaneously. Score target 3× normal. Clearing wins the run.

---

## 6. The Shop (Black Market Terminal)

Opens after every Firewall Boss.
```
┌─────────────────────────────────────────────────────┐
│  SCRIPTS                              [REROLL  $5]  │
│  [ script_1 ]  [ script_2 ]  [ script_3 ]           │
├─────────────────────────────────────────────────────┤
│  COMMANDS                                           │
│  [ cmd_1 ]  [ cmd_2 ]                               │
├─────────────────────────────────────────────────────┤
│  PATCHES                                            │
│  [ patch_1 ]  [ patch_2 ]                           │
├─────────────────────────────────────────────────────┤
│  LICENSE  (1 per sector)                            │
│  [ license ]                                        │
└─────────────────────────────────────────────────────┘
```

### Pricing

| Item | Cost |
|---|---|
| Utility Script | $3 |
| Advanced Script | $5 |
| Exploit Script | $7 |
| Zero-Day Script | $10 |
| Command | $3 |
| Patch | $4 |
| License | $8 |
| Reroll | $5 (+$1 per reroll this visit) |

Scripts sell for half purchase price (rounded down).

### Licenses

| License | Effect |
|---|---|
| `license_slots.ext` | +1 Script slot |
| `license_threshold.ext` | WPM threshold for speed Scripts -10 |
| `license_bulk.ext` | All items cost $1 less (stackable) |
| `license_commands.ext` | +1 Command slot |
| `license_patches.ext` | +1 Patch slot |
| `license_interest.ext` | +1 credit per operation cleared (retroactive) |
| `license_failsafe.ext` | Once per run: survive a failed operation with 5s extension |

---

## 7. Credit Economy

| Source | Amount |
|---|---|
| Operation cleared (base) | 4 credits |
| Score >25% above target | +1 per 25% (max +4) |
| Skip Probe or Intrude | +3 credits |
| Zero-backspace clear | +2 credits |
| Interest at shop entry | +1 per 5 credits held (max +5) |

**Starting credits: 4.** Economy is tight by design. Interest incentivises hoarding.

---

## 8. UI Layout

### Left Panel — Loadout

- Script slots as bordered terminal cards: `[name]` `[effect summary]`
- Command and Patch slots below
- Hover: full description + `[SELL $X]`

### Center — Typing Arena

- Prompt: large monospace, high contrast
- Per-word: `dim` → `green` on clean completion, `red` flash on backspace
- Live `OUT` and `AMP` values, streak counter
- Timer bar: horizontal, red under 10s

### Right Panel — Operation State

- Score vs target with fill bar
- Sector / Operation label: `Sector 3 · Firewall Boss`
- Active Firewall modifier in red
- Credit balance
- Last event: `+320 OUT × 4.2 AMP = 1,344`

---

## 9. Prompt Generation by Sector

| Sector | Pool |
|---|---|
| 1–2 | Common English, 3–6 chars |
| 3–4 | Mixed length, compound words |
| 5 | Bash commands, CLI flags, tech terms |
| 6 | camelCase identifiers, digits |
| 7 | Symbol-heavy tokens, reversed words (dim styled) |
| 8 | All pools, Firewall-modified |

Spaces → `_` (keep existing behavior). Word count: 8 (Sector 1) → 14 (Sector 8).

---

## 10. Implementation Phases

| Phase | Work |
|---|---|
| 1 | Scoring engine — OUT × AMP, word-completion events, streak logic |
| 2 | Sector/Operation loop — replace 10-level system with 8×3 |
| 3 | Script system — data model, 5 slots, ~10 scripts to start |
| 4 | Shop — reroll, script sell, pricing, licenses |
| 5 | Firewall Bosses — modifier system, 4–6 to start |
| 6 | Consumables — Command + Patch split, slot model |
| 7 | UI — score popups, loadout panel, right panel, timer bar |
| 8 | Balance pass — targets, credit economy, WPM thresholds |

Reuse: `roguelike-state.ts` economy skeleton, store modal shell.
Rebuild: scoring engine, operation loop.
