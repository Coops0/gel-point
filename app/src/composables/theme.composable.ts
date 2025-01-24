import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { watch } from 'vue';


const theme = useLocalStorage('theme', 'grapefruit');

export const useTheme = () => {
    watch(theme, t => (document.body.dataset.theme = t), { immediate: true });
    return theme;
};