import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { onMounted, readonly, watch } from 'vue';

export const THEMES = ['grapefruit', 'cotton-candy'] as const;

export const earnedThemes = useLocalStorage<(typeof THEMES[number])[]>('earned-themes', ['grapefruit']);
export const showNewlyUnlockedIndicator = useLocalStorage<boolean>('show-newly-unlocked-theme-indicator', false);

export interface Theme {
    name: typeof THEMES[number];
    dark: 'system' | 'always' | 'never';
}

const theme = useLocalStorage<Theme>('theme', { name: 'grapefruit', dark: 'system' });

const darkMediaQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const setTheme = (t: Theme) => {
    theme.value = t;

    const b = document.body;
    b.dataset.theme = t.name;

    const setDark = t.dark === 'system' ? darkMediaQuery().matches : t.dark === 'always';
    b.classList.toggle('dark', setDark);
};

const loadTheme = () => {
    watch(theme, t => setTheme(t), { immediate: true });
    onMounted(() => {
        darkMediaQuery().addEventListener('change', () => setTheme(theme.value));
    });
};

const unlockNextTheme = (): boolean => {
    const nextTheme = THEMES.find(t => !earnedThemes.value.includes(t));

    if (nextTheme) {
        earnedThemes.value = [...earnedThemes.value, nextTheme];
        showNewlyUnlockedIndicator.value = true;

        return true;
    }

    return false;
}

export const useTheme = () => {
    return {
        theme: readonly(theme),
        setTheme,
        earnedThemes,
        showNewlyUnlockedIndicator,
        loadTheme,
        unlockNextTheme
    };
};