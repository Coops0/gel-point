use log::{info, warn};
use serde::Serialize;
use std::{
    collections::HashMap, path::{Path, PathBuf}, time::Duration
};
use tauri::{path::PathResolver, Wry};
use tauri_plugin_http::reqwest;
use tokio::try_join;

#[derive(Serialize, Clone)]
pub struct CachedData {
    pub words: Vec<String>,
    pub puzzles: HashMap<u32, String>
}

impl CachedData {
    pub fn find_word(&self, word: &str) -> bool {
        self.words.iter().any(|w| w == word)
    }
}

pub struct Paths {
    cache_dir: PathBuf
}

impl Paths {
    pub fn new(path_resolver: &PathResolver<Wry>) -> tauri::Result<Self> {
        Ok(Self { cache_dir: path_resolver.app_cache_dir()? })
    }

    #[allow(clippy::missing_const_for_fn)]
    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }

    pub fn hashes(&self) -> PathBuf {
        self.cache_dir.join("hashes.data")
    }

    pub fn words(&self) -> PathBuf {
        self.cache_dir.join("words.data")
    }

    pub fn puzzles(&self) -> PathBuf {
        self.cache_dir.join("puzzles.data")
    }
}

fn req_client() -> reqwest::Client {
    reqwest::Client::builder().timeout(Duration::from_secs(1)).build().unwrap()
}

async fn fetch_hash(route: &str) -> anyhow::Result<String> {
    req_client()
        .get(format!("{}/{route}/hash-string", crate::BASE_API_URL))
        .send()
        .await?
        .text()
        .await
        .map_err(Into::into)
}

async fn fetch_text(route: &str) -> anyhow::Result<String> {
    req_client()
        .get(format!("{}/{route}", crate::BASE_API_URL))
        .send()
        .await?
        .text()
        .await
        .map_err(Into::into)
}

async fn read_cached_hashes(path: &Path) -> Option<(String, String)> {
    let data = tokio::fs::read_to_string(path).await.ok()?;
    data.split_once(',').map(|(a, b)| (a.to_owned(), b.to_owned()))
}

async fn memoize_or_fetch(
    path: &Path,
    route: &str,
    cached_hash: Option<String>,
) -> anyhow::Result<(String, String)> {
    let remote_hash = match fetch_hash(route).await {
        Ok(hash) => Some(hash),
        Err(err) => {
            warn!("failed to fetch hash for {route}: {err}");
            None
        }
    };

    match (remote_hash, cached_hash) {
        (Some(remote), Some(cached)) if remote == cached => {
            info!("hashes for {route} match remote; using local cache");
            let contents = tokio::fs::read_to_string(path).await?;
            Ok((contents, remote))
        }
        (Some(remote), maybe_cached) => {
            if maybe_cached.is_some() {
                info!("remote hash is different for {route}; fetching remote");
            } else {
                info!("no local hash for {route}; fetching remote");
            }

            let contents = fetch_text(route).await?;
            tokio::fs::write(path, &contents).await?;

            Ok((contents, remote))
        }
        (None, Some(cached)) => {
            info!("remote hash fetch failed for {route}; using local cache");
            let contents = tokio::fs::read_to_string(path).await?;

            Ok((contents, cached))
        }
        (None, None) => {
            warn!("no remote or local cache for {route}");

            // most likely case this happens is if they start the app for the first time
            // without internet. we'll just load the local bundled files, and "cache" a
            // temporary hash that will be overwritten the next time they have internet
            let contents = tokio::fs::read_to_string(path).await?;
            Ok((contents, String::from("TEMP-HASH")))
        }
    }
}

pub async fn memoized_fetch_cache(paths: &Paths) -> anyhow::Result<(String, HashMap<u32, String>)> {
    let words_data = paths.words();
    let puzzles_data = paths.puzzles();
    let hashes = paths.hashes();

    let (local_words_hash, local_puzzles_hash) = read_cached_hashes(&hashes).await.unzip();

    let ((words, words_hash), (puzzles, puzzles_hash)) = try_join!(
        memoize_or_fetch(&words_data, "words", local_words_hash),
        memoize_or_fetch(&puzzles_data, "puzzles", local_puzzles_hash)
    )?;

    if let Err(err) =
        tokio::fs::write(hashes, format!("{words_hash},{puzzles_hash}")).await
    {
        warn!("failed to write hashes to disk: {err}");
    }

    let puzzles = puzzles
        .split('\n')
        .filter_map(|line| {
            let mut parts = line.split('|');
            let id: u32 = parts.next()?.parse().ok()?;

            Some((id, line.to_owned()))
        })
        .collect::<HashMap<u32, String>>();

    info!("parsed {} puzzles", puzzles.len());

    Ok((words, puzzles))
}
