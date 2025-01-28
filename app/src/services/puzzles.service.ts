import { invoke } from '@tauri-apps/api/core';

export type Cell = string | 0 | -1;
export type Grid = Cell[][];

export interface WordMapping {
    word: string;
    positions: Array<[number, number]>;
}

export interface Puzzle {
    grid: Grid;
    letters: string[];
    words: WordMapping[];
    id: number;
}

export type LoadLevelResult =
    { name: 'correct_index', index: number } |
    { name: 'finished_all_levels' } |
    { name: 'success', puzzle: Puzzle, lastPuzzle?: boolean };

export class PuzzleService {
    // try to have in buffer current puzzle & next
    private puzzlesBuffer: Puzzle[] = [];

    private async fetchPuzzles(levelId: number) {
        const rawPuzzles = await invoke<FetchPuzzlesBufferedResponse>('load_puzzle_buffered', { id: levelId });
        const puzzle = rawPuzzles.puzzle ? parsePuzzle(rawPuzzles.puzzle) : null;
        const nextPuzzle = rawPuzzles.next_puzzle ? parsePuzzle(rawPuzzles.next_puzzle) : null;

        return { puzzle, nextPuzzle };
    }

    async loadPuzzle(levelId: number): Promise<LoadLevelResult> {
        const cachedPuzzle = this.puzzlesBuffer.find(p => p.id === levelId);
        if (cachedPuzzle) {
            this.puzzlesBuffer = this.puzzlesBuffer.filter(p => p.id >= levelId);
            return { name: 'success', puzzle: cachedPuzzle };
        }

        const { puzzle, nextPuzzle } = await this.fetchPuzzles(levelId);
        if (puzzle !== null && puzzle.id !== levelId) {
            this.puzzlesBuffer = [puzzle];

            if (nextPuzzle) {
                this.puzzlesBuffer.push(nextPuzzle);
            }

            return { name: 'correct_index', index: puzzle.id };
        }

        if (puzzle === null && nextPuzzle === null) {
            return { name: 'finished_all_levels' };
        }

        if (puzzle === null) {
            throw new Error(`puzzle ${levelId} not found`);
        }

        this.puzzlesBuffer.push(puzzle);
        if (nextPuzzle) this.puzzlesBuffer.push(nextPuzzle);

        return { name: 'success', puzzle: puzzle, lastPuzzle: !nextPuzzle };
    }

    async loadNextPuzzle(currentLevelId: number): Promise<boolean> {
        const { puzzle, nextPuzzle } = await this.fetchPuzzles(currentLevelId + 1);

        if (puzzle) {
            this.puzzlesBuffer.push(puzzle);
        }

        if (nextPuzzle) {
            this.puzzlesBuffer.push(nextPuzzle);
            return true;
        }

        return false;
    }
}

interface FetchPuzzlesBufferedResponse {
    puzzle: string | null;
    next_puzzle: string | null;
}

function extendGridTo(grid: Grid, rowIndex: number, colIndex: number) {
    let colSize = grid[0]?.length ?? 0;

    if (colIndex >= colSize) {
        for (const row of grid) {
            const columnsToAdd = colIndex + 1 - row.length;
            row.push(...new Array(columnsToAdd).fill(0));
        }

        colSize = colIndex + 1;
    }

    if (rowIndex >= grid.length) {
        const rowsToAdd = rowIndex + 1 - grid.length;
        const additionalRows = new Array(rowsToAdd)
            .fill(null)
            .map(() => new Array(colSize).fill(0));

        grid.push(...additionalRows);
    }
}

function parsePuzzle(puzzle: string): Puzzle {
    const parts = puzzle.split('|');
    const id = +parts[0];
    const letters = parts[1];
    const wordPlacements = parts[2].split(';');

    const grid: Grid = [];

    const words = wordPlacements.map(wordPlacement => {
        const [word, direction, row, col] = wordPlacement.split(',');

        let r = +row;
        let c = +col;

        const positions = word.split('')
            .map(letter => {
                extendGridTo(grid, r, c);
                grid[r][c] = letter;

                const position = <[number, number]>[r, c];

                if (direction === 'v') {
                    // move down
                    r++;
                } else {
                    // move right
                    c++;
                }

                return position;
            });

        return { word, positions };
    });

    return { grid, letters: letters.split(''), words, id };
}