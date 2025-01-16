import { onMounted, readonly, ref } from 'vue';

export const useWords = () => {
    const words = ref<string[]>([]);

    onMounted(async () => {
        if (words.value.length !== 0) {
            return;
        }

        words.value = await fetch('/words.txt')
            .then(res => res.text())
            .then(words => words.split('\n'));
    });

    return readonly(words);
}