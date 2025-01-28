import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { onMounted, watch } from 'vue';

export const THEMES = ['grapefruit', 'cotton-candy'] as const;

export interface Theme {
    name: typeof THEMES[number];
    dark: 'system' | 'always' | 'never';
}

const theme = useLocalStorage<Theme>('theme', { name: 'grapefruit', dark: 'system' });

const darkMediaQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const setTheme = ({ name, dark }: Theme) => {
    const b = document.body;
    b.dataset.theme = name;

    const setDark = dark === 'system' ? darkMediaQuery().matches : dark === 'always';
    b.classList.toggle('dark', setDark);
};

export const useTheme = () => theme;

export const loadTheme = () => {
    watch(theme, t => setTheme(t), { immediate: true });
    onMounted(() => {
        darkMediaQuery().addEventListener('change', () => setTheme(theme.value));
    });
};