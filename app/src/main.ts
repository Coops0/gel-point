import './assets/index.css';

import { createApp } from 'vue';
import App from './App.vue';
import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

createApp(App).mount('#app');

// https://v2.tauri.app/plugin/logging/#logging
function forwardConsole(
    fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
    logger: (message: string) => Promise<void>
) {
    const original = console[fnName];
    console[fnName] = (message) => {
        original(message);
        // noinspection JSIgnoredPromiseFromCall
        logger(message).catch();
    };
}

forwardConsole('log', trace);
forwardConsole('debug', debug);
forwardConsole('info', info);
forwardConsole('warn', warn);
forwardConsole('error', error);