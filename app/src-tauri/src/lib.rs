use std::fs;
use anyhow::Context;
use crate::state::{memoized_fetch_cache, CachedData, Paths};
use log::warn;
use tauri::{Manager, State};
use tauri_plugin_fs::FsExt;
use tauri_plugin_log::TargetKind;

mod ctx_macro_offload;
mod state;

#[cfg(not(debug_assertions))]
const BASE_API_URL: &str = "https://gel-point.cooperhanessian.com";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .target(tauri_plugin_log::Target::new(TargetKind::Stdout))
                .target(tauri_plugin_log::Target::new(TargetKind::Webview))
                .build()
        )
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![get_game_data])
        .setup(|app| {
            let paths = Paths::new(app.path()).context("failed to init paths struct")?;

            let _ = fs::create_dir_all(paths.cache_dir());

            let scope = app.fs_scope();
            scope.allow_file(paths.words()).context("failed to allow words file via fs_scope")?;
            scope.allow_file(paths.puzzles()).context("failed to allow puzzles file via fs_scope")?;

            let state = tauri::async_runtime::block_on(async move {
                let (words, puzzles) = memoized_fetch_cache(&paths).await?;

                Ok::<CachedData, anyhow::Error>(CachedData { words, puzzles })
            }).context("failed to memoized fetch cache")?;

            if !app.manage(state) {
                warn!("failed to create managed app state in setup hook");
            }

            Ok(())
        })
        .run(ctx_macro_offload::ctx())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_game_data(state: State<'_, CachedData>) -> tauri::Result<&CachedData> {
    Ok(state.inner())
}
