import { promises as fs } from 'fs';

async function r() {
	const words = await fs.readFile('../public/words-filtered.txt', { encoding: 'utf-8' }).then(w => w.split('\n'));

	const w = words // test alphabetical
		.filter(word => word.length >= 4 && word.length <= 10 && /^[A-Z]+$/i.test(word))
		.map(word => word.toLowerCase())
		.filter(word => {
			const letters = [];
			for (const l of word.split('')) {
				if (letters.includes(l)) {
					return false;
				} else {
					letters.push(l);
				}
			}

			return true;
		});

	console.log(`available words ${ words.length } => ${ w.length }`);
	await fs.writeFile('../public/words-filtered.txt', w.join('\n'));
}

async function b() {
	const words = await fs.readFile('../public/fair-puzzle-words.txt', { encoding: 'utf-8' }).then(w => w.split('\n'));

	const w = words
		.filter(word => word.length >= 4 && word.length <= 10 && /^[A-Z]+$/i.test(word))
		.map(word => word.toLowerCase())
		.filter(word => {
			const letters = [];
			for (const l of word.split('')) {
				if (letters.includes(l)) {
					return false;
				} else {
					letters.push(l);
				}
			}

			return true;
		});

	console.log(`available words ${ words.length } => ${ w.length }`);
	await fs.writeFile('../public/fair-puzzle-words.txt', w.join('\n'));
}

async function verify() {
	const words = await fs.readFile('../public/words-filtered.txt', { encoding: 'utf-8' }).then(w => w.split('\n'));
	const puzzleWords = await fs.readFile('../public/fair-puzzle-words.txt', { encoding: 'utf-8' }).then(w => w.split('\n'));

	for (const w of puzzleWords) {
		if (!words.includes(w)) {
			console.warn(`missing word: ${ w }`);
		}
	}
}

// r();
// b();
verify();