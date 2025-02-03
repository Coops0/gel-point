<template>
  <div class="flex flex-col justify-center items-center" :style="{ gap: `${gapSize}px` }">
    <div
        v-for="(row, rowIndex) in localGrid"
        :key="`${rowIndex}-${row.length}`"
        :style="{ gap: `${gapSize}px` }"
        class="flex flex-row"
    >
      <div
          v-for="(cell, colIndex) in row"
          :key="`${rowIndex}-${colIndex}-${cell}`"
          :class="{
            'bg-secondary-400 text-background-50': cell !== 0 && cell !== -1,
            'bg-secondary-200': cell === 0,
            [cell === 0 ? 'ring-2 ring-accent-600' : 'ring-2 ring-accent-300']: buyMode && (selectedCol === colIndex || selectedRow === rowIndex)
          }"
          :style="{ width: `${cellSize}px`, height: `${cellSize}px` }"
          class="flex items-center justify-center font-medium transition-all duration-200"
          @click="() => handleCellClick(rowIndex, colIndex)"
      >
        <span v-if="cell !== 0 && cell !== -1" :style="{ fontSize: `${textSize}px` }">{{ cell }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRaw, watch } from 'vue';
import { impactFeedback } from '@tauri-apps/plugin-haptics';
import type { Cell, Grid } from '@/services/puzzles.service.ts';
import { clone } from '@/util';
import { useWindowSize } from '@/composables/reactive-sizes.composable.ts';

const { width } = useWindowSize();

const props = defineProps<{
  grid: Grid;
  buyMode: boolean;
}>();

const emit = defineEmits<{
  selected: [row: number, col: number];
}>();

defineExpose({ resetSelection });

const localGrid = ref<Grid>(clone(toRaw(props.grid)));

const colSize = computed(() => props.grid[0]?.length ?? 0);

const gapSize = computed(() => {
  const s = colSize.value;
  if (s > 10) return 4;
  if (s > 8) return 8;
  if (s > 6) return 10;
  return 12;
});

const cellSize = computed(() => {
  const c = colSize.value;
  const g = gapSize.value;

  for (let i = 24; i < 48; i++) {
    if (width.value < c * (i + g)) {
      return i - 1;
    }
  }

  return 48;
});

const textSize = computed(() => {
  const s = colSize.value;
  // 18-24px

  if (s > 10) return 16;
  if (s > 8) return 18;
  if (s > 6) return 20;
  return 22;
});

const selectedRow = ref(-1);
const selectedCol = ref(-1);

let lastClickedCell: [number, number] = [-1, -1];

watch(() => props.grid, updateGrid, { deep: true });
watch(() => props.buyMode, resetSelection);

let updateTasks: number[] = [];

const updateArrayLen = <T>(arr: T[], newLen: number) => {
  if (arr.length < newLen) {
    let isArray = Array.isArray(arr.find(el => typeof el !== 'undefined'));

    arr.push(
        ...Array(newLen - arr.length)
            .fill(null)
            .map(() => isArray ? [] : -1) as any
    );
  } else if (arr.length > newLen) {
    arr.length = newLen;
  }
};

function updateGrid(newGrid: Grid) {
  updateTasks.forEach(id => clearTimeout(id));

  if (
      newGrid.length !== localGrid.value.length ||
      newGrid.some((row, rowIndex) => row.length !== localGrid.value[rowIndex].length)
  ) {
    updateArrayLen(localGrid.value, newGrid.length);
    localGrid.value.forEach((row, rowIndex) => updateArrayLen(row, newGrid[rowIndex].length));
  }

  const updates = newGrid
      .flatMap((row, rowIndex) => row.map((cell, cellIndex) => <[number, number, Cell]>[rowIndex, cellIndex, cell]))
      .filter(([row, col, cell]) =>
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
    // double click => try to swap row/col
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