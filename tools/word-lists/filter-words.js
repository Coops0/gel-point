import { promises as fs } from "fs";

async function r() {
  const words = await fs
    .readFile("./new-word-list.txt", { encoding: "utf-8" })
    .then((w) => w.split("\n"));

  const w = words
    .map((word) => word.replace("\r", "").split("	")[0])
    .filter(
      (word) => word.length >= 3 && word.length <= 10 && /^[A-Z]+$/i.test(word),
    )
    .map((word) => word.toLowerCase());
  // .filter((word) => {
  //   const letters = [];
  //   // duplicate letters
  //   for (const l of word.split("")) {
  //     if (letters.includes(l)) {
  //       return false;
  //     } else {
  //       letters.push(l);
  //     }
  //   }

  //   return true;
  // });

  console.log(`available words ${words.length} => ${w.length}`);
  await fs.writeFile("./filtered-words.txt", w.join("\n"));
}

async function b() {
  const words = await fs
    .readFile("../public/fair-puzzle-words.txt", { encoding: "utf-8" })
    .then((w) => w.split("\n"));

  const w = words
    .filter(
      (word) => word.length >= 4 && word.length <= 10 && /^[A-Z]+$/i.test(word),
    )
    .map((word) => word.toLowerCase())
    .filter((word) => {
      const letters = [];
      for (const l of word.split("")) {
        if (letters.includes(l)) {
          return false;
        } else {
          letters.push(l);
        }
      }

      return true;
    });

  console.log(`available words ${words.length} => ${w.length}`);
  await fs.writeFile("../public/fair-puzzle-words.txt", w.join("\n"));
}

async function verify() {
  const words = await fs
    .readFile("../public/words.txt", { encoding: "utf-8" })
    .then((w) => w.split("\n"));
  const puzzleWords = await fs
    .readFile("../public/fair-puzzle-words.txt", { encoding: "utf-8" })
    .then((w) => w.split("\n"));

  for (const w of puzzleWords) {
    if (!words.includes(w)) {
      console.warn(`missing word: ${w}`);
    }
  }
}

r();
// b();
// verify();
//
