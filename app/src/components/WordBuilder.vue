<template>
  <div class="absolute inset-0 flex items-center justify-center">
    <svg :height :width class="absolute pointer-events-none">
      <line
          v-for="(line, index) in activeLines"
          :key="index"
          :x1="line.start.x - circleXCenterOffset/2 + 150"
          :x2="line.end.x - circleXCenterOffset/2 + 150"
          :y1="line.start.y + height/2 + 40"
          :y2="line.end.y + height/2 + 40"
          class="animated-line stroke-primary-600"
          stroke-width="8"
      />
    </svg>

    <div class="w-full">
      <Letter v-for="(l, letterIndex) in alignedLetters"
              :key="letterIndex.toString() + l.letter"
              :active="selectedLetterIndices.includes(letterIndex)"
              :animating
              :last-selected="selectedLetterIndices.length > 0 && selectedLetterIndices[selectedLetterIndices.length - 1] === letterIndex"
              v-bind="l"
              @hover="event => hover(event, letterIndex)"
              @move="(x, y) => handleLetterMovement(letterIndex, x, y)"
              @start-touch="event => startTouch(event, letterIndex)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRef, watch } from 'vue';
import Letter from '@/components/Letter.vue';
import { useWindowSize } from '@/composables/reactive-sizes.composable.ts';
import { type LetterPosition, useLetterAlignment } from '@/composables/letter-alignment.composable.ts';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { selectionFeedback } from '@tauri-apps/plugin-haptics';

const highestLetterPosition = defineModel<LetterPosition | null>({ required: true });
const props = defineProps<{ letters: string[] }>();
const emit = defineEmits<{
  'test-word': [word: string];
  'update-built-word': [word: string];
}>();

const { height, width } = useWindowSize();

const {
  alignedLetters,
  shuffle,
  circleXCenterOffset,
  circleYCenterOffset
} = useLetterAlignment(toRef(() => props.letters), width);

watch(alignedLetters, a => {
  highestLetterPosition.value = a.reduce((acc, cur) => {
    if (Math.abs(cur.y) > Math.abs(acc.y)) {
      return cur;
    }

    return acc;
  }, { x: 0, y: 0, letter: '' });
}, { immediate: true, deep: true });

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
  } else /* if (wordIndex === len - 2) {
    selectedLetterIndices.value = selectedLetterIndices.value.slice(0, -1);
  } */ if (len !== 1) {
    selectedLetterIndices.value = selectedLetterIndices.value.slice(0, wordIndex + 1);
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