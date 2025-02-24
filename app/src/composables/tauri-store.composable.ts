import { LazyStore } from '@tauri-apps/plugin-store';

const store = new LazyStore('store.json');

const FOUND_BONUS_WORDS_KEY = 'found_bonus_words';

export const useTauriStore = () => {
    let foundBonusWords: string[] | null = null;

    const getFoundBonusWords = async () => {
        if (foundBonusWords === null) {
            foundBonusWords = await store.get<string[]>(FOUND_BONUS_WORDS_KEY) ?? [];
        }

        return foundBonusWords;
    }

    const setFoundBonusWords = async (words: string[]) => {
        foundBonusWords = words;
        await store.set(FOUND_BONUS_WORDS_KEY, words);
    }

    return { getFoundBonusWords, setFoundBonusWords };
}