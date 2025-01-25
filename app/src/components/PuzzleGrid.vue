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
            'bg-secondary-400 text-background-50': cell !== 0 && cell !== -1,
            'bg-secondary-200': cell === 0,
            'ring-3 ring-accent-600': cell === 0 && buyMode && (selectedCol === colIndex || selectedRow === rowIndex),
            'ring-3 ring-accent-300': cell !== 0 && buyMode && (selectedCol === colIndex || selectedRow === rowIndex),
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
import { impactFeedback } from '@tauri-apps/plugin-haptics';

const props = defineProps<{
  grid: Grid;
  buyMode: boolean;
}>();

const emit = defineEmits<{
  selected: [row: number, col: number];
}>();

defineExpose({ resetSelection });

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
      .filter(([row, col, cell]) =>
          localGrid.value.length > row &&
          localGrid.value[row].length > col &&
          localGrid.value[row][col] !== cell
      );

  if (updates.length === 0) {
    updateTasks = [];
    return;
  }

  const [startRow, startCol] = updates[0];

  updateTasks = updates
      .map(([row, col, cell]) =>
          setTimeout(() => {
            localGrid.value[row][col] = cell;

            impactFeedback('light');

            // 50(|row - startRow|) + 100(|col - startCol|)
          }, Math.abs(row - startRow) * 50 + Math.abs(col - startCol) * 100)
      );
}

function resetSelection() {
  selectedRow.value = -1;
  selectedCol.value = -1;
  emit('selected', -1, -1);
}

const hasEmptyCells = (rowIndex: number, colIndex: number): [boolean, boolean] => ([
  localGrid.value[rowIndex].some(cell => cell === 0),
  localGrid.value.some(row => row[colIndex] === 0)
]);


function parseSelectedRowAndCol(row: number, col: number, isDoubleClick: boolean, isRowValid: boolean, isColValid: boolean) {
  if (isDoubleClick) {
    // dobule click => try to swap row/col
    if (selectedRow.value === row && isColValid) {
      return [-1, col];
    }

    if (selectedCol.value === col && isRowValid) {
      return [row, -1];
    }

  } else {
    if (row === 0 && isColValid) {
      return [-1, col];
    }

    if (col === 0 && isRowValid) {
      return [row, -1];
    }

    if (isRowValid) {
      return [row, -1];
    }

    if (isColValid) {
      return [-1, col];
    }
  }

  return [-1, -1];
}

function handleCellClick(rowIndex: number, colIndex: number) {
  if (!props.buyMode) return;

  const [hasEmptyInRow, hasEmptyInCol] = hasEmptyCells(rowIndex, colIndex);
  const isDoubleClick = lastClickedCell[0] === rowIndex && lastClickedCell[1] === colIndex;

  let [r, c] = parseSelectedRowAndCol(rowIndex, colIndex, isDoubleClick, hasEmptyInRow, hasEmptyInCol);

  if (r === selectedRow.value && c === selectedCol.value) {
    [r, c] = parseSelectedRowAndCol(rowIndex, colIndex, !isDoubleClick, hasEmptyInRow, hasEmptyInCol);
  }

  selectedRow.value = r;
  selectedCol.value = c;

  lastClickedCell = [rowIndex, colIndex];

  emit('selected', selectedRow.value, selectedCol.value);
}
</script>