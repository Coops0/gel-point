import { onMounted, onUnmounted, type Ref, ref } from 'vue';

export const useReactiveSizes = (wordContainer: Ref<HTMLElement | null>) => {
    const width = ref(400);
    const height = ref(600);

    const updateDimensions = () => {
        if (wordContainer.value) {
            width.value = wordContainer.value.clientWidth;
            height.value = wordContainer.value.clientHeight;
        }
    };

    onMounted(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', updateDimensions);
    });

    return { width, height };
};