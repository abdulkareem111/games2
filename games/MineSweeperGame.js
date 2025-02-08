// games/MinesweeperGame.js
const GameFramework = require('../gameFramework');

class MinesweeperGame extends GameFramework {
  constructor(config) {
    super(config);
    this.options = config.options || {};
    this.rows = this.options.rows || 8;
    this.cols = this.options.cols || 8;
    // Reduced default mines to 10 (instead of 40) so flood-fill is more likely
    this.minesCount = (this.options.mines !== undefined) ? this.options.mines : 10;
    this.grid = [];
  }

  initializeGame() {
    // Create the grid
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = { revealed: false, flagged: false, mine: false, adjacent: 0 };
      }
    }

    // Place mines randomly
    let placedMines = 0;
    while (placedMines < this.minesCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      if (!this.grid[r][c].mine) {
        this.grid[r][c].mine = true;
        placedMines++;
      }
    }

    // Compute adjacent mine counts
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].mine) {
          this.grid[r][c].adjacent = this.countAdjacentMines(r, c);
        }
      }
    }

    // Broadcast initial round
    this.broadcastToPlayers('newRound', {
      gridSize: { rows: this.rows, cols: this.cols },
      minesCount: this.minesCount,
      duration: this.duration,
      state: this.getGameState()
    });
  }

  countAdjacentMines(row, col) {
    let count = 0;
    for (let rr = row - 1; rr <= row + 1; rr++) {
      for (let cc = col - 1; cc <= col + 1; cc++) {
        if (rr === row && cc === col) continue;
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
          if (this.grid[rr][cc].mine) count++;
        }
      }
    }
    return count;
  }

  processPlayerAction(playerId, action) {
    console.log("[DEBUG] Processing action from player:", playerId, "Action:", action);
    let actionResult = { valid: false };

    if (action.type === 'reveal') {
      const { row, col } = action;
      if (!this.isValidCell(row, col)) {
        return { valid: false, message: "Invalid cell coordinates" };
      }
      const cell = this.grid[row][col];
      if (cell.revealed || cell.flagged) {
        return { valid: false, message: "Cell already revealed or flagged" };
      }

      cell.revealed = true;
      let revealedCells = [];

      if (cell.mine) {
        // Exploded
        revealedCells.push({ row, col, mine: true });
        this.broadcastToPlayers('gameStateUpdate', { state: this.getGameState() });
        // OVERRIDE: pass second param with { explodedAt: { row, col }, playerId }
        this.endGame('mine_exploded', { explodedAt: { row, col }, playerId });
        actionResult = { valid: true, type: 'reveal', exploded: true, revealedCells };
        return actionResult;
      } else {
        // Safe cell reveal + flood fill
        revealedCells = this.revealCell(row, col);
        this.broadcastToPlayers('gameStateUpdate', { state: this.getGameState() });
        if (this.checkWinCondition()) {
          this.endGame('win', { playerId });
        }
        actionResult = { valid: true, type: 'reveal', exploded: false, revealedCells };
        return actionResult;
      }
    }
    else if (action.type === 'flag') {
      const { row, col } = action;
      if (!this.isValidCell(row, col)) {
        return { valid: false, message: "Invalid cell coordinates" };
      }
      const cell = this.grid[row][col];
      if (!cell.revealed) {
        cell.flagged = !cell.flagged;
        this.broadcastToPlayers('gameStateUpdate', { state: this.getGameState() });
        actionResult = { valid: true, type: 'flag', flagged: cell.flagged, row, col };
        return actionResult;
      } else {
        return { valid: false, message: "Cannot flag a revealed cell" };
      }
    }
    else {
      return { valid: false, message: "Unknown action type" };
    }
  }

  revealCell(row, col) {
    const stack = [{ row, col }];
    let revealedCells = [];

    while (stack.length > 0) {
      const { row: r, col: c } = stack.pop();
      if (!this.isValidCell(r, c)) continue;
      const cell = this.grid[r][c];
      if (cell.revealed || cell.flagged) continue;

      cell.revealed = true;
      revealedCells.push({ row: r, col: c, adjacent: cell.adjacent });

      // If no adjacent mines, flood-fill neighbors
      if (cell.adjacent === 0) {
        for (let rr = r - 1; rr <= r + 1; rr++) {
          for (let cc = c - 1; cc <= c + 1; cc++) {
            if (!(rr === r && cc === c)) {
              stack.push({ row: rr, col: cc });
            }
          }
        }
      }
    }
    return revealedCells;
  }

  checkWinCondition() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell.mine && !cell.revealed) {
          return false;
        }
      }
    }
    return true;
  }

  calculateScore(playerId, actionResult) {
    if (!actionResult.valid || actionResult.exploded) {
      return this.getPlayerScore(playerId);
    }
    let pointsEarned = 0;
    if (actionResult.type === 'reveal' && Array.isArray(actionResult.revealedCells)) {
      // 10 pts per newly revealed cell
      pointsEarned = actionResult.revealedCells.length * 10;
    }
    const newScore = this.getPlayerScore(playerId) + pointsEarned;
    return newScore;
  }

  getGameState() {
    const stateGrid = this.grid.map(row =>
      row.map(cell => {
        if (cell.revealed) {
          if (cell.mine) {
            return { state: 'revealed', mine: true };
          } else {
            return { state: 'revealed', adjacent: cell.adjacent };
          }
        } else {
          return { state: 'hidden', flagged: cell.flagged };
        }
      })
    );
    return { grid: stateGrid };
  }

  // **Critical**: override endGame so we can include extra data (like explodedAt) in the broadcast
  endGame(reason, extraData = {}) {
    this.state = 'finished';
    this.endTime = Date.now();
    clearTimeout(this.timer);

    // Build standings
    const standings = Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([playerId, score]) => ({
        playerId,
        score,
        playerData: this.players.get(playerId)
      }));

    // Merge the second param (extraData) into results
    const results = {
      reason,
      ...extraData,
      duration: (this.endTime - this.startTime) / 1000,
      standings,
      finalState: this.getGameState()
    };

    // Broadcast final event
    this.broadcastToPlayers('gameEnded', results);
    this.cleanup();
  }

  isValidCell(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }
}

module.exports = { MinesweeperGame };
