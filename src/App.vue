<template>
  <div class="flex flex-col gap-8">
    <div v-if="letters.length">
      <PuzzleGrid :grid="activeGrid"/>
      <WordBuilder :letters @test-word="testWord" v-model="showBonusAnimation"/>

      <div class="flex flex-col gap-2 items-center">
        <div class="font-bold">{{ foundBonusWords.length }} extra words found</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, onMounted, type Ref, ref } from 'vue';
import PuzzleGrid from '@/components/PuzzleGrid.vue';
import WordBuilder from '@/components/WordBuilder.vue';

// RULES:
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

let allWordList: string[] = [];
const foundBonusWords = ref<string[]>([]);
const showBonusAnimation = ref(false);

export interface Position {
  x: number;
  y: number;
  letter: string;
}

export type Cell = string | null | undefined;
export type Grid = Cell[][];
export type WordMapping = [string, Array<[number, number]>];

const words: Ref<WordMapping[]> = ref([]);

const staticGrid: Ref<Grid> = ref([]);

const letters: ComputedRef<string[]> = computed(() =>
    [...new Set(staticGrid.value.flat().filter(cell => cell !== undefined) as string[])]
);

const activeGrid = ref<Grid>([]);

function testWord(word: string) {
  const match = words.value.find(([w]) => w === word);
  if (!match) {
    if (allWordList.includes(word) && !foundBonusWords.value.includes(word)) {
      foundBonusWords.value.push(word);
      showBonusAnimation.value = true;
    }
    return;
  }

  for (const [col, row] of match[1]) {
    activeGrid.value[row][col] = staticGrid.value[row][col] as string;
  }

  if (activeGrid.value.every(row => row.every(cell => cell !== null))) {
    alert('WIN');
  }
}

onMounted(() => {
  setTimeout(async () => {
    const words = await fetch('/words-filtered.txt').then(res => res.text());
    allWordList = words.split('\n');
  });

  setTimeout(async () => {
    const rawPuzzle = await fetch('/puzzle.json').then(res => res.json());

    words.value = (<string[]>rawPuzzle.words).map(word => {
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
    });

    staticGrid.value = (<string[]>rawPuzzle.grid).map(row =>
        row.split('').map(cell => cell === '0' ? undefined : cell)
    );

    activeGrid.value = staticGrid.value.map(row =>
        row.map(cell => cell === undefined ? undefined : null)
    );
  });
});
</script>