<template>
  <div
      class="w-32 text-center flex justify-center items-center h-12 text-white rounded-lg transition-all duration-200 !pointer-events-auto font-shippori"
      :class="bgColor"
  >
    <span v-text="text" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  hasSelection: boolean;
  canAfford: boolean;
}>();

const state = computed(() => {
  if (!props.hasSelection) return -2;
  if (!props.canAfford) return -1;
  return 0;
});

const text = computed(() => {
  switch (state.value) {
    case -2: return 'SELECT';
    case -1: return 'CANNOT AFFORD';
    case 0: return 'BUY';
  }
});

const bgColor = computed(() => {
  switch (state.value) {
    case -2: return 'bg-blue-200';
    case -1: return 'bg-blue-200';
    case 0: return 'bg-blue-600 active:bg-blue-700';
  }
});
</script>