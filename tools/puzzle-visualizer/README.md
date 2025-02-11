# Puzzle Format Documentation

This document describes the format for puzzles used in the word search game system.

## Format Overview

Each puzzle is represented as a single string with three main components separated by the pipe character (`|`):

```
puzzleId|availableLetters|wordPlacements
```

### Components

1. **puzzleId** (Required)
    - A numeric identifier for the puzzle
    - Must be parseable as a number
    - Example: `42`

2. **availableLetters** (Required)
    - A string of lowercase letters that are available in the puzzle
    - No separators between letters
    - All letters must be lowercase
    - Example: `abcdefg`

3. **wordPlacements** (Required)
    - Multiple word placements separated by semicolons (`;`)
    - Each word placement follows the format: `word,direction,row,column`
    - All words must be in lowercase
    - Example: `cat,h,0,0;dog,v,2,1`

### Word Placement Format

Each word placement consists of four parts separated by commas:

1. **word**: The actual word to be placed in the grid (must be lowercase)
2. **direction**: Either `h` for horizontal or `v` for vertical
3. **row**: Starting row (0-based index)
4. **column**: Starting column (0-based index)

*(The row/col is handled as indexing into a 2D matrix)*

## Grid Generation

- The grid is generated dynamically based on word placements
- Grid size is determined by the maximum coordinates needed
- Empty cells are filled with `0`
- The grid extends automatically to accommodate words

## Example Puzzles

### Simple Puzzle
```
1|abc|cat,h,0,0
```
This creates a puzzle with:
- ID: 1
- Available letters: a, b, c
- One word "cat" placed horizontally at position (0,0)

### Multiple Words Puzzle
```
2|abcdefgh|cat,h,0,0;dog,v,2,1;fish,h,1,2
```
This creates a puzzle with:
- ID: 2
- Available letters: a, b, c, d, e, f, g, h
- Three words:
    - "cat" placed horizontally starting at (0,0)
    - "dog" placed vertically starting at (1,2)
    - "fish" placed horizontally starting at (2,1)

## Validation Rules

1. Puzzle ID must be a valid number
2. Available letters must not be empty and must be lowercase
3. At least one word placement is required
4. Word placements must use valid directions (`h` or `v`)
5. Column and row coordinates must be valid numbers
6. Words must not overlap invalidly (shared letters must match)
7. All letters and words must be lowercase

## Response Format

When fetching puzzles, the backend returns a `FetchPuzzlesBufferedResponse` containing:
```typescript
{
    puzzle: string | null;      // Current puzzle in the above format
    nextPuzzle: string | null;  // Next puzzle in the above format
}
```

## Error Cases

The parser will throw errors in these situations:
- Invalid puzzle ID format
- Missing required components (ID, letters, or word placements)
- Invalid word placement format
- Invalid direction specifier
- Invalid coordinate formats
- Uppercase letters in words or available letters