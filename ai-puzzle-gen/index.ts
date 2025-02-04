import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';

// Types for our puzzle configuration
interface PuzzleConfig {
    minWords: number;
    maxWords: number;
    minWordLength: number;
    maxWordLength: number;
    maxGridSize: number;
    minLetters: number;
    maxLetters: number;
}

// Format of our training data
interface PuzzleData {
    id: string;
    letters: string;
    placements: WordPlacement[];
}

interface WordPlacement {
    word: string;
    direction: 'h' | 'v';
    row: number;
    col: number;
}

class PuzzleAITrainer {
    private model: tf.LayersModel;
    private tokenizer: Map<string, number>;
    private config: PuzzleConfig;

    constructor(config: PuzzleConfig) {
        this.config = config;
        this.tokenizer = new Map();
        this.model = this.buildModel();
    }

    private buildModel(): tf.LayersModel {
        // Input layers
        const wordInput = tf.layers.input({ shape: [this.config.maxWordLength], name: 'word_input' });
        const configInput = tf.layers.input({ shape: [7], name: 'config_input' }); // For puzzle constraints

        // Embedding layer for words
        const embedding = tf.layers.embedding({
            inputDim: 28, // 26 letters + start/end tokens
            outputDim: 32,
            inputLength: this.config.maxWordLength
        });

        // Process word sequence
        const wordEmbedding = embedding.apply(wordInput) as tf.SymbolicTensor;
        const lstm = tf.layers.lstm({
            units: 64,
            returnSequences: false
        }).apply(wordEmbedding) as tf.SymbolicTensor;

        // Combine word features with config
        const combined = tf.layers.concatenate().apply([lstm, configInput]);

        // Dense layers for processing
        const dense1 = tf.layers.dense({ units: 128, activation: 'relu' }).apply(combined);
        const dropout = tf.layers.dropout({ rate: 0.3 }).apply(dense1);
        const dense2 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(dropout);

        // Output layers
        const positionOutput = tf.layers.dense({
            units: 3,  // row, col, direction
            name: 'position_output'
        }).apply(dense2) as tf.SymbolicTensor;

        // Create and compile model
        const model = tf.model({
            inputs: [wordInput, configInput],
            outputs: positionOutput
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });

        return model;
    }

    // Preprocess puzzle data for training
    private preprocessPuzzle(puzzleStr: string): PuzzleData {
        const [id, letters, placementsStr] = puzzleStr.split('|');
        const placements = placementsStr.split(';').map(placement => {
            const [word, direction, row, col] = placement.split(',');
            return {
                word,
                direction: direction as 'h' | 'v',
                row: parseInt(row),
                col: parseInt(col)
            };
        });

        return { id, letters, placements };
    }

    // Convert words to tensor format
    private wordToTensor(word: string): tf.Tensor {
        const padding = Array(this.config.maxWordLength - word.length).fill(0);
        const wordIndices = word.split('')
            .map(char => this.tokenizer.get(char) || 0)
            .concat(padding);

        return tf.tensor2d([wordIndices], [1, this.config.maxWordLength]);
    }

    // Convert placement to normalized position values
    private placementToTensor(placement: WordPlacement): tf.Tensor {
        const direction = placement.direction === 'h' ? 1 : 0;
        const normalizedRow = placement.row / this.config.maxGridSize;
        const normalizedCol = placement.col / this.config.maxGridSize;

        return tf.tensor2d([[direction, normalizedRow, normalizedCol]], [1, 3]);
    }

    // Train the model on a dataset of puzzles
    async trainOnDataset(puzzles: string[], epochs: number = 50): Promise<void> {
        const batchSize = 32;
        const trainData = puzzles.map(puzzle => this.preprocessPuzzle(puzzle));

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            let batchCount = 0;

            for (let i = 0; i < trainData.length; i += batchSize) {
                const batch = trainData.slice(i, i + batchSize);

                // Prepare batch data
                const words = batch.flatMap(puzzle =>
                    puzzle.placements.map(p => this.wordToTensor(p.word))
                );
                const positions = batch.flatMap(puzzle =>
                    puzzle.placements.map(p => this.placementToTensor(p))
                );
                const configs = batch.flatMap(puzzle =>
                    puzzle.placements.map(() =>
                        tf.tensor2d([[
                            this.config.minWords,
                            this.config.maxWords,
                            this.config.minWordLength,
                            this.config.maxWordLength,
                            this.config.maxGridSize,
                            this.config.minLetters,
                            this.config.maxLetters
                        ]], [1, 7])
                    )
                );

                // Train on batch
                const wordsTensor = tf.concat(words, 0);
                const configsTensor = tf.concat(configs, 0);
                const positionsTensor = tf.concat(positions, 0);

                // Ensure batch sizes match
                if (wordsTensor.shape[0] !== configsTensor.shape[0]) {
                    throw new Error(`Batch size mismatch: wordsTensor=${wordsTensor.shape[0]}, configsTensor=${configsTensor.shape[0]}`);
                }

                const history = await this.model.trainOnBatch(
                    [wordsTensor, configsTensor],
                    positionsTensor
                );

                totalLoss += history as number;
                batchCount++;

                // Clean up tensors
                words.forEach(t => t.dispose());
                positions.forEach(t => t.dispose());
                configs.forEach(t => t.dispose());
            }

            console.log(`Epoch ${epoch + 1}/${epochs}, Average Loss: ${totalLoss / batchCount}`);
        }
    }

    // Generate a new puzzle
    async generatePuzzle(words: string[]): Promise<PuzzleData | null> {
        const wordTensors = words.map(word => this.wordToTensor(word));
        const configTensor = tf.tensor2d([[
            this.config.minWords,
            this.config.maxWords,
            this.config.minWordLength,
            this.config.maxWordLength,
            this.config.maxGridSize,
            this.config.minLetters,
            this.config.maxLetters
        ]], [1, 7]);

        try {
            const predictions = this.model.predict([
                tf.concat(wordTensors),
                tf.tile(configTensor, [words.length, 1])
            ]) as tf.Tensor;

            const positions = await predictions.array() as number[][];
            const placements: WordPlacement[] = positions.map((pos, i) => ({
                word: words[i],
                direction: pos[0] > 0.5 ? 'h' : 'v',
                row: Math.round(pos[1] * this.config.maxGridSize),
                col: Math.round(pos[2] * this.config.maxGridSize)
            }));

            // Generate unique letters
            const letters = [...new Set(words.join(''))].join('');

            return {
                id: Date.now().toString(),
                letters,
                placements
            };
        } finally {
            // Clean up tensors
            wordTensors.forEach(t => t.dispose());
            configTensor.dispose();
        }
    }

    // Save the trained model
    async saveModel(path: string): Promise<void> {
        await this.model.save(`file://${path}`);
    }

    // Load a previously trained model
    async loadModel(path: string): Promise<void> {
        this.model = await tf.loadLayersModel(`file://${path}`);
    }
}

// Example usage
async function main() {
    const config: PuzzleConfig = {
        minWords: 3,
        maxWords: 8,
        minWordLength: 3,
        maxWordLength: 8,
        maxGridSize: 15,
        minLetters: 10,
        maxLetters: 20
    };

    const trainer = new PuzzleAITrainer(config);

    // Load your perfect puzzle examples
    const puzzleExamples = fs.readFileSync('../app/src-tauri/assets/puzzles.data', 'utf-8').split('\n');

    // Train the model
    await trainer.trainOnDataset(puzzleExamples, 50);

    // Generate a new puzzle
    const newPuzzle = await trainer.generatePuzzle(['cat', 'dog', 'bat']);
    console.log('Generated Puzzle:', newPuzzle);

    // Save the model for later use
    await trainer.saveModel('./puzzle_model');
}

main();