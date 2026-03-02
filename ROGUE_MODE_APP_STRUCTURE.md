# Rogue Mode App Structure (Current)

## 1) Runtime Entry + Main Loop

- Entry point: `src/index.ts`
- Boot order:
  1. `initDisplay()` (`src/ts/ui/typing-display.ts`)
  2. `initCaret()` (`src/ts/core/caret.ts`, currently a no-op)
  3. `initScoreDisplay()` (`src/ts/ui/score-display.ts`)
  4. `initInputHandler()` (`src/ts/core/input-handler.ts`)
- Game tick:
  - `tickGame()` runs every `180ms` via `setInterval`.
  - Tick responsibilities:
    - update rogue timed state (`tickRogueLevelState`)
    - sync speed/scoring multipliers
    - refresh score/HUD display

## 2) Current UI Layout (Rogue-Focused)

- Main markup: `src/index.html`
- High-level regions:
  - Left column:
    - Session panel (`mode`, `validation`, `set`, `accuracy`, `status`)
    - Run Intel panel (`level meta`, `slots`, `mutator`)
    - Command info panel (instructions only)
  - Center terminal:
    - Prompt/title/messages
    - Single unified input line (`#commandInput`)
    - Inline metric strip (`score`, `wpm`, multipliers, gain)
    - Bash/help/output pane (`#terminalBashPane`) shown only in command mode
  - Store overlay modal (`#storeOverlay`)

## 3) Single Input Model (Typing + Command)

- Single field: `#commandInput` (no separate typing field now)
- Input mode split:
  - If first char is `!`: command mode
  - Otherwise: typing mode
- Command mode UI signal:
  - `#typingTerminal` gets class `isCommandMode`
  - bottom half bash pane is shown

Implementation in `src/ts/core/input-handler.ts`:

- `isCommandModeValue(value)` checks `value.startsWith("!")`
- `syncInlineInputModeFromValue(value)` toggles command mode classes
- `input` event:
  - command mode: hold value for Enter execution
  - typing mode:
    - fast path for append typing
    - fallback path for mid-string edits (`applyEditedTextFromInput`)
- `keydown` event:
  - `Enter` in command mode executes command
  - `Enter` in quiz mode submits answer
  - `Backspace` in typing mode:
    - end-of-text path uses game backspace logic
    - mid-string/selection path uses native browser editing + input sync
  - `Escape` clears command buffer first if in command mode

## 4) Core Rogue State Machine

Module: `src/ts/game/roguelike-state.ts`

- `RoguePhase`: `idle | level | store | game-over | victory`
- Key constants:
  - `MAX_LEVEL = 10`
  - `MAX_SLOTS = 3`
  - `STARTING_COINS = 22`
  - `BASE_SPEED_MUTATOR = 2`

### Phase flow

1. `startNewRun(totalScore)`
   - resets run economy/effects/slots
   - seeds default consumable slot
   - randomizes store offers
   - starts level 1
2. `level` phase
   - timer active (`levelStartedAt`, `levelDurationMs`)
   - goal tracked (`levelGoal`, `levelStartScore`)
3. On goal met: `completeLevel(totalScore)`
   - grants coins
   - if level < 10 => `store`
   - if level 10 => `victory`
4. Store exit: `advanceAfterStore(totalScore)` => next `level`
5. Timeout fail:
   - tries `tryTriggerDeusEx()` if module equipped + not spent
   - otherwise `failLevel()` => `game-over`

## 5) Rogue Economy + Loadout

- Consumables (`RogueConsumableId`)
  - `scoring_surge`, `overclock_draught`, `lucky_battery`
  - time-bound active effects (`flatGainBonus`, `gainMultiplier`, `speedMultiplier`)
- Modules (`RogueModuleId`)
  - `deus_ex_machina`, `overclock_core`, `stability_anchor`
  - passive run-wide modifiers (`goal`, `coin rewards`, `speed`, `flat gain`, etc.)
- Slots:
  - 3 consumable slots
  - 3 module slots
- Store:
  - randomized 3 consumables + 3 modules each store phase
  - purchase guarded by coin + slot capacity checks

## 6) Rogue Prompt Generation + Mutators

Module: `src/ts/core/word-manager.ts`

- Rogue prompt source:
  - `createRoguePrompt(level, wordCount)`
  - sequence pools:
    - early narrative pool (lower levels)
    - tech + bash command style pools (higher levels)
- Rogue formatting:
  - all spaces become `_` via `transformPromptForRogue(...)` in rogue state layer
- Boss behavior (level 10):
  - additional token transforms:
    - reverse token
    - upside-down style mapping
    - or unchanged token

## 7) Scoring + Multipliers

Module: `src/ts/scoring/score-calculator.ts`

- Total gain uses:
  - base gain event value
  - `flatGainBonus`
  - `globalGainMultiplier`
  - combined `totalMultiplier = speedMultiplier * flawlessMultiplier`
- Rogue injects bonuses in controller:
  - `syncRogueScoringBonuses()` pulls rogue active/passive effects:
    - `setFlatGainBonus(...)`
    - `setGlobalGainMultiplier(...)`
- Speed multiplier stack:
  - WPM-derived speed multiplier
  - rogue speed multiplier (includes base `x2` mutator + effects/modules)

## 8) Input/Progress Controller Responsibilities

Main orchestrator: `src/ts/core/input-handler.ts`

- Owns:
  - run reset/start/tab switching
  - prompt loading (regular/quiz)
  - typed char handling + strict lock enforcement
  - set finalization + rogue progression checks
  - store modal lifecycle
  - command parsing/execution
  - theme/difficulty/theme-filter persistence hooks

Rogue-specific integration points:

- `evaluateRogueProgress()` checks score goal completion
- `tickRogueLevelState()` checks timer expiration and deus-ex rescue
- `handleConsumableHotkey()` handles `CTRL+1/2/3` activation

## 9) Command System (Unified Input, `!` Prefix)

Command executor: `executeTerminalCommand(...)` in `input-handler.ts`.

Rogue-relevant commands:

- `!--rogue`
- `!--start`
- `!--reset`
- `!--next` (loads next rogue set when in rogue)
- `!--help` (written to command output pane)

Also supported (global/training related):

- tab/mode/validation/difficulty/theme filters
- quiz actions (`!--tip`, `!--submit`)
- theme toggle/import/template commands

All command responses write to:

- `#commandOutput` in terminal bottom pane

## 10) UI Rendering Layers

### Prompt + state text

- `src/ts/ui/typing-display.ts`
- Renders:
  - title (`ROGUE MODE · Lx ...`)
  - expected prompt with per-char correctness coloration
  - quiz message areas
  - set progress inline value
  - rogue accent color class/style on terminal

### Score + side telemetry

- `src/ts/ui/score-display.ts`
- Renders:
  - score, wpm, multipliers, last gain
  - session/run intel labels/values
  - slot text + active effect countdowns

## 11) Persistence Used by Rogue Flow

Module: `src/ts/utils/storage.ts`

Used by controller for:

- selected quiz themes
- quiz difficulty filter
- regular difficulty
- custom content package

Note:
- Rogue run state itself is currently in-memory only (not persisted).

## 12) Known Structural Notes (For Further Refactor Analysis)

- `input-handler.ts` is currently a "god-controller" handling input, commands, run orchestration, and modal/store wiring.
- `score-display.ts` and `input-handler.ts` still contain legacy button/menu bindings (for IDs that are no longer in current markup); optional chaining prevents crashes.
- `caret.ts` is intentionally no-op now because the old separate typing lane was removed.

## 13) Quick File Map (Rogue Runtime Path)

- Entry loop: `src/index.ts`
- Main controller: `src/ts/core/input-handler.ts`
- Rogue run state/economy: `src/ts/game/roguelike-state.ts`
- Global gameplay state: `src/ts/game/game-state.ts`
- Scoring engine: `src/ts/scoring/score-calculator.ts`
- Prompt generation: `src/ts/core/word-manager.ts`
- Prompt rendering: `src/ts/ui/typing-display.ts`
- Score/run panels: `src/ts/ui/score-display.ts`
- Markup shell: `src/index.html`

