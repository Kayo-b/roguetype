import * as InputState from "./input-state";
import * as Stats from "./stats";
import { wordManager } from "./word-manager";
import { updateDisplay } from "../ui/typing-display";
import * as ScoreCalculator from "../scoring/score-calculator";

let wordBackspaces = 0;

export function initInputHandler(): void {
    const inputEl = document.getElementById("hiddenInput") as HTMLInputElement;

    if (!inputEl) {
        throw new Error('hidden input element not found');
    }

    document.addEventListener("click", () => {
        inputEl.focus();
    });

    inputEl.addEventListener("blur", () => {
        setTimeout(() => inputEl.focus(), 0);
    });

    inputEl.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        if (!InputState.getIsActive() && value.length > 0) {
            InputState.setActive(true);
            Stats.startTimer();
        }

        processInput(value);

        target.value = "";
    });

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Backspace") {
            handleBackspace();
            e.preventDefault();
        } else if (e.key === " ") {
            handleSpace();
            e.preventDefault();
        }
    });

    inputEl.focus();
}

function processInput(char: string): void {
    if (!InputState.getIsActive()) return;

    const currentWord = wordManager.getCurrent(InputState.getCurrentWordIndex());
    const currentInput = InputState.getCurrentInput();

    const newInput = currentInput + char;
    InputState.setCurrentInput(newInput);

    const charIndex = currentInput.length;
    const isCorrect = char === currentWord[charIndex];

    if (isCorrect) {
        Stats.recordCorrectChar();
        ScoreCalculator.addCharChips(char);
    } else {
        Stats.recordIncorrectChar();
    }

    updateDisplay();
}

function handleBackspace(): void {
    const currentInput = InputState.getCurrentInput();
    if (currentInput.length > 0) {
        InputState.setCurrentInput(currentInput.slice(0, -1));
        Stats.recordBackspace();
        wordBackspaces++;
        updateDisplay();
    }
}

function handleSpace(): void {
    const currentInput = InputState.getCurrentInput();
    const currentWord = wordManager.getCurrent(InputState.getCurrentWordIndex());

    if (currentInput.length > 0) {
        const wordScore = ScoreCalculator.calculateWordScore(
            currentWord,
            currentInput,
            wordBackspaces
        );

        console.log(`Word: "${currentInput}" → ${wordScore.chips} chips × ${wordScore.mult.toFixed(1)} = ${wordScore.score}${wordScore.isPerfect ? " ⭐" : ""}`);

        wordBackspaces = 0;

        InputState.incrementWordIndex();
        InputState.setCurrentInput("");

        if (InputState.getCurrentWordIndex() >= wordManager.getLength()) {
            InputState.setActive(false);
            Stats.stopTimer();

            const stats = Stats.getAllStats();
            const finalScore = ScoreCalculator.getTotalScore();
            console.log("=== Test Complete ===");
            console.log(`WPM: ${stats.wpm} | Accuracy: ${stats.accuracy}%`);
            console.log(`Total Score: ${finalScore}`);
        }

        updateDisplay();
    }
}