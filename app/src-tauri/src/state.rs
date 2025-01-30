use anyhow::Context;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap, path::{Path, PathBuf}
};
use std::time::Duration;
use tauri::{path::PathResolver, Wry};
use tauri_plugin_http::reqwest;
use tokio::try_join;

#[derive(Serialize, Clone)]
pub struct CachedData {
    pub words: String,
    pub puzzles: HashMap<u32, String>
}

pub struct Paths {
    cache_dir: PathBuf
}

impl Paths {
    pub fn new(path_resolver: &PathResolver<Wry>) -> tauri::Result<Self> {
        Ok(Self { cache_dir: path_resolver.app_cache_dir()? })
    }

    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }

    pub fn words(&self) -> PathBuf {
        self.cache_dir.join("words.txt")
    }

    pub fn puzzles(&self) -> PathBuf {
        self.cache_dir.join("puzzles.txt")
    }
}

fn req_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(1))
        .build()
        // TODO root certificate?
        .unwrap()
}

#[cfg(not(debug_assertions))]
async fn fetch_hash(route: &str) -> anyhow::Result<Vec<u8>> {
    req_client().get(format!("{}/{route}/hash", crate::BASE_API_URL))
        .await?
        .bytes()
        .await
        .map_err(Into::into)
        .map(|r| r.to_vec())
}

#[cfg(not(debug_assertions))]
async fn fetch_text(route: &str) -> anyhow::Result<String> {
    req_client().get(format!("{}/{route}", crate::BASE_API_URL))
        .await?
        .text()
        .await
        .map_err(Into::into)
}

async fn memoize_or_fetch(path: &Path, route: &str) -> anyhow::Result<String> {
    let local_bytes = tokio::fs::read(path).await.unwrap_or_default();
    let hash = Sha256::digest(&local_bytes).to_vec();

    #[cfg(not(debug_assertions))]
    let remote_hash = match fetch_hash(route).await {
        Ok(h) => h,
        Err(_) => hash.clone()
    };

    #[cfg(debug_assertions)]
    let remote_hash = vec![0, 0, 0];

    if hash == remote_hash && !local_bytes.is_empty() {
        return String::from_utf8(local_bytes).map_err(Into::into);
    }

    #[cfg(not(debug_assertions))]
    let Ok(text) = fetch_text(route).await
    else {
        return String::from_utf8(local_bytes).map_err(Into::into);
    };

    #[cfg(debug_assertions)]
    let text = match route {
        "words" => include_str!("../assets/words.txt").to_string(),
        "puzzles" => include_str!("../assets/puzzles.txt").to_string(),
        _ => unreachable!()
    };

    tokio::fs::write(path, text.as_bytes()).await?;

    Ok(text)
}

pub async fn memoized_fetch_cache(paths: &Paths) -> anyhow::Result<(String, HashMap<u32, String>)> {
    let words_txt = paths.words();
    let puzzles_json = paths.puzzles();

    let (words, puzzles) = try_join!(
        memoize_or_fetch(&words_txt, "words"),
        memoize_or_fetch(&puzzles_json, "puzzles")
    )?;

    let puzzles = puzzles
        .split("\n")
        .map(|line| {
            let mut parts = line.split("|");
            let id: u32 = parts.next()?.parse().ok()?;

            Some((id.to_owned(), line.to_owned()))
        })
        .collect::<Option<HashMap<u32, String>>>()
        .context("failed to split puzzles")?;

    Ok((words, puzzles))
}
