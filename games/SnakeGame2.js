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

    // Min 2, max 4 just as an example
    this.minPlayers = 2;
    this.maxPlayers = 4;

    this.fieldWidth = 800;
    this.fieldHeight = 400;

    // Store snakes keyed by playerId:
    // snakes[playerId] = { x, y, direction, score }
    this.snakes = {};

    // Fruit position
    this.fruit = { x: 0, y: 0 };

    // Speed of snake movement per update
    this.snakeSpeed = 5;

    // Game loop
    this.gameLoopInterval = null;
    this.gameSpeedMs = 100; // 10 updates per second

    // Whoever reaches this score first wins
    this.winningScore = 3;
  }

  initializeGame() {
    // Called once when the game starts
    this.roundNumber = 1;
    // Place each player's snake at a random position
    for (const playerId of this.players.keys()) {
      this.snakes[playerId] = {
        x: Math.floor(Math.random() * (this.fieldWidth - 10)),
        y: Math.floor(Math.random() * (this.fieldHeight - 10)),
        direction: 'right',
        score: 0
      };
    }

    this.placeFruit();

    // Broadcast that a new round is starting
    this.broadcastToPlayers('newRound', {
      roundNumber: this.roundNumber
    });

    // Start the loop
    this.startGameLoop();
  }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, this.gameSpeedMs);
  }

  updateGame() {
    // Move each snake
    for (const snake of Object.values(this.snakes)) {
      switch (snake.direction) {
        case 'up':
          snake.y -= this.snakeSpeed;
          break;
        case 'down':
          snake.y += this.snakeSpeed;
          break;
        case 'left':
          snake.x -= this.snakeSpeed;
          break;
        case 'right':
          snake.x += this.snakeSpeed;
          break;
      }
      // Keep snake within field, but collisions don't kill the snake
      // We can just clamp the values
      if (snake.x < 0) snake.x = 0;
      if (snake.x > this.fieldWidth - 10) snake.x = this.fieldWidth - 10;
      if (snake.y < 0) snake.y = 0;
      if (snake.y > this.fieldHeight - 10) snake.y = this.fieldHeight - 10;
    }

    // Check if any snake eats the fruit
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      if (this.isColliding(snake.x, snake.y, this.fruit.x, this.fruit.y)) {
        snake.score += 1;
        this.placeFruit();
        if (snake.score >= this.winningScore) {
          this.endGame('Player ' + playerId + ' won');
          return;
        }
      }
    }

    // Broadcast updated state
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  processPlayerAction(playerId, action) {
    // action: { type: 'move', direction: 'up'|'down'|'left'|'right' }
    const snake = this.snakes[playerId];
    if (!snake) {
      return { valid: false, reason: 'No snake for this player' };
    }

    if (action.type === 'move') {
      if (['up','down','left','right'].includes(action.direction)) {
        snake.direction = action.direction;
        return { valid: true };
      } else {
        return { valid: false, reason: 'Invalid direction' };
      }
    }

    return { valid: false, reason: 'Unknown action type' };
  }

  isColliding(x1, y1, x2, y2) {
    // We'll use a simple bounding-box check since snake & fruit are small squares
    const size = 10; // snake segment size or fruit radius approx

    return (
      x1 < x2 + size &&
      x1 + size > x2 &&
      y1 < y2 + size &&
      y1 + size > y2
    );
  }

  placeFruit() {
    this.fruit.x = Math.floor(Math.random() * (this.fieldWidth - 10));
    this.fruit.y = Math.floor(Math.random() * (this.fieldHeight - 10));
  }

  endGame(reason) {
    // Clear intervals
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    // Broadcast final standings
    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', {
      reason,
      standings
    });

    super.endGame(reason);
  }

  calculateScore(playerId) {
    // Return the snake's score
    const snake = this.snakes[playerId];
    if (!snake) return 0;
    return snake.score;
  }

  getGameState() {
    // Return data needed by the client to render
    const snakeStates = {};
    for (const [playerId, snk] of Object.entries(this.snakes)) {
      snakeStates[playerId] = {
        x: snk.x,
        y: snk.y,
        score: snk.score,
        direction: snk.direction
      };
    }
    return {
      snakes: snakeStates,
      fruit: { ...this.fruit },
      roundNumber: this.roundNumber
    };
  }

  getStandings() {
    // Sort players by score (descending)
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