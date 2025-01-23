<template>
  <div class="flex flex-col">
    <WinMessage v-model="showNextLevelAnimation"/>
<!--    <div-->
<!--        class="fixed inset-0 z-50 bg-black duration-500 transition-all"-->
<!--        :class="showBuySelector ? 'bg-opacity-75 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'"-->
<!--    />-->
    <div class="bg-colors-background-50 text-text-900 min-h-screen p-2">
      <!-- DEBUG! -->
      <button @click="reset" class="fixed bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">RESET</button>
      <button @click="debugChangeBonus" class="fixed right-0 bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">B-+</button>

      <div v-if="!isLoaded"></div>
      <div v-else-if="totalPuzzles !== 0 && totalPuzzles < puzzleIndex + 1">
        <div class="text-colors-primary-400">Congratulations!</div>
        <div class="text-colors-primary-400">You've completed all puzzles!</div>
        <button @click="reset" class="bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">RESET</button>
      </div>
      <div v-else class="flex flex-col h-screen">
        <div class="flex justify-center items-center gap-4">
          <div class="text-colors-primary-400">LEVEL {{ puzzleIndex + 1 }}</div>
        </div>

        <div class="flex-1">
          <KeepAlive>
            <PuzzleGrid class="mt-4" :grid :buy-mode="showBuySelector" key="puzzle"/>
          </KeepAlive>
        </div>

        <Actions class="fixed left-2 bottom-4"
                 :available-bonus-word-points="availableBonusWordPoints"
                 @shuffle="shuffle"
                 @buy="startBuy"
        />

        <div class="flex flex-col items-center gap-4 mb-28">
          <div class="relative size-fit">
            <WordBuilder
                :letters
                @test-word="testWord"
                v-model:show-bonus-animation="showBonusAnimation"
                v-model:should-shuffle="shouldShuffle"
            />
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
import Actions from '@/components/Actions.vue';

// RULES:
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

const showBonusAnimation = ref(false);
const shouldShuffle = ref(false);
const showNextLevelAnimation = ref(false);
const showBuySelector = ref(false);

const puzzleIndex = useLocalStorage('puzzle-index', 0);

const {
  letters,
  grid,
  testWord: testWordResult,
  availableBonusWordPoints,
  isLoaded,
  totalPuzzles
} = usePuzzle(puzzleIndex);

function testWord(word: string) {
  switch (testWordResult(word)) {
    case WordTestResult.Bonus:
      showBonusAnimation.value = true;
      break;
    case WordTestResult.Win:
      const nextPuzzle = puzzleIndex.value + 1;
      if (nextPuzzle <= totalPuzzles.value) {
        showNextLevelAnimation.value = true;
      }

      setTimeout(() => {
        puzzleIndex.value = nextPuzzle;
      }, 1000);

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

const debugChangeBonus = () => {
  const amount = Math.floor(Math.random() * 10);
  availableBonusWordPoints.value += Math.random() > 0.5 ? amount : -amount;
}

const shuffle = () => {
  shouldShuffle.value = true;
};

const startBuy = () => {
  showBuySelector.value = true;
};

const _theme = useTheme();
</script>