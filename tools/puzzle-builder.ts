import { promises as fs } from 'fs';

const LETTER_COUNT = 5;
const PUZZLE_GRID_HEIGHT = 5;
const PUZZLE_GRID_WIDTH = 5;
const MIN_WORD_LENGTH = 3;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

interface Position {
	x: number;
	y: number;
}

interface WordPlacement {
	word: string;
	start: Position;
	direction: 'horizontal' | 'vertical';
}

interface Puzzle {
	grid: string[];
	words: string[];
}

function createEmptyGrid(): string[][] {
	return Array(PUZZLE_GRID_HEIGHT).fill(0).map(() =>
		Array(PUZZLE_GRID_WIDTH).fill('0')
	);
}

function canPlaceWord(
	grid: string[][],
	word: string,
	start: Position,
	direction: 'horizontal' | 'vertical'
): boolean {
	if (direction === 'horizontal') {
		if (start.x + word.length > PUZZLE_GRID_WIDTH) return false;

		for (let i = 0; i < word.length; i++) {
			const cell = grid[start.y][start.x + i];
			if (cell !== '0' && cell !== word[i]) return false;

			// No adjacent words on same axis
			if (i === 0 && start.x > 0 && grid[start.y][start.x - 1] !== '0') return false;
			if (i === word.length - 1 && start.x + i + 1 < PUZZLE_GRID_WIDTH &&
				grid[start.y][start.x + i + 1] !== '0') return false;
		}
	} else {
		if (start.y + word.length > PUZZLE_GRID_HEIGHT) return false;

		for (let i = 0; i < word.length; i++) {
			const cell = grid[start.y + i][start.x];
			if (cell !== '0' && cell !== word[i]) return false;

			// No adjacent words on same axis
			if (i === 0 && start.y > 0 && grid[start.y - 1][start.x] !== '0') return false;
			if (i === word.length - 1 && start.y + i + 1 < PUZZLE_GRID_HEIGHT &&
				grid[start.y + i + 1][start.x] !== '0') return false;
		}
	}
	return true;
}

function placeWord(
	grid: string[][],
	word: string,
	start: Position,
	direction: 'horizontal' | 'vertical'
) {
	if (direction === 'horizontal') {
		for (let i = 0; i < word.length; i++) {
			grid[start.y][start.x + i] = word[i];
		}
	} else {
		for (let i = 0; i < word.length; i++) {
			grid[start.y + i][start.x] = word[i];
		}
	}
}

function formatWordPlacement(
	word: string,
	start: Position,
	direction: 'horizontal' | 'vertical'
): string {
	const coordinates: number[] = [];
	for (let i = 0; i < word.length; i++) {
		if (direction === 'horizontal') {
			coordinates.push(start.x + i, start.y);
		} else {
			coordinates.push(start.x, start.y + i);
		}
	}
	return `${word},${coordinates.join(',')}`;
}

function countIntersections(
	grid: string[][],
	word: string,
	start: Position,
	direction: 'horizontal' | 'vertical'
): number {
	let intersections = 0;

	for (let i = 0; i < word.length; i++) {
		const x = direction === 'horizontal' ? start.x + i : start.x;
		const y = direction === 'vertical' ? start.y + i : start.y;
		if (grid[y][x] === word[i]) {
			intersections++;
		}
	}

	return intersections;
}

async function generatePuzzle(): Promise<Puzzle | null> {
	const words = await fs.readFile('../public/fair-puzzle-words.txt', { encoding: 'utf-8' })
		.then(w => w.split('\n'));
	console.log(`loaded ${words.length} words`);

	// Pick exactly LETTER_COUNT random letters
	const selectedLetters = [...ALPHABET]
		.sort(() => Math.random() - 0.5)
		.slice(0, LETTER_COUNT);

	console.log('chose letters:', selectedLetters);

	// Only include words that use our selected letters
	const filteredWords = words
		.filter(word => word.length >= MIN_WORD_LENGTH)
		.filter(word => word.split('').every(letter => selectedLetters.includes(letter)))
		.sort((a, b) => b.length - a.length); // Prioritize longer words

	console.log('filtered words:', filteredWords.length);

	let bestGrid = createEmptyGrid();
	let bestWords: WordPlacement[] = [];
	let bestScore = -1;

	// Try multiple puzzles
	for (let puzzleAttempt = 0; puzzleAttempt < 20; puzzleAttempt++) {
		const currentGrid = createEmptyGrid();
		const placedWords: WordPlacement[] = [];

		// Try to place words
		for (const word of filteredWords) {
			if (placedWords.find(p => p.word === word)) continue;

			let bestPlacement: WordPlacement | null = null;
			let maxIntersections = -1;

			// Try every possible position
			for (let y = 0; y < PUZZLE_GRID_HEIGHT; y++) {
				for (let x = 0; x < PUZZLE_GRID_WIDTH; x++) {
					for (const direction of ['horizontal', 'vertical'] as const) {
						const pos = { x, y };
						if (!canPlaceWord(currentGrid, word, pos, direction)) continue;

						const intersections = countIntersections(currentGrid, word, pos, direction);
						if (intersections > maxIntersections ||
							(intersections === maxIntersections && Math.random() < 0.5)) {
							maxIntersections = intersections;
							bestPlacement = { word, start: pos, direction };
						}
					}
				}
			}

			// Place the word with most intersections if found
			if (bestPlacement && (maxIntersections > 0 || placedWords.length === 0)) {
				placeWord(currentGrid, bestPlacement.word, bestPlacement.start, bestPlacement.direction);
				placedWords.push(bestPlacement);
			}
		}

		// Score based on word count and total intersections
		const score = placedWords.length * 100 + placedWords.reduce((sum, placement) =>
			sum + countIntersections(currentGrid, placement.word, placement.start, placement.direction), 0);

		if (score > bestScore) {
			bestScore = score;
			bestGrid = currentGrid.map(row => [...row]);
			bestWords = [...placedWords];
		}
	}

	if (bestWords.length === 0) return null;

	return {
		grid: bestGrid.map(row => row.join('')),
		words: bestWords.map(placement => formatWordPlacement(
			placement.word,
			placement.start,
			placement.direction
		))
	};
}

async function r() {
	for(let i = 0; i < 10000; i++) {
		const puzzle = await generatePuzzle();
		if (puzzle) {
			if (puzzle.words.length === 1) {
				continue;
			}

			console.log(JSON.stringify(puzzle, null, 2));
			break;
		} else {
			console.log('Failed to generate valid puzzle');
		}
	}
}

r();