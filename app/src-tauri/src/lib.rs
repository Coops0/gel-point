#![allow(clippy::missing_panics_doc, clippy::used_underscore_binding, clippy::large_stack_frames)]

use crate::{
    errors::{ResultExtDisplay, SmallError}, state::{memoized_fetch_cache, CachedData, Paths}
};
use log::{error, info, LevelFilter};
use serde::Serialize;
use std::{
    collections::HashSet, error::Error, fs, sync::{Arc, Mutex, MutexGuard}
};
use tauri::{command, generate_handler, path::BaseDirectory, App, Manager, State};
use tauri_plugin_fs::FsExt;
use tauri_plugin_log::{Target, TargetKind};
use tokio::sync::Notify;

mod ctx_macro_offload;
mod errors;
mod state;

const BASE_API_URL: &str = "https://gel-point.cooperhanessian.com";

struct AppState {
    cached_data: Mutex<Option<CachedData>>,
    notify: Notify
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([Target::new(TargetKind::Stdout)])
                .level(LevelFilter::Warn)
                .level_for("app_lib", LevelFilter::Trace)
                .build()
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_http::init())
        .append_invoke_initialization_script(include_str!("../assets/startup.js"))
        .invoke_handler(generate_handler![test_word, load_puzzle_buffered])
        .setup(|app: &mut App| -> Result<(), Box<dyn Error>> {
            let path = app.path();
            let paths = Paths::new(path).context("failed to init paths struct")?;

            let _ = fs::create_dir_all(paths.cache_dir());

            let scope = app.fs_scope();
            scope.allow_file(paths.words()).context("failed to allow words file via fs_scope")?;
            scope
                .allow_file(paths.puzzles())
                .context("failed to allow puzzles file via fs_scope")?;

            if !paths.puzzles().exists() {
                let bundled_puzzles = path
                    .resolve("./assets/puzzles.data", BaseDirectory::Resource)
                    .context("failed to resolve puzzles data path")?;

                let _ = fs::copy(&bundled_puzzles, paths.puzzles());
                info!("copied bundled puzzles to cache");
            }

            if !paths.words().exists() {
                let bundled_words = path
                    .resolve("./assets/words.data", BaseDirectory::Resource)
                    .context("failed to resolve words data path")?;

                let _ = fs::copy(&bundled_words, paths.words());
                info!("copied bundled words to cache");
            }

            let state = Arc::new(AppState {
                cached_data: Mutex::new(None::<CachedData>),
                notify: Notify::new()
            });

            if !app.manage(Arc::clone(&state)) {
                return Err(
                    SmallError::from("failed to create managed app state in setup hook").into()
                );
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
                    words.to_lowercase().split('\n').map(ToOwned::to_owned).collect::<HashSet<_>>();

                {
                    let mut state = state.cached_data.lock().unwrap();
                    *state = Some(CachedData { words, puzzles });
                }

                state.notify.notify_waiters();
            });

            Ok(())
        })
        .run(ctx_macro_offload::ctx())
        .expect("error while running tauri application");
}

async fn extract_state<'s>(
    state: &'s State<'s, Arc<AppState>>
) -> MutexGuard<'s, Option<CachedData>> {
    {
        let guard = state.cached_data.lock().unwrap();

        if guard.is_some() {
            return guard;
        }
    }

    state.notify.notified().await;
    state.cached_data.lock().unwrap()
}

#[command]
async fn test_word(state: State<'_, Arc<AppState>>, word: String) -> Result<bool, ()> {
    let state = extract_state(&state).await;
    let cached_data = state.as_ref().unwrap();
    Ok(cached_data.find_word(&word))
}

#[derive(Serialize)]
struct PuzzleBufferedResponse {
    puzzle: Option<String>,
    next_puzzle: Option<String>
}

#[command]
async fn load_puzzle_buffered(
    state: State<'_, Arc<AppState>>,
    id: u32
) -> Result<PuzzleBufferedResponse, ()> {
    let state = extract_state(&state).await;
    let cached_data = state.as_ref().unwrap();

    let mut viable_puzzles =
        cached_data.puzzles.iter().filter(|(&puzzle_id, _)| puzzle_id >= id).collect::<Vec<_>>();

    viable_puzzles.sort_by_key(|(&puzzle_id, _)| puzzle_id);

    let puzzle = viable_puzzles.first().map(|(_, puzzle)| *puzzle).cloned();
    let next_puzzle = viable_puzzles.get(1).map(|(_, puzzle)| *puzzle).cloned();

    Ok(PuzzleBufferedResponse { puzzle, next_puzzle })
}
