import fs from 'fs';

type Grid = (string | '0')[][];

interface Puzzle {
  grid: Grid;
  words: string[];
}

const GRID_SIZE = 8;
const VALID_LETTERS = ['B', 'O', 'R', 'I', 'N'];
const MIN_WORD_LENGTH = 3;
const WORD_LIST_PATH = '../public/words.txt';

// Reads and filters the word list.
const loadWords = (): string[] => {
  const rawWords = fs.readFileSync(WORD_LIST_PATH, 'utf-8').split('\n');
  return rawWords
    .map(word => word.trim().toLowerCase())
    .filter(word =>
      word.length >= MIN_WORD_LENGTH &&
      [...word].every(char => VALID_LETTERS.includes(char.toUpperCase()))
    );
};

const createEmptyGrid = (): Grid => {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('0'));
};

const isValidPlacement = (
  grid: Grid,
  word: string,
  row: number,
  col: number,
  horizontal: boolean
): boolean => {
  for (let i = 0; i < word.length; i++) {
    const r = row + (horizontal ? 0 : i);
    const c = col + (horizontal ? i : 0);

    if (
      r >= GRID_SIZE ||
      c >= GRID_SIZE ||
      (grid[r][c] !== '0' && grid[r][c] !== word[i]) ||
      (horizontal && c < GRID_SIZE - 1 && grid[r][c + 1] === word[i]) ||
      (!horizontal && r < GRID_SIZE - 1 && grid[r + 1][c] === word[i])
    ) {
      return false;
    }
  }
  return true;
};

const placeWord = (
  grid: Grid,
  word: string,
  row: number,
  col: number,
  horizontal: boolean
): void => {
  for (let i = 0; i < word.length; i++) {
    const r = row + (horizontal ? 0 : i);
    const c = col + (horizontal ? i : 0);
    grid[r][c] = word[i];
  }
};

const generatePuzzle = (words: string[]): Puzzle => {
  const grid = createEmptyGrid();
  const placedWords: { word: string; coordinates: string }[] = [];

  words.sort((a, b) => b.length - a.length); // Prioritize longer words.

  for (const word of words) {
    let placed = false;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        for (const horizontal of [true, false]) {
          if (isValidPlacement(grid, word, row, col, horizontal)) {
            placeWord(grid, word, row, col, horizontal);
            placedWords.push({
              word,
              coordinates: word
                .split('')
                .map((_, i) => {
                  const r = row + (horizontal ? 0 : i);
                  const c = col + (horizontal ? i : 0);
                  return `${r},${c}`;
                })
                .join(',')
            });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }
  }

  return {
    grid: grid.map(row => row.join('')) as unknown as Grid,
    words: placedWords.map(({ word, coordinates }) => `${word},${coordinates}`)
  };
};

const main = () => {
  const wordList = loadWords();
  const puzzle = generatePuzzle(wordList);

  console.log(JSON.stringify(puzzle, null, 2));
};

main();

