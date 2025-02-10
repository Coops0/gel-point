<template>
  <div>
    <FadeTransition :duration="500">
      <div
          v-if="active"
          id="buy-selector-backdrop"
          class="fixed size-full inset-0 z-10 bg-black/75 transition-all duration-500 flex justify-center"
      />
    </FadeTransition>

    <FadeTransition :duration="500">
      <div
          v-if="grid !== null && active"
          class="fixed inset-0 z-12 pointer-events-none items-center justify-center flex"
      >
        <p
            :class="hasSelection ? 'animate-pulse' : 'opacity-0'"
            class="text-xl text-white text-center transition-opacity fixed top-7/10 font-shippori">
          PRICE: <span
            :class="canAfford ? 'text-red-300' : 'text-red-500'"
            class="transition-colors font-bold">{{ affectedCells.length * 2 }}</span>
        </p>

        <div class="flex flex-row gap-4 items-center justify-center fixed top-4/5">
          <BuyButton :can-afford="canAfford" :has-selection="hasSelection" @click="buySelection"/>
          <div
              class="px-6 py-3 bg-gray-600 active:bg-gray-700 text-white rounded-lg transition-colors duration-200 !pointer-events-auto font-shippori"
              @click="cancel"
          >
            CANCEL
          </div>
        </div>
      </div>
    </FadeTransition>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import BuyButton from '@/components/BuyButton.vue';
import type { Cell, Grid } from '@/services/puzzles.service.ts';
import FadeTransition from '@/components/FadeTransition.vue';
import { impactFeedback, notificationFeedback } from '@tauri-apps/plugin-haptics';

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
  impactFeedback('light');
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
  } else {
    notificationFeedback('warning');
  }
}
</script>