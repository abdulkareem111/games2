// File: games/SnakeGame.js

const GameFramework = require('../gameFramework');

class SnakeGame extends GameFramework {
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

    // Basic Snake configuration
    this.gridWidth = 20;
    this.gridHeight = 20;

    // Dictionary of snakes, keyed by playerId
    // Each snake is:
    //   {
    //     body: [[x,y], [x,y], ...],
    //     direction: 'left'|'right'|'up'|'down',
    //     alive: true,
    //     score: 0
    //   }
    this.snakes = {};

    // Single food position: [x, y]
    this.food = null;

    // Timers
    this.gameLoopInterval = null;
    this.gameSpeedMs = 300; // Move every 300ms
    this.winningScore = 10; // First player to reach this wins
  }

  initializeGame() {
    // Called once when the game starts
    // Create a "roundNumber" if you want to keep track, or treat it as continuous
    this.roundNumber = 1;

    // Spawn each player's snake
    for (const playerId of this.players.keys()) {
      this.snakes[playerId] = this.createInitialSnake();
    }

    // Place initial food on the board
    this.placeFood();

    // Broadcast that a new round (or game session) is starting
    this.broadcastToPlayers('newRound', {
      roundNumber: this.roundNumber,
      // If you want a time limit, you can pass `duration: this.duration`
      // We'll omit time-limited gameplay for now
    });

    // Start the timed game loop
    this.startGameLoop();
  }

  createInitialSnake() {
    // Randomly place a single-segment snake somewhere in the grid
    const startX = Math.floor(Math.random() * this.gridWidth);
    const startY = Math.floor(Math.random() * this.gridHeight);
    return {
      body: [[startX, startY]],
      direction: 'right', // default direction
      alive: true,
      score: 0,
    };
  }

  placeFood() {
    // Pick a random position that is not currently occupied by a snake
    let x, y;
    while (true) {
      x = Math.floor(Math.random() * this.gridWidth);
      y = Math.floor(Math.random() * this.gridHeight);

      // Check if any snake occupies (x,y)
      let occupied = false;
      for (const snake of Object.values(this.snakes)) {
        if (snake.body.some(seg => seg[0] === x && seg[1] === y)) {
          occupied = true;
          break;
        }
      }

      if (!occupied) {
        this.food = [x, y];
        break;
      }
    }
  }

  startGameLoop() {
    // Move snakes and broadcast state at regular intervals
    this.gameLoopInterval = setInterval(() => {
      this.updateSnakes();
    }, this.gameSpeedMs);
  }

  processPlayerAction(playerId, action) {
    // Handle a player's action (e.g. direction move)
    // Example action payload: { type: 'move', direction: 'left' }
    if (!this.snakes[playerId] || !this.snakes[playerId].alive) {
      return { valid: false, reason: 'No active snake for this player' };
    }

    if (action.type === 'move') {
      // Update the snake's direction
      const { direction } = action;
      if (['up', 'down', 'left', 'right'].includes(direction)) {
        this.snakes[playerId].direction = direction;
        return { valid: true };
      }
      return { valid: false, reason: 'Invalid direction' };
    }

    return { valid: false, reason: 'Unknown action type' };
  }

  updateSnakes() {
    // Move each alive snake based on its direction
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      if (!snake.alive) continue;

      // Current head
      const [headX, headY] = snake.body[0];
      let newHeadX = headX;
      let newHeadY = headY;

      switch (snake.direction) {
        case 'up':
          newHeadY -= 1;
          break;
        case 'down':
          newHeadY += 1;
          break;
        case 'left':
          newHeadX -= 1;
          break;
        case 'right':
          newHeadX += 1;
          break;
      }

      // Wrap around if out of bounds (no collision fail)
      if (newHeadX < 0) newHeadX = this.gridWidth - 1;
      else if (newHeadX >= this.gridWidth) newHeadX = 0;
      if (newHeadY < 0) newHeadY = this.gridHeight - 1;
      else if (newHeadY >= this.gridHeight) newHeadY = 0;

      // Insert the new head at the front
      snake.body.unshift([newHeadX, newHeadY]);

      // Check if we ate the food
      if (this.food && newHeadX === this.food[0] && newHeadY === this.food[1]) {
        // Increase score and grow (do NOT pop tail)
        snake.score += 1;

        // If reached winning score, end the game
        if (snake.score >= this.winningScore) {
          this.endGame(`Player ${playerId} reached ${this.winningScore} points`);
          return;
        }

        // Place a new food somewhere
        this.placeFood();
      } else {
        // Move forward (pop tail) if we didn't eat food
        snake.body.pop();
      }
    }

    // After updating all snakes, broadcast the new state
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  // We won't end the round due to collisions or time here, so endRound is optional
  endRound(reason) {
    // Not used in this variant, but here's a stub if needed:
    this.broadcastToPlayers('roundEnded', {
      reason,
      scores: this.getAllScores(),
      snakes: this.getGameState().snakes
    });
  }

  endGame(reason) {
    // Clear intervals
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    // Broadcast final gameEnded event with standings
    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', {
      reason,
      standings
    });

    // Call the parent endGame method to finalize cleanup
    super.endGame(reason);
  }

  calculateScore(playerId, actionResult) {
    // The "score" is just snake.score
    const snake = this.snakes[playerId];
    if (!snake) return 0;
    return snake.score;
  }

  getGameState() {
    // Return positions (and alive status) for each snake
    const snakeStates = {};
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      snakeStates[playerId] = {
        body: snake.body,
        alive: snake.alive,
        score: snake.score
      };
    }

    return {
      snakes: snakeStates,
      roundNumber: this.roundNumber,
      food: this.food
    };
  }

  getStandings() {
    // Sort players by their score (descending)
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

module.exports = { SnakeGame };
