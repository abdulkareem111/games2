const GameFramework = require('../gameFramework');

// A minimal Tetris-like class. Single-player version for demonstration.
// You can adapt for multiple players if desired.
class TetrisGame extends GameFramework {
  constructor(config) {
    super(config);

    this.boardWidth = 10;
    this.boardHeight = 20;
    this.board = this.createEmptyBoard();
    this.activePiece = null;  // { shape, x, y }
    this.scoreMap = new Map();

    // Example shapes
    this.shapes = [
      [[1,1,1,1]], // I
      [[1,1],[1,1]], // O
      [[1,0],[1,0],[1,1]], // L
      // add more if needed...
    ];

    this.gameLoopInterval = null;
    this.gameSpeedMs = 500;
    this.linesCleared = 0;
    this.linesToWin = 5; // clear 5 lines to "win" for demonstration
  }

  createEmptyBoard() {
    return Array.from({ length: this.boardHeight }, () => Array(this.boardWidth).fill(0));
  }

  initializeGame() {
    this.roundNumber = 1;
    this.broadcastToPlayers('newRound', {
      roundNumber: this.roundNumber
    });
    // Choose a random piece
    this.spawnNewPiece();
    // Start game loop
    this.startGameLoop();
  }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => this.tick(), this.gameSpeedMs);
  }

  /**
   * Spawn a new piece at the top. 
   * If it collides immediately, we end the game (lose condition).
   */
  spawnNewPiece() {
    const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    const startX = Math.floor(this.boardWidth / 2) - 1;
    const startY = 0;

    // Check if shape collides at the top
    if (this.collides(shape, startX, startY)) {
      // If collision occurs immediately, that means no space => game over
      this.endGame("No space to spawn new piece - Game Over!");
      this.activePiece = null;
    } else {
      this.activePiece = {
        shape,
        x: startX,
        y: startY
      };
    }
  }

  processPlayerAction(playerId, action) {
    // We assume single-player, but you can adapt
    if (!this.scoreMap.has(playerId)) {
      this.scoreMap.set(playerId, 0);
    }
    if (!this.activePiece) return { valid: false };

    const { type } = action;
    switch (type) {
      case 'moveLeft':
        this.tryMovePiece(-1, 0);
        return { valid: true };
      case 'moveRight':
        this.tryMovePiece(1, 0);
        return { valid: true };
      case 'rotate':
        this.rotatePiece();
        return { valid: true };
      case 'drop':
        this.tick(); // immediate move down
        return { valid: true };
      default:
        return { valid: false };
    }
  }

  tryMovePiece(dx, dy) {
    if (!this.collides(this.activePiece.shape, this.activePiece.x + dx, this.activePiece.y + dy)) {
      this.activePiece.x += dx;
      this.activePiece.y += dy;
    } else if (dy > 0 && dx === 0) {
      // piece can't move down => place piece on board
      this.lockPiece();
      this.clearLines();
      // spawn next piece if game not ended
      if (this.activePiece !== null) {
        this.spawnNewPiece();
      }
    }
  }

  rotatePiece() {
    const shape = this.activePiece.shape;
    // naive rotation
    const rotated = shape[0].map((_, colIndex) =>
      shape.map(row => row[colIndex]).reverse()
    );
    if (!this.collides(rotated, this.activePiece.x, this.activePiece.y)) {
      this.activePiece.shape = rotated;
    }
  }

  collides(shape, offsetX, offsetY) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          let newX = offsetX + c;
          let newY = offsetY + r;
          if (
            newX < 0 || newX >= this.boardWidth ||
            newY < 0 || newY >= this.boardHeight ||
            this.board[newY][newX]
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Lock the current piece into the board. After locking,
   * check if we filled the top row => lose condition.
   */
  lockPiece() {
    for (let r = 0; r < this.activePiece.shape.length; r++) {
      for (let c = 0; c < this.activePiece.shape[r].length; c++) {
        if (this.activePiece.shape[r][c]) {
          this.board[this.activePiece.y + r][this.activePiece.x + c] = 1;
        }
      }
    }

    // If the top row is filled after locking => game over
    if (this.board[0].some(cell => cell === 1)) {
      this.endGame('Blocks reached the top - Game Over!');
      // Remove the active piece reference so no further moves
      this.activePiece = null;
    }
  }

  clearLines() {
    let linesClearedNow = 0;
    for (let r = this.boardHeight - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell === 1)) {
        // remove the line
        this.board.splice(r, 1);
        // add empty line on top
        this.board.unshift(Array(this.boardWidth).fill(0));
        linesClearedNow++;
        r++; // re-check same row index
      }
    }
    if (linesClearedNow > 0) {
      // For demonstration, let's give +100 points per line
      // We'll apply to all players or a single player; you can adapt logic
      for (let [playerId, score] of this.scoreMap.entries()) {
        this.scoreMap.set(playerId, score + linesClearedNow * 100);
      }
      this.linesCleared += linesClearedNow;

      // "Win" condition for demonstration
      if (this.linesCleared >= this.linesToWin) {
        this.endGame(`Lines Cleared = ${this.linesCleared}. You Win!`);
      }
    }
  }

  tick() {
    if (!this.activePiece) return;
    this.tryMovePiece(0, 1);
    // broadcast new state
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  calculateScore(playerId) {
    return this.scoreMap.get(playerId) || 0;
  }

  getGameState() {
    return {
      board: this.board,
      activePiece: this.activePiece,
      roundNumber: this.roundNumber
    };
  }

  endGame(reason) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    // Build standings (descending by score)
    let standings = [];
    for (let [pid, scr] of this.scoreMap.entries()) {
      standings.push({ playerId: pid, score: scr });
    }
    standings.sort((a, b) => b.score - a.score);

    this.broadcastToPlayers('gameEnded', { reason, standings });
    super.endGame(reason);
  }
}

module.exports = { TetrisGame };
