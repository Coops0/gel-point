use crate::state::{memoized_fetch_cache, CachedData, Paths};
use anyhow::Context;
use serde::Serialize;
use std::{
    fs, sync::{Arc, Mutex}, time::Duration
};
use tauri::{command, generate_handler, Manager, State};
use tauri_plugin_fs::FsExt;
use tokio::time::sleep;

mod ctx_macro_offload;
mod state;

#[cfg(not(debug_assertions))]
const BASE_API_URL: &str = "https://gel-point.cooperhanessian.com";

type AppState = Arc<Mutex<Option<CachedData>>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(generate_handler![load_words, load_puzzle_buffered])
        .setup(|app| {
            let paths = Paths::new(app.path()).context("failed to init paths struct")?;

            let _ = fs::create_dir_all(paths.cache_dir());

            let scope = app.fs_scope();
            scope.allow_file(paths.words()).context("failed to allow words file via fs_scope")?;
            scope
                .allow_file(paths.puzzles())
                .context("failed to allow puzzles file via fs_scope")?;

            let state = Arc::new(Mutex::new(None::<CachedData>));
            if !app.manage(Arc::clone(&state)) {
                panic!("failed to create managed app state in setup hook");
            }

            tauri::async_runtime::spawn(async move {
                let (words, puzzles) =
                    memoized_fetch_cache(&paths).await.expect("failed to get game data");

                let mut state = state.lock().expect("failed to lock state");
                *state = Some(CachedData { words, puzzles });
            });

            Ok(())
        })
        .run(ctx_macro_offload::ctx())
        .expect("error while running tauri application");
}

#[command]
async fn load_words(state: State<'_, AppState>) -> Result<String, ()> {
    while state.lock().unwrap().is_none() {
        sleep(Duration::from_millis(100)).await;
    }

    let state = state.lock().unwrap();
    Ok(state.as_ref().unwrap().words.clone())
}

#[derive(Serialize)]
struct PuzzleBufferedResponse {
    puzzle: Option<String>,
    next_puzzle: Option<String>
}

#[command]
async fn load_puzzle_buffered(
    state: State<'_, AppState>,
    id: u32
) -> Result<PuzzleBufferedResponse, ()> {
    while state.lock().unwrap().is_none() {
        sleep(Duration::from_millis(100)).await;
    }

    let state = state.lock().unwrap();

    let mut viable_puzzles = state
        .as_ref()
        .unwrap()
        .puzzles
        .iter()
        .filter(|(&puzzle_id, _)| puzzle_id >= id)
        .map(|(_, puzzle)| puzzle);

    let puzzle = viable_puzzles.next().cloned();
    let next_puzzle = viable_puzzles.next().cloned();

    Ok(PuzzleBufferedResponse { puzzle, next_puzzle })
}
