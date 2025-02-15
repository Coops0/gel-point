<template>
  <div class="flex flex-col gap-2 items-center">
    <div class="text-primary-800 opacity-50 h-8 w-12 text-center relative m-0 p-0">
      <div class="absolute inset-0 overflow-hidden" @click="() => cheatCodeButtonInput(0)">
        <Transition
            :duration="transitionSpeed" :name="shouldIncrement ? 'slide-down' : 'slide-up'"
            @leave="() => updateLocalCounterSingle()">
          <span
              :key="localBonusPoints" :style="{ transitionDuration: `${transitionSpeed / 2}ms` }"
              class="absolute inset-0 !transition-all !ease-in-out font-shippori text-center">
            {{ localBonusPoints }}
          </span>
        </Transition>
      </div>
    </div>

    <GhostButton class="rounded-md" variant="accent" @click="() => clickShuffle()">
      <div
          class="grayscale !transition-transform !ease-[cubic-bezier(0.4,0,0.2,1)]"
          :class="isSpinning ? '!duration-600' : '!duration-0'"
          :style="{ transform: `rotate(${rotation}deg)` }"
          @transitionend="() => spinTransitionEnd()">♻️
      </div>
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

const rotation = ref(0);
const isSpinning = ref(false);

function clickShuffle() {
  if (cheatCodeButtonInput(1)) return;

  emit('shuffle');
  impactFeedback('light');

  if (isSpinning.value) {
    rotation.value += 360;
  } else {
    isSpinning.value = true;
    rotation.value += 360;
  }
}

function spinTransitionEnd() {
  isSpinning.value = false;
  rotation.value = 0;
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
</style>