<template>
  <div
      class="fixed size-full inset-0 z-50 bg-black/75 transition-all duration-500 flex justify-center"
      :class="active ? 'opacity-100' : 'opacity-0 pointer-events-none'"
  />

  <div
      class="fixed inset-0 z-[52] transition-all duration-500 pointer-events-none"
      :class="active ? 'opacity-100' : 'opacity-0'"
  >
    <div class="flex flex-col h-full">
      <h1 class="text-4xl font-bold text-white text-center mt-20">BUY</h1>
      <p v-if="affectedCells.length" class="text-xl text-white text-center mt-4">
        PRICE: ${{ affectedCells.length * 2 }}
      </p>
      <div class="flex flex-col items-center justify-center flex-grow gap-6">
        <BuyButton :can-afford="canAfford" :has-selection="!!affectedCells.length"/>
        <div
            @click="cancel"
            class="px-6 py-3 mt-36 bg-gray-600 active:bg-gray-700 text-white rounded-lg transition-colors duration-200 !pointer-events-auto"
        >
          CANCEL
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Cell, Grid } from '@/composables/puzzle.composable.ts';
import { computed, ref } from 'vue';
import BuyButton from '@/components/BuyButton.vue';

const active = defineModel<boolean>({ required: true });

const props = defineProps<{
  grid: Grid,
  availableBonusWordPoints: number
}>();

const emit = defineEmits<{
  buy: [Array<[number, number]>]
}>();

defineExpose({ buyModeSelect });

const cancel = () => {
  active.value = false;
  setTimeout(() => {
    currentlySelected.value = [-1, -1];
    affectedCells.value = [];
  }, 500);
};

const currentlySelected = ref<[number, number]>([-1, -1]);
const affectedCells = ref<Array<[number, number]>>([]);

const canAfford = computed(() => props.availableBonusWordPoints >= (affectedCells.value.length * 2));

function buyModeSelect(row: number, col: number) {
  currentlySelected.value = [row, col];

  const flattenedGrid: Array<[number, number]> = props.grid
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

const buySelection = () => {
  if (canAfford.value) {
    active.value = false;
    emit('buy', affectedCells.value);
  }
};

</script>