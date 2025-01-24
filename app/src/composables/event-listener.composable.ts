// addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;

import { onMounted, onUnmounted } from 'vue';

export const useEventListener = <K extends keyof DocumentEventMap>(
    type: K,
    listener: (ev: DocumentEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
) => {
    onMounted(() => {
        document.addEventListener(type, listener, options);
    });

    onUnmounted(() => {
        document.removeEventListener(type, listener);
    });
};