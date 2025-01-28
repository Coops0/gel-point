import { invoke } from '@tauri-apps/api/core';

export class WordService {
    async fetchWords(): Promise<string[]> {
        return await invoke<string>('load_words')
            .then(l => l.split('\n'));
    }
}