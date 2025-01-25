import type { ComputedRef, Ref } from 'vue';
import { computed, readonly, ref, watch } from 'vue';
import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import type { StaticPuzzle } from '@/util/game-data.util.ts';

export type Cell = string | 0 | -1;
export type Grid = Cell[][];
export type WordMapping = [string, Array<[number, number]>];

export enum WordTestResult {
    NotFound,
    Found,
    Bonus,
    Win
}


export const usePuzzle = (puzzleIndex: Ref<number>, allWords: Ref<string[]>, puzzles: Ref<StaticPuzzle[]>) => {
    const puzzle = ref<StaticPuzzle | null>(null);

    const staticGrid = ref<Grid>([]);
    const activeGrid = useLocalStorage<Grid>('active-grid', []);

    const foundBonusWords = useLocalStorage<string[]>('bonus-words', [], w => w.join(','), s => s.split(','));
    const availableBonusWordPoints = useLocalStorage('available-bonus-word-points', 0);

    const words: ComputedRef<Array<WordMapping>> = computed(() =>
        (<string[]>puzzle.value?.words ?? []).map(word => {
            const [w, ...coords] = word.split(',');

            const pairs = [];
            let pair = null;

            for (const p of coords) {
                if (pair === null) {
                    pair = p;
                } else {
                    pairs.push(<[number, number]>[+pair, +p]);
                    pair = null;
                }
            }

            return [w, pairs];
        }));

    const letters: ComputedRef<string[]> = computed(() =>
        [...new Set(staticGrid.value.flat().filter(cell => cell !== -1 && cell !== 0) as string[])]
    );

    const hasWon = () => activeGrid.value.every(row => row.every(cell => cell !== 0));

    const testWord = (word: string): WordTestResult => {
        const match = words.value.find(([w]) => w === word);
        if (!match) {
            if (!allWords.value.includes(word) || foundBonusWords.value.includes(word)) {
                return WordTestResult.NotFound;
            }

            availableBonusWordPoints.value++;
            foundBonusWords.value = [...foundBonusWords.value, word];
            return WordTestResult.Bonus;
        }

        const newGrid = [...activeGrid.value];

        for (const [col, row] of match[1]) {
            newGrid[row][col] = staticGrid.value[row][col] as string;
        }

        activeGrid.value = newGrid;

        return hasWon() ? WordTestResult.Win : WordTestResult.Found;
    };

    watch(puzzleIndex, async pi => {
        puzzle.value = puzzles.value.length > pi ? puzzles.value[pi] : null;

        if (!puzzle.value) {
            console.warn(`puzzle ${pi} was not found`);
            return;
        }

        const hasStartedPuzzle = staticGrid.value.length === 0 && activeGrid.value.length > 0;

        staticGrid.value = (<string[]>puzzle.value.grid).map(row =>
            row.split('').map(cell => cell === '0' ? -1 : cell)
        );

        if (!hasStartedPuzzle) {
            activeGrid.value = staticGrid.value.map(row =>
                row.map(cell => cell === -1 ? -1 : 0)
            );
        }
    }, { immediate: true });

    /// @returns If sale resulted in a game win
    const buyCells = (cells: Array<[number, number]>): boolean => {
        const newGrid = [...activeGrid.value];

        for (const [row, col] of cells) {
            newGrid[row][col] = staticGrid.value[row][col] as string;
        }

        availableBonusWordPoints.value -= cells.length * 2;
        activeGrid.value = newGrid;

        return hasWon();
    };

    const isLoaded = computed(() => puzzle.value !== null && !!activeGrid.value.length);

    return {
        grid: activeGrid,
        buyCells,
        letters,
        availableBonusWordPoints: readonly(availableBonusWordPoints),
        testWord,
        isLoaded,
    };
};