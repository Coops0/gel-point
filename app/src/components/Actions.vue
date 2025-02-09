<template>
  <div class="flex flex-col gap-2">
    <div class="text-primary-800 opacity-50 h-8 w-12 text-center relative">
      <div class="absolute inset-0 overflow-hidden" @click="() => cheatCodeButtonInput(0)">
        <Transition :duration="transitionSpeed" :name="shouldIncrement ? 'slide-down' : 'slide-up'"
                    @leave="() => updateLocalCounterSingle()">
          <span :key="localBonusPoints" :style="{ transitionDuration: `${transitionSpeed / 2}ms` }"
                class="absolute inset-0 transition-all ease-in-out font-shippori">
            {{ localBonusPoints }}
          </span>
        </Transition>
      </div>
    </div>

    <GhostButton class="rounded-md" variant="accent" @click="() => clickShuffle()">
      <div :class="isSpinningShuffle ? 'spin-button' : ''" class="grayscale">♻️</div>
    </GhostButton>
    <GhostButton class="rounded-md" variant="secondary" @click="() => clickBuy()"><span class="grayscale">$</span>
    </GhostButton>
  </div>
</template>

<script lang="ts" setup>
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
  buy: [],
  'active-cheat-code': []
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

const isSpinningShuffle = ref(false);

function clickShuffle() {
  if (cheatCodeButtonInput(1)) return;

  emit('shuffle');
  impactFeedback('light');

  if (isSpinningShuffle.value) return;

  isSpinningShuffle.value = true;
  setTimeout(() => {
    isSpinningShuffle.value = false;
  }, 820);
}

function clickBuy() {
  if (!cheatCodeButtonInput(2)) {
    emit('buy');
    impactFeedback('light');
  }
}

const CHEAT_CODE_SEQUENCE = [0, 1, 1, 0, 2];
let cheatCodeSequence = <number[]>[];

let lastInput = 0;

function cheatCodeButtonInput(index: number): boolean {
  if (lastInput !== 0 && Date.now() - lastInput > 1000) {
    cheatCodeSequence = [];
    lastInput = 0;
    return false;
  }

  cheatCodeSequence.push(index);

  if (cheatCodeSequence.length < CHEAT_CODE_SEQUENCE.length) {
    return false;
  }

  let match = true;
  for (let i = 1; i <= CHEAT_CODE_SEQUENCE.length; i++) {
    if (cheatCodeSequence[cheatCodeSequence.length - i] !== CHEAT_CODE_SEQUENCE[CHEAT_CODE_SEQUENCE.length - i]) {
      match = false;
      break;
    }
  }

  if (match) {
    cheatCodeSequence = [];
    lastInput = 0;
    emit('active-cheat-code');
    return true;
  }

  return false;
}
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

.spin-button {
  animation: spinOnce 800ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  -webkit-animation: spinOnce 800ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes spinOnce {
  0% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  90% {
    -webkit-transform: rotate(365deg);
    transform: rotate(365deg);
  }
  99% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
</style>