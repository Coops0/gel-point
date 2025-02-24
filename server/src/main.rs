use axum::routing::get;
use axum::Router;
use sha2::{Digest, Sha256};
use tokio::fs;

static mut WORDS_HASH_STRING: String = String::new();
static mut PUZZLES_HASH_STRING: String = String::new();

static mut WORDS: String = String::new();
static mut PUZZLES: String = String::new();

#[tokio::main]
async fn main() {
    unsafe {
        WORDS = fs::read_to_string("./words.data").await.expect("no words.data file found");
        PUZZLES = fs::read_to_string("./puzzles.data").await.expect("no puzzles.data file found");

        let words_hash = Sha256::digest(&WORDS);
        let puzzles_hash = Sha256::digest(&PUZZLES);

        WORDS_HASH_STRING = format!("{:x}", words_hash);
        PUZZLES_HASH_STRING = format!("{:x}", puzzles_hash);

        println!("WORDS HASH: {WORDS_HASH:?}");
        println!("PUZZLES HASH: {PUZZLES_HASH:?}");
    }

    let app = Router::new()
        .route("/words/", get(words))
        .route("/words/hash-string", get(words_hash_string))
        .route("/puzzles/", get(puzzles))
        .route("/puzzles/hash-string", get(puzzles_hash_string));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4444").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn words_hash_string() -> &'static str {
    unsafe { &WORDS_HASH_STRING }
}

async fn puzzles_hash_string() -> &'static str {
    unsafe { &PUZZLES_HASH_STRING }
}

async fn words() -> &'static str {
    unsafe { &WORDS }
}

async fn puzzles() -> &'static str {
    unsafe { &PUZZLES }
}
