// Word Frequency Filter using Bun
// No external dependencies

const FREQUENCY_THRESHOLD = 500000; // Words with at least 1 million occurrences
const MIN_WORD_LENGTH = 3;

// Paths
const FREQUENCY_FILE = "count_1w.txt";
const DICTIONARY_FILE = "words.txt";
const OUTPUT_FILE = "words.data";

async function processFiles() {
  console.log("Reading frequency list...");
  const frequencyMap = new Map();

  // Read the frequency file
  const frequencyContent = await Bun.file(FREQUENCY_FILE).text();
  const frequencyLines = frequencyContent.split("\n");

  for (const line of frequencyLines) {
    if (!line.trim()) continue;

    const [word, countStr] = line.trim().split(/\s+/);

    // Apply filtering conditions
    if (
      word &&
      word.length >= MIN_WORD_LENGTH &&
      /^[a-z]+$/.test(word) && // Only lowercase alphabetic characters
      parseInt(countStr) >= FREQUENCY_THRESHOLD
    ) {
      frequencyMap.set(word, parseInt(countStr));
    }
  }

  console.log(
    `Found ${frequencyMap.size} words meeting frequency and format criteria`,
  );

  // Read dictionary file to verify valid English words
  console.log("Reading dictionary...");
  const dictionaryContent = await Bun.file(DICTIONARY_FILE).text();
  const dictionaryWords = dictionaryContent.split("\n");

  const validWords = new Set();

  for (const word of dictionaryWords) {
    const cleanWord = word.trim().toLowerCase();
    if (
      cleanWord &&
      cleanWord.length >= MIN_WORD_LENGTH &&
      /^[a-z]+$/.test(cleanWord) &&
      frequencyMap.has(cleanWord)
    ) {
      validWords.add(cleanWord);
    }
  }

  console.log(
    `Found ${validWords.size} words that exist in both frequency list and dictionary`,
  );

  // Sort words by frequency (highest first)
  const sortedWords = Array.from(validWords)
    .filter((word) => frequencyMap.has(word))
    .sort((a, b) => frequencyMap.get(b) - frequencyMap.get(a));

  // Write results to output file
  await Bun.write(OUTPUT_FILE, sortedWords.join("\n"));
  console.log(
    `Successfully wrote ${sortedWords.length} words to ${OUTPUT_FILE}`,
  );
}

processFiles().catch((err) => {
  console.error("Error processing files:", err);
  process.exit(1);
});
