// Live score, multipliers, chips display
import * as ScoreCalculator from '../scoring/score-calculator';
import * as Stats from "../core/stats";

let multiplierElement: HTMLElement | null = null;
let wpmElement: HTMLElement | null = null;
let scoreElement: HTMLElement | null = null;
let totalMultiElement: HTMLElement | null = null;

export function initScoreDisplay(): void {
  multiplierElement = document.getElementById("multi");
  wpmElement = document.getElementById("wpm");
  totalMultiElement = document.getElementById("totalMulti");
  scoreElement = document.getElementById("score");
  if (!multiplierElement) throw new Error("multiplier element not found");
  wpmMultiplierDisplay();
  wpmDisplay();
  scoreDisplay();
  totalMultiDisplay();
}

function wpmMultiplierDisplay(): void {
    if(!multiplierElement) return;
    const wpmMultiplier = ScoreCalculator.getWpmMul();
    multiplierElement.innerHTML = String(Math.floor(wpmMultiplier));
}

function wpmDisplay(): void {
    if(!wpmElement) return;
    wpmElement.innerHTML = String(Stats.getWPM());
}

function scoreDisplay(): void {
    if(!scoreElement) return;
    scoreElement.innerHTML = String(ScoreCalculator.getTotalScore())

}

function totalMultiDisplay(): void {
    if(!totalMultiElement) return;
    totalMultiElement.innerHTML = String(ScoreCalculator.getTotalMult())

}