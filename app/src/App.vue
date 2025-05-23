<template>
  <div class="flex flex-col">
    <WinMessage ref="win-message" :class="showBuySelector ? 'z-18' : 'z-25'"/>
    <BuySelector
        ref="buy-selector"
        v-model="showBuySelector"
        :available-bonus-word-points="availableBonusWordPoints"
        :grid
        @buy="buy"
    />

    <div class="bg-background-50 text-text-900 min-h-screen p-2">
      <div
          v-if="winState === 'active'"
          class="flex flex-col justify-center items-center h-screen gap-4">
        <div class="text-primary-400 font-alt">good job 🎉</div>
        <div class="text-primary-400 text-sm font-alt">you did all the puzzles. now wait for me to add more.</div>
      </div>

      <FadeTransition :duration="350">
        <div
            v-if="winState !== 'active' && !isLoaded"
            class="fixed launch-screen-pallet h-screen min-w-screen overflow-hidden z-[999] pointer-events-none inset-0">
        </div>
      </FadeTransition>


      <div v-if="winState !== 'active' && isLoaded" class="flex flex-col h-screen">
        <!-- compensate for dynamic island -->
        <div class="h-12"/>
        <div class="flex justify-center items-center gap-4">
          <div class="text-primary-400 font-alt">LEVEL {{ puzzleId }}</div>
        </div>

        <div class="flex-1">
          <KeepAlive>
            <PuzzleGrid
                ref="puzzle-grid"
                :buy-mode="showBuySelector"
                :class="showBuySelector && 'opacity-80 !duration-150'"
                :grid="grid!"
                class="mt-4 relative z-22 transition-opacity duration-500"
                @selected="(row, col) => buySelector?.select(row, col)"
            />
          </KeepAlive>
        </div>

        <BuiltWordIndicator
            ref="built-word-indicator"
            :highest-letter-position="highestLetterPosition"
            :class="!showBuySelector && 'z-22'"
        />

        <Actions
            :available-bonus-word-points="availableBonusWordPoints"
            class="fixed left-2 bottom-6"
            @buy="() => (showBuySelector = true)"
            @shuffle="() => wordBuilder?.shuffle()"
            @active-cheat-code="() => activateCheatCode()"
        />

        <ThemeSelector
            :current-theme="theme"
            :earned="earnedThemes"
            :show-unread="showNewlyUnlockedIndicator"
            class="fixed right-2 bottom-6"
            :class="!showBuySelector && 'z-23'"
            @change-theme="t => setTheme(t)"
            @clear-unread="() => showNewlyUnlockedIndicator = false"
        />

        <div>
          <FadeTransition appear>
            <div
                v-if="showHelp"
                class="fixed top-3/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-9 bg-primary-900/85 text-white p-2 rounded-md font-alt w-fit"
                :class="[!showHelp && '!pointer-events-none', !showBuySelector && 'z-23']"
                @click="() => showHelp = false">
              hold and drag letters to build words
            </div>
          </FadeTransition>

          <div class="relative z-1">
            <WordBuilder
                ref="word-builder"
                v-model="highestLetterPosition"
                :letters="currentPuzzle!.letters"
                @test-word="word => testWord(word)"
                @update-built-word="updateBuiltWord"
                @show-help="() => requestShowHelp()"
            />
          </div>
        </div>
      </div>
    </div>

    <input
        ref="cheat-code-input-el"
        v-model="cheatCodeInput"
        :class="!showCheatCodeInput && 'hidden'"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        autofocus
        class="fixed w-1/2 h-16 z-[1000] ml-10 mt-10 text-text-900 !select-auto"
        spellcheck="false"
        @keydown.enter="() => submitCheatCode()"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, toRaw, useTemplateRef, watch } from 'vue';
import PuzzleGrid from '@/components/PuzzleGrid.vue';
import WordBuilder from '@/components/WordBuilder.vue';
import { usePuzzleManager } from '@/composables/puzzle-manager.composable.ts';
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
import type { LetterPosition } from '@/composables/letter-alignment.composable.ts';
import FadeTransition from '@/components/FadeTransition.vue';
import BuiltWordIndicator from '@/components/BuiltWordIndicator.vue';

const puzzleService = new PuzzleService();
const wordService = new WordService();
const { theme, loadTheme, unlock, showNewlyUnlockedIndicator, earnedThemes, setTheme } = useTheme();

const currentPuzzle = ref<Puzzle | null>(null);

const winMessage = useTemplateRef<InstanceType<typeof WinMessage>>('win-message');
const wordBuilder = useTemplateRef<InstanceType<typeof WordBuilder>>('word-builder');
const puzzleGrid = useTemplateRef<InstanceType<typeof PuzzleGrid>>('puzzle-grid');
const builtWordIndicator = useTemplateRef<InstanceType<typeof BuiltWordIndicator>>('built-word-indicator');

const cheatCodeInputElement = useTemplateRef<HTMLInputElement>('cheat-code-input-el');
const cheatCodeInput = ref('');
const showCheatCodeInput = ref(false);

const highestLetterPosition = ref<LetterPosition | null>(null);

const showBuySelector = ref(false);
const buySelector = useTemplateRef<InstanceType<typeof BuySelector>>('buy-selector');

const winState = ref<'next-level' | 'active' | 'none'>('none');

const puzzleId = useLocalStorage('puzzle-id', 0);

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
  winMessage.value?.showMessage();

  const time = Date.now();
  const loadResult = await puzzleService.loadPuzzle(nextPuzzle);
  const waitTimeLeft = 1000 - (Date.now() - time);

  setTimeout(() => {
    puzzleId.value = nextPuzzle;
    winMessage.value?.hideMessage();
    loadAndSetPuzzle(loadResult);
    puzzleGrid.value?.stopAnimations();
  }, Math.max(waitTimeLeft, 0));
}

async function testWord(word: string) {
  const r = await testWordResult(word);
  switch (r.tag) {
    case 'bonus':
      builtWordIndicator.value?.dismissWith('bonus');

      wordBuilder.value?.showBonusAnimation();
      await impactFeedback('medium');

      if (r.theme && unlock('next')) {
        showNewlyUnlockedIndicator.value = true;
      }

      break;
    case 'win':
      builtWordIndicator.value?.dismissWith('word');

      await goToNextLevel();
      // causing crash?
      // await notificationFeedback('success');

      puzzleGrid.value?.animateShimmerCells(r.cells);
      puzzleGrid.value?.animateGlowCells(r.cells);
      break;
    case 'not_found':
      await notificationFeedback('warning');
      builtWordIndicator.value?.dismissWith();
      break;
    case 'found':
      if (r.foundBefore) {
        await notificationFeedback('warning');
        builtWordIndicator.value?.dismissWith();
      } else {
        builtWordIndicator.value?.dismissWith('word');
        puzzleGrid.value?.animateGlowCells(r.cells);
      }
      break;
  }
}

function buy(cells: Array<[number, number]>) {
  if (buyCells(cells)) {
    goToNextLevel();
  }
}

function updateBuiltWord(word: string) {
  builtWordIndicator.value?.updateWord(word);
}

function activateCheatCode() {
  cheatCodeInput.value = '';
  showCheatCodeInput.value = true;
  setTimeout(() => {
    cheatCodeInputElement.value?.focus();
  }, 150);
}

function submitCheatCode() {
  cheatCodeInputElement.value?.blur();
  setTimeout(() => (showCheatCodeInput.value = false), 150);

  const code = cheatCodeInput.value.toLowerCase();
  cheatCodeInput.value = '';

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
      if (unlock('public')) {
        showNewlyUnlockedIndicator.value = true;
      }
      break;
    case 'reload':
      loadAndSetPuzzle();
      break;
    case 'bonus':
      wordBuilder.value?.showBonusAnimation();
      availableBonusWordPoints.value++;
      break;
    case 'zebra':
      if (unlock('zebra')) {
        showNewlyUnlockedIndicator.value = true;
      }
      break;
    default:
      notificationFeedback('error');
      return;
  }

  impactFeedback('light');
}

let hideHelpTask = -1;
const showHelp = ref(false);

function requestShowHelp() {
  if (hideHelpTask !== -1) {
    clearTimeout(hideHelpTask);
  }

  showHelp.value = true;
  hideHelpTask = setTimeout(() => {
    showHelp.value = false;
    hideHelpTask = -1;
  }, 3000);
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

      if (buySelector.value?.hasSelection() === true) {
        puzzleGrid.value?.resetSelection();
      } else {
        showBuySelector.value = false;
      }
    }
);

useEventListener(
    'touchstart',
    (event: TouchEvent) => {
      event.preventDefault();
    }
);

let hasRanInitialLoad = false;
watch(isLoaded, l => {
  if (!l || hasRanInitialLoad) return;
  hasRanInitialLoad = true;

  const c = document.body.classList;
  c.remove('launch-screen-pallet');
  c.add('bg-background-50');
});

loadTheme();
loadAndSetPuzzle();
</script>