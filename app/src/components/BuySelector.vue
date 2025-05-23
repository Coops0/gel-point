<template>
  <div>
    <FadeTransition :duration="500">
      <div
          v-if="active"
          id="buy-selector-backdrop"
          class="fixed size-full inset-0 z-20 bg-black/75 !transition-all !duration-500 flex justify-center"
      />
    </FadeTransition>

    <FadeTransition :duration="500">
      <div
          v-if="grid !== null && active"
          class="fixed inset-0 z-22 pointer-events-none items-center justify-center flex"
      >
        <p
            :class="hasSelection ? 'animate-pulse' : 'opacity-0'"
            class="text-xl text-white text-center !transition-opacity fixed top-7/10 font-alt">
          PRICE: <span
            :class="canAfford ? 'text-red-300' : 'text-red-500'"
            class="!transition-colors font-bold">{{ affectedCells.length * 2 }}</span>
        </p>

        <div class="flex flex-row gap-4 items-center justify-center fixed top-4/5">
          <BuyButton :can-afford="canAfford" :has-selection="hasSelection" @click="buySelection"/>
          <button
              class="px-6 py-3 bg-gray-600 active:bg-gray-700 text-white rounded-lg !transition-colors !duration-200 !pointer-events-auto font-alt"
              @click="cancel"
          >
            CANCEL
          </button>
        </div>

        <div
            class="flex flex-col gap-2 text-center items-center justify-center fixed top-9/10 text-white/50 font-alt">
          <p>select a row or column by clicking on it, or double clicking to switch axis</p>
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
import { impactFeedback } from '@tauri-apps/plugin-haptics';

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
    return;
  }

  if (affectedCells.value.length !== 0) {
    impactFeedback('medium');
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