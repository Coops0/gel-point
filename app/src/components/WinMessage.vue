<template>
  <div class="fixed inset-0 flex items-center justify-center pointer-events-none">
    <Transition
        class="transition-all duration-1000"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
    >
      <div
          v-if="isVisible"
          class="text-5xl font-bold text-white/80 font-shippori"
      >
        {{ message }}
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

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

defineExpose({ showMessage, hideMessage });

const message = ref('NEXT LEVEL');
const isVisible = ref(false);

let hideTask = -1;

function showMessage() {
  if (hideTask !== -1) return;

  message.value = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  isVisible.value = true;

  hideTask = setTimeout(() => {
    isVisible.value = false;
    hideTask = -1;
  }, 3000);
}

function hideMessage() {
  if (hideTask !== -1) {
    clearTimeout(hideTask);
    hideTask = -1;
  }

  isVisible.value = false;
}
</script>