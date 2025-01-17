use crate::state::AppState;
use log::warn;
use std::{path::PathBuf, sync::Mutex};
use tauri::{path::PathResolver, AppHandle, Manager, State, Wry};
use tauri_plugin_fs::FsExt;
use tauri_plugin_log::TargetKind;

mod ctx_macro_offload;
mod state;

#[cfg(debug_assertions)]
const BASE_API_URL: &str = "http://localhost:8000";

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
        .setup(|app| {
            let scope = app.fs_scope();
            let path_resolver = app.path();

            let app_cache_dir = path_resolver.app_cache_dir()?;
            let app_data_dir = path_resolver.app_data_dir()?;

            scope.allow_file(app_cache_dir.join("puzzles.json"))?;
            scope.allow_file(app_cache_dir.join("words.txt"))?;
            scope.allow_file(app_data_dir.join("state.json"))?;

            let state = AppState::new(path_resolver)?;

            let state = tauri::async_runtime::block_on(async move {
                if let Err(why) = state.memoized_fetch_cache().await {
                    warn!("failed to memoize or fetch cache: {why:?}");
                }

                state
            });

            if !app.manage(state) {
                warn!("failed to create managed app state in setup hook");
            }

            Ok(())
        })
        .run(ctx_macro_offload::ctx())
        .expect("error while running tauri application");
}
