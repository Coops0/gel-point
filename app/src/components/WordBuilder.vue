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
      <Letter
          v-for="(l, letterIndex) in alignedLetters"
          :key="letterIndex.toString() + l.letter"
          :letter-index="letterIndex"
          :active="selectedLetterIndices.includes(letterIndex)"
          :any-active="selectedLetterIndices.length > 0"
          :animating
          :last-selected="selectedLetterIndices.length > 0 && selectedLetterIndices[selectedLetterIndices.length - 1] === letterIndex"
          v-bind="l"
          @hover="event => hover(event, letterIndex)"
          @move="(x, y) => handleLetterMovement(letterIndex, x, y)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRef, watch } from 'vue';
import Letter from '@/components/Letter.vue';
import { useWindowSize } from '@/composables/window-size.composable.ts';
import { type LetterPosition, useLetterAlignment } from '@/composables/letter-alignment.composable.ts';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { selectionFeedback } from '@tauri-apps/plugin-haptics';

const highestLetterPosition = defineModel<LetterPosition | null>({ required: true });
const props = defineProps<{ letters: string[] }>();
const emit = defineEmits<{
  'test-word': [word: string];
  'update-built-word': [word: string];
  'show-help': [];
}>();

const { height, width } = useWindowSize();

const {
  alignedLetters,
  shuffle,
  circleXCenterOffset
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

useEventListener('pointerdown', (event: PointerEvent) => {
  if (selectedLetterIndices.value.length !== 0) return;

  const directClickTarget = document.elementsFromPoint(event.clientX, event.clientY);
  if (directClickTarget.length && directClickTarget.some(el => el.tagName.toLowerCase() === 'button' && !('letterIndex' in (<HTMLElement>el).dataset))) {
    return;
  }

  const elements = document.querySelectorAll<HTMLElement>('[data-letter-index]');
  const closest = [...elements].reduce((acc, cur) => {
    const rect = cur.getBoundingClientRect();
    const letter = Number(cur.dataset['letterIndex']);

    if (isNaN(letter)) return acc;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);

    if (distance < acc.distance) {
      return { distance, letter };
    }

    return acc;
  }, { distance: Infinity, letter: -1 });
  
  if (closest.letter !== -1 && closest.distance < 65) {
    startTouch(event, closest.letter);
  }
});

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
    // must be more than 1 letter to go back, and cannot have all letters selected already UNLESS it is the letter behind
  } */ if (len !== 1 && (len !== alignedLetters.value.length || wordIndex === len - 2)) {
    selectedLetterIndices.value = selectedLetterIndices.value.slice(0, wordIndex + 1);
  } else {
    return;
  }

  if (len !== 1) {
    consecutiveTaps = 0;
  }

  selectionFeedback();
}

let consecutiveTaps = 0;
let lastTap = -1;

// This can be called 2x sometimes
function endTouch() {
  const word = buildingWord.value;
  selectedLetterIndices.value = [];

  if (word.length >= 3) {
    emit('test-word', word);
  }

  if (lastTap !== -1 && Date.now() - lastTap > 1000) {
    consecutiveTaps = 0;
  }

  lastTap = Date.now();

  if (word.length === 1) {
    if (++consecutiveTaps >= 5) {
      consecutiveTaps = 0;
      emit('show-help');
    }
    // This function gets called twice sometimes, with the second call therefor having no length
  } else if (word.length !== 0) {
    consecutiveTaps = 0;
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