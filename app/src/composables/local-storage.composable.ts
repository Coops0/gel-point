import { ref, watch } from 'vue';

export const useLocalStorage = <T = unknown>(
    key: string,
    defaultValue: T,
    serialize: (data: T) => string = JSON.stringify,
    deserialize: (payload: string) => T = JSON.parse
) => {
    let initialLoadedValue = null;
    try {
        const rawPayload = localStorage.getItem(key);
        if (rawPayload) {
            initialLoadedValue = deserialize(rawPayload);
        }
    } catch {
        localStorage.setItem(key, serialize(defaultValue));
    }

    const value = ref<T>(initialLoadedValue || defaultValue);

    watch(value, v => localStorage.setItem(key, serialize(v)));

    return value;
};