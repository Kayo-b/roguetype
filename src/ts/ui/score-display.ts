// Live score, multipliers, chips display
import * as ScoreCalculator from '../scoring/score-calculator';

let multiplierElement: HTMLElement | null = null;

export function initScoreDisplay(): void {
  multiplierElement = document.getElementById("multi");

  if (!multiplierElement) {
    throw new Error("multiplier element not found");
  }
  wpmMultiplierDisplay();
}

function wpmMultiplierDisplay(): void {
    if(!multiplierElement) return;
    const wpmMultiplier = ScoreCalculator.getWpmMul();
    multiplierElement.innerHTML = String(Math.floor(wpmMultiplier));
}