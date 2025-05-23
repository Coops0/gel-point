<template>
  <div :style="{ gap: `${gapSize}px` }" class="flex flex-col justify-center items-center">
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
            [cell === 0 ? 'ring-3 ring-accent-600 brightness-125' : 'bg-accent-300/25']: buyMode && (selectedCol === colIndex || selectedRow === rowIndex),
            '!duration-150': buyMode,
            '!duration-500': !buyMode,

            'animate-glow': positionInArray([rowIndex, colIndex], currentlyGlowingCells) !== -1,
            'cell-active': cell !== 0,
            'cell-inactive': cell === 0
          }"
          :data-col="colIndex"
          :data-row="rowIndex"
          :style="{ width: `${cellSize}px`, height: `${cellSize}px` }"
          class="flex items-center justify-center font-bold !transition-all cell uppercase"
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
import { centerOfCells, clone, positionInArray } from '@/util';
import { useWindowSize } from '@/composables/window-size.composable.ts';

const { width } = useWindowSize();

const props = defineProps<{
  grid: Grid;
  buyMode: boolean;
}>();

const emit = defineEmits<{
  selected: [row: number, col: number];
}>();

defineExpose({ resetSelection, animateShimmerCells, animateGlowCells, stopAnimations });

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
  // if (s > 6) return 22;
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
    const isArray = Array.isArray(arr.find(el => typeof el !== 'undefined'));

    arr.push(
        ...Array(newLen - arr.length)
            .fill(null)
            .map(() => isArray ? [] : -1) as unknown as T[]
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

  let delay = 50;
  if (updates.length < 4) {
    delay = 75;
  }

  updateTasks = updates
      .map(([row, col, cell]) =>
          setTimeout(() => {
            localGrid.value[row][col] = cell;
            impactFeedback('light');
          }, Math.abs(row - startRow) * delay + Math.abs(col - startCol) * delay)
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

const currentlyShiningCells: Array<[number, number]> = [];

function animateShimmerCells(cells: Array<[number, number]>) {
  if (props.buyMode) return;

  const grid = <[number, number]>[localGrid.value.length, localGrid.value[0].length];

  const centerCell = centerOfCells(cells, grid);

  document.querySelectorAll<HTMLElement>('.cell').forEach((cell) => {
    const [row, col] = [+(cell.dataset.row ?? '0'), +(cell.dataset.col ?? '0')];

    const distanceTime = (Math.abs(row - centerCell[0]) * 50) + (Math.abs(col - centerCell[1]) * 50);

    if (positionInArray([row, col], currentlyShiningCells)) return;

    currentlyShiningCells.push([row, col]);

    setTimeout(() => {
      const isBefore = row < centerCell[0] || (row === centerCell[0] && col < centerCell[1]);

      cell.style.mask = `linear-gradient(-60deg, #000 30%, #0005, #000 70%) ${!isBefore ? 'left' : 'right'}/350% 100%`;
      cell.classList.add(!isBefore ? 'animate-shine-rtl' : 'animate-shine-ltr');

      setTimeout(() => {
        currentlyShiningCells.filter(c => c[0] !== row && c[1] !== col);

        cell.classList.remove('animate-shine-ltr', 'animate-shine-rtl');
        cell.style.mask = '';
      }, 100);
    }, distanceTime);
  });
}

const currentlyGlowingCells = ref<Array<[number, number]>>([]);

function animateGlowCells(cells: Array<[number, number]>) {
  if (props.buyMode) return;

  for (const cell of cells) {
    if (positionInArray(cell, currentlyGlowingCells.value) !== -1) continue;

    requestAnimationFrame(() => currentlyGlowingCells.value.push(cell));
    setTimeout(() => {
      const cellIndex = positionInArray(cell, currentlyGlowingCells.value);
      currentlyGlowingCells.value.splice(cellIndex, 1);
    }, 1210);
  }
}

function stopAnimations() {
  currentlyShiningCells.length = 0;
  currentlyGlowingCells.value.length = 0;
}
</script>

<style scoped>
.animate-shine-ltr {
  animation: animate-shine-ltr 100ms ease-in-out forwards;
}

.animate-shine-rtl {
  animation: animate-shine-rtl 200ms ease-in-out forwards;
}

@keyframes animate-shine-ltr {
  from {
    mask-position: left;
  }
  to {
    mask-position: right;
  }
}

@keyframes animate-shine-rtl {
  from {
    mask-position: right;
  }
  to {
    mask-position: left;
  }
}

.animate-glow {
  animation: glow-pulse 600ms ease-in-out;
  animation-iteration-count: 2;
}

/* noinspection ALL */
@keyframes glow-pulse {
  0% {
    box-shadow: 0 0 0 0 --alpha(var(--theme-secondary-400) / 10%);
    transform: scale(1);
  }
  25% {
    filter: brightness(1.1);
    box-shadow: 0 0 10px 5px --alpha(var(--theme-secondary-400) / 30%);
    transform: scale(1.001);
  }
  100% {
    box-shadow: 0 0 0 0 --alpha(var(--theme-secondary-400) / 10%);
    transform: scale(1);
  }
}
</style>