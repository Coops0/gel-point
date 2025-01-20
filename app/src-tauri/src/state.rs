use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tauri::{path::PathResolver, Wry};
use tokio::try_join;

#[derive(Serialize, Clone)]
pub struct CachedData {
    pub words: String,
    pub puzzles: String,
    // pub game_state: String
}

pub struct Paths {
    cache_dir: PathBuf,
    // data_dir: PathBuf
}

impl Paths {
    pub fn new(path_resolver: &PathResolver<Wry>) -> tauri::Result<Self> {
        Ok(Self {
            cache_dir: path_resolver.app_cache_dir()?,
            // data_dir: path_resolver.app_data_dir()?
        })
    }

    pub fn words(&self) -> PathBuf {
        self.cache_dir.join("words.txt")
    }

    pub fn puzzles(&self) -> PathBuf {
        self.cache_dir.join("puzzles.json")
    }

    // pub fn game_state(&self) -> PathBuf {
    //     self.data_dir.join("state.json")
    // }
}

async fn memoize_or_fetch(path: &Path, route: &str) -> anyhow::Result<String> {
    let local_bytes = tokio::fs::read(path).await?;
    let mut hasher = Sha256::new();
    hasher.update(&local_bytes);

    let hash = hasher.finalize().to_vec();
    
    #[cfg(not(debug_assertions))]
    let remote_hash = reqwest::get(format!("{}/{route}/hash", crate::BASE_API_URL))
        .await?
        .bytes()
        .await?
        .to_vec();
    
    #[cfg(debug_assertions)]
    let remote_hash = hash.clone();

    if hash == remote_hash {
        return String::from_utf8(local_bytes).map_err(Into::into);
    }
    
    #[cfg(not(debug_assertions))]
    let text = reqwest::get(format!("{}/{route}", crate::BASE_API_URL)).await?.text().await?;
    
    #[cfg(debug_assertions)]
    let text = match route {
        "words" => include_str!("../assets/words.txt").to_string(),
        "puzzles" => include_str!("../assets/puzzles.json").to_string(),
        _ => unreachable!()
    };
    
    tokio::fs::write(path, text.as_bytes()).await?;

    Ok(text)
}

pub async fn memoized_fetch_cache(paths: &Paths) -> anyhow::Result<(String, String)> {
    let words_txt = paths.words();
    let puzzles_json = paths.puzzles();

    try_join!(memoize_or_fetch(&words_txt, "words"), memoize_or_fetch(&puzzles_json, "puzzles"))
        .map_err(Into::into)
}

// pub async fn try_load_game_state(paths: &Paths) -> anyhow::Result<String> {
//     tokio::fs::read_to_string(paths.game_state()).await.map_err(Into::into)
// }
