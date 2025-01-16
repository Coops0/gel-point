import { computed, type Ref } from 'vue';
import { clamp } from '@/util';

export interface LetterPosition {
    x: number;
    y: number;
    letter: string;
}

export const useLetterAlignment = (letters: string[], width: Ref<number>) => {
    const circleRadius = computed(() => clamp(width.value / 6.6, 60, 130));

    const alignedLetters = computed<LetterPosition[]>(() =>
        letters.map((letter, i) => {
            const step = (i / letters.length);
            const angle = step * Math.PI * 2 - (Math.PI / 2);
            return {
                x: Math.cos(angle) * circleRadius.value,
                y: Math.sin(angle) * circleRadius.value,
                letter
            };
        })
    );

    const circleSize = computed(() => clamp(width.value / 10, 60, 90));
    const sectionHeight = computed(() => circleRadius.value * 3.17);

    return { alignedLetters, circleSize, sectionHeight };
};