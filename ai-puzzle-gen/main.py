import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from collections import defaultdict
import re

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
        
        # Convert letters to one-hot encoding
        x = torch.zeros(self.max_letters, len(self.char_to_idx))
        for i, letter in enumerate(letters):
            x[i][self.char_to_idx[letter]] = 1
            
        # Create target mask for valid words
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
        # Generate random input
        x = torch.zeros(1, dataset.max_letters, len(dataset.char_to_idx))
        for i in range(dataset.max_letters):
            idx = np.random.randint(len(dataset.char_to_idx))
            x[0, i, idx] = 1
            
        x = x.to(device)
        output = model(x)
        output = output.cpu().numpy()[0]
        
        # Sample words based on probability distribution
        words = []
        for word_prob in output:
            if np.random.random() < temperature:
                word = ''.join(['1' if p > 0.5 else '0' for p in word_prob])
                if '1' in word:  # Only add if word contains letters
                    words.append(word)
                    
        return words

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Load and prepare data
    dataset = PuzzleDataset('../app/src-tauri/assets/puzzles.data')
    train_loader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    # Initialize and train model
    model = PuzzleGenerator(len(dataset.char_to_idx))
    train_model(model, train_loader, device)
    
    # Generate new puzzles
    for _ in range(5):
        puzzle = generate_puzzle(model, dataset, device)
        print(f"Generated puzzle: {puzzle}")

if __name__ == "__main__":
    main()