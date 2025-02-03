import { invoke } from '@tauri-apps/api/core';

export class WordService {
    async testWord(word: string): Promise<boolean> {
        return await invoke<boolean>('test_word', { word });
    }
}