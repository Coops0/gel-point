const fs = require("fs");

// "3,4,V,ATE",
// "5,4,V,AXE",
// "5,6,H,EAT",
// "1,5,V,LAX",
// "7,4,V,LET",
// "3,5,H,TAX",
// "6,2,H,TEA",
// "5,4,H,AXLE",
// "8,1,V,LATE",
// "0,6,H,TALE",
// "6,0,V,LATEX",
// "0,2,HB,EXALT"

const puzzles = [];

function go(f) {
  for (const [levelName, level] of Object.entries(f)) {
    // const id = level["a"];
    const letters = level["b"];
    // const rowCells = level["c"]; // todo check these
    // const columnCells = level["d"];
    // const dirtyGrid = level["e"];
    // console.log(levelName, id, letters, verticalCells, horizontalCells);

    const words = level["e"]
      .map((w) => w.split(","))
      .filter((w) => w[2] !== "HB")
      .map(
        ([col, row, direction, word]) => `${word},${direction},${row},${col}`,
      )
      .join(";");

    puzzles.push(`${puzzles.length + 1}|${letters}|${words}`.toLowerCase());
  }
}

// const transformedGrids = grids.map((g) => ({
//   grid: g.grid.map((r) => r.join("").toLowerCase()),
//   words: g.words.map(
//     (w) =>
//       w.word.toLowerCase() +
//       "," +
//       w.locations.map((l) => l[0] + "," + l[1]).join(","),
//   ),
//   letters: g.letters.toLowerCase(),
//   id: g.id,
// }));

// console.log(grids);
// fs.writeFileSync("./processed.json", JSON.stringify(transformedGrids, null, 2));

const all = fs.readdirSync("./levels/");
for (const file of all) {
  if (!file.endsWith(".json") || file === "level_map.json") continue;

  const f = JSON.parse(fs.readFileSync(`./levels/${file}`, "utf8"));
  go(f);
  console.log("PROCESSED", file);
}

fs.writeFileSync("./puzzles.txt", puzzles.join("\n"));
