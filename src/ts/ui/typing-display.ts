import * as InputState from "../core/input-state";
import { wordManager } from "../core/word-manager";
import { updateCaretPosition, restartBlink } from "../core/caret";

let wordsElement: HTMLElement | null = null;

export function initDisplay(): void {
  wordsElement = document.getElementById("words");
  
  if (!wordsElement) {
    throw new Error("Words element not found");
  }
  
  renderWords();
}

function renderWords(): void {
  if (!wordsElement) return;
  
  const words = wordManager.getAll();
  let html = "";
  
  for (let i = 0; i < words.length; i++) {
    html += buildWordHTML(words[i], i);
  }
  
  wordsElement.innerHTML = html;
  
  const firstWord = wordsElement.querySelector('[data-index="0"]');
  if (firstWord) {
    firstWord.classList.add("active");
  }
}

function buildWordHTML(word: string, index: number): string {
  let html = `<div class="word" data-index="${index}">`;
  
  for (const char of word) {
    html += `<span class="char">${char}</span>`;
  }
  
  html += "</div>";
  return html;
}

export function updateDisplay(): void {
  const currentIndex = InputState.getCurrentWordIndex();
  const currentInput = InputState.getCurrentInput();
  const currentWord = wordManager.getCurrent(currentIndex);
  
  updateWordDisplay(currentIndex, currentInput, currentWord);
  updateActiveWord(currentIndex);
  updateCaretPosition();
  restartBlink();
}

function updateWordDisplay(
  wordIndex: number,
  input: string,
  targetWord: string
): void {
  if (!wordsElement) return;
  
  const wordElement = wordsElement.querySelector(
    `[data-index="${wordIndex}"]`
  ) as HTMLElement;
  
  if (!wordElement) return;
  
  const chars = wordElement.querySelectorAll(".char");
  
  for (let i = 0; i < targetWord.length; i++) {
    const char = chars[i] as HTMLElement;
    
    if (i < input.length) {
      if (input[i] === targetWord[i]) {
        char.className = "char correct";
      } else {
        char.className = "char incorrect";
      }
    } else {
      char.className = "char";
    }
  }
}

function updateActiveWord(currentIndex: number): void {
  if (!wordsElement) return;
  
  const allWords = wordsElement.querySelectorAll(".word");
  allWords.forEach((word, index) => {
    word.classList.remove("active");
    if (index < currentIndex) {
      word.classList.add("typed");
    }
  });
  
  const currentWord = wordsElement.querySelector(
    `[data-index="${currentIndex}"]`
  );
  if (currentWord) {
    currentWord.classList.add("active");
  }
}