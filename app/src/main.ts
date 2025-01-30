import './assets/index.css';

import { createApp } from 'vue';
import App from './App.vue';
import { attachConsole, debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

(async function () {
    await attachConsole();

    // const replacements = [
    //     ['log', info],
    //     ['warn', warn],
    //     ['debug', debug],
    //     ['error', error],
    //     ['trace', trace]
    // ] as const;
    //
    // for (const [name, fn] of replacements) {
    //     console.log(`registering ${name} tauri log function`);
    //     const originalFn = console[name];
    //
    //     console[name] = function (message: string, ...args: any[]) {
    //         originalFn(message, ...args);
    //
    //         const formattedArgs = args.map(a => {
    //             if (a) {
    //                 try {
    //                     return JSON.stringify(a, null, 2);
    //                 } catch {
    //                     /* empty */
    //                 }
    //             }
    //
    //             return a;
    //         }).join(' ');
    //
    //         fn(message + (formattedArgs ? ` ${formattedArgs}` : ''))
    //             .catch(() => {
    //                 /* empty */
    //             });
    //     };
    // }
})();

createApp(App).mount('#app');