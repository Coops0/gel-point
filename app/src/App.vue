<template>
  <div class="flex flex-col gap-8">
    <div v-if="isLoaded">
      <PuzzleGrid :grid/>
      <WordBuilder
          :letters
          @test-word="testWord"
          v-model="showBonusAnimation"
      />

      <div class="flex flex-col gap-2 items-center">
        <div class="font-bold">{{ foundBonusWords.length }} extra words found</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PuzzleGrid from '@/components/PuzzleGrid.vue';
import WordBuilder from '@/components/WordBuilder.vue';
import { usePuzzle, WordTestResult } from '@/composables/puzzle.composable.ts';
import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { useTheme } from '@/composables/theme.composable.ts';

// RULES:
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

const showBonusAnimation = ref(false);
const puzzleIndex = useLocalStorage('puzzle-index', 0);

const { letters, grid, testWord: testWordResult, foundBonusWords, isLoaded } = usePuzzle(puzzleIndex);

function testWord(word: string) {
  switch (testWordResult(word)) {
    case WordTestResult.Bonus:
      showBonusAnimation.value = true;
      break;
    case WordTestResult.Win:
      puzzleIndex.value++;
      break;
    case WordTestResult.NotFound:
    case WordTestResult.Found:
      break;
  }
}

const _theme = useTheme();
</script>