<template>
  <div class="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
    <div
        :class="isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'"
        class="text-6xl font-bold text-white/80 transition-all dur-1k"
    >
      NEXT LEVEL
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const animate = defineModel<boolean>({ required: true });

const isVisible = ref(false);

watch(animate, a => {
  if (a) {
    isVisible.value = true;
    setTimeout(() => {
      isVisible.value = false;
    }, 3000);
  }
}, { immediate: true });
</script>

<style scoped>
.dur-1k {
  transition-duration: 1000ms;
}
</style>