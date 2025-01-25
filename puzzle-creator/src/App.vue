<template>
  <div>
    <div class="flex flex-col gap-2 justify-center items-center select-none">
      <div
          class="flex flex-row gap-2"
          v-for="(row, rowIndex) in grid"
          :key="rowIndex"
      >
        <div
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            class="flex items-center justify-center text-2xl size-16 font-medium transition-colors"
            :class="{
            'bg-gray-400 text-white': cell !== null && cell !== undefined,
            'bg-gray-200': cell === null,
            'ring-2 ring-indigo-500': selectedCell !== null && selectedCell[0] === rowIndex && selectedCell[1] === colIndex,
            '!bg-indigo-400': (currentlyDragging && isInRange(rowIndex, colIndex, currentlyDragging)),
            'bg-indigo-300': isInAWord(rowIndex, colIndex)
          }"
            @pointerdown="e => startDrag(e,rowIndex, colIndex)"
            @mouseover="() => mouseOver(rowIndex, colIndex)"
        >
          {{ cell }}
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 justify-center items-center">
      <input type="number" v-model.number="width"/>
      <input type="number" v-model.number="height"/>
      <button @click="() => copy()">Copy</button>
      <p>{{letters.join(' ') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

interface Range {
  from: [number, number];
  to: [number, number];
}

const width = ref(8);
const height = ref(8);

const grid = ref<(string | null)[][]>(
    Array.from({ length: height.value }, () => Array.from({ length: width.value }, () => null))
);

const words = ref<Range[]>([]);

const letters = computed(() => {
  const l: string[] = [];

  for (const word of words.value) {
    const range = buildRange(word);
    const wordLetters = range.map(([i, j]) => grid.value[i][j]).join('');
    let wordLetterOccurrences: { [letter: string]: number } = {};
    for (const letter of wordLetters) {
      wordLetterOccurrences[letter] = (wordLetterOccurrences[letter] || 0) + 1;
    }

    for (const [letter, occurrences] of Object.entries(wordLetterOccurrences)) {
      if (l.filter(l => l === letter).length < occurrences) {
        l.push(letter);
      }
    }
  }

  l.sort(() => Math.random() - 0.5);

  return l;
});

watch([width, height], ([w, h]) => {
  grid.value.length = h;
  grid.value.forEach(row => (row.length = w));

  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      try {
        if (grid.value[i][j] === undefined) {
          grid.value[i][j] = null;
        }
      } catch {
        grid.value[i] = Array.from({ length: w }, () => null);
      }
    }
  }
});

const selectedCell = ref<[number, number] | null>(null);
const currentlyDragging = ref<Range | null>(null);

onMounted(() => {
  document.addEventListener('keydown', e => {
    e.preventDefault();

    const cell = selectedCell.value;
    if (!cell) return;

    selectedCell.value = null;
    currentlyDragging.value = null;

    let key: string | null = e.key.toLowerCase();
    // if not alphabetic
    if (key.length !== 1 || !/^[A-Z]+$/i.test(key)) {
      key = null;
    }

    grid.value[cell[0]][cell[1]] = key;
  });

  document.addEventListener('pointerup', () => {
    const range = currentlyDragging.value;
    if (!range) return;

    currentlyDragging.value = null;

    const { from, to } = range;

    if (from[0] === to[0] && from[1] === to[1]) {
      selectedCell.value = from;
      return;
    }

    const builtRange = buildRange(range);

    if (builtRange.every(([i, j]) => grid.value[i][j] !== null) && !builtRange.some(([i, j]) => i !== from[0] && j !== from[1])) {
      words.value.push(range);
    }


    // let word = '';
    // let coords = [];
    //
    // for (let i = from[0]; i <= to[0]; i++) {
    //   for (let j = from[1]; j <= to[1]; j++) {
    //     word += grid.value[i][j] || '';
    //     coords.push(`${i},${j}`);
    //   }
    // }

    // selectedWords.value.push(`${word},${coords.join(',')}`);

  });
});

const buildRange = ({ from, to }: Range): Array<[number, number]> => {
  const range = [];

  for (let i = from[0]; i <= to[0]; i++) {
    for (let j = from[1]; j <= to[1]; j++) {
      range.push(<[number, number]>[i, j]);
    }
  }

  return range;
};

const isInRange = (rowIndex: number, colIndex: number, range: Range) => {
  return buildRange(range).some(([i, j]) => i === rowIndex && j === colIndex);
};

const isInAWord = (rowIndex: number, colIndex: number) => {
  return words.value.some(range => isInRange(rowIndex, colIndex, range));
};

function startDrag(event: MouseEvent, rowIndex: number, colIndex: number) {
  if (event.button !== 2) {
    currentlyDragging.value = { from: [rowIndex, colIndex], to: [rowIndex, colIndex] };
    return;
  }

  event.preventDefault();

  const range = words.value.findIndex(range => isInRange(rowIndex, colIndex, range));
  if (range === -1) {
    return;
  }

  words.value = words.value.filter((_, i) => i !== range);

  setTimeout(() => {
    currentlyDragging.value = null;
    selectedCell.value = null;
  });
}

function mouseOver(rowIndex: number, colIndex: number) {
  if (currentlyDragging.value) {
    currentlyDragging.value.to = [rowIndex, colIndex];
  }
}

function copy() {
  const wordsSerialized = words.value.map(r => {
    const range = buildRange(r);
    const word = range.map(([i, j]) => grid.value[i][j] || '').join('');

    let letterCheck: string[] = [];
    word.split('').forEach(letter => {
      if (letterCheck.includes(letter)) {
        alert(`LETTER ${letter.toUpperCase()} IS DUPLICATED IN WORD ${word.toUpperCase()}`);
        return;
      }
      letterCheck.push(letter);
    });

    const coords = range.map(([i, j]) => `${i},${j}`).join(',');
    return `${word},${coords}`;
  });

  const payload = {
    grid: grid.value.map(row => row.map(cell => !cell ? '0' : cell).join('')),
    words: wordsSerialized,
    letters: letters.value.join('')
  };

  console.log(payload);

  try {
    navigator.clipboard.writeText(JSON.stringify(payload));
  } catch {
    alert('cc copy fail');
  }
}
</script>
