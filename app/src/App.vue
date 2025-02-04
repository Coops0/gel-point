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
      <div v-if="winState !== 'active'" :class="isLoaded ? 'opacity-0' : 'opacity-100'"
           class="fixed bg-background-50 text-text-900 h-screen w-screen p-2 z-[999] transition-all duration-200 pointer-events-none">
        <div class="flex flex-col justify-center items-center h-screen gap-4 z-[999] pointer-events-none">

          <div class="text-primary-400">loading...</div>
          <div class="text-primary-400">{{ motd }}</div>
        </div>
      </div>

      <div v-if="winState !== 'active' && isLoaded" class="flex flex-col h-screen">
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
                 @active-cheat-code="() => activateCheatCode()"
        />

        <ThemeSelector class="fixed right-2 bottom-4"
                       @change-theme="t => setTheme(t)"
                       @clear-unread="() => showNewlyUnlockedIndicator = false"
                       :show-unread="showNewlyUnlockedIndicator"
                       :earned="earnedThemes"
                       :current-theme="theme"
        />

        <div>
          <div class="relative">
            <WordBuilder
                ref="wordBuilder"
                :letters="currentPuzzle!.letters"
                @test-word="word => testWord(word)"
                @update-built-word="updateBuiltWord"
            />
          </div>
        </div>
      </div>
    </div>
    <input
        ref="cheatCodeInputElement"
        v-model="cheatCodeInput"
        @keydown.enter="() => submitCheatCode()"
        class="fixed w-1/2 h-16 z-[1000] ml-10 mt-10"
        :class="!showCheatCodeInput && 'hidden'"
        autocomplete="off"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, toRaw } from 'vue';
import PuzzleGrid from '@/components/PuzzleGrid.vue';
import WordBuilder from '@/components/WordBuilder.vue';
import { usePuzzleManager, WordTestResult } from '@/composables/puzzle-manager.composable.ts';
import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { THEMES, useTheme } from '@/composables/theme.composable.ts';
import WinMessage from '@/components/WinMessage.vue';
import Actions from '@/components/Actions.vue';
import BuySelector from '@/components/BuySelector.vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { impactFeedback, notificationFeedback } from '@tauri-apps/plugin-haptics';
import { type LoadLevelResult, type Puzzle, PuzzleService } from '@/services/puzzles.service.ts';
import { WordService } from '@/services/words.service.ts';
import { clone } from '@/util';
import ThemeSelector from '@/components/ThemeSelector.vue';
import { MOTDS } from '@/util/motds.util.ts';

const puzzleService = new PuzzleService();
const wordService = new WordService();
const { theme, loadTheme, unlockNextTheme, showNewlyUnlockedIndicator, earnedThemes, setTheme } = useTheme();

const currentPuzzle = ref<Puzzle | null>(null);

const showNextLevelAnimation = ref(false);

const wordBuilder = ref<null | typeof WordBuilder>(null);
const puzzleGrid = ref<null | typeof PuzzleGrid>(null);

const cheatCodeInputElement = ref<HTMLInputElement | null>(null);
const cheatCodeInput = ref('');
const showCheatCodeInput = ref(true);

const currentlyBuildingWord = ref('');
const showCurrentlyBuildingWord = ref(false);

const showBuySelector = ref(false);
const buySelector = ref<typeof BuySelector | null>(null);

const winState = ref<'next-level' | 'active' | 'none'>('none');

const puzzleId = useLocalStorage('puzzle-id', 0);

const motd = MOTDS[Math.floor(Math.random() * MOTDS.length)];

const {
  grid,
  testWord: testWordResult,
  availableBonusWordPoints,
  isLoaded,
  buyCells,
  setPuzzle
} = usePuzzleManager(wordService);

async function loadAndSetPuzzle(loadResult?: LoadLevelResult) {
  if (!loadResult) {
    loadResult = await puzzleService.loadPuzzle(puzzleId.value);
  }

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
    return;
  }

  const nextPuzzle = puzzleId.value + 1;
  showNextLevelAnimation.value = true;

  const time = Date.now();
  const loadResult = await puzzleService.loadPuzzle(nextPuzzle);
  const waitTimeLeft = 1000 - (Date.now() - time);

  setTimeout(() => {
    puzzleId.value = nextPuzzle;
    showNextLevelAnimation.value = false;
    loadAndSetPuzzle(loadResult);
  }, Math.max(waitTimeLeft, 0));
}

async function testWord(word: string) {
  switch (await testWordResult(word)) {
    case WordTestResult.Bonus:
      wordBuilder.value?.showBonusAnimation?.();
      await impactFeedback('medium');
      break;
    case WordTestResult.BonusTheme:
      wordBuilder.value?.showBonusAnimation?.();
      unlockNextTheme();
      await impactFeedback('medium');
      break;
    case WordTestResult.Win:
      await goToNextLevel();
      await notificationFeedback('success');
      break;
    case WordTestResult.NotFound:
      await notificationFeedback('error');
      break;
    case WordTestResult.Found:
      await impactFeedback('rigid');
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

function activateCheatCode() {
  cheatCodeInput.value = '';
  showCheatCodeInput.value = true;
  cheatCodeInputElement.value?.focus({ preventScroll: true });
}

function submitCheatCode() {
  showCheatCodeInput.value = false;
  const code = cheatCodeInput.value.toLowerCase();

  const [name, ...args] = code.split(' ');
  switch (name) {
    case 'noobdog':
      goToNextLevel();
      break;
    case 'plsgoto':
      if (args.length === 1) {
        puzzleId.value = +args[0];
        loadAndSetPuzzle();
      }
      break;
    case 'unlockallthemes':
      THEMES.forEach(() => unlockNextTheme());
      break;
    case 'reload':
      loadAndSetPuzzle();
      break;
    default:
      notificationFeedback('error');
      return;
  }

  impactFeedback('light');
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
loadAndSetPuzzle();
</script>