// declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

import { onMounted, onUnmounted } from 'vue';

export const useInterval = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
    let taskId: number | null = null;

    onMounted(() => {
        taskId = setInterval(handler, timeout, ...args);
    });

    onUnmounted(() => {
        if (taskId !== null) {
            clearInterval(taskId);
        }
    });
};