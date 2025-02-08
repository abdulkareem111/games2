// File: games/PongGame.js
const GameFramework = require('../gameFramework');

class PongGame extends GameFramework {
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

    // Basic Pong configuration
    this.gameWidth = 600;
    this.gameHeight = 400;

    // Single "ball" object
    this.ball = {
      x: this.gameWidth / 2,
      y: this.gameHeight / 2,
      vx: 3, // horizontal velocity
      vy: 2, // vertical velocity
      radius: 8
    };

    // Two paddles (left, right)
    this.paddles = {
      left: {
        x: 10,
        y: (this.gameHeight / 2) - 40,
        width: 10,
        height: 80,
        score: 0
      },
      right: {
        x: this.gameWidth - 20,
        y: (this.gameHeight / 2) - 40,
        width: 10,
        height: 80,
        score: 0
      }
    };

    // Speed for moving paddles when we get "move" actions
    this.paddleSpeed = 6;

    // Timers and game loop settings
    this.gameLoopInterval = null;
    this.gameSpeedMs = 30; // ~33 fps

    // Winning score (if you prefer to use score, but here we use lives)
    this.winningScore = 5;

    // Add a lives property: each player gets 3 chances (3 lives)
    this.lives = {
      left: 3,
      right: 3
    };
  }

  // Called once when the game starts
  initializeGame() {
    this.roundNumber = 1;
    // Broadcast that a new round (or game session) is starting.
    // Include the initial lives in the game state.
    this.broadcastToPlayers('newRound', {
      roundNumber: this.roundNumber,
      lives: this.lives
    });
    this.startGameLoop();
  }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
    }, this.gameSpeedMs);
  }

  // Process player action (move paddle)
  processPlayerAction(playerId, action) {
    // Ensure the playerId is treated as a string.
    playerId = String(playerId);

    // We interpret type='move' with direction 'up' or 'down'
    // We assume: "1" => left paddle, "2" => right paddle
    if (action.type === 'move') {
      let paddleKey;
      if (playerId === '1') {
        paddleKey = 'left';
      } else if (playerId === '2') {
        paddleKey = 'right';
      } else {
        return { valid: false, reason: 'Invalid player for Pong' };
      }

      if (!this.paddles[paddleKey]) {
        return { valid: false, reason: 'No paddle found for that player' };
      }

      // Move paddle up or down
      if (action.direction === 'up') {
        this.paddles[paddleKey].y = Math.max(
          0,
          this.paddles[paddleKey].y - this.paddleSpeed
        );
      } else if (action.direction === 'down') {
        this.paddles[paddleKey].y = Math.min(
          this.gameHeight - this.paddles[paddleKey].height,
          this.paddles[paddleKey].y + this.paddleSpeed
        );
      } else {
        return { valid: false, reason: 'Invalid direction' };
      }
      return { valid: true };
    }
    return { valid: false, reason: 'Unknown action type' };
  }

  // Game update loop: move ball, check collisions, and update game state.
  updateGame() {
    // Move the ball.
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Check collision with top/bottom boundaries (bounce).
    if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.gameHeight) {
      this.ball.vy = -this.ball.vy;
    }

    // Check collision with left paddle.
    const leftPad = this.paddles.left;
    if (
      this.ball.x - this.ball.radius <= leftPad.x + leftPad.width &&
      this.ball.y >= leftPad.y &&
      this.ball.y <= leftPad.y + leftPad.height
    ) {
      this.ball.vx = -this.ball.vx;
      this.ball.x = leftPad.x + leftPad.width + this.ball.radius; // push ball outside paddle
    }

    // Check collision with right paddle.
    const rightPad = this.paddles.right;
    if (
      this.ball.x + this.ball.radius >= rightPad.x &&
      this.ball.y >= rightPad.y &&
      this.ball.y <= rightPad.y + rightPad.height
    ) {
      this.ball.vx = -this.ball.vx;
      this.ball.x = rightPad.x - this.ball.radius;
    }

    // Check if ball goes out of left boundary => left misses.
    if (this.ball.x < 0) {
      // Left player loses a life.
      this.lives.left--;
      this.resetBall('right');
      if (this.lives.left <= 0) {
        this.endGame('Right Player wins!');
        return;
      }
    }

    // Check if ball goes out of right boundary => right misses.
    if (this.ball.x > this.gameWidth) {
      // Right player loses a life.
      this.lives.right--;
      this.resetBall('left');
      if (this.lives.right <= 0) {
        this.endGame('Left Player wins!');
        return;
      }
    }

    // Broadcast updated state, including ball, paddles, and lives.
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  resetBall(sideScored) {
    // Reset ball to the center and set its velocity based on who scored.
    this.ball.x = this.gameWidth / 2;
    this.ball.y = this.gameHeight / 2;
    this.ball.vx = sideScored === 'right' ? -3 : 3;
    this.ball.vy = 2;
  }

  // In this version, calculateScore simply returns the current paddle score.
  calculateScore(playerId) {
    if (playerId === '1') return this.paddles.left.score;
    if (playerId === '2') return this.paddles.right.score;
    return 0;
  }

  // Return the current game state, including lives.
  getGameState() {
    return {
      roundNumber: this.roundNumber,
      ball: this.ball,
      paddles: this.paddles,
      lives: this.lives
    };
  }

  // End the game, broadcast final standings, then call the parent endGame.
  endGame(reason) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    // Build final standings (using current paddle scores)
    const standings = [
      {
        playerId: '1',
        score: this.paddles.left.score,
        playerData: this.players.get('1') || {}
      },
      {
        playerId: '2',
        score: this.paddles.right.score,
        playerData: this.players.get('2') || {}
      }
    ].sort((a, b) => b.score - a.score);

    // Broadcast 'gameEnded' with reason, standings, and lives.
    this.broadcastToPlayers('gameEnded', { reason, standings, lives: this.lives });
    super.endGame(reason);
  }
}

module.exports = { PongGame };
