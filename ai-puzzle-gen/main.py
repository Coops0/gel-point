import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from collections import defaultdict
import re
import os

# [Previous PuzzleDataset and PuzzleGenerator classes remain the same]

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

def generate_puzzle(model, char_to_idx, idx_to_char, max_letters=8, temperature=0.8, device='cuda'):
    model.eval()
    with torch.no_grad():
        available_letters = list(char_to_idx.keys())
        puzzle_letters = np.random.choice(available_letters, size=max_letters)

        x = torch.zeros(1, max_letters, len(char_to_idx))
        for i, letter in enumerate(puzzle_letters):
            x[0, i, char_to_idx[letter]] = 1

        x = x.to(device)
        output = model(x)
        output = output.cpu().numpy()[0]

        words = []
        for word_prob in output:
            if np.random.random() < temperature:
                word = ''.join([puzzle_letters[i] for i, p in enumerate(word_prob) if p > 0.5])
                if len(word) >= 3:
                    words.append(word)

        return ''.join(puzzle_letters[:6]), words

def save_model(model, char_to_idx, idx_to_char, path='puzzle_model.pt'):
    torch.save({
        'model_state_dict': model.state_dict(),
        'char_to_idx': char_to_idx,
        'idx_to_char': idx_to_char
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
        save_model(model, dataset.char_to_idx, dataset.idx_to_char, model_path)
        char_to_idx = dataset.char_to_idx
        idx_to_char = dataset.idx_to_char
    else:
        print("Loading existing model...")
        model, char_to_idx, idx_to_char = load_model(model_path)
        model.to(device)

    for i in range(5):
        letters, words = generate_puzzle(model, char_to_idx, idx_to_char, device=device)
        print(f"\nPuzzle {i+1}:")
        print(f"Letters: {letters}")
        print(f"Possible words: {', '.join(words)}")

if __name__ == "__main__":
    main()
