import type { ComputedRef, Ref } from 'vue';
import { computed, readonly, ref, watch } from 'vue';
import { useWords } from '@/composables/words.composable.ts';
import { useLocalStorage } from '@/composables/local-storage.composable.ts';

export type Cell = string | 0 | -1;
export type Grid = Cell[][];
export type WordMapping = [string, Array<[number, number]>];

export enum WordTestResult {
    NotFound,
    Found,
    Bonus,
    Win
}

interface StaticPuzzle {
    words: string[];
    grid: string[];
}

const cachedPuzzles = ref<StaticPuzzle[]>([]);

async function fetchPuzzle(index: number): Promise<StaticPuzzle> {
    if (cachedPuzzles.value.length < index + 1) {
        // TODO this needs to be tauri command
        cachedPuzzles.value = await fetch('/puzzles.json')
            .then(res => res.json());
    }

    return cachedPuzzles.value[index];
}

export const usePuzzle = (puzzleIndex: Ref<number>) => {
    const puzzle = ref<StaticPuzzle | null>(null);

    const allWords = useWords();

    const staticGrid = ref<Grid>([]);
    const activeGrid = useLocalStorage<Grid>('active-grid', []);

    const foundBonusWords = useLocalStorage<string[]>('bonus-words', []);

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

    const testWord = (word: string): WordTestResult => {
        const match = words.value.find(([w]) => w === word);
        if (!match) {
            if (!allWords.value.includes(word) || foundBonusWords.value.includes(word)) {
                return WordTestResult.NotFound;
            }

            foundBonusWords.value = [...foundBonusWords.value, word];
            return WordTestResult.Bonus;
        }

        const newGrid = [...activeGrid.value];

        for (const [col, row] of match[1]) {
            newGrid[row][col] = staticGrid.value[row][col] as string;
        }

        activeGrid.value = newGrid;

        if (activeGrid.value.every(row => row.every(cell => cell !== 0))) {
            return WordTestResult.Win;
        } else {
            return WordTestResult.Found;
        }
    };

    watch(puzzleIndex, async pi => {
        puzzle.value = await fetchPuzzle(pi);

        if (!puzzle.value) {
            if (pi + 1 <= cachedPuzzles.value.length) {
                console.warn(`puzzle ${pi} was not found`);
            }
            return;
        }

        const hasCachedPuzzle = staticGrid.value.length === 0 && activeGrid.value.length > 0;

        staticGrid.value = (<string[]>puzzle.value.grid).map(row =>
            row.split('').map(cell => cell === '0' ? -1 : cell)
        );

        if (!hasCachedPuzzle) {
            activeGrid.value = staticGrid.value.map(row =>
                row.map(cell => cell === -1 ? -1 : 0)
            );
        }
    }, { immediate: true });

    const isLoaded = computed(() => puzzle.value !== null && activeGrid.value.length);

    return {
        grid: activeGrid,
        letters,
        foundBonusWords: readonly(foundBonusWords),
        testWord,
        isLoaded,
        totalPuzzles: computed(() => cachedPuzzles.value.length),
    };
};