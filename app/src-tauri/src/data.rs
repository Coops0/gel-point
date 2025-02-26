use include_flate::flate;

flate!(pub static PUZZLES_DATA: str from "./assets/puzzles.data");
flate!(pub static WORDS_DATA: str from "./assets/words.data");