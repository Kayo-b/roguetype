// Word queue and generation
class WordManager {
    private words: string[] = [];

    constructor() {
        this.reset();
    }

    reset(): void {
        this.words = [
        "the", "quick", "brown", "fox", "jumps",
        "over", "the", "lazy", "dog", "while",
        "typing", "very", "fast", "today"
        ]
    }

    get(index: number): string {
        return this.words[index] ?? "";
    }

    getCurrent(currentIndex: number): string {
        return this.get(currentIndex);
    }

    getAll(): string[] {
        return this.words;
    }

    getLength(): number {
        return this.words.length;
    }

}

export const wordManager = new WordManager();