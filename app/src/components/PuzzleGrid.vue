<template>
  <div class="flex flex-col gap-2 justify-center items-center">
    <div
        class="flex flex-row gap-2"
        v-for="(row, rowIndex) in localGrid"
        :key="rowIndex.toString() + row.length"
        :class="buyMode && selected[0] === rowIndex ? 'bg-colors-secondary-100' : ''"
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
            'bg-colors-secondary-100': cell !== -1 && buyMode && selected[1] === colIndex,
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

const emit = defineEmits<{
  selected: [row: number, col: number];
}>();

const localGrid = ref(structuredClone(toRaw(props.grid)));

const selected = ref<[number, number]>([-1, -1]);

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

watch(() => props.buyMode, () => {
  selected.value = [-1, -1];
});

const clickCell = (rowIndex: number, colIndex: number) => {
  const s = [...selected.value];
  selected.value = [-1, -1];

  if (!props.buyMode) return;

  if (rowIndex === 0 && validateColForSelection(colIndex)) {
    // if tap on one of the top rows, then select the column
    selected.value = [-1, colIndex];
  } else if (colIndex === 0 && validateRowForSelection(rowIndex)) {
    // if tap on one of the leftmost columns, then select the row
    selected.value = [rowIndex, -1];
  } else {
    const shouldSelectByCol = s[0] === -1 && s[1] === colIndex;

    let tempSelect: [number, number] = [-1, -1];
    // now get root row/col
    if (shouldSelectByCol) {
      tempSelect = findRootCol(colIndex);
      if (!validateColForSelection(colIndex)) {
        tempSelect = [-1, -1];
      }
    } else {
      tempSelect = findRootRow(rowIndex);
      if (!validateRowForSelection(rowIndex)) {
        tempSelect = [-1, -1];
      }
    }

    // try opposite
    if (tempSelect[0] === -1 && tempSelect[1] === -1) {
      tempSelect = shouldSelectByCol ? findRootRow(rowIndex) : findRootCol(colIndex);
    }

    selected.value = tempSelect;
  }

  if (selected.value[0] !== -1 || selected.value[1] !== -1) {
    emit('selected', ...selected.value);
  }
};

const findRootRow = (rowIndex: number): [number, number] => [localGrid.value[rowIndex].findIndex(cell => cell === 0), -1];
const findRootCol = (colIndex: number): [number, number] => [-1, localGrid.value.findIndex(row => row[colIndex] === 0)];

// col/row must have at least 1 valid unfilled cell
const validateRowForSelection = (rowIndex: number) => localGrid.value[rowIndex].some(cell => cell === 0);
const validateColForSelection = (colIndex: number) => localGrid.value.some(row => row[colIndex] === 0);
</script>