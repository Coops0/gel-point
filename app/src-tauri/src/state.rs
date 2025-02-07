use serde::Serialize;
use sha2::{Digest, Sha256};
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

async fn fetch_hash(route: &str) -> anyhow::Result<Vec<u8>> {
    req_client()
        .get(format!("{}/{route}/hash", crate::BASE_API_URL))
        .send()
        .await?
        .bytes()
        .await
        .map_err(Into::into)
        .map(|r| r.to_vec())
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

async fn read_cached_hashes(path: &Path) -> Option<(Vec<u8>, Vec<u8>)> {
    let data = tokio::fs::read(path).await.ok()?;
    let mut stream = data.split(|b| b == &b',').map(|b| b.to_vec());

    Some((stream.next()?, stream.next()?))
}

async fn memoize_or_fetch(
    path: &Path,
    route: &str,
    cached_hash: Option<Vec<u8>>
) -> anyhow::Result<(String, Vec<u8>)> {
    let mut local_bytes = None::<Vec<u8>>;

    let hash = match cached_hash {
        Some(hash) => hash,
        None => {
            let b = tokio::fs::read(path).await.unwrap_or_default();
            let h = Sha256::digest(&b).to_vec();
            local_bytes = Some(b);

            h
        }
    };

    let remote_hash = match fetch_hash(route).await {
        Ok(h) => h,
        Err(_) => hash.clone()
    };

    if hash != remote_hash {
        if let Ok(text) = fetch_text(route).await {
            tokio::fs::write(path, text.as_bytes()).await?;
            return Ok((text, hash));
        }
    }

    let bytes = match local_bytes {
        Some(b) => String::from_utf8(b)?,
        None => tokio::fs::read_to_string(path).await.unwrap_or_default()
    };

    Ok((bytes, hash))
}

pub async fn memoized_fetch_cache(paths: &Paths) -> anyhow::Result<(String, HashMap<u32, String>)> {
    let words_data = paths.words();
    let puzzles_data = paths.puzzles();
    let hashes = paths.hashes();

    let (words_hash, puzzles_hash) = read_cached_hashes(&hashes).await.unzip();

    let ((words, words_hash), (puzzles, puzzles_hash)) = try_join!(
        memoize_or_fetch(&words_data, "words", words_hash),
        memoize_or_fetch(&puzzles_data, "puzzles", puzzles_hash)
    )?;

    let _ = tokio::fs::write(hashes, [&words_hash, &[b','][..], &puzzles_hash].concat()).await;

    let puzzles = puzzles
        .split("\n")
        .filter_map(|line| {
            let mut parts = line.split("|");
            let id: u32 = parts.next()?.parse().ok()?;

            Some((id.to_owned(), line.to_owned()))
        })
        .collect::<HashMap<u32, String>>();

    Ok((words, puzzles))
}
