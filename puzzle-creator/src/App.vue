<template>
  <div class="min-h-screen flex flex-col gap-4 p-4">
    <div class="flex flex-col gap-2 justify-center items-center select-none" v-if="puzzle">
      <div
          class="flex flex-row gap-2"
          v-for="(row, rowIndex) in puzzle.grid"
          :key="rowIndex"
      >
        <div
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            class="flex items-center justify-center text-2xl size-16 font-medium transition-colors"
            :class="{
            'bg-gray-400 text-white': cell !== 0,
            'bg-gray-200': cell === 0,
            '!bg-red-500': warningCells.some(([r, c]) => r === rowIndex && c === colIndex)
          }"
        >
          <span v-if="cell !== 0">{{ cell }} </span>
        </div>
      </div>
    </div>

    <div class="mt-auto">
      <textarea @change="onType" class="flex flex-col gap-2 justify-center items-center w-full h-32 ring-2 ring-blue-300"/>
      <div class="flex flex-row ring-4 ring-red-400 gap-2 p-2">
        <p v-for="(warning, i) in warnings" :key="i">
          {{ warning }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

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

const warnings = ref<string[]>([]);
const warningCells = ref<Array<[number, number]>>([]);

const puzzle = ref<Puzzle | null>(null);

function onType(event: Event) {
  warnings.value = [];
  warningCells.value = [];
  puzzle.value = null;

  const text = (event.target as HTMLTextAreaElement).value.trim();
  if (!text.length) {
    warnings.value.push('no input');
    return;
  }

  if (text.split('').some(c => c.toLowerCase() !== c)) {
    warnings.value.push('non lowercase detected');
  }

  try {
    puzzle.value = parsePuzzle(text);
  } catch (err) {
    console.error(err);
    warnings.value.push(`failed to parse puzzle ${err}`);
    return;
  }
}

function extendGridTo(grid: Grid, rowIndex: number, colIndex: number) {
  let colSize = grid[0]?.length ?? 0;

  if (colIndex >= colSize) {
    grid.forEach(row => {
      const columnsToAdd = colIndex + 1 - row.length;
      row.push(...new Array(columnsToAdd).fill(0));
    });

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
  if (parts.length !== 3) {
    warnings.value.push('puzzle parts len is not 3');
  }

  const id = +parts[0];
  const letters = parts[1];
  const wordPlacements = parts[2].split(';');

  const grid: Grid = [];

  const words = wordPlacements.map(wordPlacement => {
    const [word, direction, row, col] = wordPlacement.split(',');

    let r = +row;
    let c = +col;

    if (isNaN(r) || isNaN(c)) {
      warnings.value.push(`got invalid row or col ${row}, ${col}`);
    }

    const positions = word.split('')
        .map(letter => {
          extendGridTo(grid, r, c);

          if (grid[r][c] !== 0 && grid[r][c] !== letter) {
            warnings.value.push(`got invalid overwriting placement for ${letter} at ${r}, ${c} with existing value ${grid[r][c]}`);
            warningCells.value.push([r, c]);
          }

          grid[r][c] = letter;

          const position = <[number, number]>[r, c];

          if (direction === 'v') {
            // move down
            r++;
          } else if (direction === 'h') {
            // move right
            c++;
          } else {
            warnings.value.push(`got invalid direction ${direction}`);

            // ?
            c++;
          }

          return position;
        });

    return { word, positions };
  });

  return { grid, letters: letters.split(''), words, id };
}
</script>


<style>
body, html {
  width: 100%;
  height: 100%;
}
</style>