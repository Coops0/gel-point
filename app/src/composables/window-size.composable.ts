import { onMounted, ref } from 'vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { useInterval } from '@/composables/interval.composable.ts';

export const useWindowSize = () => {
    const width = ref(window.innerWidth);
    const height = ref(window.innerHeight);

    const updateDimensions = () => {
        width.value = window.innerWidth;
        height.value = window.innerHeight;
    };

    useEventListener('resize', () => updateDimensions());
    onMounted(() => updateDimensions());
    useInterval(() => updateDimensions(), 1000);

    return { width, height };
};