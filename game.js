/* game.js */

// Fibonacci sequence used for normal merges (1 -> 2 -> 3 -> 5 -> … -> 144)
const fibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

let board;
let score = 0;
let gameWon = false;
let gameOver = false;

const boardSize = 4;

const boardContainer = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('best-score');
const messageDisplay = document.getElementById('message');
const restartButton = document.getElementById('restart-button');

// Sound effects (placeholders – replace with your own audio files)
const mergeSound = new Audio('merge.mp3');
const winSound = new Audio('win.mp3');
const loseSound = new Audio('lose.mp3');

function init() {
  // Initialize empty board
  board = [];
  for (let i = 0; i < boardSize; i++) {
    board[i] = [];
    for (let j = 0; j < boardSize; j++) {
      board[i][j] = null;
    }
  }
  score = 0;
  gameWon = false;
  gameOver = false;
  updateScore(0);
  clearMessage();
  // Start with two tiles
  spawnTile();
  spawnTile();
  drawBoard();
}

function updateScore(added) {
  score += added;
  scoreDisplay.textContent = score;
  let best = localStorage.getItem('bestScore') || 0;
  if (score > best) {
    localStorage.setItem('bestScore', score);
    bestScoreDisplay.textContent = score;
  } else {
    bestScoreDisplay.textContent = best;
  }
}

function spawnTile() {
  let emptyCells = [];
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (!board[i][j]) {
        emptyCells.push({ i, j });
      }
    }
  }
  if (emptyCells.length === 0) return;
  let { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

  // 5% chance to spawn a Forge tile
  if (Math.random() < 0.05) {
    board[i][j] = { type: 'forge' }; // Special Forge tile (no numeric value)
  } else {
    // Normal tile: 90% chance for 1, 10% chance for 2
    let value = (Math.random() < 0.9) ? 1 : 2;
    board[i][j] = { type: 'normal', value };
  }
}

function drawBoard() {
  boardContainer.innerHTML = '';

  // Create background cells for consistent grid appearance
  for (let i = 0; i < boardSize * boardSize; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    boardContainer.appendChild(cell);
  }

  // Create tile elements based on board state
  board.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell) {
        const tile = document.createElement('div');
        tile.classList.add('tile');

        if (cell.type === 'forge') {
          tile.textContent = 'Forge';
          tile.classList.add('forged');
        } else if (cell.type === 'normal') {
          tile.textContent = cell.value;
          tile.classList.add(`normal-${cell.value}`);
        } else if (cell.type === 'forged') {
          tile.textContent = cell.value;
          tile.classList.add('forged');
        }
        // Position tile in grid (CSS Grid handles placement via row/column start)
        tile.style.gridRowStart = i + 1;
        tile.style.gridColumnStart = j + 1;
        boardContainer.appendChild(tile);
      }
    });
  });
}

function showMessage(text) {
  messageDisplay.textContent = text;
  messageDisplay.style.display = 'block';
}

function clearMessage() {
  messageDisplay.textContent = '';
  messageDisplay.style.display = 'none';
}

function move(direction) {
  if (gameOver || gameWon) return;
  let moved = false;
  const oldBoard = JSON.stringify(board);

  switch (direction) {
    case 'up':
      for (let j = 0; j < boardSize; j++) {
        let column = [];
        for (let i = 0; i < boardSize; i++) {
          column.push(board[i][j]);
        }
        let newColumn = slideAndMerge(column);
        for (let i = 0; i < boardSize; i++) {
          board[i][j] = newColumn[i];
        }
      }
      break;
    case 'down':
      for (let j = 0; j < boardSize; j++) {
        let column = [];
        for (let i = boardSize - 1; i >= 0; i--) {
          column.push(board[i][j]);
        }
        let newColumn = slideAndMerge(column);
        for (let i = boardSize - 1, idx = 0; i >= 0; i--, idx++) {
          board[i][j] = newColumn[idx];
        }
      }
      break;
    case 'left':
      for (let i = 0; i < boardSize; i++) {
        let row = board[i];
        let newRow = slideAndMerge(row);
        board[i] = newRow;
      }
      break;
    case 'right':
      for (let i = 0; i < boardSize; i++) {
        let row = board[i].slice().reverse();
        let newRow = slideAndMerge(row);
        board[i] = newRow.reverse();
      }
      break;
  }

  if (JSON.stringify(board) !== oldBoard) {
    moved = true;
  }

  if (moved) {
    spawnTile();
    drawBoard();
    if (checkWin()) {
      gameWon = true;
      showMessage("You Win!");
      winSound.play();
    } else if (checkGameOver()) {
      gameOver = true;
      showMessage("Game Over!");
      loseSound.play();
    }
  }
}

function slideAndMerge(cells) {
  // Filter out empty cells
  let arr = cells.filter(cell => cell !== null);
  for (let i = 0; i < arr.length - 1; i++) {
    if (canMerge(arr[i], arr[i + 1])) {
      let merged = mergeTiles(arr[i], arr[i + 1]);
      arr[i] = merged;
      arr[i + 1] = null;
      mergeSound.play();
      i++; // Skip next cell after merge
    }
  }
  arr = arr.filter(cell => cell !== null);
  while (arr.length < boardSize) {
    arr.push(null);
  }
  return arr;
}

function canMerge(a, b) {
  if (!a || !b) return false;
  // Allow merge if one tile is a spawned Forge tile and the other is a normal tile
  if ((a.type === 'normal' && b.type === 'forge') || (a.type === 'forge' && b.type === 'normal')) {
    return true;
  }
  // Normal merge: both tiles are "normal" and have equal values
  if (a.type === 'normal' && b.type === 'normal' && a.value === b.value) {
    return true;
  }
  // Forged merge: both tiles are of type "forged" and have equal values
  if (a.type === 'forged' && b.type === 'forged' && a.value === b.value) {
    return true;
  }
  return false;
}

function mergeTiles(a, b) {
  // If one is a Forge tile and the other is normal, merge them into a forged tile (doubling the value)
  if ((a.type === 'normal' && b.type === 'forge') || (a.type === 'forge' && b.type === 'normal')) {
    let normalTile = a.type === 'normal' ? a : b;
    return { type: 'forged', value: normalTile.value * 2 };
  }
  // Normal merge: merge two normal tiles using Fibonacci progression
  if (a.type === 'normal' && b.type === 'normal') {
    let current = a.value;
    let index = fibSeq.indexOf(current);
    let newValue = (index !== -1 && index < fibSeq.length - 1) ? fibSeq[index + 1] : current;
    return { type: 'normal', value: newValue };
  }
  // Forged merge: merge two forged tiles by doubling their value
  if (a.type === 'forged' && b.type === 'forged') {
    return { type: 'forged', value: a.value * 2 };
  }
  return a;
}

function checkWin() {
  // Win if any tile (normal or forged) reaches 144
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      let cell = board[i][j];
      if (cell) {
        if ((cell.type === 'normal' || cell.type === 'forged') && cell.value === 144) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkGameOver() {
  // Game is not over if an empty cell exists
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (!board[i][j]) return false;
    }
  }
  // Check if any move is possible by examining neighbors
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      let cell = board[i][j];
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (let d of directions) {
        let ni = i + d[0], nj = j + d[1];
        if (ni >= 0 && ni < boardSize && nj >= 0 && nj < boardSize) {
          let neighbor = board[ni][nj];
          if (!neighbor || canMerge(cell, neighbor)) return false;
        }
      }
    }
  }
  return true;
}

// Listen for arrow key inputs
window.addEventListener('keydown', function(e) {
  switch (e.key) {
    case 'ArrowUp':
      move('up');
      break;
    case 'ArrowDown':
      move('down');
      break;
    case 'ArrowLeft':
      move('left');
      break;
    case 'ArrowRight':
      move('right');
      break;
  }
});

// Restart game when button is clicked
restartButton.addEventListener('click', function() {
  init();
});

// Start the game when the page loads
init();
