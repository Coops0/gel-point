# Word Puzzle Generator Requirements

## Core Components

### 1. Grid Management
- Square grid with customizable dimensions
- Must track:
  - Letter placement coordinates
  - Word intersections
  - Empty spaces
- Grid representation: 2D array of characters/empty cells

### 2. Word Processing
- Input: Word file of a ton of words seperated by new lines

### 3. Placement Algorithm
- Initial placement:
  - Center word horizontally
  - Calculate optimal starting position
- Subsequent placements:
  - Find all valid intersections with existing words
  - Track direction (horizontal/vertical)
  - Store coordinates (row,col)
  - Validate letter overlaps
  - Ensure grid boundary compliance

### 4. Configuration Interface
interface PuzzleConfig {
    minWords: number        // Minimum words per puzzle
    maxWords: number        // Maximum words per puzzle
    minWordLength: number   // Shortest allowed word
    maxWordLength: number   // Longest allowed word
    maxGridSize: number     // Grid dimensions
    minLetters: number      // Minimum unique letters
    maxLetters: number      // Maximum unique letters
}

### 5. Output Format
Format: id|letters|wordPlacements
Example: 1|abcdef|cat,h,5,5;dog,v,5,7;bat,h,7,5
Components:
- id: Unique puzzle identifier
- letters: All unique letters used
- wordPlacements: semicolon-separated list of:
  - word: the actual word
  - direction: h/v
  - row: starting row
  - col: starting column

### 6. Validation Rules
- Word placement:
  - No out-of-bounds letters
  - Valid intersections only
  - No adjacent non-intersecting words
- Letter constraints:
  - Total unique letters within bounds
  - No invalid character combinations
- Puzzle completeness:
  - Minimum word count met
  - All words connected

### 7. Error Handling
Must handle:
- Invalid word lists
- Failed placement attempts
- Letter count violations
- Grid size constraints
- Connection validation
- Format verification

This specification ensures generated puzzles are:
- Playable
- Properly connected
- Within specified constraints
- Following Word Scapes-style gameplay mechanics