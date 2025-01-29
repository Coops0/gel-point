import { readdir } from "node:fs/promises";

const lists = await readdir("./final");

const words = new Set<string>();

for (const file of lists) {
  const wordsRaw = await Bun.file(`./final/${file}`).text();

  wordsRaw
    .split("\n")
    .map((word) => word.trim().toLowerCase())
    .filter(
      (word) =>
        word.length >= 3 &&
        word.length <= 9 &&
        /[a-z]+/.test(word) &&
        !word.includes("'"),
    )
    .forEach((word) => {
      words.add(word);
    });
}
await Bun.write("./words-cleaned.txt", [...words].join("\n"));
