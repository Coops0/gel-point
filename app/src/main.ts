import './assets/index.css';

import { createApp } from 'vue';
import App from './App.vue';
import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

createApp(App).mount('#app');