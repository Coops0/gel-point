import { computed, ref } from 'vue';

export interface LetterPosition {
    x: number;
    y: number;
    letter: string;
}

export const useLetterAlignment = (letters: string[]) => {
    const circleRadius = ref(130);

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

    return { alignedLetters };
}