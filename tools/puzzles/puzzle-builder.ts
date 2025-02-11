// wordPuzzleGenerator.ts

import * as fs from 'fs';

interface PuzzleConfig {
    minWords: number;        // Minimum words per puzzle
    maxWords: number;        // Maximum words per puzzle
    minWordLength: number;   // Shortest allowed word
    maxWordLength: number;   // Longest allowed word
    maxGridSize: number;     // Grid dimensions (assuming square grid)
    minLetters: number;      // Minimum unique letters in the puzzle
    maxLetters: number;      // Maximum unique letters in the puzzle
}

interface WordPlacement {
    word: string;
    direction: 'h' | 'v';
    row: number;
    col: number;
}

class PuzzleError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PuzzleError';
    }
}

type Cell = string | null;

class Grid {
    private cells: Cell[][];

    constructor(public size: number) {
        // Initialize grid with nulls
        this.cells = Array.from({ length: size }, () => Array(size).fill(null));
    }

    getCell(row: number, col: number): Cell {
        return this.cells[row][col];
    }

    setCell(row: number, col: number, letter: string): void {
        this.cells[row][col] = letter;
    }

    isEmpty(row: number, col: number): boolean {
        return this.cells[row][col] === null;
    }

    // Helper to retrieve all unique letters from the grid.
    getUniqueLetters(): Set<string> {
        const set = new Set<string>();
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const letter = this.getCell(r, c);
                if (letter) set.add(letter);
            }
        }
        return set;
    }

    // Optional helper for debugging: print grid to console.
    print(): void {
        console.log(
            this.cells
                .map(row => row.map(cell => (cell === null ? '.' : cell)).join(' '))
                .join('\n')
        );
    }
}

/**
 * Process a raw word list (separated by new lines)
 * and returns an array of trimmed, non-empty words.
 */
function processWordList(rawWords: string): string[] {
    return rawWords
        .split(/\r?\n/)
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);
}

/**
 * Helper to simulate adding a word to the grid without actually modifying it.
 * It checks if placing the word starting at (startRow, startCol) in the given
 * orientation would keep the unique letter count below or equal to maxUnique.
 *
 * @param grid The grid instance
 * @param word The word to place
 * @param startRow The starting row for placement
 * @param startCol The starting column for placement
 * @param isHorizontal True if word is placed horizontally, false if vertical
 * @param maxUnique Maximum allowed unique letters
 */
function canPlaceWithoutExceedingUnique(
    grid: Grid,
    word: string,
    startRow: number,
    startCol: number,
    isHorizontal: boolean,
    maxUnique: number
): boolean {
    // Create a copy of current unique letters.
    const unique = grid.getUniqueLetters();

    for (let i = 0; i < word.length; i++) {
        const r = isHorizontal ? startRow : startRow + i;
        const c = isHorizontal ? startCol + i : startCol;
        if (grid.getCell(r, c) === null) {
            unique.add(word[i]);
        }
    }
    return unique.size <= maxUnique;
}

/**
 * Attempts to place a word on the grid by intersecting one of its letters
 * with an already placed letter. Before committing the placement, the function
 * checks that adding the word would not exceed the maximum allowed unique letters.
 *
 * Returns a WordPlacement if successful, or null otherwise.
 */
function tryPlacementAt(
    grid: Grid,
    word: string,
    intersectRow: number,
    intersectCol: number,
    letterIndex: number,
    maxUnique: number
): WordPlacement | null {
    // --- Attempt horizontal placement ---
    const startCol = intersectCol - letterIndex;
    if (startCol >= 0 && startCol + word.length <= grid.size) {
        let valid = true;
        // Check each letter position along the row
        for (let i = 0; i < word.length; i++) {
            const col = startCol + i;
            const cell = grid.getCell(intersectRow, col);
            // If there is a letter, it must match the word.
            if (cell !== null && cell !== word[i]) {
                valid = false;
                break;
            }
            // Check above and below (only if the cell is empty) to avoid accidental word creation.
            if (cell === null) {
                if (intersectRow > 0) {
                    const above = grid.getCell(intersectRow - 1, col);
                    if (above !== null) {
                        valid = false;
                        break;
                    }
                }
                if (intersectRow < grid.size - 1) {
                    const below = grid.getCell(intersectRow + 1, col);
                    if (below !== null) {
                        valid = false;
                        break;
                    }
                }
            }
        }
        // Check left and right boundaries for adjacency.
        if (valid) {
            if (startCol - 1 >= 0 && grid.getCell(intersectRow, startCol - 1) !== null) {
                valid = false;
            }
            if (startCol + word.length < grid.size && grid.getCell(intersectRow, startCol + word.length) !== null) {
                valid = false;
            }
        }
        // Check unique letters if placement is valid so far.
        if (valid && !canPlaceWithoutExceedingUnique(grid, word, intersectRow, startCol, true, maxUnique)) {
            valid = false;
        }
        if (valid) {
            // Place the word horizontally.
            for (let i = 0; i < word.length; i++) {
                grid.setCell(intersectRow, startCol + i, word[i]);
            }
            return { word, direction: 'h', row: intersectRow, col: startCol };
        }
    }

    // --- Attempt vertical placement ---
    const startRow = intersectRow - letterIndex;
    if (startRow >= 0 && startRow + word.length <= grid.size) {
        let valid = true;
        // Check each letter position along the column
        for (let i = 0; i < word.length; i++) {
            const row = startRow + i;
            const cell = grid.getCell(row, intersectCol);
            if (cell !== null && cell !== word[i]) {
                valid = false;
                break;
            }
            // Check left and right neighbors if cell is empty.
            if (cell === null) {
                if (intersectCol > 0) {
                    const left = grid.getCell(row, intersectCol - 1);
                    if (left !== null) {
                        valid = false;
                        break;
                    }
                }
                if (intersectCol < grid.size - 1) {
                    const right = grid.getCell(row, intersectCol + 1);
                    if (right !== null) {
                        valid = false;
                        break;
                    }
                }
            }
        }
        // Check above and below boundaries.
        if (valid) {
            if (startRow - 1 >= 0 && grid.getCell(startRow - 1, intersectCol) !== null) {
                valid = false;
            }
            if (startRow + word.length < grid.size && grid.getCell(startRow + word.length, intersectCol) !== null) {
                valid = false;
            }
        }
        // Check unique letters.
        if (valid && !canPlaceWithoutExceedingUnique(grid, word, startRow, intersectCol, false, maxUnique)) {
            valid = false;
        }
        if (valid) {
            // Place the word vertically.
            for (let i = 0; i < word.length; i++) {
                grid.setCell(startRow + i, intersectCol, word[i]);
            }
            return { word, direction: 'v', row: startRow, col: intersectCol };
        }
    }

    return null;
}

/**
 * Place a word on the grid.
 * For the first word, center it horizontally.
 * For subsequent words, try to find a valid intersection with an existing letter.
 * The parameter maxUnique is used to enforce the unique letters constraint.
 */
function placeWord(
    grid: Grid,
    word: string,
    existingPlacements: WordPlacement[],
    maxUnique: number
): WordPlacement | null {
    // If this is the first word, center it horizontally.
    if (existingPlacements.length === 0) {
        const startRow = Math.floor(grid.size / 2);
        const startCol = Math.floor((grid.size - word.length) / 2);
        if (startCol < 0 || startCol + word.length > grid.size) {
            return null;
        }
        // Before placing, check the unique letters constraint.
        if (!canPlaceWithoutExceedingUnique(grid, word, startRow, startCol, true, maxUnique)) {
            return null;
        }
        for (let i = 0; i < word.length; i++) {
            grid.setCell(startRow, startCol + i, word[i]);
        }
        return { word, direction: 'h', row: startRow, col: startCol };
    }

    // For each letter in the word to be placed,
    // try to find a matching letter on the grid and then attempt placement.
    for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
        for (let row = 0; row < grid.size; row++) {
            for (let col = 0; col < grid.size; col++) {
                if (grid.getCell(row, col) === word[letterIndex]) {
                    const placement = tryPlacementAt(grid, word, row, col, letterIndex, maxUnique);
                    if (placement) {
                        return placement;
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Computes the bounding box of all placed letters in the grid.
 * Returns the minimum and maximum row and column that contain a letter.
 */
function computeBoundingBox(grid: Grid): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
    let minRow = grid.size,
        minCol = grid.size,
        maxRow = 0,
        maxCol = 0;
    for (let r = 0; r < grid.size; r++) {
        for (let c = 0; c < grid.size; c++) {
            if (grid.getCell(r, c) !== null) {
                if (r < minRow) minRow = r;
                if (c < minCol) minCol = c;
                if (r > maxRow) maxRow = r;
                if (c > maxCol) maxCol = c;
            }
        }
    }
    return { minRow, maxRow, minCol, maxCol };
}

/**
 * Generate the output string in the format:
 * id|letters|word,direction,row,col;word,direction,row,col;...
 *
 * Note: The placements passed in here should already be cropped.
 */
function generateOutput(id: number, placements: WordPlacement[], grid: Grid): string {
    // Collect all unique letters from the grid.
    const lettersSet = grid.getUniqueLetters();
    const letters = Array.from(lettersSet).sort().join('');

    // Format word placements.
    const placementStrings = placements.map(
        p => `${p.word},${p.direction},${p.row},${p.col}`
    );
    return `${id}|${letters}|${placementStrings.join(';')}`;
}

/**
 * Main generator function.
 * Accepts a raw word list string and puzzle configuration.
 */
function generatePuzzle(rawWords: string, config: PuzzleConfig, puzzleId: number = 1): string {
    // Process and filter words by length.
    let words = processWordList(rawWords).filter(word =>
        word.length >= config.minWordLength && word.length <= config.maxWordLength
    );

    if (words.length === 0) {
        throw new PuzzleError('No words available after filtering by length.');
    }

    // Shuffle the word list to get varied puzzles.
    words = words.sort(() => Math.random() - 0.5);

    const grid = new Grid(config.maxGridSize);
    const placements: WordPlacement[] = [];

    // Try to place the first word.
    const firstWord = words.shift()!;
    const placement = placeWord(grid, firstWord, placements, config.maxLetters);
    if (!placement) {
        throw new PuzzleError(`Unable to place the first word: ${firstWord}`);
    }
    placements.push(placement);

    // Try to place additional words until we reach the maximum words count or run out.
    while (placements.length < config.maxWords && words.length > 0) {
        const word = words.shift()!;
        const newPlacement = placeWord(grid, word, placements, config.maxLetters);
        if (newPlacement) {
            placements.push(newPlacement);
        }
    }

    // Validate that the minimum word count is met.
    if (placements.length < config.minWords) {
        throw new PuzzleError(`Only ${placements.length} words placed, but minimum is ${config.minWords}.`);
    }

    // Final check for unique letters.
    const uniqueLetters = grid.getUniqueLetters();
    if (uniqueLetters.size < config.minLetters || uniqueLetters.size > config.maxLetters) {
        throw new PuzzleError(
            `Unique letters count (${uniqueLetters.size}) not within bounds [${config.minLetters}, ${config.maxLetters}].`
        );
    }

    // --- Crop the grid ---
    // Compute the bounding box of all placed letters.
    const { minRow, minCol } = computeBoundingBox(grid);
    // Adjust each placement so that the smallest row and column become 0.
    const croppedPlacements = placements.map(p => ({
        ...p,
        row: p.row - minRow,
        col: p.col - minCol,
    }));

    // Optionally, for debugging, you can build and print a cropped grid.
    // For brevity, we pass the original grid to generateOutput (unique letters remain unchanged).
    return generateOutput(puzzleId, croppedPlacements, grid);
}

// ----------------------
// Example usage
// ----------------------

// Read words from file (adjust path as needed)
const sampleWords = fs.readFileSync('./progress.manual.txt', 'utf-8');

// Define a configuration.
const config: PuzzleConfig = {
    minWords: 5,
    maxWords: 10,
    minWordLength: 3,
    maxWordLength: 5,
    maxGridSize: 12,  // 12x12 grid
    minLetters: 5,
    maxLetters: 9,
};

// Attempt to generate a puzzle (try up to 500 times until one meets the constraints).
for (let i = 0; i < 500; i++) {
    try {
        const puzzle = generatePuzzle(sampleWords, config, 1);
        console.log('Generated Puzzle:');
        console.log(puzzle);
        break;
    } catch (error) {
        if (error instanceof PuzzleError) {
            console.error('Puzzle Generation Error:', error.message);
        } else {
            console.error('Unexpected Error:', error);
        }
    }
}
