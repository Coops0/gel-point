import { computed, ref, type Ref, watch } from 'vue';

export interface LetterPosition<E = string> {
    x: number;
    y: number;
    letter: E;
}

const assignPositions = <E = string>(l: E[], circleRadius: number, circleXCenterOffset: number, circleYCenterOffset: number): LetterPosition<E>[] => {
    return l.map((letter, i) => {
        const step = i / l.length;
        const angle = Math.PI * (2 * step - (1 / 2));

        // (x-h)^2+(y-k)^2=r^2
        return {
            x: (Math.cos(angle)) * circleRadius + (circleXCenterOffset / 2) + 65,
            y: (Math.sin(angle) * circleRadius) - circleYCenterOffset,
            letter
        };
    });
};

export const useLetterAlignment = (letters: Ref<string[]>, windowWidth: Ref<number>) => {
    const circleRadius = computed(() => {
        const l = letters.value.length;
        if (l <= 5) return 70;
        if (l <= 8) return 100;
        return 120;
    });

    const circleXCenterOffset = computed(() => windowWidth.value / 2);
    const circleYCenterOffset = ref(200);

    const alignedLetters = ref(assignPositions(letters.value, circleRadius.value, circleXCenterOffset.value, circleYCenterOffset.value));

    watch(letters, l => (alignedLetters.value = assignPositions(l, circleRadius.value, circleXCenterOffset.value, circleYCenterOffset.value)));

    const shuffle = () => {
        const original: Array<[string, number]> = [...alignedLetters.value].map((l, i) => [l.letter, i]);

        let shuffledLetters = [...original];

        let tries = 0;
        while (JSON.stringify(original) === JSON.stringify(shuffledLetters)) {
            shuffledLetters.sort(() => Math.random() - 0.5);

            if (++tries > 100) {
                console.warn('Shuffle failed to produce a new order after 100 attempts');
                break;
            }
        }

        const shuffledLetterPositions = assignPositions(shuffledLetters, circleRadius.value, circleXCenterOffset.value, circleYCenterOffset.value);
        shuffledLetterPositions.sort((a, b) => a.letter[1] - b.letter[1]);

        // adjust array indices back to original
        alignedLetters.value = shuffledLetterPositions.map(l => ({ ...l, letter: letters.value[l.letter[1]] }));
    };

    return { alignedLetters, shuffle, circleRadius, circleXCenterOffset, circleYCenterOffset };
};