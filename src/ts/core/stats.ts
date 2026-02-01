
let startTime: number | null = null;
let endTime: number | null = null;
let correctChars = 0;
let incorrectChars = 0;
let totalKeystrokes = 0;
let backspaceCount = 0;

export function startTimer(): void {
  startTime = performance.now();
  endTime = null;
}

export function stopTimer(): void {
  endTime = performance.now();
}

export function getElapsedTime(): number {
  if (!startTime) return 0;
  const end = endTime ?? performance.now();
  return (end - startTime) / 1000; // Convert to seconds
}

export function recordCorrectChar(): void {
  correctChars++;
  totalKeystrokes++;
}

export function recordIncorrectChar(): void {
  incorrectChars++;
  totalKeystrokes++;
}

export function recordBackspace(): void {
  backspaceCount++;
  totalKeystrokes++;
}

export function getWPM(): number {
  const elapsed = getElapsedTime();
  if (elapsed === 0) return 0;

  const words = correctChars / 5;
  const minutes = elapsed / 60;

  return Math.round(words / minutes);
}

export function getRawWPM(): number {
  const elapsed = getElapsedTime();
  if (elapsed === 0) return 0;

  const totalChars = correctChars + incorrectChars;
  const words = totalChars / 5;
  const minutes = elapsed / 60;

  return Math.round(words / minutes);
}

export function getAccuracy(): number {
  const total = correctChars + incorrectChars;
  if (total === 0) return 100;

  return Math.round((correctChars / total) * 100);
}

export function getConsistency(): number {
  if (totalKeystrokes === 0) return 100;

  const effectiveKeystrokes = correctChars;
  return Math.round((effectiveKeystrokes / totalKeystrokes) * 100);
}

export function getCorrectChars(): number {
  return correctChars;
}

export function getIncorrectChars(): number {
  return incorrectChars;
}

export function getBackspaceCount(): number {
  return backspaceCount;
}

export interface Stats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  incorrectChars: number;
  backspaces: number;
  elapsedTime: number;
}

export function getAllStats(): Stats {
  return {
    wpm: getWPM(),
    rawWpm: getRawWPM(),
    accuracy: getAccuracy(),
    consistency: getConsistency(),
    correctChars,
    incorrectChars,
    backspaces: backspaceCount,
    elapsedTime: getElapsedTime(),
  };
}

export function reset(): void {
  startTime = null;
  endTime = null;
  correctChars = 0;
  incorrectChars = 0;
  totalKeystrokes = 0;
  backspaceCount = 0;
}
