// File: games/SnakeGame.js
const GameFramework = require('../gameFramework');

class SnakeGame extends GameFramework {
  constructor(config) {
    super(config);
    this.minPlayers = 1;
    this.maxPlayers = 4; // Example for up to 4 snakes
    this.fieldWidth = 800;
    this.fieldHeight = 400;

    // Each player's snake: { segments: [{x,y}, ...], direction, score }
    this.snakes = {};
    this.food = { x: 0, y: 0 };
    this.cellSize = 10;
    this.gameLoopInterval = null;
    this.gameSpeedMs = 100;
    this.winningScore = 10;
    this.roundNumber = 1;
  }

  initializeGame() {
    const playerIds = Array.from(this.players.keys());
    for (const playerId of playerIds) {
      this.resetSnake(playerId);
    }
    this.placeFood();
    this.broadcastToPlayers('newRound', { roundNumber: this.roundNumber });
    this.startGameLoop();
  }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => this.updateGame(), this.gameSpeedMs);
  }

  updateGame() {
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      this.moveSnake(playerId, snake);
    }
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  moveSnake(playerId, snake) {
    if (!snake.direction) return;

    // Current head
    const head = snake.segments[0];
    let newX = head.x;
    let newY = head.y;

    switch (snake.direction) {
      case 'up':    newY -= this.cellSize; break;
      case 'down':  newY += this.cellSize; break;
      case 'left':  newX -= this.cellSize; break;
      case 'right': newX += this.cellSize; break;
      default: break;
    }

    // Check boundaries
    if (newX < 0 || newX >= this.fieldWidth || newY < 0 || newY >= this.fieldHeight) {
      this.endSnake(playerId);
      return;
    }

    // Check collision with self
    for (const seg of snake.segments) {
      if (seg.x === newX && seg.y === newY) {
        this.endSnake(playerId);
        return;
      }
    }

    // Move
    snake.segments.unshift({ x: newX, y: newY });

    // Check food collision
    if (newX === this.food.x && newY === this.food.y) {
      snake.score++;
      if (snake.score >= this.winningScore) {
        this.endGame(`Player ${playerId} reached ${this.winningScore} points`);
        return;
      }
      this.placeFood();
    } else {
      snake.segments.pop();
    }
  }

  endSnake(playerId) {
    // Remove snake or mark it as dead
    delete this.snakes[playerId];
    if (Object.keys(this.snakes).length <= 0) {
      this.endGame('All snakes are dead');
    }
  }

  placeFood() {
    const maxCellsX = this.fieldWidth / this.cellSize;
    const maxCellsY = this.fieldHeight / this.cellSize;
    this.food.x = Math.floor(Math.random() * maxCellsX) * this.cellSize;
    this.food.y = Math.floor(Math.random() * maxCellsY) * this.cellSize;
  }

  resetSnake(playerId) {
    const startX = Math.floor(this.fieldWidth / 2 / this.cellSize) * this.cellSize;
    const startY = Math.floor(this.fieldHeight / 2 / this.cellSize) * this.cellSize;
    this.snakes[playerId] = {
      segments: [{ x: startX, y: startY }],
      direction: null,
      score: 0
    };
  }

  processPlayerAction(playerId, action) {
    const snake = this.snakes[playerId];
    if (!snake) return { valid: false, reason: 'No snake for this player' };

    if (action.type === 'move') {
      switch (action.direction) {
        case 'up':
          if (snake.direction !== 'down') snake.direction = 'up';
          return { valid: true };
        case 'down':
          if (snake.direction !== 'up') snake.direction = 'down';
          return { valid: true };
        case 'left':
          if (snake.direction !== 'right') snake.direction = 'left';
          return { valid: true };
        case 'right':
          if (snake.direction !== 'left') snake.direction = 'right';
          return { valid: true };
        case 'stop':
          // Optional "stop" (not usually in snake, but included for consistency)
          snake.direction = null;
          return { valid: true };
      }
    }
    return { valid: false, reason: 'Unknown action type or direction' };
  }

  endGame(reason) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', { reason, standings });
    super.endGame(reason);
  }

  calculateScore(playerId) {
    const snake = this.snakes[playerId];
    return snake ? snake.score : 0;
  }

  getGameState() {
    const snakeStates = {};
    for (const [playerId, s] of Object.entries(this.snakes)) {
      snakeStates[playerId] = {
        segments: s.segments.map(seg => ({ x: seg.x, y: seg.y })),
        direction: s.direction,
        score: s.score
      };
    }
    return {
      snakes: snakeStates,
      food: { ...this.food },
      roundNumber: this.roundNumber
    };
  }

  getStandings() {
    const results = [];
    for (const [playerId, s] of Object.entries(this.snakes)) {
      results.push({
        playerId,
        score: s.score,
        playerData: this.players.get(playerId) || {}
      });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

module.exports = { SnakeGame };
