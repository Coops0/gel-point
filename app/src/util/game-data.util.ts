import { type Ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface StaticPuzzle {
    words: string[];
    grid: string[];
}

export async function fetchGameData(words: Ref<string[]>, puzzles: Ref<StaticPuzzle[]>) {
    const { words: rawWords, puzzles: rawPuzzles } = await invoke<{ words: string; puzzles: string }>('get_game_data');

    words.value = rawWords.split('\n');
    puzzles.value = JSON.parse(rawPuzzles);
}