import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { watch } from 'vue';


const theme = useLocalStorage('theme', 'grapefruit');

export const useTheme = () => theme;

export const loadTheme = () => {
    watch(theme, t => (document.body.dataset.theme = t), { immediate: true });
};