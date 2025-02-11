import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from collections import defaultdict
import os
import random

class PuzzleDataset(Dataset):
    def __init__(self, file_path):
        self.puzzles = []
        self.vocab = set()
        
        with open(file_path, 'r') as f:
            for line in f:
                parts = line.strip().split('|')
                if len(parts) != 3:
                    continue
                    
                puzzle_id, letters, words_part = parts
                if not letters or not words_part:
                    continue
                    
                words_data = []
                for placement in words_part.split(';'):
                    if not placement:
                        continue
                    parts = placement.split(',')
                    if len(parts) != 4:
                        continue
                    word, direction, row, col = parts
                    if not word.isalpha():
                        continue
                    words_data.append({
                        'word': word.lower(),
                        'direction': direction,
                        'row': int(row),
                        'col': int(col)
                    })
                
                if words_data:
                    self.puzzles.append({
                        'id': int(puzzle_id),
                        'letters': letters.lower(),
                        'words': words_data
                    })
                    self.vocab.update(letters.lower())

        self.char_to_idx = {c: i for i, c in enumerate(sorted(self.vocab))}
        self.idx_to_char = {i: c for c, i in self.char_to_idx.items()}
        
    def __len__(self):
        return len(self.puzzles)

    def __getitem__(self, idx):
        puzzle = self.puzzles[idx]
        
        # Encode letters
        x = torch.zeros(len(self.char_to_idx))
        for letter in puzzle['letters']:
            x[self.char_to_idx[letter]] = 1
            
        # Encode words and their placements
        max_words = 15  # Maximum number of words per puzzle
        y = torch.zeros(max_words, 4)  # [word_length, direction (0=h, 1=v), row, col]
        
        for i, word_data in enumerate(puzzle['words']):
            if i >= max_words:
                break
            y[i, 0] = len(word_data['word'])
            y[i, 1] = 1 if word_data['direction'] == 'v' else 0
            y[i, 2] = word_data['row']
            y[i, 3] = word_data['col']
            
        return x, y

def get_valid_words(letters, wordlist):
    valid = set()
    letter_count = defaultdict(int)
    for letter in letters:
        letter_count[letter] += 1
        
    # First pass: find all possible words
    for word in wordlist:
        if 3 <= len(word) <= 7:  # Allow words up to 7 letters
            word_count = defaultdict(int)
            for char in word:
                word_count[char] += 1
            if all(word_count[c] <= letter_count[c] for c in word_count):
                valid.add(word)
                
    return valid

def check_word_fit(grid, word, row, col, direction, size=15):
    if direction == 'v':
        if row + len(word) > size:
            return False
        # Check vertical fit
        for i in range(len(word)):
            if grid[row + i][col] not in (0, word[i]):
                return False
    else:
        if col + len(word) > size:
            return False
        # Check horizontal fit
        for i in range(len(word)):
            if grid[row][col + i] not in (0, word[i]):
                return False
    return True

def place_word(grid, word, row, col, direction):
    for i, letter in enumerate(word):
        if direction == 'v':
            grid[row + i][col] = letter
        else:
            grid[row][col + i] = letter

def generate_valid_puzzle(letters, wordlist, min_words=5, max_words=12, size=15):
    valid_words = get_valid_words(letters, wordlist)
    if len(valid_words) < min_words:
        return None
        
    # Sort words by length (prefer longer words first)
    words = sorted(valid_words, key=len, reverse=True)
    
    best_puzzle = None
    best_word_count = 0
    
    # Try multiple times to generate a good puzzle
    for attempt in range(50):
        grid = [[0] * size for _ in range(size)]
        placed = []
        
        # Place first word in center area
        first_word = random.choice([w for w in words if len(w) >= 4])
        start_row = size // 2
        start_col = (size - len(first_word)) // 2
        place_word(grid, first_word, start_row, start_col, 'h')
        placed.append((first_word, 'h', start_row, start_col))
        
        # Try to place remaining words
        for _ in range(max_words - 1):
            # Try each word in random positions
            random.shuffle(words)
            word_placed = False
            
            for word in words:
                if word in [p[0] for p in placed]:
                    continue
                    
                # Try random positions
                for _ in range(30):
                    direction = random.choice(['h', 'v'])
                    row = random.randint(0, size-1)
                    col = random.randint(0, size-1)
                    
                    if check_word_fit(grid, word, row, col, direction, size):
                        place_word(grid, word, row, col, direction)
                        placed.append((word, direction, row, col))
                        word_placed = True
                        break
                        
                if word_placed:
                    break
                    
            if not word_placed:
                break
        
        if len(placed) > best_word_count:
            best_puzzle = placed
            best_word_count = len(placed)
            
        if best_word_count >= min_words:
            break
            
    return best_puzzle if best_word_count >= min_words else None

def train_model(model, train_loader, device, epochs=200):
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005)  # Lower learning rate for better convergence
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=10)
    model.to(device)
    
    best_loss = float('inf')
    
    for epoch in range(epochs):
        total_loss = 0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        avg_loss = total_loss / len(train_loader)
        scheduler.step(avg_loss)
        
        if avg_loss < best_loss:
            best_loss = avg_loss
            
        if (epoch + 1) % 10 == 0:
            print(f'Epoch {epoch+1}, Loss: {avg_loss:.4f}')

def load_wordlist(filepath='wordlist.txt'):
    # Try to use NLTK's word lists for better quality words
    try:
        import nltk
        from nltk.corpus import words, brown
        nltk.download('words', quiet=True)
        nltk.download('brown', quiet=True)
        
        # Get word frequency from Brown corpus
        word_freq = defaultdict(int)
        for word in brown.words():
            word = word.lower()
            if word.isalpha():
                word_freq[word] += 1
        
        # Filter words by length and frequency
        common_words = set()
        for word, freq in word_freq.items():
            if 3 <= len(word) <= 7 and freq >= 5:  # Words that appear at least 5 times
                common_words.add(word)
                
        # Add some basic words from NLTK's word list that might be missing
        english_words = set(w.lower() for w in words.words() if 3 <= len(w) <= 7 and w.isalpha())
        basic_words = {'cat', 'dog', 'run', 'jump', 'play', 'walk', 'talk', 'eat', 'drink', 
                      'sleep', 'work', 'help', 'look', 'see', 'hear', 'feel', 'think', 'know',
                      'want', 'need', 'give', 'take', 'make', 'find', 'keep', 'let', 'seem',
                      'have', 'show', 'try', 'call', 'ask', 'live', 'stay', 'sit', 'stand',
                      'love', 'like', 'come', 'leave', 'put', 'send', 'meet', 'pay', 'hear',
                      'stop', 'pass', 'set', 'cut', 'fall', 'tell', 'turn', 'cost', 'drive',
                      'hold', 'move', 'wait', 'sold', 'fill', 'lead', 'lie', 'red', 'blue',
                      'open', 'pull', 'read', 'ride', 'run', 'seek', 'sell', 'send', 'shed',
                      'shut', 'sing', 'sink', 'slip', 'slow', 'snap', 'snow', 'sort', 'spot',
                      'star', 'stay', 'step', 'stop', 'swim', 'take', 'talk', 'tear', 'tell',
                      'tend', 'test', 'tick', 'tide', 'time', 'tire', 'turn', 'twin', 'type',
                      'view', 'vote', 'wait', 'wake', 'walk', 'want', 'warm', 'warn', 'wash',
                      'wave', 'wear', 'wind', 'wing', 'wipe', 'wire', 'wish', 'wood', 'work',
                      'yard', 'year', 'yell'}
        
        return common_words.union(basic_words)
        
    except:
        # Fallback to downloading wordlist if NLTK fails
        if not os.path.exists(filepath):
            import urllib.request
            # Use a better word list source - Norvig's frequency-based list
            url = "https://norvig.com/ngrams/count_1w.txt"
            urllib.request.urlretrieve(url, filepath)
        
        words = set()
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    word, count = line.strip().split('\t')
                    if word.isalpha() and 3 <= len(word) <= 7:
                        count = int(count)
                        if count > 1000:  # Only take somewhat common words
                            words.add(word.lower())
                except:
                    continue
        return words

def save_model(model, char_to_idx, idx_to_char, path='wordscape_model.pt'):
    torch.save({
        'model_state_dict': model.state_dict(),
        'char_to_idx': char_to_idx,
        'idx_to_char': idx_to_char,
        'vocab_size': model.vocab_size
    }, path)

def load_model(path='wordscape_model.pt'):
    checkpoint = torch.load(path)
    model = PuzzleGenerator(vocab_size=checkpoint['vocab_size'])
    model.load_state_dict(checkpoint['model_state_dict'])
    return model, checkpoint['char_to_idx'], checkpoint['idx_to_char']

class PuzzleGenerator(nn.Module):
    def __init__(self, vocab_size, hidden_dim=512):
        super().__init__()
        self.vocab_size = vocab_size
        
        self.encoder = nn.Sequential(
            nn.Linear(vocab_size, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        
        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 15 * 4),  # 15 words max, 4 features each
            nn.Sigmoid()
        )

    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x.reshape(-1, 15, 4)

def generate_puzzle(model, char_to_idx, idx_to_char, wordlist, puzzle_id, device='cpu'):
    model.eval()
    attempts = 0
    max_attempts = 50  # Maximum number of attempts to generate a valid puzzle
    
    while attempts < max_attempts:
        with torch.no_grad():
            # Generate 5-7 letters
            num_letters = random.randint(5, 7)
            
            # Ensure we have vowels
            vowels = 'aeiou'
            consonants = 'bcdfghjklmnpqrstvwxyz'
            
            # Start with 2 random vowels
            puzzle_letters = random.sample(vowels, 2)
            
            # Add random consonants and maybe another vowel
            remaining_letters = num_letters - 2
            consonant_choices = random.sample(consonants, remaining_letters)
            if random.random() < 0.3:  # 30% chance to add another vowel
                consonant_choices[0] = random.choice(vowels)
            
            puzzle_letters.extend(consonant_choices)
            random.shuffle(puzzle_letters)
            puzzle_letters = ''.join(puzzle_letters)
            
            # Test if we can make enough valid words
            valid_words = get_valid_words(puzzle_letters, wordlist)
            if len(valid_words) >= 5:  # Make sure we have enough words
                x = torch.zeros(1, len(char_to_idx))
                for letter in puzzle_letters:
                    if letter in char_to_idx:
                        x[0, char_to_idx[letter]] = 1
                
                x = x.to(device)
                placed_words = generate_valid_puzzle(puzzle_letters, wordlist)
                
                if placed_words and len(placed_words) >= 3:
                    word_placements = []
                    for word, direction, row, col in placed_words:
                        word_placements.append(f"{word},{direction},{row},{col}")
                    return f"{puzzle_id}|{puzzle_letters}|{';'.join(word_placements)}"
        
        attempts += 1
    
    return None

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    wordlist = load_wordlist()
    model_path = 'wordscape_model.pt'
    
    # Load dataset first to get character mappings regardless of training path
    dataset = PuzzleDataset('puzzles.data')
    char_to_idx = dataset.char_to_idx
    idx_to_char = dataset.idx_to_char
    
    if not os.path.exists(model_path):
        print("Training new model...")
        train_loader = DataLoader(dataset, batch_size=32, shuffle=True)
        model = PuzzleGenerator(len(char_to_idx))
        train_model(model, train_loader, device, epochs=200)
        save_model(model, char_to_idx, idx_to_char, model_path)
    else:
        print("Loading existing model...")
        model, char_to_idx, idx_to_char = load_model(model_path)
        model.to(device)
    
    print("\nGenerating sample puzzles:")
    for i in range(100):
        puzzle = None

        try:
            puzzle = generate_puzzle(model, char_to_idx, idx_to_char, wordlist, i+1, device)
        except Exception as e:
            print(f"Error generating puzzle: {e}")

        if puzzle:
            print(f"\nPuzzle {i+1}:")
            print(puzzle)
        else:
            print(f"\nPuzzle {i+1}: Failed to generate valid puzzle")

if __name__ == "__main__":
    main()