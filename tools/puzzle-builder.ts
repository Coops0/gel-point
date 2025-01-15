import * as fs from 'fs';

interface Position {
    row: number;
    col: number;
}

interface WordPlacement {
    word: string;
    positions: Position[];
    direction: 'horizontal' | 'vertical';
}

interface Puzzle {
    grid: string[];
    words: string[];
}

class PuzzleGenerator {
    private readonly wordList: string[];
    private readonly gridSize: number;
    private readonly grid: string[][];
    private readonly availableLetters: string[];
    private placedWords: WordPlacement[] = [];

    constructor(wordListPath: string, availableLetters: string[], gridSize: number = 8) {
        this.gridSize = gridSize;
        this.availableLetters = availableLetters.map(l => l.toLowerCase());

        this.wordList = this.loadWordList(wordListPath);
        this.grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill('0'));
    }

    private loadWordList(filePath: string): string[] {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.toLowerCase().split('\n')
            .map(word => word.trim())
            .filter(word => word.length >= 3)
            .filter(word => this.canMakeWordFromLetters(word));
    }

    private canMakeWordFromLetters(word: string): boolean {
        const letterCounts = new Map<string, number>();
        for (const letter of this.availableLetters) {
            letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
        }

        for (const char of word) {
            const count = letterCounts.get(char) || 0;
            if (count === 0) {
                return false;
            } else {
                letterCounts.set(char, count - 1);
            }
        }
        return true;
    }

    private canPlaceWord(word: string, startPos: Position, direction: 'horizontal' | 'vertical'): boolean {
        for (let i = 0; i < word.length; i++) {
            const pos = {
                row: direction === 'horizontal' ? startPos.row : startPos.row + i,
                col: direction === 'horizontal' ? startPos.col + i : startPos.col
            };

            // Check bounds
            if (pos.row >= this.gridSize || pos.col >= this.gridSize) return false;

            // Check if cell is empty or has matching letter
            if (this.grid[pos.row][pos.col] !== '0' &&
                this.grid[pos.row][pos.col] !== word[i]) {
                return false;
            }

            // Check adjacent cells (except intersections)
            if (direction === 'horizontal') {
                // Check cells above and below
                if (pos.row > 0 && this.grid[pos.row - 1][pos.col] !== '0') return false;
                if (pos.row < this.gridSize - 1 && this.grid[pos.row + 1][pos.col] !== '0') return false;
            } else {
                // Check cells left and right
                if (pos.col > 0 && this.grid[pos.row][pos.col - 1] !== '0') return false;
                if (pos.col < this.gridSize - 1 && this.grid[pos.row][pos.col + 1] !== '0') return false;
            }

            // positions.push(pos);
        }

        // Check spacing before and after word
        const beforePos = direction === 'horizontal'
            ? { row: startPos.row, col: startPos.col - 1 }
            : { row: startPos.row - 1, col: startPos.col };

        const afterPos = direction === 'horizontal'
            ? { row: startPos.row, col: startPos.col + word.length }
            : { row: startPos.row + word.length, col: startPos.col };

        if (beforePos.col >= 0 && beforePos.row >= 0 && this.grid[beforePos.row][beforePos.col] !== '0') {
            return false;
        }

        return !(this.grid[afterPos.row][afterPos.col] !== '0' && afterPos.row < this.gridSize && afterPos.col < this.gridSize);

    }

    private placeWord(word: string, startPos: Position, direction: 'horizontal' | 'vertical'): void {
        const positions: Position[] = [];
        for (let i = 0; i < word.length; i++) {
            const pos = {
                row: direction === 'horizontal' ? startPos.row : startPos.row + i,
                col: direction === 'horizontal' ? startPos.col + i : startPos.col
            };
            this.grid[pos.row][pos.col] = word[i];
            positions.push(pos);
        }
        this.placedWords.push({ word, positions, direction });
    }

    private findIntersection(word: string): { pos: Position; direction: 'horizontal' | 'vertical' } | null {
        for (const placedWord of this.placedWords) {
            for (let i = 0; i < word.length; i++) {
                for (let j = 0; j < placedWord.positions.length; j++) {
                    const pos = placedWord.positions[j];
                    if (word[i] === this.grid[pos.row][pos.col]) {
                        // Try both directions
                        const directions: Array<'horizontal' | 'vertical'> =
                            [placedWord.direction === 'horizontal' ? 'vertical' : 'horizontal'];

                        for (const direction of directions) {
                            const startPos = {
                                row: direction === 'horizontal' ? pos.row : pos.row - i,
                                col: direction === 'horizontal' ? pos.col - i : pos.col
                            };

                            if (startPos.row >= 0 && startPos.col >= 0 &&
                                startPos.row + (direction === 'vertical' ? word.length - 1 : 0) < this.gridSize &&
                                startPos.col + (direction === 'horizontal' ? word.length - 1 : 0) < this.gridSize) {

                                if (this.canPlaceWord(word, startPos, direction)) {
                                    return { pos: startPos, direction };
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    public generatePuzzle(): Puzzle {
        // Start with a random word in the middle
        const firstWord = this.wordList[Math.floor(Math.random() * this.wordList.length)];
        const startPos = {
            row: Math.floor(this.gridSize / 2),
            col: Math.floor((this.gridSize - firstWord.length) / 2)
        };
        this.placeWord(firstWord, startPos, 'horizontal');

        // Try to place more words
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const word = this.wordList[Math.floor(Math.random() * this.wordList.length)];
            if (this.placedWords.some(w => w.word === word)) continue;

            const intersection = this.findIntersection(word);
            if (intersection) {
                this.placeWord(word, intersection.pos, intersection.direction);
                attempts = 0;  // Reset attempts on successful placement
            }
            attempts++;
        }

        // Format output
        return {
            grid: this.grid.map(row => row.join('')),
            words: this.placedWords.map(w => {
                const coords = w.positions.map(p => `${p.col},${p.row}`).join(',');
                return `${w.word},${coords}`;
            })
        };
    }
}

// Usage example:
const generator = new PuzzleGenerator(
    '../public/words-filtered.txt',
    ['b', 'o', 'r', 'i', 'n']
);

const puzzle = generator.generatePuzzle();
console.log(JSON.stringify(puzzle, null, 2));