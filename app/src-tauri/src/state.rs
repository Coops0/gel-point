use crate::errors::{ResultExtDisplay, SmallResult};
use log::{info, warn};
use serde::Serialize;
use std::{
    collections::{HashMap, HashSet}, path::{Path, PathBuf}, time::Duration
};
use tauri::{path::PathResolver, Wry};
use tauri_plugin_http::reqwest;
use tokio::{time::Instant, try_join};

#[derive(Serialize)]
pub struct CachedData {
    pub words: HashSet<&'static str>,
    pub puzzles: HashMap<u32, &'static str>
}

impl CachedData {
    // owned_words MUST be lowercase
    pub fn new(owned_words: String, owned_puzzles: String) -> Self {
        // SAFETY: these strings will be used and unmutated for the lifetime of the app
        let leaked_words: &'static str = owned_words.leak();
        let leaked_puzzles: &'static str = owned_puzzles.leak();

        let words =
            leaked_words.lines().collect::<HashSet<_>>();

        let puzzles = leaked_puzzles
            .lines()
            .filter_map(|line| {
                let mut parts = line.split('|');
                let id: u32 = parts.next()?.parse().ok()?;

                Some((id, line))
            })
            .collect::<HashMap<u32, &str>>();

        Self { words, puzzles }
    }

    pub fn find_word(&self, word: &str) -> bool {
        self.words.contains(word)
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
    reqwest::Client::builder().timeout(Duration::from_secs(3)).build().unwrap()
}

async fn fetch_hash(route: &str) -> SmallResult<String> {
    req_client()
        .get(format!("{}/{route}/hash-string", crate::BASE_API_URL))
        .send()
        .await
        .context("failed to send hash req")?
        .text()
        .await
        .context("failed to get hash text")
}

async fn fetch_text(route: &str) -> SmallResult<String> {
    req_client()
        .get(format!("{}/{route}", crate::BASE_API_URL))
        .send()
        .await
        .context("failed to send text req")?
        .text()
        .await
        .context("failed to get text")
}

async fn read_cached_hashes(path: &Path) -> Option<(String, String)> {
    let mut data = tokio::fs::read_to_string(path).await.ok()?;
    let split_index = data.find(',')?;

    data.remove(split_index);
    let right = data.split_off(split_index);

    Some((data, right))
}

async fn memoize_or_fetch(
    path: &Path,
    route: &str,
    cached_hash: Option<String>
) -> SmallResult<(String, String)> {
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
            let contents =
                tokio::fs::read_to_string(path).await.context("failed to read file contents")?;

            return Ok((contents, remote));
        }
        (Some(remote), maybe_cached) => {
            if maybe_cached.is_some() {
                info!("remote hash is different for {route}; fetching remote");
            } else {
                info!("no local hash for {route}; fetching remote");
            }

            if let Ok(contents) = fetch_text(route).await {
                tokio::fs::write(path, &contents).await.context("failed to write contents")?;
                return Ok((contents, remote));
            }

            warn!("failed to fetch text for (case 2B) {route}");
        }
        (None, Some(cached)) => {
            info!("remote hash fetch failed for {route}; using local cache");
            let contents =
                tokio::fs::read_to_string(path).await.context("failed to read string contents")?;

            return Ok((contents, cached));
        }
        (None, None) => {
            warn!("no remote or local cache for {route}");

            // most likely case this happens is if they start the app for the first time
            // without internet. we'll just load the local bundled files, and "cache" a
            // temporary hash that will be overwritten the next time they have internet
        }
    }

    // fall thru
    let contents =
        tokio::fs::read_to_string(path).await.context("failed to read local string contents???")?;
    Ok((contents, String::from("TEMP-HASH")))
}

pub async fn memoized_fetch_cache(paths: &Paths) -> SmallResult<(String, String)> {
    let words_data = paths.words();
    let puzzles_data = paths.puzzles();
    let hashes = paths.hashes();

    let (local_words_hash, local_puzzles_hash) = read_cached_hashes(&hashes).await.unzip();

    let before = Instant::now();

    let ((words, words_hash), (puzzles, puzzles_hash)) = try_join!(
        memoize_or_fetch(&words_data, "words", local_words_hash),
        memoize_or_fetch(&puzzles_data, "puzzles", local_puzzles_hash)
    )
    .context("failed to memoize or fetch")?;

    info!("fetched data in {}ms", before.elapsed().as_millis());

    if let Err(err) = tokio::fs::write(hashes, format!("{words_hash},{puzzles_hash}")).await {
        warn!("failed to write hashes to disk: {err}");
    }

    Ok((words, puzzles))
}
