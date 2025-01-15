Create an 8x8 word puzzle using only these letters: B O R I N.
Rules:

Words must be 3+ letters
Words can only go left-to-right or top-to-bottom (no backwards or diagonal)
Every word after the first must share at least one letter with another word (they must intersect)
Words on the same line/column must have at least one empty space between them
Words can only use the given letters

*** NO FLOATING WORDS!!! ***
E.x.

000B000
000R000
000I000
000B000
000N000

And you try to use RIB as a word there, even though it's squished between 2 other letters

// OTHER RULES
// Word length >= 3 characters
// Words can be formed left, right, up, down. But have to be in a straight line, NOT in reverse, and NOT diagonally.
// Words can branch into others, but may not overlap: 2 words on the same axis must have at least 1 cell between them.

Give me the puzzle in this exact format:
```json
  {
    "grid": [
      "0000a",
      "00set",
      "00e0e",
      "00a00",
      "0eta0"
    ],
    "words": [
      "ate,4,0,4,1,4,2",
      "eta,1,4,2,4,3,4",
      "set,2,1,3,1,4,1",
      "seat,2,1,2,2,2,3,2,4"
    ]
  }
```
Optimize for:

Maximum number of words
Maximum intersections between words
Good mix of word lengths (3+ letters)


THE WORDS SHOULD NOT BE SUPER UNCOMMON/DIFFICULT TO GUESS: They should be NO harder than for example, like a wordle puzzle word.

NO CAPITAL LETTERS ANYWHERE

NEED TO USE INDEXES STARTING AT 0, AGAIN, PAY CLOSE ATTENTION TO THE EXAMPLE

TAKE ADVANTAGE OF THE GRID SPACE PROVIDED TO YOU

**No nonsense combinations**!!!!!!!
THE GRID & WORD PATH MUST BE VALID!!!! MOST IMPORTANT!!!