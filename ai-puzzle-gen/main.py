import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from collections import defaultdict
import re
import os

class PuzzleDataset(Dataset):
    def __init__(self, file_path, max_letters=8, max_words=12):
        self.puzzles = []
        self.max_letters = max_letters
        self.max_words = max_words
        self.vocab = set()

        with open(file_path, 'r') as f:
            for line in f:
                puzzle_id, letters, solutions = line.strip().split('|')
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

def train_model(model, train_loader, device, epochs=100):
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters())

    model.to(device)
    for epoch in range(epochs):
        total_loss = 0
        for batch_x, batch_y in train_loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)

            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        if (epoch + 1) % 10 == 0:
            print(f'Epoch {epoch+1}, Loss: {total_loss/len(train_loader):.4f}')

def generate_puzzle(model, dataset, device, temperature=0.8):
    model.eval()
    with torch.no_grad():
        x = torch.zeros(1, dataset.max_letters, len(dataset.char_to_idx))
        for i in range(dataset.max_letters):
            idx = np.random.randint(len(dataset.char_to_idx))
            x[0, i, idx] = 1

        x = x.to(device)
        output = model(x)
        output = output.cpu().numpy()[0]

        words = []
        for word_prob in output:
            if np.random.random() < temperature:
                word = ''.join(['1' if p > 0.5 else '0' for p in word_prob])
                if '1' in word:
                    words.append(word)

        return words

def save_model(model, dataset, path='puzzle_model.pt'):
    torch.save({
        'model_state_dict': model.state_dict(),
        'char_to_idx': dataset.char_to_idx,
        'idx_to_char': dataset.idx_to_char
    }, path)

def load_model(path='puzzle_model.pt'):
    checkpoint = torch.load(path)
    vocab_size = len(checkpoint['char_to_idx'])
    model = PuzzleGenerator(vocab_size)
    model.load_state_dict(checkpoint['model_state_dict'])
    return model, checkpoint['char_to_idx'], checkpoint['idx_to_char']

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model_path = 'puzzle_model.pt'

    if not os.path.exists(model_path):
        print("Training new model...")
        dataset = PuzzleDataset('../app/src-tauri/assets/puzzles.data')
        train_loader = DataLoader(dataset, batch_size=32, shuffle=True)
        model = PuzzleGenerator(len(dataset.char_to_idx))
        train_model(model, train_loader, device)
        save_model(model, dataset, model_path)
    else:
        print("Loading existing model...")
        model, char_to_idx, idx_to_char = load_model(model_path)
        model.to(device)

    for _ in range(5):
        puzzle = generate_puzzle(model, dataset, device)
        print(f"Generated puzzle: {puzzle}")

if __name__ == "__main__":
    main()
