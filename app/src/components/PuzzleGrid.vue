<template>
  <div class="flex flex-col gap-2 justify-center items-center">
    <div
        v-for="(row, rowIndex) in localGrid"
        :key="rowIndex"
        class="flex flex-row gap-2"
    >
      <div
          v-for="(cell, colIndex) in row"
          :key="`${rowIndex}-${colIndex}`"
          @click="() => handleCellClick(rowIndex, colIndex)"
          class="flex items-center justify-center text-2xl font-medium transition-colors size-12"
          :class="{
            'bg-colors-secondary-400 text-colors-background-50': cell !== 0 && cell !== -1,
            'bg-colors-secondary-200': cell === 0,
            'invisible': cell === -1,
            'ring-2 ring-colors-accent-400': cell !== -1 && buyMode && (selectedCol === colIndex || selectedRow === rowIndex)
          }"
      >
        <span v-if="cell !== 0 && cell !== -1">{{ cell }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw, watch } from 'vue';
import type { Cell, Grid } from '@/composables/puzzle.composable';

const props = defineProps<{
  grid: Grid;
  buyMode: boolean;
}>();

const emit = defineEmits<{
  selected: [row: number, col: number];
}>();

const localGrid = ref<Grid>(structuredClone(toRaw(props.grid)));

const selectedRow = ref(-1);
const selectedCol = ref(-1);

let lastClickedCell: [number, number] = [-1, -1];

watch(() => props.grid, updateGrid, { deep: true });
watch(() => props.buyMode, resetSelection);

let updateTasks: number[] = [];

function updateGrid(newGrid: Grid) {
  if (newGrid.flat().length !== localGrid.value.flat().length) {
    localGrid.value.length = newGrid.length;
    localGrid.value.forEach((row, i) => {
      row.length = newGrid[i].length;
    });
  }

  updateTasks.forEach(id => clearTimeout(id));

  const updates = newGrid
      .flatMap((row, rowIndex) => row.map((cell, cellIndex) => <[number, number, Cell]>[rowIndex, cellIndex, cell]))
      .filter(([row, col, cell]) => localGrid.value[row][col] !== cell);

  if (updates.length === 0) {
    updateTasks = [];
    return;
  }

  const [startRow, startCol] = updates[0];

  updateTasks = updates
      .map(([row, col, cell]) =>
          setTimeout(() => {
            localGrid.value[row][col] = cell;
          }, Math.abs(row - startRow) * 50 + Math.abs(col - startCol) * 100)
      );
}

function resetSelection() {
  selectedRow.value = -1;
  selectedCol.value = -1;
}

const hasEmptyCells = (rowIndex: number, colIndex: number): [boolean, boolean] => ([
  localGrid.value[rowIndex].some(cell => cell === 0),
  localGrid.value.some(row => row[colIndex] === 0)
]);

function handleCellClick(rowIndex: number, colIndex: number) {
  if (!props.buyMode) return;

  const [hasEmptyInRow, hasEmptyInCol] = hasEmptyCells(rowIndex, colIndex);
  const isDoubleClick = lastClickedCell[0] === rowIndex && lastClickedCell[1] === colIndex;

  if (isDoubleClick) {
    // dobule click => try to swap row/col
    if (selectedRow.value === rowIndex && hasEmptyInCol) {
      selectedRow.value = -1;
      selectedCol.value = colIndex;
    } else if (selectedCol.value === colIndex && hasEmptyInRow) {
      selectedCol.value = -1;
      selectedRow.value = rowIndex;
    }
  } else {
    // Single click behavior
    if (rowIndex === 0 && hasEmptyInCol) {
      selectedRow.value = -1;
      selectedCol.value = colIndex;
    } else if (colIndex === 0 && hasEmptyInRow) {
      selectedCol.value = -1;
      selectedRow.value = rowIndex;
    } else if (hasEmptyInRow) {
      selectedCol.value = -1;
      selectedRow.value = rowIndex;
    } else if (hasEmptyInCol) {
      selectedRow.value = -1;
      selectedCol.value = colIndex;
    }
  }

  lastClickedCell = [rowIndex, colIndex];

  if (selectedRow.value !== -1 || selectedCol.value !== -1) {
    emit('selected', selectedRow.value, selectedCol.value);
  }
}
</script>