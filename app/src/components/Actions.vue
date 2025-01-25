<template>
  <div class="flex flex-col gap-2">
    <div class="text-primary-800 opacity-50 h-8 w-12 text-center relative">
      <div class="absolute inset-0 overflow-hidden">
        <Transition :name="shouldIncrement ? 'slide-down' : 'slide-up'" @leave="() => updateLocalCounterSingle()"
                    :duration="transitionSpeed">
          <span :key="localBonusPoints" class="absolute inset-0 transition-all ease-in-out"
                :style="{ transitionDuration: `${transitionSpeed / 2}ms` }">
            {{ localBonusPoints }}
          </span>
        </Transition>
      </div>
    </div>

    <GhostButton @click="() => emit('shuffle')" variant="accent" class="rounded-md">♻️</GhostButton>
    <GhostButton @click="() => emit('buy')" variant="secondary" class="rounded-md">$</GhostButton>
  </div>
</template>

<script setup lang="ts">
import GhostButton from '@/components/GhostButton.vue';
import { ref, watch } from 'vue';
import { impactFeedback } from '@tauri-apps/plugin-haptics';

const props = defineProps<{
  availableBonusWordPoints: number;
}>();

const localBonusPoints = ref(props.availableBonusWordPoints);
const shouldIncrement = ref(false);
const transitionSpeed = ref(0);

const emit = defineEmits<{
  shuffle: [],
  buy: []
}>();

function updateLocalCounterSingle() {
  if (localBonusPoints.value !== props.availableBonusWordPoints) {
    setTimeout(() => {
      localBonusPoints.value += shouldIncrement.value ? 1 : -1;
      impactFeedback('medium');
    }, transitionSpeed.value / 2);
  }
}

watch(() => props.availableBonusWordPoints, v => {
  const diff = v - localBonusPoints.value;

  // these need to be calculated here and not computed so it doesn't update values during the animation
  shouldIncrement.value = Math.sign(diff) === 1;

  // 20 + 500/(1+e^(0.1x))
  transitionSpeed.value = 20 + (500 / (1 + Math.exp(0.1 * Math.abs(diff))));

  updateLocalCounterSingle();
});
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  width: 100%;
  position: absolute;
}

.slide-up-enter-from, .slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-up-leave-to, .slide-down-enter-from {
  transform: translateY(20px);
  opacity: 0;
}
</style>