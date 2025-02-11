const GameFramework = require('../gameFramework');

class SnakeGame1 extends GameFramework {
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

    // Define a grid for snake
    this.fieldWidth = 40; // 40 cells wide
    this.fieldHeight = 20; // 20 cells tall
    this.cellSize = 20; // For rendering only

    // Snakes keyed by playerId
    // snake = { segments: [ {x, y}, ... ], direction: 'right', velocity: {x, y}, score: 0 }
    this.snakes = {};

    // Single food item
    this.food = { x: 0, y: 0 };

    // Game loop
    this.gameLoopInterval = null;
    this.gameSpeedMs = 200; // Speed of the snake updates

    // Score to win
    this.winningScore = 5;

    this.roundNumber = 1;
  }

  initializeGame() {
    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      console.log('Warning: Snake game expects exactly 2 players for now.');
    }

    // Initialize snakes in different positions
    // Left side snake
    if (playerIds[0]) {
      this.snakes[playerIds[0]] = {
        segments: [
          { x: 5, y: Math.floor(this.fieldHeight / 2) },
          { x: 4, y: Math.floor(this.fieldHeight / 2) }
        ],
        direction: 'right',
        velocity: { x: 1, y: 0 },
        score: 0
      };
    }

    // Right side snake
    if (playerIds[1]) {
      this.snakes[playerIds[1]] = {
        segments: [
          { x: this.fieldWidth - 6, y: Math.floor(this.fieldHeight / 2) },
          { x: this.fieldWidth - 7, y: Math.floor(this.fieldHeight / 2) }
        ],
        direction: 'left',
        velocity: { x: -1, y: 0 },
        score: 0
      };
    }

    // Place initial food
    this.resetFood();

    // Broadcast new round
    this.broadcastToPlayers('newRound', {
      roundNumber: this.roundNumber
    });

    this.startGameLoop();
  }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, this.gameSpeedMs);
  }

  updateGame() {
    // Move snakes
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      const head = { ...snake.segments[0] };
      // Update head position
      head.x += snake.velocity.x;
      head.y += snake.velocity.y;

      // If we go out of bounds, just wrap around (no losing on collision)
      if (head.x < 0) head.x = this.fieldWidth - 1;
      else if (head.x >= this.fieldWidth) head.x = 0;
      if (head.y < 0) head.y = this.fieldHeight - 1;
      else if (head.y >= this.fieldHeight) head.y = 0;

      // Insert new head
      snake.segments.unshift(head);

      // If head is on food, increase score and generate new food
      if (head.x === this.food.x && head.y === this.food.y) {
        snake.score++;
        if (snake.score >= this.winningScore) {
          this.endGame('Player ' + playerId + ' reached score ' + this.winningScore);
          return;
        }
        this.resetFood();
      } else {
        // Remove tail if no food eaten
        snake.segments.pop();
      }
    }

    // Broadcast updated state
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  processPlayerAction(playerId, action) {
    // { type: 'move', direction: 'left'/'right'/'up'/'down'/'stop' }
    const snake = this.snakes[playerId];
    if (!snake) {
      return { valid: false, reason: 'No snake for this player' };
    }

    if (action.type === 'move') {
      switch (action.direction) {
        case 'left':
          snake.velocity = { x: -1, y: 0 };
          return { valid: true };
        case 'right':
          snake.velocity = { x: 1, y: 0 };
          return { valid: true };
        case 'up':
          snake.velocity = { x: 0, y: -1 };
          return { valid: true };
        case 'down':
          snake.velocity = { x: 0, y: 1 };
          return { valid: true };
        case 'stop':
          snake.velocity = { x: 0, y: 0 };
          return { valid: true };
        default:
          return { valid: false, reason: 'Invalid direction' };
      }
    }

    return { valid: false, reason: 'Unknown action type' };
  }

  resetFood() {
    this.food.x = Math.floor(Math.random() * this.fieldWidth);
    this.food.y = Math.floor(Math.random() * this.fieldHeight);
  }

  endGame(reason) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', {
      reason,
      standings
    });

    super.endGame(reason);
  }

  calculateScore(playerId) {
    const snake = this.snakes[playerId];
    if (!snake) return 0;
    return snake.score;
  }

  getGameState() {
    // Build a client-safe object
    const snakeStates = {};
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      snakeStates[playerId] = {
        segments: snake.segments,
        score: snake.score
      };
    }

    return {
      snakes: snakeStates,
      food: { ...this.food },
      cellSize: this.cellSize,
      fieldWidth: this.fieldWidth,
      fieldHeight: this.fieldHeight,
      roundNumber: this.roundNumber
    };
  }

  getStandings() {
    const results = [];
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      results.push({
        playerId,
        score: snake.score,
        playerData: this.players.get(playerId) || {}
      });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

module.exports = { SnakeGame1 };