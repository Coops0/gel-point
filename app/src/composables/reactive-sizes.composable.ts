import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue';

export const useReactiveSizes = (
    wordContainer: Ref<HTMLElement | null> | null = null
) => {
    const width = ref(400);
    const height = ref(600);

    const updateDimensions = () => {
        if (wordContainer?.value) {
            width.value = wordContainer.value.clientWidth;
            height.value = wordContainer.value.clientHeight;
        } else {
            width.value = window.innerWidth;
            height.value = window.innerHeight;
        }
    };

    onMounted(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', updateDimensions);
    });

    if (wordContainer) {
        watch(wordContainer, () => updateDimensions(), { immediate: true });
    }

    return { width, height };
};