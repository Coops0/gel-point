import { computed, ref, type Ref, watch } from 'vue';
import { clamp } from '@/util';

export interface LetterPosition {
    x: number;
    y: number;
    letter: string;
}

const CIRCLE_RADIUS = 70;

export const useLetterAlignment = (letters: Ref<string[]>, width: Ref<number>) => {
    const localLetters = ref(letters.value);
    watch(letters, l => (localLetters.value = l));

    const alignedLetters = computed<LetterPosition[]>(() =>
        localLetters.value.map((letter, i) => {
            const step = (i / localLetters.value.length);
            const angle = step * Math.PI * 2 - (Math.PI / 2);
            return {
                x: Math.cos(angle) * CIRCLE_RADIUS,
                y: Math.sin(angle) * CIRCLE_RADIUS,
                letter
            };
        })
    );

    const shuffle = () => {
        localLetters.value = localLetters.value.sort(() => Math.random() - 0.5);
    }

    return { alignedLetters, shuffle };
};