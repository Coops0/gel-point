<template>
  <div class="flex flex-col gap-2 justify-center items-center">
    <div
        class="flex flex-row gap-2"
        v-for="(row, rowIndex) in localGrid"
        :key="rowIndex"
    >
      <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
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

watch(() => props.grid, g => {
  if (g.flat().length !== localGrid.value.flat().length) {
    localGrid.value = structuredClone(toRaw(g));
    return;
  }

  for (let i = 0; i < g.length; i++) {
    for (let j = 0; j < g[i].length; j++) {
      if (g[i][j] === localGrid.value[i][j]) {
        continue;
      }

      setTimeout(() => {
        localGrid.value[i][j] = g[i][j];
      }, (i * 50) + (j * 100));
    }
  }
}, { deep: true });

</script>