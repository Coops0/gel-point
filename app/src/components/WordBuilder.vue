<template>
  <div class="relative flex items-center justify-center h-[500px]" ref="wordContainer">
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
          stroke-width="10"
          class="animated-line"
      />
    </svg>

    <Letter v-for="(l, i) in alignedLetters"
            :key="i.toString() + l.letter"
            v-bind="l"
            :animating
            :active="buildingWord.includes(l.letter)"
            @start-touch="() => startTouch(l.letter)"
            @hover="() => hover(l.letter)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Letter from '@/components/Letter.vue';
import { useReactiveSizes } from '@/composables/reactive-sizes.composable.ts';
import { type LetterPosition, useLetterAlignment } from '@/composables/letter-alignment.composable.ts';


const props = defineProps<{ letters: string[] }>();
const showBonusAnimation = defineModel<boolean>({ required: true });
const emit = defineEmits<{ 'test-word': [word: string] }>();

const wordContainer = ref<HTMLElement | null>(null);
const { height, width } = useReactiveSizes(wordContainer);
const { alignedLetters } = useLetterAlignment(props.letters);


const buildingWord = ref<string>('');
const animating = ref(false);

type Position = Omit<LetterPosition, 'letter'>;

const activeLines = computed(() => {
  const lines: Array<{ start: Position; end: Position }> = [];
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
  const len = buildingWord.value.length;
  if (!len) return;

  const index = buildingWord.value.indexOf(letter);

  if (index === -1) {
    buildingWord.value += letter;
  } else if (index === len - 2) {
    buildingWord.value = buildingWord.value.slice(0, -1);
  }
}

function endTouch() {
  const word = buildingWord.value;
  buildingWord.value = '';

  if (word && word.length >= 3) {
    emit('test-word', word);
  }
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

<style>
@keyframes lineDraw {
  to {
    stroke-dashoffset: 0;
    stroke-width: 14;
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
    filter: brightness(1.2) blur(0);
    box-shadow: 0 0 8px 4px rgba(129, 140, 248, 0.4);
  }

  50% {
    filter: brightness(1.3) blur(0);
    box-shadow: 0 0 12px 6px rgba(165, 180, 252, 0.5);
  }

  60% {
    filter: brightness(1.1) blur(0);
    box-shadow: 0 0 10px 5px rgba(129, 140, 248, 0.3);
  }

  80% {
    filter: brightness(1) blur(0);
    box-shadow: 0 0 0 0 rgba(129, 140, 248, 0);
  }
}

.animate-bonus {
  animation: bonusAnimation 3s ease-in-out forwards;
}
</style>