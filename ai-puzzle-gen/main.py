import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from collections import defaultdict
import os
import random

class PuzzleDataset(Dataset):
    def __init__(self, file_path, max_letters=8, max_words=12):
        self.puzzles = []
        self.max_letters = max_letters
        self.max_words = max_words
        self.vocab = set()

        with open(file_path, 'r') as f:
            for line in f:
                parts = line.strip().split('|')
                if len(parts) < 3:
                    continue
                puzzle_id, letters, solutions = parts
                if len(letters) <= max_letters:
                    words = [w.split(',')[0] for w in solutions.split(';')]
                    if len(words) <= max_words:
                        self.puzzles.append((letters, words))
                        self.vocab.update(letters)

        self.char_to_idx = {c: i for i, c in enumerate(sorted(self.vocab))}
        self.idx_to_char = {i: c for c, i in self.char_to_idx.items()}

    def __len__(self):
        return len(self.puzzles)

    def __getitem__(self, idx):
        letters, words = self.puzzles[idx]
        x = torch.zeros(self.max_letters, len(self.char_to_idx))
        for i, letter in enumerate(letters):
            x[i][self.char_to_idx[letter]] = 1

        y = torch.zeros(self.max_words, self.max_letters)
        for i, word in enumerate(words):
            if i >= self.max_words:
                break
            for j, letter in enumerate(word):
                if j < self.max_letters:
                    y[i][j] = 1

        return x, y

class PuzzleGenerator(nn.Module):
    def __init__(self, vocab_size, max_letters=8, max_words=12, hidden_dim=256):
        super().__init__()
        self.max_letters = max_letters
        self.max_words = max_words
        self.vocab_size = vocab_size
        
        # Calculate correct input size: max_letters * vocab_size
        input_size = max_letters * vocab_size
        
        self.encoder = nn.Sequential(
            nn.Linear(input_size, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, max_words * max_letters),
            nn.Sigmoid()
        )

    def forward(self, x):
        # x shape: [batch_size, max_letters, vocab_size]
        batch_size = x.size(0)
        # Flatten: [batch_size, max_letters * vocab_size]
        x = x.reshape(batch_size, self.max_letters * self.vocab_size)
        x = self.encoder(x)
        x = self.decoder(x)
        # Reshape output to [batch_size, max_words, max_letters]
        return x.reshape(batch_size, self.max_words, self.max_letters)

def train_model(model, train_loader, device, epochs=50):
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    model.to(device)
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
        if (epoch + 1) % 10 == 0:
            print(f'Epoch {epoch+1}, Loss: {total_loss/len(train_loader):.4f}')

def load_wordlist(filepath='wordlist.txt'):
    if not os.path.exists(filepath):
        import urllib.request
        url = "https://raw.githubusercontent.com/dwyl/english-words/master/words.txt"
        urllib.request.urlretrieve(url, filepath)
    with open(filepath, 'r') as f:
        return set(word.strip().lower() for word in f)

def get_valid_words(letters, wordlist):
    valid = set()
    letter_count = defaultdict(int, {c: letters.count(c) for c in letters})
    for word in wordlist:
        if 3 <= len(word) <= len(letters):
            word_count = defaultdict(int, {c: word.count(c) for c in word})
            if all(word_count[c] <= letter_count[c] for c in word_count):
                valid.add(word)
    return valid

def generate_puzzle(model, char_to_idx, idx_to_char, wordlist, max_letters=6, device='cpu'):
    model.eval()
    with torch.no_grad():
        available_letters = list(char_to_idx.keys())
        puzzle_letters = ''.join(random.sample(available_letters, max_letters))
        x = torch.zeros(1, max_letters, len(char_to_idx))
        for i, letter in enumerate(puzzle_letters):
            x[0, i, char_to_idx[letter]] = 1
        x = x.to(device)
        output = model(x).cpu().numpy()[0]
        valid_words = get_valid_words(puzzle_letters, wordlist)
        return puzzle_letters, list(valid_words)

def save_model(model, char_to_idx, idx_to_char, path='puzzle_model.pt'):
    torch.save({
        'model_state_dict': model.state_dict(),
        'char_to_idx': char_to_idx,
        'idx_to_char': idx_to_char,
        'max_letters': model.max_letters,
        'max_words': model.max_words,
        'vocab_size': model.vocab_size
    }, path)

def load_model(path='puzzle_model.pt'):
    checkpoint = torch.load(path)
    model = PuzzleGenerator(
        vocab_size=checkpoint['vocab_size'],
        max_letters=checkpoint['max_letters'],
        max_words=checkpoint['max_words']
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    return model, checkpoint['char_to_idx'], checkpoint['idx_to_char']

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    wordlist = load_wordlist()
    model_path = 'puzzle_model.pt'
    if not os.path.exists(model_path):
        print("Training new model...")
        dataset = PuzzleDataset('puzzles.data')
        train_loader = DataLoader(dataset, batch_size=32, shuffle=True)
        model = PuzzleGenerator(len(dataset.char_to_idx))
        train_model(model, train_loader, device)
        save_model(model, dataset.char_to_idx, dataset.idx_to_char, model_path)
    else:
        print("Loading existing model...")
        model, char_to_idx, idx_to_char = load_model(model_path)
        model.to(device)
    for i in range(5):
        letters, words = generate_puzzle(model, char_to_idx, idx_to_char, wordlist, device=device)
        print(f"\nPuzzle {i+1}:")
        print(f"Letters: {letters}")
        print(f"Possible words: {', '.join(words)}")

if __name__ == "__main__":
    main()
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
                    
                puzzle_id, letters, placements = parts
                words_data = []
                for placement in placements.split(';'):
                    if not placement:
                        continue
                    word, direction, row, col = placement.split(',')
                    words_data.append({
                        'word': word,
                        'direction': direction,
                        'row': int(row),
                        'col': int(col)
                    })
                
                if words_data:  # Only add if we have valid words
                    self.puzzles.append({
                        'id': int(puzzle_id),
                        'letters': letters,
                        'words': words_data
                    })
                    self.vocab.update(letters)

        self.char_to_idx = {c: i for i, c in enumerate(sorted(self.vocab))}
        self.idx_to_char = {i: c for c, i in self.char_to_idx.items()}
        
    def __len__(self):
        return len(self.puzzles)

    def __getitem__(self, idx):
        puzzle = self.puzzles[idx]
        x = torch.zeros(len(self.char_to_idx))
        for letter in puzzle['letters']:
            x[self.char_to_idx[letter]] = 1
            
        # Encode word placements as a sequence of [word_length, direction, row, col]
        max_words = 12  # Maximum number of words per puzzle
        y = torch.zeros(max_words, 4)  # [word_length, direction (0=h, 1=v), row, col]
        
        for i, word_data in enumerate(puzzle['words']):
            if i >= max_words:
                break
            y[i, 0] = len(word_data['word'])
            y[i, 1] = 1 if word_data['direction'] == 'v' else 0
            y[i, 2] = word_data['row']
            y[i, 3] = word_data['col']
            
        return x, y

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
            nn.Linear(hidden_dim, 12 * 4),  # 12 words max, 4 features each
            nn.Sigmoid()
        )

    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x.reshape(-1, 12, 4)  # Reshape to [batch_size, max_words, features]

def load_wordlist(filepath='wordlist.txt'):
    if not os.path.exists(filepath):
        import urllib.request
        url = "https://raw.githubusercontent.com/dwyl/english-words/master/words.txt"
        urllib.request.urlretrieve(url, filepath)
    
    with open(filepath, 'r') as f:
        words = set()
        for word in f:
            word = word.strip().lower()
            if len(word) >= 3 and word.isalpha():
                words.add(word)
    return words

def check_word_fit(grid, word, row, col, direction):
    height, width = len(grid), len(grid[0])
    
    # Check if word fits within grid bounds
    if direction == 'v':
        if row + len(word) > height:
            return False
    else:
        if col + len(word) > width:
            return False
    
    # Check if word can be placed (empty spaces or matching letters)
    for i, letter in enumerate(word):
        curr_row = row + (i if direction == 'v' else 0)
        curr_col = col + (i if direction == 'h' else 0)
        
        if grid[curr_row][curr_col] not in (0, letter):
            return False
            
    return True

def place_word(grid, word, row, col, direction):
    for i, letter in enumerate(word):
        if direction == 'v':
            grid[row + i][col] = letter
        else:
            grid[row][col + i] = letter

def generate_valid_puzzle(wordlist, letters, min_words=3, max_words=8, grid_size=15):
    grid = [[0] * grid_size for _ in range(grid_size)]
    placed_words = []
    
    # Get all valid words that can be made from letters
    valid_words = set()
    letter_count = defaultdict(int)
    for letter in letters:
        letter_count[letter] += 1
        
    for word in wordlist:
        if 3 <= len(word) <= len(letters):
            word_chars = defaultdict(int)
            for char in word:
                word_chars[char] += 1
            if all(word_chars[char] <= letter_count[char] for char in word_chars):
                valid_words.add(word)
    
    valid_words = sorted(valid_words, key=len, reverse=True)
    if not valid_words:
        return None
    
    # Place first word in center
    first_word = valid_words[0]
    start_row = grid_size // 2
    start_col = (grid_size - len(first_word)) // 2
    place_word(grid, first_word, start_row, start_col, 'h')
    placed_words.append((first_word, 'h', start_row, start_col))
    
    # Try to place remaining words
    attempts = 0
    max_attempts = 1000
    
    while len(placed_words) < max_words and attempts < max_attempts:
        word = random.choice(valid_words)
        direction = random.choice(['h', 'v'])
        
        # Try random positions
        for _ in range(50):
            row = random.randint(0, grid_size - 1)
            col = random.randint(0, grid_size - 1)
            
            if check_word_fit(grid, word, row, col, direction):
                place_word(grid, word, row, col, direction)
                placed_words.append((word, direction, row, col))
                break
                
        attempts += 1
    
    if len(placed_words) >= min_words:
        return placed_words
    return None

def train_model(model, train_loader, device, epochs=100):
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    model.to(device)
    
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
            
        if (epoch + 1) % 10 == 0:
            print(f'Epoch {epoch+1}, Loss: {total_loss/len(train_loader):.4f}')

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

def generate_puzzle(model, char_to_idx, idx_to_char, wordlist, puzzle_id, device='cpu'):
    model.eval()
    with torch.no_grad():
        # Generate random set of letters
        num_letters = random.randint(6, 8)
        letters = ''.join(random.sample(list(char_to_idx.keys()), num_letters))
        
        # Create input tensor
        x = torch.zeros(1, len(char_to_idx))
        for letter in letters:
            x[0, char_to_idx[letter]] = 1
        
        x = x.to(device)
        
        # Generate puzzle layout
        placed_words = generate_valid_puzzle(wordlist, letters)
        
        if placed_words is None:
            return None
            
        # Format output string
        word_placements = []
        for word, direction, row, col in placed_words:
            word_placements.append(f"{word},{direction},{row},{col}")
            
        return f"{puzzle_id}|{letters}|{';'.join(word_placements)}"

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    wordlist = load_wordlist()
    model_path = 'wordscape_model.pt'
    
    if not os.path.exists(model_path):
        print("Training new model...")
        dataset = PuzzleDataset('puzzles.data')
        train_loader = DataLoader(dataset, batch_size=32, shuffle=True)
        model = PuzzleGenerator(len(dataset.char_to_idx))
        train_model(model, train_loader, device)
        save_model(model, dataset.char_to_idx, dataset.idx_to_char, model_path)
    else:
        print("Loading existing model...")
        model, char_to_idx, idx_to_char = load_model(model_path)
        model.to(device)
    
    print("\nGenerating sample puzzles:")
    for i in range(5):
        puzzle = generate_puzzle(model, char_to_idx, idx_to_char, wordlist, i+1, device)
        if puzzle:
            print(f"\nPuzzle {i+1}:")
            print(puzzle)

if __name__ == "__main__":
    main()