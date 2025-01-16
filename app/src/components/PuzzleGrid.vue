<template>
  <div class="flex flex-col gap-2 justify-center items-center">
    <div
        class="flex flex-row gap-2"
        v-for="(row, rowIndex) in localGrid"
        :key="rowIndex.toString() + '' + row.length"
    >
      <div
          v-for="(cell, colIndex) in row"
          :key="rowIndex.toString() + cell + colIndex.toString()"
          class="flex items-center justify-center text-2xl font-medium transition-colors"
          :style="{ width: `${size}px`, height: `${size}px` }"
          :class="{
            'bg-colors-secondary-400 text-colors-background-50': cell !== 0 && cell !== -1,
            'bg-colors-secondary-200': cell === 0,
            'invisible': cell === -1
          }"
      >
        <span v-if="cell !== 0 && cell !== -1">{{ cell }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Grid } from '@/composables/puzzle.composable.ts';
import { computed, ref, toRaw, watch } from 'vue';
import { useReactiveSizes } from '@/composables/reactive-sizes.composable.ts';
import { clamp } from '@/util';

const props = defineProps<{ grid: Grid }>();
const localGrid = ref(structuredClone(toRaw(props.grid)));

const { height, width } = useReactiveSizes();
const size = computed(() => clamp((height.value * width.value) / 10000, 32, 64));

let previousTimeouts: number[] = [];

watch(() => props.grid, g => {
  if (g.flat().length !== localGrid.value.flat().length) {
    // localGrid.value = structuredClone(toRaw(g));
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

</script>