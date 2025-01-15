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
          class="flex items-center justify-center w-16 h-16 text-lg font-medium transition-colors"
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
import type { Grid } from '@/App.vue';

defineProps<{ grid: Grid; }>();
</script>