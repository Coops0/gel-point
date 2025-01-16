import { ref, watch } from 'vue';

function loadAndParse<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
            return JSON.parse(raw);
        }
    } catch {
        /* empty */
    }
    return null;
}

export const useLocalStorage = <T = any>(key: string, defaultValue: T) => {
    const value = ref<T>(loadAndParse<T>(key) || defaultValue);
    watch(value, v => localStorage.setItem(key, JSON.stringify(v)));

    return value;
};