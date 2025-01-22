import { ref, type Ref, watch } from 'vue';

export interface LetterPosition {
    x: number;
    y: number;
    letter: string;
}

const CIRCLE_RADIUS = 70;
export const CIRCLE_CENTER_OFFSET = CIRCLE_RADIUS / 2;

const nudgeToZero = (value: number, threshold = 0.01): number => Math.abs(value) < threshold ? 0 : +value.toFixed(4);
const assignPositions = (l: string[]): LetterPosition[] => l.map((letter, i) => {
    const step = i / l.length;
    const angle = step * Math.PI * 2 - (Math.PI / 2);

    return {
        x: nudgeToZero((Math.cos(angle) * CIRCLE_RADIUS)) - CIRCLE_CENTER_OFFSET,
        y: nudgeToZero((Math.sin(angle) * CIRCLE_RADIUS)) - CIRCLE_CENTER_OFFSET,
        letter
    };
});

export const useLetterAlignment = (letters: Ref<string[]>) => {
    const alignedLetters = ref(assignPositions(letters.value));

    watch(letters, l => (alignedLetters.value = assignPositions(l)));

    const shuffle = () => {
        let shuffledLetters: LetterPosition[] = [...alignedLetters.value];

        let tries = 0;
        while (JSON.stringify(alignedLetters.value) === JSON.stringify(shuffledLetters)) {
            shuffledLetters = [...alignedLetters.value].sort(() => Math.random() - 0.5);

            if (++tries > 100) {
                console.warn('Shuffle failed to produce a new order after 100 attempts');
                break;
            }
        }

        shuffledLetters = assignPositions(shuffledLetters.map(l => l.letter));

        // adjust indices back to original
        alignedLetters.value = letters.value.map(l => shuffledLetters.find(ll => ll.letter === l)!);
    };

    return { alignedLetters, shuffle };
};