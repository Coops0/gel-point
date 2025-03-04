use crate::data::{PUZZLES_DATA, WORDS_DATA};
use serde::Serialize;
use std::{
    collections::{HashMap, HashSet}, sync::Arc
};
use tauri::{command, generate_handler, App, Manager, State};

mod ctx_macro_offload;
mod data;

struct AppState {
    processed_words: HashSet<&'static str>,
    processed_puzzles: HashMap<u32, &'static str>
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_haptics::init())
        .append_invoke_initialization_script(include_str!("../assets/startup.js"))
        .invoke_handler(generate_handler![test_word, load_puzzle_buffered])
        .setup(|app: &mut App| {
            let processed_words = WORDS_DATA.lines().collect::<HashSet<_>>();

            let processed_puzzles = PUZZLES_DATA
                .lines()
                .filter_map(|line| {
                    let mut parts = line.split('|');
                    let id: u32 = parts.next()?.parse().ok()?;

                    Some((id, line))
                })
                .collect::<HashMap<u32, &str>>();

            let state = Arc::new(AppState { processed_words, processed_puzzles });
            app.manage(state);

            Ok(())
        })
        .run(ctx_macro_offload::ctx())
        .expect("error while running tauri application");
}

#[command]
fn test_word(state: State<'_, Arc<AppState>>, word: String) -> bool {
    state.processed_words.contains(&*word)
}

#[derive(Serialize)]
struct PuzzleBufferedResponse<'a> {
    puzzle: Option<&'a str>,
    next_puzzle: Option<&'a str>
}

#[command]
fn load_puzzle_buffered(
    state: State<'_, Arc<AppState>>,
    id: u32
) -> PuzzleBufferedResponse<'static> {
    let mut viable_puzzles = state
        .processed_puzzles
        .iter()
        .filter(|&(&puzzle_id, _)| puzzle_id >= id)
        .collect::<Vec<_>>();

    viable_puzzles.sort_by_key(|&(&puzzle_id, _)| puzzle_id);

    let puzzle = viable_puzzles.first().map(|&(_, &puzzle)| puzzle);
    let next_puzzle = viable_puzzles.get(1).map(|&(_, &puzzle)| puzzle);

    PuzzleBufferedResponse { puzzle, next_puzzle }
}
