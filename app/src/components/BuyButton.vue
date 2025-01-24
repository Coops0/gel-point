<template>
  <div
      class="w-32 text-center h-12 bg-blue-600 active:bg-blue-700 text-white rounded-lg transition-colors duration-200 !pointer-events-auto"
  >
    <Transition name="button-slide">
      <span v-if="!hasSelection" class="fixed">SELECT</span>
      <span v-else-if="!canAfford" class="text-red-300 fixed">CANNOT AFFORD</span>
      <span v-else class="fixed">BUY</span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hasSelection: boolean;
  canAfford: boolean;
}>();
</script>


<style scoped>
.button-slide-enter-active,
.button-slide-leave-active {
  transition: all 0.25s ease-out;
}

.button-slide-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.button-slide-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>