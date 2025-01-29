import { computed, ref, type Ref, watch } from 'vue';

export interface LetterPosition<E = string> {
    x: number;
    y: number;
    letter: E;
}

const nudgeToZero = (value: number, threshold = 0.01): number => Math.abs(value) < threshold ? 0 : +value.toFixed(4);
const assignPositions = <E = string>(l: E[], circleRadius: number, circleCenterOffset: number): LetterPosition<E>[] => {
    return l.map((letter, i) => {
        const step = i / l.length;
        const angle = step * Math.PI * 2 - (Math.PI / 2);

        return {
            x: nudgeToZero((Math.cos(angle) * circleRadius)) - circleCenterOffset,
            y: nudgeToZero((Math.sin(angle) * circleRadius)) - circleCenterOffset,
            letter
        };
    });
};

export const useLetterAlignment = (letters: Ref<string[]>) => {
    const circleRadius = computed(() => {
        const l = letters.value.length;
        if (l <= 5) return 70;
        if (l <= 8) return 100;
        return 120;
    });

    const circleCenterOffset = computed(() => circleRadius.value / 2);

    const alignedLetters = ref(assignPositions(letters.value, circleRadius.value, circleCenterOffset.value));

    watch(letters, l => (alignedLetters.value = assignPositions(l, circleRadius.value, circleCenterOffset.value)));

    const shuffle = () => {
        const original: Array<[string, number]> =  [...alignedLetters.value].map((l, i) => [l.letter, i]);

        let shuffledLetters = [...original];

        let tries = 0;
        while (JSON.stringify(original) === JSON.stringify(shuffledLetters)) {
            shuffledLetters.sort(() => Math.random() - 0.5);

            if (++tries > 100) {
                console.warn('Shuffle failed to produce a new order after 100 attempts');
                break;
            }
        }

        const shuffledLetterPositions = assignPositions(shuffledLetters, circleRadius.value, circleCenterOffset.value);
        shuffledLetterPositions.sort((a, b) => a.letter[1] - b.letter[1]);

        // adjust indices back to original
        alignedLetters.value = shuffledLetterPositions.map(l => ({ ...l, letter: letters.value[l.letter[1]] }))
    };

    return { alignedLetters, shuffle, circleRadius, circleCenterOffset };
};