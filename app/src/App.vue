<template>
  <div class="flex flex-col">
    <WinMessage v-model="showNextLevelAnimation"/>
    <BuySelector
        v-model="showBuySelector"
        :grid
        :available-bonus-word-points="availableBonusWordPoints"
        @buy="buy"
        ref="buySelector"
    />

    <div class="bg-background-50 text-text-900 min-h-screen p-2">
      <div v-if="!isLoaded" class="flex flex-col justify-center items-center h-screen gap-4">
        <div class="text-primary-400">loading...</div>
        <div class="text-primary-400">todo add random motd here</div>
      </div>
      <div v-else-if="puzzles.length !== 0 && puzzles.length < puzzleIndex + 1"
           class="flex flex-col justify-center items-center h-screen gap-4">
        <div class="text-primary-400">good job 🎉</div>
        <div class="text-primary-400 text-sm">you did all the puzzles. now wait for me to add more.</div>
      </div>
      <div v-else class="flex flex-col h-screen">
        <!-- compensate for dynamic island -->
        <div class="h-12" />
        <div class="flex justify-center items-center gap-4">
          <div class="text-primary-400">LEVEL {{ puzzleIndex + 1 }}</div>
        </div>

        <div class="flex-1">
          <KeepAlive>
            <PuzzleGrid
                class="mt-4 relative z-[51] transition-opacity duration-500"
                :class="showBuySelector && 'opacity-80'"
                :grid
                :buy-mode="showBuySelector"
                @selected="(row, col) => buySelector?.select(row, col)"
                ref="puzzleGrid"
            />
          </KeepAlive>
        </div>

        <div
            class="text-center w-full fixed top-2/3 text-2xl font-bold transition-opacity text-primary-900"
            :class="!showCurrentlyBuildingWord && 'opacity-0'"
        >
          {{ currentlyBuildingWord }}
        </div>

        <Actions class="fixed left-2 bottom-4"
                 :available-bonus-word-points="availableBonusWordPoints"
                 @shuffle="() => wordBuilder?.shuffle()"
                 @buy="() => (showBuySelector = true)"
        />

        <div class="flex flex-col items-center gap-4 mb-42">
          <div class="relative size-fit">
            <WordBuilder
                :letters
                @test-word="testWord"
                @update-built-word="updateBuiltWord"
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
import { loadTheme } from '@/composables/theme.composable.ts';
import WinMessage from '@/components/WinMessage.vue';
import Actions from '@/components/Actions.vue';
import BuySelector from '@/components/BuySelector.vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { fetchGameData, type StaticPuzzle } from '@/util/game-data.util.ts';
import { impactFeedback, notificationFeedback } from '@tauri-apps/plugin-haptics';

const allWords = ref<string[]>([]);
const puzzles = ref<StaticPuzzle[]>([]);

const showNextLevelAnimation = ref(false);

const wordBuilder = ref<null | typeof WordBuilder>(null);
const puzzleGrid = ref<null | typeof PuzzleGrid>(null);

const currentlyBuildingWord = ref('');
const showCurrentlyBuildingWord = ref(false);

const showBuySelector = ref(false);
const buySelector = ref<typeof BuySelector | null>(null);

const puzzleIndex = useLocalStorage('puzzle-index', 0);

const {
  letters,
  grid,
  testWord: testWordResult,
  availableBonusWordPoints,
  isLoaded,
  buyCells,
  setPuzzle
} = usePuzzle(puzzleIndex, allWords, puzzles);

function goToNextLevel() {
  const nextPuzzle = puzzleIndex.value + 1;
  if (nextPuzzle <= puzzles.value.length) {
    showNextLevelAnimation.value = true;
  }

  setTimeout(() => {
    puzzleIndex.value = nextPuzzle;
  }, 1000);
}

function testWord(word: string) {
  switch (testWordResult(word)) {
    case WordTestResult.Bonus:
      wordBuilder.value?.showBonusAnimation?.();
      impactFeedback('medium');
      break;
    case WordTestResult.Win:
      notificationFeedback('success');
      goToNextLevel();
      break;
    case WordTestResult.NotFound:
      notificationFeedback('error');
      break;
    case WordTestResult.Found:
      impactFeedback('rigid');
      break;
  }
}

function buy(cells: Array<[number, number]>) {
  if (buyCells(cells)) {
    goToNextLevel();
    notificationFeedback('success');
  }
}

function updateBuiltWord(word: string) {
  if (word.length) {
    currentlyBuildingWord.value = word;
  }

  showCurrentlyBuildingWord.value = !!word.length;
}

// detect if click outside of buy selector, close it
useEventListener(
    'click',
    (event: MouseEvent) => {
      if (!showBuySelector.value) return;

      const target = event.target;
      if (target && (<HTMLElement>target).id !== 'buy-selector-backdrop') {
        return;
      }

      event.preventDefault();

      if (buySelector.value?.hasSelection?.() === true) {
        puzzleGrid.value?.resetSelection();
      } else {
        showBuySelector.value = false;
      }
    }
);

loadTheme();

fetchGameData(allWords, puzzles).then(() => setPuzzle());
</script>