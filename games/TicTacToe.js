const GameFramework = require('../gameFramework');

class TicTacToeGame extends GameFramework {
  constructor(config) {
    /*
      config = {
        gameId,
        roomId,
        socket,
        maxPlayers,
        minPlayers = 2,
        duration,
        options = {}
      }
    */
    super(config);

    this.minPlayers = 2;
    this.maxPlayers = 2;

    this.boardSize = 3;
    this.board = null; // 2D array for the 3x3 board
    this.playerSymbols = {}; // playerId -> 'X' or 'O'
    this.currentTurnIndex = 0;
    this.roundNumber = 0;
    this.winner = null;
  }

  initializeGame() {
    // Called once when the game starts
    this.roundNumber = 1;

    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      console.log('Warning: Tic-Tac-Toe expects exactly 2 players.');
    }

    // Create empty board
    this.board = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(null));

    // Assign symbols after players have joined
    this.playerSymbols[playerIds[0]] = 'X';
    this.playerSymbols[playerIds[1]] = 'O';

    this.currentTurnIndex = 0;
    this.winner = null;

    // Broadcast a new round with initial state
    this.broadcastToPlayers('newRound', {
      roundNumber: this.roundNumber,
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  processPlayerAction(playerId, action) {
    // e.g. action = { type: 'move', row, col }
    const playerIds = Array.from(this.players.keys());
    const currentPlayerId = playerIds[this.currentTurnIndex];

    if (playerId !== currentPlayerId) {
      return { valid: false, reason: 'Not your turn' };
    }

    if (action.type === 'move') {
      const { row, col } = action;
      if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
        return { valid: false, reason: 'Invalid move coordinates' };
      }
      if (this.board[row][col] !== null) {
        return { valid: false, reason: 'Cell already occupied' };
      }
      const symbol = this.playerSymbols[playerId];
      this.board[row][col] = symbol;

      // Check win or draw
      if (this.checkWinner(symbol)) {
        this.winner = playerId;
        this.endGame(`Player ${playerId} won with symbol ${symbol}`);
        return { valid: true };
      } else if (this.checkDraw()) {
        this.endGame(`It's a draw!`);
        return { valid: true };
      } else {
        // Switch turn
        this.currentTurnIndex = (this.currentTurnIndex + 1) % playerIds.length;
      }

      this.broadcastToPlayers('gameStateUpdate', {
        state: this.getGameState(),
        scores: this.getAllScores()
      });

      return { valid: true };
    }

    return { valid: false, reason: 'Unknown action type' };
  }

  checkWinner(symbol) {
    // Check rows
    for (let r = 0; r < this.boardSize; r++) {
      if (this.board[r].every(cell => cell === symbol)) {
        return true;
      }
    }
    // Check columns
    for (let c = 0; c < this.boardSize; c++) {
      let allSymbol = true;
      for (let r = 0; r < this.boardSize; r++) {
        if (this.board[r][c] !== symbol) {
          allSymbol = false;
          break;
        }
      }
      if (allSymbol) {
        return true;
      }
    }
    // Check diagonals
    let diag1 = true;
    let diag2 = true;
    for (let i = 0; i < this.boardSize; i++) {
      if (this.board[i][i] !== symbol) diag1 = false;
      if (this.board[i][this.boardSize - 1 - i] !== symbol) diag2 = false;
    }
    if (diag1 || diag2) {
      return true;
    }
    return false;
  }

  checkDraw() {
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.board[r][c] === null) {
          return false;
        }
      }
    }
    return true;
  }

  endGame(reason) {
    // Broadcast final standings
    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', {
      reason,
      standings
    });

    // Parent cleanup
    super.endGame(reason);
  }

  calculateScore(playerId) {
    // 1 point if you are the winner
    if (this.winner === playerId) {
      return 1;
    }
    return 0;
  }

  getAllScores() {
    const scores = {};
    for (const pid of this.players.keys()) {
      scores[pid] = this.calculateScore(pid);
    }
    return scores;
  }

  getStandings() {
    // Sort players by score desc
    const results = [];
    for (const playerId of this.players.keys()) {
      const score = this.calculateScore(playerId);
      const playerData = this.players.get(playerId) || {};
      results.push({ playerId, score, playerData });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  getGameState() {
    const playerIds = Array.from(this.players.keys());
    const currentPlayerId = playerIds[this.currentTurnIndex];
    return {
      board: this.board,
      currentTurnPlayer: currentPlayerId,
      symbols: this.playerSymbols,
      roundNumber: this.roundNumber
    };
  }
}

module.exports = { TicTacToeGame };