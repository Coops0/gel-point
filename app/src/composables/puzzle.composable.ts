import type { ComputedRef, Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import { useWords } from '@/composables/words.composable.ts';

export type Cell = string | null | undefined;
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

let cachedPuzzles: StaticPuzzle[] = [];

async function fetchPuzzle(index: number): Promise<StaticPuzzle> {
    if (cachedPuzzles.length < index + 1) {
        cachedPuzzles = await fetch('/puzzles.json')
            .then(res => res.json());
    }

    return cachedPuzzles[index];
}

export const usePuzzle = (puzzleIndex: Ref<number>) => {
    const puzzle = ref<StaticPuzzle | null>(null);

    const { words: allWords } = useWords();

    const staticGrid = ref<Grid>([]);
    const activeGrid = ref<Grid>([]);

    const foundBonusWords = ref<string[]>([]);

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
        [...new Set(staticGrid.value.flat().filter(cell => cell !== undefined) as string[])]
    );

    const testWord = (word: string): WordTestResult => {
        const match = words.value.find(([w]) => w === word);
        if (!match) {
            if (!allWords.value.includes(word) || foundBonusWords.value.includes(word)) {
                return WordTestResult.NotFound;
            }

            foundBonusWords.value.push(word);
            return WordTestResult.Bonus;
        }

        for (const [col, row] of match[1]) {
            activeGrid.value[row][col] = staticGrid.value[row][col] as string;
        }

        if (activeGrid.value.every(row => row.every(cell => cell !== null))) {
            return WordTestResult.Win;
        } else {
            return WordTestResult.Found;
        }
    };

    watch(puzzleIndex, async pi => {
        puzzle.value = await fetchPuzzle(pi);

        if (!puzzle.value) {
            console.warn(`puzzle ${pi} was not found`);
            return;
        }

        staticGrid.value = (<string[]>puzzle.value.grid).map(row =>
            row.split('').map(cell => cell === '0' ? undefined : cell)
        );

        activeGrid.value = staticGrid.value.map(row =>
            row.map(cell => cell === undefined ? undefined : null)
        );
    }, { immediate: true });

    return {
        grid: activeGrid,
        letters,
        foundBonusWords,
        testWord
    };
};