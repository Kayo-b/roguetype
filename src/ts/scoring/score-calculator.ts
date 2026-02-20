import * as GameState from "../game/game-state";
import { getQuizDifficultyWeight } from "../core/quiz-manager";

interface QuizScoreInput {
  difficulty: GameState.QuizDifficulty;
  usedTip: boolean;
  minorErrors: number;
}

let totalScore = 0;
let totalChips = 0;

let speedMultiplier = 1;
let flawlessMultiplier = 1;
let totalMultiplier = 1;

const CHAR_VALUES: Record<string, number> = {
  q: 5,
  z: 5,
  x: 4,
  j: 4,
  k: 3,
  v: 3,
  w: 3,
  y: 3,
  default: 2,
};

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function syncMultipliers(): void {
  totalMultiplier = roundTo2(speedMultiplier * flawlessMultiplier);
  GameState.setSpeedMultiplier(speedMultiplier);
  GameState.setTotalMultiplier(totalMultiplier);
}

function recordGain(gain: number, reason: string): number {
  const safeGain = Math.max(0, Math.round(gain));
  totalScore += safeGain;
  GameState.setLastGain(safeGain, reason);
  return safeGain;
}

export function calculateSpeedMultiplier(wpm: number): number {
  if (wpm <= 0) return 1;
  return roundTo2(Math.min(3.2, 1 + wpm / 90));
}

export function setSpeedMultiplier(multiplier: number): void {
  speedMultiplier = Math.max(1, roundTo2(multiplier));
  syncMultipliers();
}

export function setFlawlessMultiplier(multiplier: number): void {
  flawlessMultiplier = Math.max(1, roundTo2(multiplier));
  syncMultipliers();
}

export function getSpeedMultiplier(): number {
  return speedMultiplier;
}

export function getFlawlessMultiplier(): number {
  return flawlessMultiplier;
}

export function getTotalMult(): number {
  return totalMultiplier;
}

export function getTotalScore(): number {
  return totalScore;
}

export function getTotalChips(): number {
  return totalChips;
}

export function getCharBaseValue(char: string): number {
  return CHAR_VALUES[char.toLowerCase()] ?? CHAR_VALUES.default;
}

export function addRegularCharScore(char: string): number {
  const base = getCharBaseValue(char);
  totalChips += base;
  const gain = base * totalMultiplier;
  return recordGain(gain, "char");
}

export function addRegularSetBonus(wordCount: number, flawlessSet: boolean): number {
  const base = wordCount * 14;
  const flawlessBonus = flawlessSet ? 1.4 : 1;
  return recordGain(base * flawlessBonus * totalMultiplier, "set");
}

export function addQuizAnswerScore(input: QuizScoreInput): number {
  const base = 130;
  const difficultyWeight = getQuizDifficultyWeight(input.difficulty);
  const tipPenalty = input.usedTip ? 0.85 : 1;
  const minorErrorPenalty = Math.max(0.6, 1 - input.minorErrors * 0.06);

  return recordGain(
    base * difficultyWeight * tipPenalty * minorErrorPenalty * totalMultiplier,
    "quiz"
  );
}

export function recordNoGain(reason: string): void {
  GameState.setLastGain(0, reason);
}

export function reset(): void {
  totalScore = 0;
  totalChips = 0;
  speedMultiplier = 1;
  flawlessMultiplier = 1;
  totalMultiplier = 1;
  syncMultipliers();
  GameState.setLastGain(0, "reset");
}
