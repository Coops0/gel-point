import { computed, readonly, type Ref, ref, toRaw } from 'vue';
import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import type { Grid, Puzzle } from '@/services/puzzles.service.ts';
import { clone } from '@/util';

export enum WordTestResult {
    NotFound,
    Found,
    Bonus,
    BonusTheme,
    Win
}

export const usePuzzleManager = (allWords: Ref<string[]>) => {
    const isInitialLoad = ref(true);
    const puzzle = ref<Puzzle | null>(null);

    const activeGrid = useLocalStorage<Grid | null>('active-grid', null);

    const foundBonusWords = useLocalStorage<Set<string>>(
        'bonus-words',
        new Set(),
        w => [...w].join(','),
        s => new Set([...s.split(',')])
    );

    const availableBonusWordPoints = useLocalStorage('available-bonus-word-points', 0);

    const hasWon = () => activeGrid.value?.every(row => row.every(cell => cell !== 0)) === true;

    const testWord = (word: string): WordTestResult => {
        if (!activeGrid.value || !puzzle.value) return WordTestResult.NotFound;

        const match = puzzle.value.words.find(w => w.word === word);
        if (!match) {
            if (!allWords.value.includes(word) || foundBonusWords.value.has(word)) {
                return WordTestResult.NotFound;
            }

            availableBonusWordPoints.value++;
            foundBonusWords.value.add(word);
            return foundBonusWords.value.size % 30 === 0 ? WordTestResult.BonusTheme : WordTestResult.Bonus;
        }

        const newGrid = [...activeGrid.value];

        for (const [row, col] of match.positions) {
            newGrid[row][col] = puzzle.value.grid[row][col];
        }

        activeGrid.value = newGrid;

        return hasWon() ? WordTestResult.Win : WordTestResult.Found;
    };

    const setPuzzle = (p: Puzzle) => {
        const hasStartedPuzzle = isInitialLoad.value && !!activeGrid.value;
        isInitialLoad.value = false;

        puzzle.value = p;

        if (!hasStartedPuzzle) {
            resetGrid();
        }
    };

    const buyCells = (cells: Array<[number, number]>): boolean => {
        if (!activeGrid.value || !puzzle.value) return false;

        const newGrid = clone(toRaw(activeGrid.value));

        for (const [row, col] of cells) {
            newGrid[row][col] = puzzle.value.grid[row][col];
        }

        availableBonusWordPoints.value -= cells.length * 2;
        activeGrid.value = newGrid;

        return hasWon();
    };

    const resetGrid = () => {
        activeGrid.value = transformToActiveGrid(clone(toRaw(puzzle.value!.grid)));
    }

    const isLoaded = computed(() => puzzle.value !== null && activeGrid.value !== null);

    return {
        grid: activeGrid,
        buyCells,
        availableBonusWordPoints: readonly(availableBonusWordPoints),
        testWord,
        isLoaded,
        setPuzzle
    };
};

function transformToActiveGrid(grid: Grid): Grid {
    return grid.map(row => row.map(cell => cell === 0 ? -1 : 0));
}