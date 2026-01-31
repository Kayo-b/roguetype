# RogueType

A run-based typing game inspired by roguelike deckbuilders. Type words to earn chips, build multipliers, collect modifiers, and beat the blinds.

## Features

- **Run-based progression** - Progress through antes and blinds with increasing difficulty
- **Scoring system** - Earn chips per word, apply multipliers for massive scores
- **Modifier system** - Collect modifiers that change how scoring works
- **Boss blinds** - Special challenges with unique rules
- **Shop phase** - Buy and sell modifiers between rounds

## Tech Stack

- TypeScript
- Vite
- SASS
- Howler.js (audio)
- Anime.js (animations)

## Development

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── ts/
│   ├── core/       # Typing engine (input, word management, caret)
│   ├── game/       # Run logic (blinds, antes, shop)
│   ├── scoring/    # Chips, multipliers, combos
│   ├── modifiers/  # Gameplay modifiers
│   └── ui/         # Display components
├── styles/         # SCSS stylesheets
└── assets/         # Audio, fonts, images
```
