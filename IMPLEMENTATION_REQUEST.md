# Roguelike Typing Game - Feature Request (Review Draft)

## Scope
Implement the remaining core gameplay features for the roguelike typing game.

## Out of Scope
- Do **not** implement a chip/card system like Balatro.

## Core Focus
- Make score progression highly visible (the score number should clearly go up during play).
- Show current WPM in real time.
- Add speed multipliers(already semi-implemented).
- Add flawless multipliers (triggered when completing full word sets with zero mistakes)(already semi-implemented).
- Keep feedback immediate and satisfying(numbers should be visible near the typing area so tha player can type and see the numbers go up).

## UI / Visual Direction
- Style should look like a terminal with a subtle cyberpunk hacker vibe.
- Overall look should stay clean and not overly stylized.
- Use this CSS terminal UI library: https://github.com/webtui/webtui
- The central typing area (where text appears) should look like a bash terminal window.
- The typing should happen on a separate lane without any text behind it, the text to be typed must be above the typing lane. Like when you have a file open on IDE and below it there is a bash window open, when typing there should be a cursor that follows the current letter placement on the words to give a visual reference of where it is.
- on the side columns there should be a couple of separated horizontal retangular fields where the menu (lower part) will be and the level info/aggregated score/general info is (top part)
## Game Modes

### 1) Regular Mode
- Keep the currently implemented behavior:
  - User types along with displayed text.

### 2) Quiz Mode
- Present syntax-related questions across topics such as:
  - Bash commands
  - SQL syntax / SQL injection syntax
  - JavaScript common methods (`splice`, `split`, `find`, `filter`, `map`, etc.)
- In Quiz Mode, the answer is **not** shown initially.
- User can click a `Tip` option to receive a semi-vague hint.
- Correct syntax is shown only after an incorrect input.
- Include two validation modes:
  - `Strict`: exact correctness required.
  - `Loose`: allows small errors (example: missing closing parenthesis or semicolon).
- Quiz scoring should be based on:
  - Question difficulty
  - Whether loose-mode minor mistakes occurred

## Process Note
Approved
