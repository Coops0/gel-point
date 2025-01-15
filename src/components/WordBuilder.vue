<template>
  <div class="relative flex items-center justify-center h-[600px]" ref="wordContainer">
    <div
        class="absolute top-4 text-2xl font-bold transition-opacity"
        :class="!buildingWord && 'opacity-0'"
    >
      {{ buildingWord }}
    </div>

    <svg class="absolute inset-0 pointer-events-none" :width="width" :height="height">
      <line
          v-for="(line, index) in activeLines"
          :key="index"
          :x1="line.start.x + width/2"
          :y1="line.start.y + height/2"
          :x2="line.end.x + width/2"
          :y2="line.end.y + height/2"
          stroke="#818CF8"
          stroke-width="3"
          class="animated-line"
      />
    </svg>

    <div
        v-for="{ x, y, letter } in alignedLetters"
        :key="letter"
        :style="{ transform: `translate(${x}px, ${y}px)` }"
        class="absolute flex items-center justify-center w-12 h-12 text-lg font-bold
               transition-colors duration-200 rounded-full select-none cursor-pointer"
        :class="[
          'bg-indigo-400 text-white hover:bg-indigo-500',
          buildingWord.includes(letter) && '!bg-indigo-600 ring-indigo-400 ring-4',
          animating && 'animate-bonus'
        ]"
        @pointerdown="() => startTouch(letter)"
        @pointerenter="() => hover(letter)"
        @touchstart.prevent.passive="() => startTouch(letter)"
    >
      {{ letter }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Position } from '@/App.vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const CIRCLE_RADIUS = 80;

const wordContainer = ref<HTMLElement | null>(null);

const width = ref(400);
const height = ref(600);

const props = defineProps<{ letters: string[] }>();

const showBonusAnimation = defineModel<boolean>({
  required: true
});

const emit = defineEmits<{ 'test-word': [word: string] }>();

const buildingWord = ref<string>('');
const animating = ref(false);

const alignedLetters = computed<Position[]>(() =>
    props.letters.map((letter, i) => {
      const step = (i / props.letters.length);
      const angle = step * Math.PI * 2 - (Math.PI / 2);
      return {
        x: Math.cos(angle) * CIRCLE_RADIUS,
        y: Math.sin(angle) * CIRCLE_RADIUS,
        letter
      };
    })
);

const activeLines = computed(() => {
  const lines: Array<{ start: Omit<Position, 'letter'>; end: Omit<Position, 'letter'> }> = [];
  const letters = buildingWord.value.split('');

  for (let i = 0; i < letters.length - 1; i++) {
    const startLetter = alignedLetters.value.find(l => l.letter === letters[i]);
    const endLetter = alignedLetters.value.find(l => l.letter === letters[i + 1]);


    if (startLetter && endLetter) {
      lines.push({
        start: { x: startLetter.x, y: startLetter.y },
        end: { x: endLetter.x, y: endLetter.y }
      });
    }
  }

  return lines;
});

watch(showBonusAnimation, show => {
  if (show) {
    animating.value = true;
    setTimeout(() => {
      animating.value = false;
    }, 5000);
  }

  showBonusAnimation.value = false;
});

function startTouch(letter: string) {
  buildingWord.value = letter;
}

function hover(letter: string) {
  if (buildingWord.value && !buildingWord.value.includes(letter)) {
    buildingWord.value += letter;
  }
}

function endTouch() {
  const word = buildingWord.value;
  buildingWord.value = '';

  if (!word || word.length < 3) {
    return;
  }

  emit('test-word', word);
}

const updateDimensions = () => {
  if (wordContainer.value) {
    width.value = wordContainer.value.clientWidth;
    height.value = wordContainer.value.clientHeight;
  }
};

onMounted(() => {
  updateDimensions();
  window.addEventListener('resize', updateDimensions);
  document.addEventListener('pointerup', endTouch, { passive: true });
  document.addEventListener('touchend', endTouch, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions);
  document.removeEventListener('pointerup', endTouch);
  document.removeEventListener('touchend', endTouch);
});
</script>

<style>
@keyframes lineDraw {
  to {
    stroke-dashoffset: 0;
    stroke-width: 5;
  }
}

.animated-line {
  animation: lineDraw 1000ms ease forwards;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
}

@keyframes bonusAnimation {
  0% {
    filter: brightness(1) blur(0);
    box-shadow: 0 0 0 0 rgba(129, 140, 248, 0);
  }

  15% {
    filter: brightness(1.4) blur(1px);
    box-shadow: 0 0 15px 8px rgba(99, 102, 241, 0.6);
  }

  30% {
    filter: brightness(1.2) blur(0px);
    box-shadow: 0 0 8px 4px rgba(129, 140, 248, 0.4);
  }

  45% {
    filter: brightness(1.3) blur(0px);
    box-shadow: 0 0 12px 6px rgba(165, 180, 252, 0.5);
  }

  70% {
    filter: brightness(1.1) blur(1px);
    box-shadow: 0 0 10px 5px rgba(129, 140, 248, 0.3);
  }

  100% {
    filter: brightness(1) blur(0);
    box-shadow: 0 0 0 0 rgba(129, 140, 248, 0);
  }
}

.animate-bonus {
  animation: bonusAnimation 3s ease-in-out forwards;
  backface-visibility: hidden;
  will-change: filter, box-shadow;
}
</style>