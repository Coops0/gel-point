import { useLocalStorage } from '@/composables/local-storage.composable.ts';
import { onMounted, readonly, ref, watch } from 'vue';

export const THEMES = ['grapefruit', 'cotton-candy', 'lilac', 'chromatic', 'amber', 'ivy', 'zebra'] as const;
export const PUBLIC_THEMES = ['grapefruit', 'cotton-candy', 'lilac', 'chromatic', 'amber', 'ivy'] as const;

export const THEME_EMOJIS: { [key in typeof THEMES[number]]: string } = {
    'grapefruit': '🍆',
    'cotton-candy': '🍬',
    'lilac': '🪻',
    'chromatic': '🗿',
    'amber': '🏵️',
    'ivy': '🌿',
    'zebra': '🦓'
} as const;

// export const earnedThemes = useLocalStorage<(typeof THEMES[number])[]>('earned-themes', ['grapefruit']);
export const earnedThemes = ref<(typeof THEMES[number])[]>([...PUBLIC_THEMES]); // temporarily for beta
export const showNewlyUnlockedIndicator = useLocalStorage<boolean>('show-newly-unlocked-theme-indicator', false);

export interface Theme {
    name: typeof THEMES[number];
    dark: 'system' | 'always' | 'never';
}

const theme = useLocalStorage<Theme>(
    'theme',
    { name: 'grapefruit', dark: 'never' },
    JSON.stringify,
    JSON.parse,
    true
);

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

const unlock = (action: 'public' | 'next' | typeof THEMES[number] = 'next'): boolean => {
    switch (action) {
        case 'public': {
            const newThemes = PUBLIC_THEMES.filter(t => !earnedThemes.value.includes(t));
            earnedThemes.value = [...earnedThemes.value, ...newThemes];

            return newThemes.length === 0;
        }
        case 'next': {
            const nextTheme = PUBLIC_THEMES.find(t => !earnedThemes.value.includes(t));
            if (nextTheme) {
                earnedThemes.value = [...earnedThemes.value, nextTheme];
            }

            return !!nextTheme;
        }
        default: {
            if (earnedThemes.value.includes(action)) {
                return false;
            } else {
                earnedThemes.value = [...earnedThemes.value, action];
                return true;
            }
        }
    }
};

export const useTheme = () => {
    return {
        theme: readonly(theme),
        setTheme,
        earnedThemes,
        showNewlyUnlockedIndicator,
        loadTheme,
        unlock
    };
};