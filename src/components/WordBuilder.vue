<template>
  <div class="relative flex items-center justify-center h-96">
    <div
        class="absolute top-4 text-2xl font-bold transition-opacity"
        :class="!buildingWord && 'opacity-0'"
    >
      {{ buildingWord }}
    </div>

    <div
        v-for="{ x, y, letter } in alignedLetters"
        :key="letter"
        :style="{ transform: `translate(${x}px, ${y}px)` }"
        class="absolute flex items-center justify-center w-12 h-12 text-lg font-bold
               transition-colors duration-200 rounded-full select-none cursor-pointer"
        :class="[
          'bg-indigo-400 text-white hover:bg-indigo-500',
          buildingWord.includes(letter) && '!bg-indigo-600'
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

const CIRCLE_RADIUS = 120;

const props = defineProps<{
  letters: string[];
  showBonusAnimation: boolean;
}>();

const emit = defineEmits<{ 'test-word': [word: string] }>();

const buildingWord = ref<string>('');
const animating = ref(false);

const connectedLines = computed(() => {
  const lines: Array<[number, number]> = [];
  let previousIndex = -1;

  for (const letter of buildingWord.value) {
    const index = props.letters.indexOf(letter);
    if (index === -1) continue; // ?

    if (previousIndex != -1) {
      lines.push([previousIndex, index]);
    }

    previousIndex = index;
  }

  return lines;
});

watch(() => props.showBonusAnimation, show => {
  if (show) {
    animating.value = true;
    setTimeout(() => {
      animating.value = false;
    }, 1000);
  }
});

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

onMounted(() => {
  document.addEventListener('pointerup', endTouch, { passive: true });
  document.addEventListener('touchend', endTouch, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener('pointerup', endTouch);
  document.removeEventListener('touchend', endTouch);
});
</script>