const GameFramework = require('../gameFramework');

class MinesweeperGame extends GameFramework {
  constructor(config) {
    super(config);
    this.minPlayers = 2;
    this.maxPlayers = 2;
    this.rows = 9;
    this.cols = 9;
    this.numMines = 10;
    this.board = [];
    this.revealed = [];
    this.revealedBy = [];
    this.gameOver = false;
    this.currentPlayerIndex = 0;
    this.playersArray = [];
  }

  initializeGame() {
    this.roundNumber = 1;
    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      console.log('Warning: Minesweeper expects exactly 2 players.');
    }
    this.playersArray = playerIds;
    this.generateBoard();

    this.broadcastToPlayers('newRound', {
      initialState: this.getGameState()
    });

    this.broadcastGameState();
  }

  generateBoard() {
    for (let r = 0; r < this.rows; r++) {
      this.board[r] = [];
      this.revealed[r] = [];
      this.revealedBy[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.board[r][c] = { mine: false, adjacentMines: 0 };
        this.revealed[r][c] = false;
        this.revealedBy[r][c] = null;
      }
    }

    let placed = 0;
    while (placed < this.numMines) {
      const rr = Math.floor(Math.random() * this.rows);
      const cc = Math.floor(Math.random() * this.cols);
      if (!this.board[rr][cc].mine) {
        this.board[rr][cc].mine = true;
        placed++;
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.board[r][c].mine) {
          this.board[r][c].adjacentMines = this.countAdjacentMines(r, c);
        }
      }
    }
  }

  countAdjacentMines(row, col) {
    let count = 0;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (this.isValidCell(r, c) && !(r === row && c === col)) {
          if (this.board[r][c].mine) {
            count++;
          }
        }
      }
    }
    return count;
  }

  isValidCell(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  processPlayerAction(playerId, action) {
    if (action.type === 'revealCell') {
      const currentPlayerId = this.playersArray[this.currentPlayerIndex];
      if (playerId !== currentPlayerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      const { row, col } = action;
      if (!this.isValidCell(row, col)) {
        return { valid: false, reason: 'Invalid cell' };
      }
      if (this.revealed[row][col]) {
        return { valid: false, reason: 'Cell already revealed' };
      }

      this.revealed[row][col] = true;
      this.revealedBy[row][col] = playerId;

      if (this.board[row][col].mine) {
        const otherPlayerId = this.playersArray[1 - this.currentPlayerIndex];
        this.endGame('Player ' + playerId + ' hit a mine! ' + otherPlayerId + ' wins!');
        return { valid: true };
      } else {
        if (this.board[row][col].adjacentMines === 0) {
          this.floodFill(row, col);
        }
        if (this.checkAllSafeRevealed()) {
          this.endGame('All safe cells revealed. Draw!');
          return { valid: true };
        }
        this.currentPlayerIndex = 1 - this.currentPlayerIndex;
        this.broadcastGameState();
        return { valid: true };
      }
    }
    return { valid: false, reason: 'Unknown action type' };
  }

  floodFill(row, col) {
    const stack = [{ row, col }];
    while (stack.length > 0) {
      const { row: r, col: c } = stack.pop();
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (this.isValidCell(rr, cc) && !this.revealed[rr][cc] && !this.board[rr][cc].mine) {
            this.revealed[rr][cc] = true;
            this.revealedBy[rr][cc] = this.playersArray[this.currentPlayerIndex];
            if (this.board[rr][cc].adjacentMines === 0) {
              stack.push({ row: rr, col: cc });
            }
          }
        }
      }
    }
  }

  checkAllSafeRevealed() {
    let revealedCount = 0;
    const totalSafe = this.rows * this.cols - this.numMines;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.board[r][c].mine && this.revealed[r][c]) {
          revealedCount++;
        }
      }
    }
    return revealedCount === totalSafe;
  }

  broadcastGameState() {
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState()
    });
  }

  getGameState() {
    const revealedCells = [];
    for (let r = 0; r < this.rows; r++) {
      revealedCells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        if (this.revealed[r][c]) {
          revealedCells[r][c] = {
            mine: this.board[r][c].mine,
            adjacentMines: this.board[r][c].adjacentMines,
            revealedBy: this.revealedBy[r][c]
          };
        } else {
          revealedCells[r][c] = null;
        }
      }
    }
    return {
      revealedCells,
      currentTurn: this.playersArray[this.currentPlayerIndex],
      roundNumber: this.roundNumber
    };
  }

  endGame(reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', {
      reason,
      standings
    });
    super.endGame(reason);
  }

  getStandings() {
    const results = [];
    for (const [playerId] of this.players) {
      results.push({
        playerId,
        score: 0,
        playerData: this.players.get(playerId) || {}
      });
    }
    return results;
  }

  calculateScore(playerId) {
    return 0;
  }
}

module.exports = { MinesweeperGame };