<template>
  <div class="fixed inset-0 flex items-center justify-center z-[49] pointer-events-none">
    <div
        :class="isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'"
        class="text-6xl font-bold text-white/80 transition-all duration-1000"
    >
      {{ message }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const MESSAGES = [
  'NEXT LEVEL',
  'PASS',
  'NEXT',
  'FORWARD',
  'PROCEED',
  'CONTINUE',
  'ADVANCE',
  'OK'
] as const;

const animate = defineModel<boolean>({ required: true });

const message = ref('NEXT LEVEL');
const isVisible = ref(false);

watch(animate, a => {
  if (a) {
    message.value = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    isVisible.value = true;
    setTimeout(() => {
      isVisible.value = false;
    }, 3000);
  }
}, { immediate: true });
</script>