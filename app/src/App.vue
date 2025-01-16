<template>
  <div class="flex flex-col gap-8">
    <WinMessage v-model="showNextLevelAnimation"/>
    <div class="bg-colors-background-50 text-text-900 min-h-screen p-2">
      <!-- DEBUG! -->
      <button @click="reset" class="fixed bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">RESET</button>

      <div v-if="!isLoaded"></div>
      <div v-else-if="totalPuzzles !== 0 && totalPuzzles < puzzleIndex + 1">
        <div class="text-colors-primary-400">Congratulations!</div>
        <div class="text-colors-primary-400">You've completed all puzzles!</div>
        <button @click="reset" class="bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">RESET</button>
      </div>
      <div v-else class="flex flex-col h-screen">
        <KeepAlive>
          <PuzzleGrid :grid key="puzzle"/>
        </KeepAlive>
        <div class="mt-auto mb-6">
          <WordBuilder
              :letters
              @test-word="testWord"
              v-model="showBonusAnimation"
          />

          <div class="mt-4 flex flex-col gap-2 items-center">
            <div class="text-colors-primary-400">LEVEL {{ puzzleIndex + 1 }}</div>
            <div class="font-bold text-colors-primary-900">{{ foundBonusWords.length }} extra words found</div>
          </div>
        </div>
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
import WinMessage from '@/components/WinMessage.vue';

// RULES:
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

const showBonusAnimation = ref(false);
const showNextLevelAnimation = ref(false);
const puzzleIndex = useLocalStorage('puzzle-index', 0);

const { letters, grid, testWord: testWordResult, foundBonusWords, isLoaded, totalPuzzles } = usePuzzle(puzzleIndex);

function testWord(word: string) {
  switch (testWordResult(word)) {
    case WordTestResult.Bonus:
      showBonusAnimation.value = true;
      break;
    case WordTestResult.Win:
      puzzleIndex.value++;
      if (puzzleIndex.value <= totalPuzzles.value) {
        showNextLevelAnimation.value = true;
      }
      break;
    case WordTestResult.NotFound:
    case WordTestResult.Found:
      break;
  }
}

const reset = () => {
  if (puzzleIndex.value === 0) {
    puzzleIndex.value = 1;
  }

  // bypass batch updates
  setTimeout(() => {
    grid.value = [];
    puzzleIndex.value = 0;
  });
};

const _theme = useTheme();
</script>