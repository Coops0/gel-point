<template>
  <div class="flex flex-col gap-2 justify-center items-center">
    <div
        class="flex flex-row gap-2"
        v-for="(row, rowIndex) in localGrid"
        :key="rowIndex.toString() + row.length"
        :class="selectedRow === rowIndex ? 'bg-colors-secondary-100' : ''"
    >
      <div
          v-for="(cell, colIndex) in row"
          @click="() => clickCell(rowIndex, colIndex)"
          :key="rowIndex.toString() + cell + colIndex.toString()"
          class="flex items-center justify-center text-2xl font-medium transition-colors size-12"
          :class="{
            'bg-colors-secondary-400 text-colors-background-50': cell !== 0 && cell !== -1,
            'bg-colors-secondary-200': cell === 0,
            'invisible': cell === -1,
            'bg-colors-secondary-100': selectedCol === colIndex,
          }"
      >
        <span v-if="cell !== 0 && cell !== -1">{{ cell }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Grid } from '@/composables/puzzle.composable.ts';
import { ref, toRaw, watch } from 'vue';

const props = defineProps<{
  grid: Grid;
  buyMode: boolean;
}>();

const localGrid = ref(structuredClone(toRaw(props.grid)));

const selectedRow = ref(-1);
const selectedCol = ref(-1);

let previousTimeouts: number[] = [];

watch(() => props.grid, g => {
  if (g.flat().length !== localGrid.value.flat().length) {
    localGrid.value.length = g.length;
    localGrid.value.forEach((row, i) => {
      row.length = g[i].length;
    });
  }

  previousTimeouts.forEach(id => clearTimeout(id));
  previousTimeouts = [];

  const cellsToUpdate: Array<[number, number]> = [];

  for (let i = 0; i < g.length; i++) {
    for (let j = 0; j < g[i].length; j++) {
      if (g[i][j] !== localGrid.value[i][j]) {
        cellsToUpdate.push(<[number, number]>[i, j]);
      }
    }
  }

  if (!cellsToUpdate.length) return;
  const [startRow, startCol] = cellsToUpdate[0];

  for (const cell of cellsToUpdate) {
    const [row, col] = cell;

    const timeout = setTimeout(() => {
      localGrid.value[row][col] = g[row][col];
    }, Math.abs(row - startRow) * 50 + Math.abs(col - startCol) * 100);

    previousTimeouts.push(timeout);
  }
}, { deep: true });


const clickCell = (rowIndex: number, colIndex: number) => {
  selectedCol.value = -1;
  selectedRow.value = -1;

  if (!props.buyMode) return;


  if (rowIndex === 0) {
    // col/row must have at least 1 valid unfilled cell
    if (localGrid.value.find(row => row[colIndex] === 0)) {
      selectedCol.value = colIndex;
    }
  } else if (colIndex === 0) {
    if (localGrid.value[rowIndex].find(cell => cell === 0)) {
      selectedRow.value = rowIndex;
    }
  }
};
</script>