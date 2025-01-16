<template>
  <div class="flex flex-col gap-2 justify-center items-center">
    <div
        class="flex flex-row gap-2"
        v-for="(row, rowIndex) in grid"
        :key="rowIndex"
    >
      <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="flex items-center justify-center text-2xl font-medium transition-colors"
          :style="{ width: `${size}px`, height: `${size}px` }"
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
</template>

<script setup lang="ts">
import type { Grid } from '@/composables/puzzle.composable.ts';
import { ref } from 'vue';

defineProps<{ grid: Grid }>();

const size = ref(64);
</script>