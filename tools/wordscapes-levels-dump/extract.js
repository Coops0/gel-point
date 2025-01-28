const fs = require("fs");

const f = JSON.parse(fs.readFileSync("./levels/base_level_group_1_5.json"));

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

const grids = [];

for (const [levelName, level] of Object.entries(f)) {
  const id = level["a"];
  const letters = level["b"];
  const rowCells = level["c"]; // todo check these
  const columnCells = level["d"];
  const dirtyGrid = level["e"];
  // console.log(levelName, id, letters, verticalCells, horizontalCells);
  const grid = new Array(rowCells)
    .fill(null)
    .map(() => new Array(columnCells).fill(0));

  const words = [];

  // console.log(grid);
  for (const word of dirtyGrid) {
    const [col, row, direction, wordStr] = word.split(",");
    if (direction === "HB") {
      continue;
    }

    const wordArr = wordStr.split("");

    let r = parseInt(row);
    let c = parseInt(col);

    // console.log(grid, row, col);

    const locations = [];
    for (const letter of wordArr) {
      if (r < 0 || c < 0 || typeof grid[r] === "undefined") {
        console.warn("WTF", grid, r, c, row, col, direction, wordStr);
        throw new Error("WTF");
      }

      grid[r][c] = letter;
      locations.push([r, c]);
      if (direction === "V") {
        r++;
      } else {
        c++;
      }
    }

    words.push({ word: wordStr, locations });
  }

  grids.push({ grid, id, letters, words });
}

// trim and adjust indexes
// for (const [index, grid] of grids.entries()) {
//   for (let i = 0; i < grid.length; i++) {
//     if (grid[i].some((row) => row.some((cell) => cell !== 0))) {
//       continue;
//     }

//     grids[index].grid = grids[index].grid.slice(0, i);
//   }

//   for (let i = 0; i < grid.grid[0].length; i++) {
//     if (grid.grid.every((row) => row[i] === 0)) {
//       for (let j = 0; j < grid.grid.length; j++) {
//         grid.grid[j] = grid.grid[j].slice(0, i);
//       }
//     }
//   }

//   grids[index].grid = grids[index].grid.map((r) =>
//     r.map((c) => (c === 0 ? " " : c)),
//   );
// }

const transformedGrids = grids.map((g) => ({
  grid: g.grid.map((r) => r.join("").toLowerCase()),
  words: g.words.map(
    (w) =>
      w.word.toLowerCase() +
      "," +
      w.locations.map((l) => l[0] + "," + l[1]).join(","),
  ),
  letters: g.letters.toLowerCase(),
  id: g.id,
}));

console.log(grids);
fs.writeFileSync("./processed.json", JSON.stringify(transformedGrids, null, 2));
