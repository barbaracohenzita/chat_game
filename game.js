/* game.js */

// Fibonacci sequence for normal merges: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144
// (Note: Although Fibonacci typically starts 1,1,2..., we use one 1 so that merging 1+1 yields 2)
const fibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

const boardSize = 4;
let board;
let score = 0;
let gameWon = false;
let gameOver = false;

const boardContainer = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('best-score');
const messageDisplay = document.getElementById('message');
const restartButton = document.getElementById('restart-button');

// Sound effects (placeholders – ensure these files exist or comment them out)
let mergeSound, winSound, loseSound;
try {
  mergeSound = new Audio('merge.mp3');
  winSound = new Audio('win.mp3');
  loseSound = new Audio('lose.mp3');
} catch (e) {
  console.warn("Audio files not loaded", e);
}

function init() {
  // Create an empty board (2D array filled with null)
  board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  score = 0;
  gameWon = false;
  gameOver = false;
  updateScore(0);
  clearMessage();
  // Spawn two initial tiles
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
    board[i][j] = { type: 'forge' };
  } else {
    // Normal tile: 90% chance for 1, 10% chance for 2
    let value = (Math.random() < 0.9) ? 1 : 2;
    board[i][j] = { type: 'normal', value };
  }
}

function drawBoard() {
  boardContainer.innerHTML = '';
  
  // Draw background grid cells
  for (let k = 0; k < boardSize * boardSize; k++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    boardContainer.appendChild(cell);
  }
  
  // Draw tiles based on board state
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const cellData = board[i][j];
      if (cellData) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        
        if (cellData.type === 'forge') {
          tile.textContent = 'Forge';
          tile.classList.add('forged');
        } else if (cellData.type === 'normal') {
          tile.textContent = cellData.value;
          tile.classList.add(`normal-${cellData.value}`);
        } else if (cellData.type === 'forged') {
          tile.textContent = cellData.value;
          tile.classList.add('forged');
        }
        
        // Position tile using CSS Grid (grid rows/columns start at 1)
        tile.style.gridRowStart = i + 1;
        tile.style.gridColumnStart = j + 1;
        boardContainer.appendChild(tile);
      }
    }
  }
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
        board[i] = slideAndMerge(board[i]);
      }
      break;
    case 'right':
      for (let i = 0; i < boardSize; i++) {
        let reversed = board[i].slice().reverse();
        let merged = slideAndMerge(reversed);
        board[i] = merged.reverse();
      }
      break;
  }
  
  if (JSON.stringify(board) !== oldBoard) {
    spawnTile();
    drawBoard();
    if (checkWin()) {
      gameWon = true;
      showMessage("You Win!");
      if (winSound) winSound.play();
    } else if (checkGameOver()) {
      gameOver = true;
      showMessage("Game Over!");
      if (loseSound) loseSound.play();
    }
  }
}

function slideAndMerge(cells) {
  // Remove empty cells
  let filtered = cells.filter(cell => cell !== null);
  
  // Merge adjacent tiles when possible
  for (let i = 0; i < filtered.length - 1; i++) {
    if (canMerge(filtered[i], filtered[i + 1])) {
      const mergedTile = mergeTiles(filtered[i], filtered[i + 1]);
      filtered[i] = mergedTile;
      filtered[i + 1] = null;
      if (mergeSound) mergeSound.play();
      // Award points based on the merged tile’s value (if numeric)
      if (mergedTile.value) updateScore(mergedTile.value);
      i++; // Skip next since it was merged
    }
  }
  filtered = filtered.filter(cell => cell !== null);
  while (filtered.length < boardSize) {
    filtered.push(null);
  }
  return filtered;
}

function canMerge(a, b) {
  if (!a || !b) return false;
  // Allow merge if one tile is a Forge and the other is normal
  if ((a.type === 'normal' && b.type === 'forge') || (a.type === 'forge' && b.type === 'normal')) {
    return true;
  }
  // Merge two normal tiles with identical value
  if (a.type === 'normal' && b.type === 'normal' && a.value === b.value) {
    return true;
  }
  // Merge two forged tiles with identical value
  if (a.type === 'forged' && b.type === 'forged' && a.value === b.value) {
    return true;
  }
  return false;
}

function mergeTiles(a, b) {
  // Merge Forge with normal: double the normal tile's value and mark as forged
  if ((a.type === 'normal' && b.type === 'forge') || (a.type === 'forge' && b.type === 'normal')) {
    let normalTile = (a.type === 'normal') ? a : b;
    return { type: 'forged', value: normalTile.value * 2 };
  }
  // Merge two normal tiles: advance in the Fibonacci sequence
  if (a.type === 'normal' && b.type === 'normal') {
    let current = a.value;
    let idx = fibSeq.indexOf(current);
    let newValue = (idx !== -1 && idx < fibSeq.length - 1) ? fibSeq[idx + 1] : current;
    return { type: 'normal', value: newValue };
  }
  // Merge two forged tiles: double the value
  if (a.type === 'forged' && b.type === 'forged') {
    return { type: 'forged', value: a.value * 2 };
  }
  return a;
}

function checkWin() {
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const cell = board[i][j];
      if (cell && (cell.type === 'normal' || cell.type === 'forged') && cell.value === 144) {
        return true;
      }
    }
  }
  return false;
}

function checkGameOver() {
  // If there's any empty cell, game continues
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (!board[i][j]) return false;
    }
  }
  // Check adjacent cells for possible merges
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const cell = board[i][j];
      const directions = [ [-1, 0], [1, 0], [0, -1], [0, 1] ];
      for (const [di, dj] of directions) {
        const ni = i + di, nj = j + dj;
        if (ni >= 0 && ni < boardSize && nj >= 0 && nj < boardSize) {
          const neighbor = board[ni][nj];
          if (!neighbor || canMerge(cell, neighbor)) return false;
        }
      }
    }
  }
  return true;
}

// Keyboard controls for arrow keys
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp': move('up'); break;
    case 'ArrowDown': move('down'); break;
    case 'ArrowLeft': move('left'); break;
    case 'ArrowRight': move('right'); break;
  }
});

// Touch support for mobile (simple swipe detection)
let touchStartX = null, touchStartY = null;
boardContainer.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
});
boardContainer.addEventListener('touchend', (e) => {
  if (touchStartX === null || touchStartY === null) return;
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe
    if (dx > 20) move('right');
    else if (dx < -20) move('left');
  } else {
    // Vertical swipe
    if (dy > 20) move('down');
    else if (dy < -20) move('up');
  }
  
  touchStartX = null;
  touchStartY = null;
});

// Restart game when clicking the button
restartButton.addEventListener('click', init);

// Initialize the game when the page loads
init();
