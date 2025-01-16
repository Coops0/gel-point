// WordBuilder.vue
<template>
  <div class="relative flex items-center justify-center" ref="wordContainer" :style="{ height: `${sectionHeight}px` }">
    <div
        class="absolute top-4 text-2xl font-bold transition-opacity text-primary-900"
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
          class="animated-line stroke-colors-primary-600"
          stroke-width="10"
      />
    </svg>

    <Letter v-for="(l, i) in alignedLetters"
            :key="i.toString() + l.letter"
            v-bind="l"
            :animating
            :active="buildingWord.includes(l.letter)"
            :size="circleSize"
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
const { alignedLetters, circleSize, sectionHeight } = useLetterAlignment(props.letters, width);


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