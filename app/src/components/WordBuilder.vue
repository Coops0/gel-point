<template>
  <div class="absolute inset-0 flex items-center justify-center" ref="wordContainer">
    <svg class="absolute pointer-events-none" :width :height>
      <line
          v-for="(line, index) in activeLines"
          :key="index"
          :x1="line.start.x + width/2 + CIRCLE_CENTER_OFFSET"
          :y1="line.start.y + height/2 + CIRCLE_CENTER_OFFSET"
          :x2="line.end.x + width/2 + CIRCLE_CENTER_OFFSET"
          :y2="line.end.y + height/2 + CIRCLE_CENTER_OFFSET"
          class="animated-line stroke-primary-600"
          stroke-width="8"
      />
    </svg>

    <div>
      <Letter v-for="(l, letterIndex) in alignedLetters"
              :key="letterIndex.toString() + l.letter"
              v-bind="l"
              :animating
              :active="selectedLetterIndices.includes(letterIndex)"
              :last-selected="selectedLetterIndices.length > 0 && selectedLetterIndices[selectedLetterIndices.length - 1] === letterIndex"
              @start-touch="event => startTouch(event, letterIndex)"
              @hover="event => hover(event, letterIndex)"
              @move="(x, y) => handleLetterMovement(letterIndex, x, y)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import Letter from '@/components/Letter.vue';
import { useReactiveSizes } from '@/composables/reactive-sizes.composable.ts';
import {
  CIRCLE_CENTER_OFFSET,
  type LetterPosition,
  useLetterAlignment
} from '@/composables/letter-alignment.composable.ts';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { selectionFeedback } from '@tauri-apps/plugin-haptics';

const props = defineProps<{ letters: string[] }>();
const emit = defineEmits<{
  'test-word': [word: string];
  'update-built-word': [word: string];
}>();

const wordContainer = ref<HTMLElement | null>(null);
const { height, width } = useReactiveSizes();

const { alignedLetters, shuffle } = useLetterAlignment(toRef(() => props.letters));
// used for accurate lines
const alignedLettersOffsetPosition = ref<LetterPosition[]>([]);

watch(() => props.letters, () => (alignedLettersOffsetPosition.value = []));

defineExpose({ shuffle, showBonusAnimation });

const selectedLetterIndices = ref<number[]>([]);
const animating = ref(false);

const buildingWord = computed(() => selectedLetterIndices.value.map(i => props.letters[i]).join(''));
watch(buildingWord, w => emit('update-built-word', w));

type Position = Omit<LetterPosition, 'letter'>;

const activeLines = computed(() => {
  const lines: Array<{ start: Position; end: Position }> = [];

  const sli = selectedLetterIndices.value;
  const al = alignedLetters.value;
  const alo = alignedLettersOffsetPosition.value;
  // ENTRIES RETURNS [INDEX, VALUE]
  for (const [wordIndex, letterIndex] of sli.entries()) {
    const letter = alo[letterIndex] ?? al[letterIndex];

    const nextLetterWordIndex = sli[wordIndex + 1];
    if (nextLetterWordIndex === undefined) break;

    const nextLetter = alo[nextLetterWordIndex] ?? al[nextLetterWordIndex];

    lines.push({
      start: { x: letter.x, y: letter.y },
      end: { x: nextLetter.x, y: nextLetter.y }
    });
  }

  return lines;
});

function showBonusAnimation() {
  if (animating.value) return;

  animating.value = true;

  setTimeout(() => {
    animating.value = false;
  }, 1500);
}

function startTouch(event: PointerEvent, letterIndex: number) {
  selectedLetterIndices.value = [letterIndex];
  (<Element>event.target)?.releasePointerCapture(event.pointerId);

  selectionFeedback();
}

function hover(_event: PointerEvent, letterIndex: number) {
  const len = selectedLetterIndices.value.length;
  if (len === 0) return;

  const wordIndex = selectedLetterIndices.value.indexOf(letterIndex);
  if (wordIndex === -1) {
    selectedLetterIndices.value = [...selectedLetterIndices.value, letterIndex];
  } else if (wordIndex === len - 2) {
    selectedLetterIndices.value = selectedLetterIndices.value.slice(0, -1);
  } else {
    return;
  }

  selectionFeedback();
}

function endTouch() {
  const word = buildingWord.value;
  selectedLetterIndices.value = [];

  if (word.length >= 3) {
    emit('test-word', word);
  }
}

function handleLetterMovement(letterIndex: number, x: number, y: number) {
  alignedLettersOffsetPosition.value[letterIndex] = {
    ...alignedLetters.value[letterIndex],
    x,
    y
  };
}

useEventListener('pointerup', endTouch, { passive: true });
useEventListener('touchend', endTouch, { passive: true });
</script>

<style scoped>
@keyframes lineDraw {
  to {
    stroke-dashoffset: 0;
    stroke-width: 12;
  }
}

.animated-line {
  animation: lineDraw 250ms ease forwards;
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
}
</style>