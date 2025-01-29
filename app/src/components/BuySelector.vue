<template>
  <div
      id="buy-selector-backdrop"
      :class="active ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      class="fixed size-full inset-0 z-50 bg-black/75 transition-all duration-500 flex justify-center"
  />

  <div
      v-if="grid !== null"
      :class="active ? 'opacity-100' : 'opacity-0'"
      class="fixed inset-0 z-[52] transition-all duration-500 pointer-events-none"
  >
    <div class="flex flex-col h-full">
      <h1 class="text-4xl font-bold text-white text-center mt-20">BUY</h1>
      <p :class="!hasSelection && 'opacity-0'"
         class="text-xl text-white text-center mt-4 animate-pulse transition-opacity">
        PRICE: <span :class="canAfford ? 'text-red-300' : 'text-red-500'"
                     class="transition-colors font-bold">{{ affectedCells.length * 2 }}</span>
      </p>
      <div class="flex flex-row items-center justify-center grow gap-4">
        <BuyButton :can-afford="canAfford" :has-selection="hasSelection" @click="buySelection"/>
        <div
            class="px-6 py-3 bg-gray-600 active:bg-gray-700 text-white rounded-lg transition-colors duration-200 !pointer-events-auto"
            @click="cancel"
        >
          CANCEL
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import BuyButton from '@/components/BuyButton.vue';
import type { Cell, Grid } from '@/services/puzzles.service.ts';

const active = defineModel<boolean>({ required: true });

const props = defineProps<{
  grid: Grid | null,
  availableBonusWordPoints: number
}>();

const emit = defineEmits<{
  buy: [Array<[number, number]>]
}>();

function delayedClear() {
  setTimeout(() => {
    currentlySelected.value = [-1, -1];
    affectedCells.value = [];
  }, 500);
}

function cancel() {
  active.value = false;
  delayedClear();
}

const currentlySelected = ref<[number, number]>([-1, -1]);
const affectedCells = ref<Array<[number, number]>>([]);

const hasSelection = computed(() => !!affectedCells.value.length);

const canAfford = computed(() => props.availableBonusWordPoints >= (affectedCells.value.length * 2));

defineExpose({ select, hasSelection: () => hasSelection.value });

function select(row: number, col: number) {
  if (!props.grid) return;

  currentlySelected.value = [row, col];

  const flattenedGrid: Array<[number, number]> = props.grid!
      .flatMap((row, rowIndex) => row.map((cell, colIndex) => <[number, number, Cell]>[rowIndex, colIndex, cell]))
      .filter(([, , cell]) => cell === 0)
      .map(([rowIndex, colIndex]) => [rowIndex, colIndex]);

  if (row !== -1) {
    affectedCells.value = flattenedGrid.filter(([r]) => r === row);
  } else if (col !== -1) {
    affectedCells.value = flattenedGrid.filter(([, c]) => c === col);
  } else {
    affectedCells.value = [];
  }
}

function buySelection() {
  if (canAfford.value) {
    active.value = false;
    emit('buy', affectedCells.value);
    delayedClear();
  }
}
</script>