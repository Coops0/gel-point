use crate::BASE_API_URL;
use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf}, sync::{Arc, Mutex, MutexGuard}
};
use tauri::{path::PathResolver, Wry};
use tauri_plugin_http::reqwest;
use tokio::try_join;

pub struct AppState {
    paths: Paths,
    cache: Arc<Mutex<Cache>>,
}

impl AppState {
    pub fn new(path_resolver: &PathResolver<Wry>) -> tauri::Result<Self> {
        Ok(Self {
            paths: Paths::new(path_resolver)?,
            cache: Arc::new(Mutex::new(Cache::default()))
        })
    }
}

struct Paths {
    cache_dir: PathBuf,
    data_dir: PathBuf
}

impl Paths {
    fn new(path_resolver: &PathResolver<Wry>) -> tauri::Result<Self> {
        Ok(Self {
            cache_dir: path_resolver.app_cache_dir()?,
            data_dir: path_resolver.app_data_dir()?
        })
    }

    fn words(&self) -> PathBuf {
        self.cache_dir.join("words.txt")
    }

    fn puzzles(&self) -> PathBuf {
        self.cache_dir.join("puzzles.json")
    }
}

#[derive(Default)]
struct Cache {
    words: Option<String>,
    puzzles: Option<String>
}

async fn memoize_or_fetch(path: &Path, route: &str) -> anyhow::Result<String> {
    let local_bytes = tokio::fs::read(path).await?;
    let mut hasher = Sha256::new();
    hasher.update(&local_bytes);

    let hash = hasher.finalize().to_vec();

    let remote_hash =
        reqwest::get(format!("{BASE_API_URL}/{route}/hash")).await?.bytes().await?.to_vec();

    let text = if hash == remote_hash {
        String::from_utf8(local_bytes)?
    } else {
        let t = reqwest::get(format!("{BASE_API_URL}/{route}")).await?.text().await?;
        tokio::fs::write(path, t.as_bytes()).await?;

        t
    };

    Ok(text)
}

impl AppState {
    fn c(&self) -> MutexGuard<'_, Cache> {
        self.cache.lock().expect("cache mutex was poisoned")
    }

    pub async fn memoized_fetch_cache(&self) -> anyhow::Result<()> {
        let words_txt = self.paths.words();
        let puzzles_json = self.paths.puzzles();

        let (words, puzzles) = try_join!(
            memoize_or_fetch(&words_txt, "words"),
            memoize_or_fetch(&puzzles_json, "puzzles")
        )?;

        let mut c = self.c();
        c.words = Some(words);
        c.puzzles = Some(puzzles);

        Ok(())
    }
}
