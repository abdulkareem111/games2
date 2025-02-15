const GameFramework = require('../gameFramework');

class SnakeGame extends GameFramework {
  constructor(config) {
    super(config);
    this.minPlayers = 2;
    this.maxPlayers = 2;
    this.gridWidth = 20;
    this.gridHeight = 20;
    this.snakes = {};
    this.fruit = { x: 0, y: 0 };
    this.gameLoopInterval = null;
    this.gameSpeedMs = 200;
    this.gameActive = false;
  }

  initializeGame() {
    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      console.log('Warning: Snake game expects exactly 2 players.');
    }
    // assign snake IDs/colors and make them green
    if (playerIds[0]) {
      this.snakes[playerIds[0]] = this.createInitialSnake('green');
    }
    if (playerIds[1]) {
      this.snakes[playerIds[1]] = this.createInitialSnake('green');
    }
    this.placeFruit();
    this.gameActive = true;
    this.roundNumber = 1;
    this.broadcastToPlayers('newRound', {
      initialState: this.getGameState()
    });
    this.startGameLoop();
  }

  createInitialSnake(color) {
    return {
      color,
      // starting at the center
      body: [{ x: Math.floor(this.gridWidth / 2), y: Math.floor(this.gridHeight / 2) }],
      direction: 'up'
    };
  }

  placeFruit() {
    let valid = false;
    let x, y;
    while (!valid) {
      x = Math.floor(Math.random() * this.gridWidth);
      y = Math.floor(Math.random() * this.gridHeight);
      valid = true;
      for (const snake of Object.values(this.snakes)) {
        if (snake.body.some(seg => seg.x === x && seg.y === y)) {
          valid = false;
          break;
        }
      }
    }
    this.fruit = { x, y };
  }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, this.gameSpeedMs);
  }

  updateGame() {
    if (!this.gameActive) return;

    // Update each snake's position
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      this.moveSnake(snake);
      if (this.checkCollision(snake)) {
        // For this version, collisions (self) do not remove the player
      }
    }

    // Check if fruit is eaten
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      const head = snake.body[0];
      if (head.x === this.fruit.x && head.y === this.fruit.y) {
        // grow snake by adding new segment at the tail position
        snake.body.push({ ...snake.body[snake.body.length - 1] });
        this.placeFruit();
        break; // only one snake can eat the fruit
      }
    }

    // Check for win condition: first to get 5 points (points = snake.body.length - 1)
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      if ((snake.body.length - 1) >= 5) {
        this.endGame(`Player ${playerId} wins by reaching 5 points!`);
        return;
      }
    }

    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  moveSnake(snake) {
    const head = snake.body[0];
    let newHead = { x: head.x, y: head.y };
    switch (snake.direction) {
      case 'up': newHead.y -= 1; break;
      case 'down': newHead.y += 1; break;
      case 'left': newHead.x -= 1; break;
      case 'right': newHead.x += 1; break;
    }
    // Wrap around logic
    newHead.x = (newHead.x + this.gridWidth) % this.gridWidth;
    newHead.y = (newHead.y + this.gridHeight) % this.gridHeight;

    snake.body.unshift(newHead);
    snake.body.pop();
  }

  checkCollision(snake) {
    const head = snake.body[0];
    // Wall collisions are now handled by wrapping, so only check self collision
    for (let i = 1; i < snake.body.length; i++) {
      if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
        return true;
      }
    }
    return false;
  }

  processPlayerAction(playerId, action) {
    const snake = this.snakes[playerId];
    if (!snake) {
      return { valid: false, reason: 'No snake for this player' };
    }
    if (action.type === 'changeDirection') {
      const currentDirection = snake.direction;
      const newDirection = action.direction;
      if (this.isOppositeDirection(currentDirection, newDirection)) {
        return { valid: false, reason: 'Cannot reverse direction' };
      }
      snake.direction = newDirection;
      return { valid: true };
    }
    return { valid: false, reason: 'Unknown action type' };
  }

  isOppositeDirection(dir1, dir2) {
    return (dir1 === 'up' && dir2 === 'down') ||
           (dir1 === 'down' && dir2 === 'up') ||
           (dir1 === 'left' && dir2 === 'right') ||
           (dir1 === 'right' && dir2 === 'left');
  }

  getGameState() {
    return {
      snakes: this.snakes,
      fruit: this.fruit,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellSize: 20,
      roundNumber: this.roundNumber
    };
  }

  calculateScore(playerId) {
    const snake = this.snakes[playerId];
    if (!snake) return 0;
    // Score is number of fruits eaten; initial length is 1
    return snake.body.length - 1;
  }

  endGame(reason) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    this.gameActive = false;
    const standings = this.getStandings();
    this.broadcastToPlayers('gameEnded', {
      reason,
      standings
    });
    super.endGame(reason);
  }

  getStandings() {
    const results = [];
    for (const [playerId, snake] of Object.entries(this.snakes)) {
      results.push({
        playerId,
        score: snake.body.length - 1,
        playerData: this.players.get(playerId) || {}
      });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

module.exports = { SnakeGame };