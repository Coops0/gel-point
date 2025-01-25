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
          stroke-width="6"
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
import { computed, ref, toRef, watch } from 'vue';
import Letter from '@/components/Letter.vue';
import { useReactiveSizes } from '@/composables/reactive-sizes.composable.ts';
import {
  CIRCLE_CENTER_OFFSET,
  type LetterPosition,
  useLetterAlignment
} from '@/composables/letter-alignment.composable.ts';
import { useEventListener } from '@/composables/event-listener.composable.ts';

const props = defineProps<{ letters: string[] }>();
const showBonusAnimation = defineModel<boolean>('showBonusAnimation', { required: true });
const emit = defineEmits<{
  'test-word': [word: string];
  'update-built-word': [word: string];
}>();

const wordContainer = ref<HTMLElement | null>(null);
const { height, width } = useReactiveSizes();
const { alignedLetters, shuffle } = useLetterAlignment(toRef(() => props.letters));

defineExpose({ shuffle });

const buildingWord = ref<string>('');
const animating = ref(false);

watch(buildingWord, w => emit('update-built-word', w));

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

useEventListener('pointerup', endTouch, { passive: true });
useEventListener('touchend', endTouch, { passive: true });
</script>