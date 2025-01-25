<template>
  <div
      class="w-32 text-center flex justify-center items-center h-12 bg-blue-600 active:bg-blue-700 text-white rounded-lg transition-colors duration-200 !pointer-events-auto"
  >
    <span v-text="contents[0]" :class="contents[1]" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  hasSelection: boolean;
  canAfford: boolean;
}>();

const contents = computed(() => {
  if (!props.hasSelection) {
    return ['SELECT', ''];
  }

  if (!props.canAfford) {
    return ['CANNOT AFFORD', 'text-red-500'];
  }

  return ['BUY', ''];
});
</script>