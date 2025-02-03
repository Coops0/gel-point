use crate::state::{memoized_fetch_cache, CachedData, Paths};
use anyhow::Context;
use log::{error, LevelFilter};
use serde::Serialize;
use std::{
    fs, sync::{Arc, Mutex}, time::Duration
};
use tauri::{command, generate_handler, path::BaseDirectory, Manager, State};
use tauri_plugin_fs::FsExt;
use tauri_plugin_log::{Target, TargetKind};
use tokio::time::sleep;

mod ctx_macro_offload;
mod state;

#[cfg(not(debug_assertions))]
const BASE_API_URL: &str = "https://gel-point.cooperhanessian.com";

type AppState = Arc<Mutex<Option<CachedData>>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([Target::new(TargetKind::Stdout), Target::new(TargetKind::Webview)])
                .level(LevelFilter::Warn)
                .build()
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(generate_handler![test_word, load_puzzle_buffered])
        .setup(|app| {
            let path = app.path();
            let paths = Paths::new(path).context("failed to init paths struct")?;

            let _ = fs::create_dir_all(paths.cache_dir());

            let scope = app.fs_scope();
            scope.allow_file(paths.words()).context("failed to allow words file via fs_scope")?;
            scope
                .allow_file(paths.puzzles())
                .context("failed to allow puzzles file via fs_scope")?;

            if !paths.puzzles().exists() {
                let bundled_puzzles =
                    path.resolve("./assets/puzzles.txt", BaseDirectory::Resource)?;
                let _ = fs::copy(&bundled_puzzles, paths.puzzles());
            }

            if !paths.words().exists() {
                let bundled_words = path.resolve("./assets/words.txt", BaseDirectory::Resource)?;
                let _ = fs::copy(&bundled_words, paths.words());
            }

            let state = Arc::new(Mutex::new(None::<CachedData>));
            if !app.manage(Arc::clone(&state)) {
                return Err(Box::from("failed to create managed app state in setup hook"));
            }

            tauri::async_runtime::spawn(async move {
                let (words, puzzles) = match memoized_fetch_cache(&paths).await {
                    Ok((words, puzzles)) => (words, puzzles),
                    Err(e) => {
                        // for some reason tauri ignores panics in async threads
                        error!("failed to fetch cache: {e:?}");
                        panic!("failed to fetch cache: {e:?}");
                    }
                };

                let words =
                    words.to_lowercase().split("\n").map(ToOwned::to_owned).collect::<Vec<_>>();

                let mut state = state.lock().unwrap();
                *state = Some(CachedData { words, puzzles });
            });

            Ok(())
        })
        .run(ctx_macro_offload::ctx())
        .expect("error while running tauri application");
}

#[command]
async fn test_word(state: State<'_, AppState>, word: String) -> Result<bool, ()> {
    while state.lock().unwrap().is_none() {
        sleep(Duration::from_millis(100)).await;
    }

    let state = state.lock().unwrap();
    Ok(state.as_ref().unwrap().find_word(&word))
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
        .collect::<Vec<_>>();

    viable_puzzles.sort_by_key(|(&puzzle_id, _)| puzzle_id);

    let puzzle = viable_puzzles.first().map(|(_, puzzle)| *puzzle).cloned();
    let next_puzzle = viable_puzzles.get(1).map(|(_, puzzle)| *puzzle).cloned();

    Ok(PuzzleBufferedResponse { puzzle, next_puzzle })
}
