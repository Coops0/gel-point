<template>
  <div class="flex flex-col">
    <WinMessage v-model="showNextLevelAnimation" :class="!showBuySelector && 'z-[52]'"/>
    <BuySelector
        ref="buySelector"
        v-model="showBuySelector"
        :available-bonus-word-points="availableBonusWordPoints"
        :grid
        @buy="buy"
    />

    <div class="bg-background-50 text-text-900 min-h-screen p-2">
      <div v-if="winState === 'active'"
           class="flex flex-col justify-center items-center h-screen gap-4">
        <div class="text-primary-400">good job 🎉</div>
        <div class="text-primary-400 text-sm">you did all the puzzles. now wait for me to add more.</div>
      </div>
      <div v-else-if="!isLoaded" class="flex flex-col justify-center items-center h-screen gap-4">
        <div class="text-primary-400">loading...</div>
        <div class="text-primary-400">todo add random motd here</div>
      </div>
      <div v-else class="flex flex-col h-screen">
        <!-- compensate for dynamic island -->
        <div class="h-12"/>
        <div class="flex justify-center items-center gap-4">
          <div class="text-primary-400">LEVEL {{ puzzleId }}</div>
        </div>

        <div class="flex-1">
          <KeepAlive>
            <PuzzleGrid
                ref="puzzleGrid"
                :buy-mode="showBuySelector"
                :class="showBuySelector && 'opacity-80'"
                :grid="grid!"
                class="mt-4 relative z-[51] transition-opacity duration-500"
                @selected="(row, col) => buySelector?.select(row, col)"
            />
          </KeepAlive>
        </div>

        <div
            :class="{ 'opacity-0': !showCurrentlyBuildingWord, 'z-[52]': !showBuySelector }"
            class="text-center w-full fixed top-6/11 text-2xl font-bold transition-opacity text-primary-900"
        >
          {{ currentlyBuildingWord }}
        </div>

        <Actions :available-bonus-word-points="availableBonusWordPoints"
                 class="fixed left-2 bottom-4"
                 @buy="() => (showBuySelector = true)"
                 @shuffle="() => wordBuilder?.shuffle()"
                 @debug-next-level="() => {goToNextLevel(); unlockNextTheme();}"
        />

        <ThemeSelector class="fixed right-2 bottom-4"
                       @change-theme="t => setTheme(t)"
                       @clear-unread="() => showNewlyUnlockedIndicator = false"
                       :show-unread="showNewlyUnlockedIndicator"
                       :earned="earnedThemes"
                       :current-theme="theme"
        />

        <div class="flex flex-col items-center gap-4 mb-42">
          <div class="relative size-fit">
            <WordBuilder
                ref="wordBuilder"
                :letters="currentPuzzle!.letters"
                @test-word="testWord"
                @update-built-word="updateBuiltWord"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, toRaw } from 'vue';
import PuzzleGrid from '@/components/PuzzleGrid.vue';
import WordBuilder from '@/components/WordBuilder.vue';
import { usePuzzleManager, WordTestResult } from '@/composables/puzzle-manager.composable.ts';
import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { useTheme } from '@/composables/theme.composable.ts';
import WinMessage from '@/components/WinMessage.vue';
import Actions from '@/components/Actions.vue';
import BuySelector from '@/components/BuySelector.vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { impactFeedback, notificationFeedback } from '@tauri-apps/plugin-haptics';
import { type LoadLevelResult, type Puzzle, PuzzleService } from '@/services/puzzles.service.ts';
import { WordService } from '@/services/words.service.ts';
import { clone } from '@/util';
import ThemeSelector from '@/components/ThemeSelector.vue';

const puzzleService = new PuzzleService();
const wordService = new WordService();
const { theme, loadTheme, unlockNextTheme, showNewlyUnlockedIndicator, earnedThemes, setTheme } = useTheme();

const allWords = ref<string[]>([]);
const currentPuzzle = ref<Puzzle | null>(null);

const showNextLevelAnimation = ref(false);

const wordBuilder = ref<null | typeof WordBuilder>(null);
const puzzleGrid = ref<null | typeof PuzzleGrid>(null);

const currentlyBuildingWord = ref('');
const showCurrentlyBuildingWord = ref(false);

const showBuySelector = ref(false);
const buySelector = ref<typeof BuySelector | null>(null);

const winState = ref<'next-level' | 'active' | 'none'>('none');

const puzzleId = useLocalStorage('puzzle-id', 0);

const {
  grid,
  testWord: testWordResult,
  availableBonusWordPoints,
  isLoaded,
  buyCells,
  setPuzzle
} = usePuzzleManager(allWords);

async function loadAndSetPuzzle(loadResult?: LoadLevelResult) {
  if (!loadResult) {
    loadResult = await puzzleService.loadPuzzle(puzzleId.value);
  }

  // noinspection ES6MissingAwait
  console.log(`load and set puzzle result ~> ${JSON.stringify(loadResult)}`);

  winState.value = 'none';
  switch (loadResult.name) {
    case 'correct_index':
      puzzleId.value = loadResult.index;
      return await loadAndSetPuzzle();
    case 'finished_all_levels':
      winState.value = 'active';
      break;
    case 'success':
      if (loadResult.lastPuzzle === true) {
        winState.value = 'next-level';
      }

      currentPuzzle.value = loadResult.puzzle;
      setPuzzle(clone(toRaw(loadResult.puzzle)));

      puzzleService.loadNextPuzzle(puzzleId.value).then(r => {
        // last
        if (!r) {
          winState.value = 'next-level';
        }
      });

      break;
  }
}

async function goToNextLevel() {
  if (winState.value === 'next-level') {
    winState.value = 'active';
    console.log('hit active win state');
    return;
  }

  const nextPuzzle = puzzleId.value + 1;
  showNextLevelAnimation.value = true;

  const time = new Date().getTime();
  const loadResult = await puzzleService.loadPuzzle(nextPuzzle);
  const waitTimeLeft = 1000 - (Date.now() - time);

  setTimeout(() => {
    puzzleId.value = nextPuzzle;
    showNextLevelAnimation.value = false;
    loadAndSetPuzzle(loadResult);
  }, Math.max(waitTimeLeft, 0));
}

function testWord(word: string) {
  switch (testWordResult(word)) {
    case WordTestResult.Bonus:
      wordBuilder.value?.showBonusAnimation?.();
      impactFeedback('medium');
      break;
    case WordTestResult.BonusTheme:
      wordBuilder.value?.showBonusAnimation?.();
      impactFeedback('medium');
      unlockNextTheme();
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

useEventListener('keydown', e => {
  if (e.key === 'b') {
    puzzleId.value = 0;
    loadAndSetPuzzle();
  }
});

loadTheme();
loadAndSetPuzzle();

wordService.fetchWords().then(w => (allWords.value = w));
</script>