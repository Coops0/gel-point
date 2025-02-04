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
        self.encoder = nn.Sequential(
            nn.Linear(vocab_size * max_letters, hidden_dim),
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
        x = x.view(x.size(0), -1)
        x = self.encoder(x)
        x = self.decoder(x)
        return x.view(-1, self.max_words, self.max_letters)

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
    torch.save({'model_state_dict': model.state_dict(), 'char_to_idx': char_to_idx, 'idx_to_char': idx_to_char}, path)

def load_model(path='puzzle_model.pt'):
    checkpoint = torch.load(path)
    model = PuzzleGenerator(len(checkpoint['char_to_idx']))
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
