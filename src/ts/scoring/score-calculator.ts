import * as Stats from "../core/stats";

let wordChips = 0;
let wordMult = 1;

let totalChips = 0;
let totalMult = 1;
let totalScore = 0;

const BASE_CHAR_CHIPS = 1;
const PERFECT_WORD_MULT = 1.5;
const SPEED_BONUS_THRESHOLD = 50; // WPM
const SPEED_MULT_BONUS = 0.1;

const CHAR_VALUES: Record<string, number> = {
  q: 3,
  z: 3,
  x: 3,
  j: 2,
  k: 2,
  v: 2,
  w: 2,
  y: 2,
  default: 1,
};

function getWordLengthBonus(length: number): number {
  if (length >= 10) return 2.0;
  if (length >= 7) return 1.5;
  if (length >= 5) return 1.2;
  return 1.0;
}

export function calculateCharChips(char: string): number {
  const baseValue = CHAR_VALUES[char.toLowerCase()] ?? CHAR_VALUES.default;
  return baseValue;
}

export function addCharChips(char: string): void {
  const chips = calculateCharChips(char);
  wordChips += chips;
}

export function calculateWordScore(
  word: string,
  typedWord: string,
  backspacesUsed: number
): WordScore {
  let chips = wordChips;

  const lengthBonus = getWordLengthBonus(word.length);
  chips = Math.round(chips * lengthBonus);

  let mult = wordMult;

  const isPerfect = typedWord === word && backspacesUsed === 0;
  if (isPerfect) {
    mult *= PERFECT_WORD_MULT;
  }

  const wpm = Stats.getWPM();
  if (wpm >= SPEED_BONUS_THRESHOLD) {
    mult += getWpmMul();
  }

  const score = Math.round(chips * mult);

  totalChips += chips;
  totalScore += score;

  const result: WordScore = {
    chips,
    mult,
    score,
    isPerfect,
    lengthBonus,
  };

  resetWordState();

  return result;
}

export function getTotalChips(): number {
  return totalChips;
}

export function getWpmMul(): number {
  const wpm = Stats.getWPM();
  let wpmMult: number = 0;
  wpmMult = SPEED_MULT_BONUS * wpm; //(wpm / 10);
  return wpmMult;
}

export function getTotalMult(): number {
  return totalMult;
}

export function getTotalScore(): number {
  return totalScore;
}

export function applyMultBonus(bonus: number): void {
  totalMult += bonus;
}

export function applyMultMultiplier(multiplier: number): void {
  totalMult *= multiplier;
}

export function meetsRequirement(requirement: number): boolean {
  return totalScore >= requirement;
}

export interface WordScore {
  chips: number;
  mult: number;
  score: number;
  isPerfect: boolean;
  lengthBonus: number;
}

export interface BlindScore {
  totalChips: number;
  totalMult: number;
  totalScore: number;
  wordsTyped: number;
  requirement: number;
  passed: boolean;
}

export function getBlindScore(
  wordsTyped: number,
  requirement: number
): BlindScore {
  return {
    totalChips,
    totalMult,
    totalScore,
    wordsTyped,
    requirement,
    passed: totalScore >= requirement,
  };
}

function resetWordState(): void {
  wordChips = 0;
  wordMult = 1;
}

export function reset(): void {
  wordChips = 0;
  wordMult = 1;
  totalChips = 0;
  totalMult = 1;
  totalScore = 0;
}
