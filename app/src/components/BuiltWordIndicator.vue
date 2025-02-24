<template>
  <div
      class="w-full fixed pointer-events-none text-center"
      :style="{ bottom: `${Math.abs(highestLetterPosition?.y ?? 300) + 5}px` }">
    <svg xmlns="http://www.w3.org/2000/svg" class="invisible absolute size-full">
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
          <feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="goo"/>
          <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
        </filter>
      </defs>
    </svg>

    <div
        class="text-2xl font-bold uppercase inline-block box-decoration-clone text-background-50 px-4 py-2 relative overflow-hidden"
        :style="{
          filter: 'url(#goo)',
          transform: `scale(${scaleOut ? 1.5 : 1})`,
          transition: `opacity ${prolongFadeOut ? '900' : '150'}ms, background-color ${prolongFadeOut ? '150' : '0'}ms ease-in-out, transform ${scaleOut ? '2500' : '0'}ms !important`
        }"
        :class="[showCurrentlyBuildingWord ? 'opacity-100' : 'opacity-0', bgColor]">
      {{ word }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LetterPosition } from '@/composables/letter-alignment.composable.ts';
import { computed, ref } from 'vue';

defineProps<{
  highestLetterPosition: LetterPosition | null;
}>();

const word = ref('');
const showCurrentlyBuildingWord = ref(false);

const ORIGINAL_BG_COLOR = 'bg-secondary-500';
const bgColor = ref(ORIGINAL_BG_COLOR);

const prolongFadeOut = computed(() => bgColor.value !== ORIGINAL_BG_COLOR);
const scaleOut = ref(false);

function dismissWith(type?: 'bonus' | 'word') {
  if (!type) {
    scaleOut.value = false;
    bgColor.value = ORIGINAL_BG_COLOR;
    showCurrentlyBuildingWord.value = true;
    return;
  }

  scaleOut.value = type === 'word';
  bgColor.value = type === 'bonus' ? 'bg-blue-600' : 'bg-green-600';

  setTimeout(() => (showCurrentlyBuildingWord.value = false), 50);
}

function updateWord(nWord: string) {
  if (nWord.length) {
    scaleOut.value = false;
    bgColor.value = ORIGINAL_BG_COLOR;
    showCurrentlyBuildingWord.value = true;
    word.value = nWord;
  } else {
    setTimeout(() => (showCurrentlyBuildingWord.value = false), 50);
  }
}

defineExpose({ dismissWith, updateWord });
</script>