import { computed, ref, type Ref, watch } from 'vue';

export interface LetterPosition {
    x: number;
    y: number;
    letter: string;
}

const CIRCLE_RADIUS = 70;
export const CIRCLE_CENTER_OFFSET = CIRCLE_RADIUS / 2;

const nudgeToZero = (value: number, threshold = 0.01): number => Math.abs(value) < threshold ? 0 : +value.toFixed(4);

export const useLetterAlignment = (letters: Ref<string[]>, width: Ref<number>) => {
    const localLetters = ref(letters.value);
    watch(letters, l => (localLetters.value = l));

    const alignedLetters = computed<LetterPosition[]>(() => {
        return localLetters.value.map((letter, i) => {
            const step = i / localLetters.value.length;
            const angle = step * Math.PI * 2 - (Math.PI / 2);

            return {
                x: nudgeToZero((Math.cos(angle) * CIRCLE_RADIUS)) - CIRCLE_CENTER_OFFSET,
                y: nudgeToZero((Math.sin(angle) * CIRCLE_RADIUS)) - CIRCLE_CENTER_OFFSET,
                letter
            };
        });
    });

    const shuffle = () => {
        localLetters.value = localLetters.value.sort(() => Math.random() - 0.5);
    };

    return { alignedLetters, shuffle };
};