<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2 justify-center">
      <div
          class="flex flex-row gap-2"
          v-for="(row, rowIndex) in revealed"
          :key="rowIndex"
      >
        <div
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            class="flex items-center justify-center w-12 h-12 text-lg font-medium transition-colors"
            :class="{
            'bg-gray-400 text-white': cell !== null && cell !== undefined,
            'bg-gray-200': cell === null,
            'invisible': cell === undefined
          }"
        >
          {{ cell }}
        </div>
      </div>
    </div>

    <div class="relative flex items-center justify-center h-96">
      <div
          class="absolute top-4 text-2xl font-bold transition-opacity"
          :class="!buildingWord && 'opacity-0'"
      >
        {{ buildingWord }}
      </div>

      <div
          v-for="{ x, y, letter } in alignedLetters"
          :key="letter"
          :style="{ transform: `translate(${x}px, ${y}px)` }"
          class="absolute flex items-center justify-center w-12 h-12 text-lg font-bold
               transition-colors duration-200 rounded-full select-none cursor-pointer"
          :class="[
          'bg-indigo-400 text-white hover:bg-indigo-500',
          buildingWord?.includes(letter) && '!bg-indigo-600'
        ]"
          @pointerdown="startTouch(letter)"
          @pointerenter="hover(letter)"
          @touchstart.prevent="startTouch(letter)"
      >
        {{ letter }}
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="font-bold">{{ foundInvalidWords.length }} extra words found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

let allWordList: string[] | null = null;
const foundInvalidWords = ref<string[]>([]);

interface Position {
  x: number;
  y: number;
  letter: string;
}

type Cell = string | null | undefined;
type Grid = Cell[][];
type WordMapping = [string, Array<[number, number]>];

const CIRCLE_RADIUS = 120;

// const PUZZLE: Grid = [
//   [undefined, undefined, undefined, undefined, 'a'],
//   [undefined, undefined, 's', 'e', 't'],
//   [undefined, undefined, 'e', undefined, 'e'],
//   [undefined, undefined, 'a', undefined, undefined],
//   [undefined, 'e', 't', 'a', undefined],
// ];

const PUZZLE: Grid = [
  '0000a',
  '00set',
  '00ea0',
  '00a00',
  '0eta0'
].map(row =>
    row.split('').map(cell => cell === '0' ? undefined : cell)
);

// const LETTERS = ['a', 't', 'e', 's'] as const;
const LETTERS: string[] = [
  ...new Set(PUZZLE.flat().filter(cell => cell !== undefined) as string[])
];

// const WORDS: WordMapping[] = [
//   ['ate', [[4, 0], [4, 1], [4, 2]]],
//   ['eta', [[1, 4], [2, 4], [3, 4]]],
//   ['set', [[2, 1], [3, 1], [4, 1]]],
//   ['seat', [[2, 1], [2, 2], [2, 3], [2, 4]]]
// ];
//

const WORDS: WordMapping[] = [
  'ate,4,0,4,1,4,2',
  'eta,1,4,2,4,3,4',
  'set,2,1,3,1,4,1',
  'seat,2,1,2,2,2,3,2,4'
].map(word => {
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

// RULES:
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

const revealed = ref<Grid>(
    PUZZLE.map(row =>
        row.map(cell => cell === undefined ? undefined : null)
    )
);

const buildingWord = ref<string>('');

const alignedLetters = computed<Position[]>(() =>
    LETTERS.map((letter, i) => {
      const step = (i / LETTERS.length);

      const angle = step * Math.PI * 2 - (Math.PI / 2);
      return {
        x: Math.cos(angle) * CIRCLE_RADIUS,
        y: Math.sin(angle) * CIRCLE_RADIUS,
        letter
      };
    })
);

function startTouch(letter: string) {
  buildingWord.value = letter;
}

function hover(letter: string) {
  if (buildingWord.value && !buildingWord.value.includes(letter)) {
    buildingWord.value += letter;
  }
}

function endTouch() {
  const word = buildingWord.value;
  buildingWord.value = '';

  if (!word || word.length < 3) {
    return;
  }

  const match = WORDS.find(([w]) => w === word);
  if (!match) {
    if (allWordList?.includes(word) && !foundInvalidWords.value.includes(word)) {
      foundInvalidWords.value.push(word);
      alert('BONUS WORD');
    }
    return;
  }

  for (const [col, row] of match[1]) {
    revealed.value[row][col] = PUZZLE[row][col] as string;
  }

  if (revealed.value.every(row => row.every(cell => cell !== null))) {
    alert('WIN');
  }
}

onMounted(() => {
  document.addEventListener('pointerup', endTouch, { passive: true });
  document.addEventListener('touchend', endTouch, { passive: true });

  setTimeout(async () => {
    const words = await fetch('/words-filtered.txt').then(res => res.text());
    allWordList = words.split('\n');
    console.log(`loaded ${allWordList.length} words`);
  });
});

onUnmounted(() => {
  document.removeEventListener('pointerup', endTouch);
  document.removeEventListener('touchend', endTouch);
});
</script>