<template>
  <div class="flex flex-col">
    <WinMessage v-model="showNextLevelAnimation"/>
    <BuySelector
        v-model="showBuySelector"
        :grid
        :available-bonus-word-points="availableBonusWordPoints"
        @buy="c => buyCells(c)"
        ref="buySelector"
    />

    <div class="bg-colors-background-50 text-text-900 min-h-screen p-2">
      <!-- DEBUG! -->
      <button @click="reset" class="fixed bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">RESET</button>
      <button @click="debugChangeBonus"
              class="fixed right-0 bg-colors-primary-500 text-colors-background-50 p-2 rounded-md">B-+
      </button>

      <div v-if="!isLoaded"/>
      <div v-else-if="totalPuzzles !== 0 && totalPuzzles < puzzleIndex + 1">
        <div class="text-colors-primary-400">good job 🎉</div>
        <div class="text-colors-primary-400">you did all the puzzles. now wait for me to add more.</div>
      </div>
      <div v-else class="flex flex-col h-screen">
        <div class="flex justify-center items-center gap-4">
          <div class="text-colors-primary-400">LEVEL {{ puzzleIndex + 1 }}</div>
        </div>

        <div class="flex-1">
          <KeepAlive>
            <PuzzleGrid
                class="mt-4 relative z-[51] transition-opacity duration-500"
                :class="showBuySelector && 'opacity-80'"
                :grid
                :buy-mode="showBuySelector"
                @selected="(row, col) => buySelector?.select(row, col)"
            />
          </KeepAlive>
        </div>

        <Actions class="fixed left-2 bottom-4"
                 :available-bonus-word-points="availableBonusWordPoints"
                 @shuffle="() => wordBuilder?.shuffle()"
                 @buy="() => (showBuySelector = true)"
        />

        <div class="flex flex-col items-center gap-4 mb-28">
          <div class="relative size-fit">
            <WordBuilder
                :letters
                @test-word="testWord"
                v-model:show-bonus-animation="showBonusAnimation"
                ref="wordBuilder"
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
import BuySelector from '@/components/BuySelector.vue';

// RULES:
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

const showBonusAnimation = ref(false);
const showNextLevelAnimation = ref(false);

const wordBuilder = ref<null | typeof WordBuilder>(null);

const showBuySelector = ref(false);
const buySelector = ref<typeof BuySelector | null>(null);

const puzzleIndex = useLocalStorage('puzzle-index', 0);

const {
  letters,
  grid,
  testWord: testWordResult,
  availableBonusWordPoints,
  isLoaded,
  totalPuzzles,
  buyCells
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

// TODO remove
function reset() {
  if (puzzleIndex.value === 0) {
    puzzleIndex.value = 1;
  }

  // bypass batch updates
  setTimeout(() => {
    grid.value = [];
    puzzleIndex.value = 0;
  });
}

// TODO remove
function debugChangeBonus() {
  const amount = Math.floor(Math.random() * 10);
  availableBonusWordPoints.value += Math.random() > 0.5 ? amount : -amount;
}

// need to load theme to apply colors to document
// noinspection JSUnusedGlobalSymbols
const _theme = useTheme();
</script>