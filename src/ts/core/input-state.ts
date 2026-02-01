let currentInput = "";
let currentWordIndex = 0;
let isActive = false;


export function getCurrentInput(): string {
    return currentInput;
}

export function setCurrentInput(value: string): void {
    currentInput = value;
}

export function getCurrentWordIndex(): number {
    return currentWordIndex;
}

export function incrementWordIndex(): void {
    currentWordIndex++;
}

export function setActive(active: boolean): void {
    isActive = active;
}

export function getIsActive(): boolean {
    return isActive;
}

export function reset(): void {
    currentInput = "";
    currentWordIndex = 0;
    isActive = false;
}