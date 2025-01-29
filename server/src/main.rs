use anyhow::Context;
use axum::routing::get;
use axum::Router;
use sha2::{Digest, Sha256};
use tokio::fs;

static mut WORDS_HASH: Vec<u8> = Vec::new();
static mut PUZZLES_HASH: Vec<u8> = Vec::new();

static mut WORDS: String = String::new();
static mut PUZZLES: String = String::new();

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    unsafe {
        WORDS = fs::read_to_string("./words.txt").await.context("no words file found")?;
        PUZZLES = fs::read_to_string("./puzzles.txt").await.context("no puzzles file found")?;

        WORDS_HASH = Sha256::digest(&WORDS).to_vec();
        PUZZLES_HASH = Sha256::digest(&PUZZLES).to_vec();

        println!("WORDS HASH: {WORDS_HASH:?}");
        println!("PUZZLES HASH: {PUZZLES_HASH:?}");
    }

    let app = Router::new()
        .route("/words/", get(words))
        .route("/words/hash", get(words_hash))
        .route("/puzzles/", get(puzzles))
        .route("/puzzles/hash", get(puzzles_hash));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4444").await?;
    axum::serve(listener, app).await.map_err(Into::into)
}

async fn words_hash() -> &'static [u8] {
    unsafe { &WORDS_HASH }
}

async fn puzzles_hash() -> &'static [u8] {
    unsafe { &PUZZLES_HASH }
}

async fn words() -> &'static str {
    unsafe { &WORDS }
}

async fn puzzles() -> &'static str {
    unsafe { &PUZZLES }
}
