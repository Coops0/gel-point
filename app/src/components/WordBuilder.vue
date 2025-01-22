<template>
  <div class="absolute inset-0 flex items-center justify-center" ref="wordContainer">
    <div
        class="text-white absolute top-4 text-2xl font-bold transition-opacity text-primary-900"
        :class="!buildingWord && 'opacity-0'"
    >
      {{ displayedBuildingWord }}
    </div>

    <svg class="absolute pointer-events-none" :width :height>
      <line
          v-for="(line, index) in activeLines"
          :key="index"
          :x1="line.start.x + width/2 + CIRCLE_CENTER_OFFSET"
          :y1="line.start.y + height/2 + CIRCLE_CENTER_OFFSET"
          :x2="line.end.x + width/2 + CIRCLE_CENTER_OFFSET"
          :y2="line.end.y + height/2 + CIRCLE_CENTER_OFFSET"
          class="animated-line stroke-colors-primary-600"
          stroke-width="10"
      />
    </svg>

    <div>
      <Letter v-for="(l, i) in alignedLetters"
              :key="i.toString() + l.letter"
              v-bind="l"
              :animating
              :active="buildingWord.includes(l.letter)"
              :last-selected="buildingWord.endsWith(l.letter)"
              @start-touch="event => startTouch(event, l.letter)"
              @hover="event => hover(event, l.letter)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue';
import Letter from '@/components/Letter.vue';
import { useReactiveSizes } from '@/composables/reactive-sizes.composable.ts';
import {
  CIRCLE_CENTER_OFFSET,
  type LetterPosition,
  useLetterAlignment
} from '@/composables/letter-alignment.composable.ts';

const props = defineProps<{ letters: string[] }>();
const showBonusAnimation = defineModel<boolean>('showBonusAnimation', { required: true });
const shouldShuffle = defineModel<boolean>('shouldShuffle', { required: true });
const emit = defineEmits<{ 'test-word': [word: string] }>();

const wordContainer = ref<HTMLElement | null>(null);
const { height, width } = useReactiveSizes();
const { alignedLetters, shuffle } = useLetterAlignment(toRef(() => props.letters));

const buildingWord = ref<string>('');
const animating = ref(false);

const displayedBuildingWord = ref<string>('');
watch(buildingWord, w => {
  // allow word to still be there to fade out
  if (w.length) {
    displayedBuildingWord.value = w;
  }
});

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

watch(shouldShuffle, s => {
  if (s) {
    shuffle();
    shouldShuffle.value = false;
  }
});

function startTouch(event: PointerEvent, letter: string) {
  buildingWord.value = letter;
  (<Element>event.target)?.releasePointerCapture(event.pointerId);
}

function hover(_event: PointerEvent, letter: string) {
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