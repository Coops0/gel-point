import { computed, ref, type Ref, watch } from 'vue';
import { clamp } from '@/util';

export interface LetterPosition {
    x: number;
    y: number;
    letter: string;
}

export const useLetterAlignment = (letters: Ref<string[]>, width: Ref<number>) => {
    const localLetters = ref(letters.value);
    watch(letters, l => (localLetters.value = l));

    const circleRadius = computed(() => clamp(width.value / 6.6, 60, 130));

    const alignedLetters = computed<LetterPosition[]>(() =>
        localLetters.value.map((letter, i) => {
            const step = (i / localLetters.value.length);
            const angle = step * Math.PI * 2 - (Math.PI / 2);
            return {
                x: Math.cos(angle) * circleRadius.value,
                y: Math.sin(angle) * circleRadius.value,
                letter
            };
        })
    );

    const shuffle = () => {
        localLetters.value = localLetters.value.sort(() => Math.random() - 0.5);
    }

    const circleSize = computed(() => clamp(width.value / 10, 60, 90));
    const sectionHeight = computed(() => circleRadius.value * 3.17);

    return { alignedLetters, circleSize, sectionHeight, shuffle };
};