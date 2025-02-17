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

    // Typically Pong is best with 2 players
    this.minPlayers = 2;
    this.maxPlayers = 2;

    // Dimensions of the playing field
    // (We'll treat them like "logical" units; the client can scale them)
    this.fieldWidth = 800;
    this.fieldHeight = 400;

    // Ball state
    this.ball = {
      x: this.fieldWidth / 2,
      y: this.fieldHeight / 2,
      radius: 8,
      vx: 5, // initial velocity x
      vy: 3  // initial velocity y
    };

    // Paddles keyed by playerId
    // Example: paddles[playerId] = { x, y, width, height, score, velocity }
    this.paddles = {};

    // Game loop
    this.gameLoopInterval = null;
    this.gameSpeedMs = 30; // ~33 FPS

    // Score needed to win
    this.winningScore = 5;
  }

  initializeGame() {
    // Called once when the game starts
    this.roundNumber = 1;

    // Assign each player's paddle (up to 2 players)
    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      // Pong typically requires exactly 2 players
      // If you want to handle fewer or more, adapt logic accordingly
      // For demonstration, we'll assume it's exactly 2 or won't start
      console.log('Warning: Pong game expects exactly 2 players.');
    }

    // Left paddle (first joined, for instance)
    if (playerIds[0]) {
      this.paddles[playerIds[0]] = {
        x: 20,  // near left
        y: this.fieldHeight / 2 - 40, // center vertically
        width: 10,
        height: 80,
        score: 0,
        velocity: 0  // how fast the paddle is moving up/down
      };
    }

    // Right paddle (second joined)
    if (playerIds[1]) {
      this.paddles[playerIds[1]] = {
        x: this.fieldWidth - 30, // near right
        y: this.fieldHeight / 2 - 40,
        width: 10,
        height: 80,
        score: 0,
        velocity: 0
      };
    }

    // Reset ball to center
    this.resetBall();

    // Broadcast with unified newRound event payload
    this.broadcastToPlayers('newRound', {
      initialState: this.getGameState()
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
    // Move paddles
    for (const paddle of Object.values(this.paddles)) {
      paddle.y += paddle.velocity;

      // Keep paddle in the field
      if (paddle.y < 0) paddle.y = 0;
      if (paddle.y + paddle.height > this.fieldHeight) {
        paddle.y = this.fieldHeight - paddle.height;
      }
    }

    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Collide with top/bottom
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -1;
    } else if (this.ball.y + this.ball.radius > this.fieldHeight) {
      this.ball.y = this.fieldHeight - this.ball.radius;
      this.ball.vy *= -1;
    }

    // Check paddle collisions (left or right)
    for (const [playerId, paddle] of Object.entries(this.paddles)) {
      const paddleLeft = paddle.x;
      const paddleRight = paddle.x + paddle.width;
      const paddleTop = paddle.y;
      const paddleBottom = paddle.y + paddle.height;

      // If the ball is horizontally in range of the paddle
      // (Check left paddle or right paddle side depending on ball movement)
      const isCollidingX =
        this.ball.x - this.ball.radius < paddleRight &&
        this.ball.x + this.ball.radius > paddleLeft;
      
      // And vertically within the paddle
      const isCollidingY =
        this.ball.y + this.ball.radius > paddleTop &&
        this.ball.y - this.ball.radius < paddleBottom;

      if (isCollidingX && isCollidingY) {
        // Reverse ball direction
        this.ball.vx *= -1;

        // Slight "acceleration" effect or random factor if you want
        // this.ball.vx *= 1.05; 
        // this.ball.vy *= 1.05;

        // Move the ball just outside the paddle to avoid stuck collisions
        if (paddleLeft < this.fieldWidth / 2) {
          // Left paddle
          this.ball.x = paddleRight + this.ball.radius;
        } else {
          // Right paddle
          this.ball.x = paddleLeft - this.ball.radius;
        }
      }
    }

    // Check if ball goes off left/right boundary => score
    if (this.ball.x - this.ball.radius < 0) {
      // Right player scores
      this.scoreForRightPaddle();
    } else if (this.ball.x + this.ball.radius > this.fieldWidth) {
      // Left player scores
      this.scoreForLeftPaddle();
    }

    // Broadcast updated state
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  processPlayerAction(playerId, action) {
    // action could be:
    // { type: 'move', direction: 'up'/'down'/'stop' }
    // We'll interpret "up" as negative velocity, "down" as positive
    // "stop" sets velocity to 0
    const paddle = this.paddles[playerId];
    if (!paddle) {
      return { valid: false, reason: 'No paddle for this player' };
    }

    if (action.type === 'move') {
      switch (action.direction) {
        case 'up':
          paddle.velocity = -5;
          return { valid: true };
        case 'down':
          paddle.velocity = 5;
          return { valid: true };
        case 'stop':
          paddle.velocity = 0;
          return { valid: true };
        default:
          return { valid: false, reason: 'Invalid direction' };
      }
    }

    return { valid: false, reason: 'Unknown action type' };
  }

  scoreForLeftPaddle() {
    // Find the left paddle
    const [leftPlayerId, rightPlayerId] = Array.from(this.players.keys());
    if (leftPlayerId && this.paddles[leftPlayerId]) {
      this.paddles[leftPlayerId].score += 1;
      if (this.paddles[leftPlayerId].score >= this.winningScore) {
        this.endGame(`Player ${leftPlayerId} won (score ${this.winningScore})`);
        return;
      }
    }
    this.resetBall();
  }

  scoreForRightPaddle() {
    // The second joined is presumably the right
    const [leftPlayerId, rightPlayerId] = Array.from(this.players.keys());
    if (rightPlayerId && this.paddles[rightPlayerId]) {
      this.paddles[rightPlayerId].score += 1;
      if (this.paddles[rightPlayerId].score >= this.winningScore) {
        this.endGame(`Player ${rightPlayerId} won (score ${this.winningScore})`);
        return;
      }
    }
    this.resetBall();
  }

  resetBall() {
    this.ball.x = this.fieldWidth / 2;
    this.ball.y = this.fieldHeight / 2;

    // Random initial direction
    const direction = Math.random() < 0.5 ? 1 : -1;
    const directionY = Math.random() < 0.5 ? 1 : -1;
    this.ball.vx = 5 * direction;
    this.ball.vy = 3 * directionY;
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

    // Call parent endGame method for cleanup
    super.endGame(reason);
  }

  calculateScore(playerId) {
    // Just return the paddle's score
    const paddle = this.paddles[playerId];
    if (!paddle) return 0;
    return paddle.score;
  }

  getGameState() {
    // Return data needed by the client to render
    const paddleStates = {};
    for (const [playerId, pad] of Object.entries(this.paddles)) {
      paddleStates[playerId] = {
        x: pad.x,
        y: pad.y,
        width: pad.width,
        height: pad.height,
        score: pad.score
      };
    }

    return {
      ball: { ...this.ball },
      paddles: paddleStates,
      roundNumber: this.roundNumber
    };
  }

  getStandings() {
    // Sort players by score (descending)
    const results = [];
    for (const [playerId, pad] of Object.entries(this.paddles)) {
      results.push({
        playerId,
        score: pad.score,
        playerData: this.players.get(playerId) || {}
      });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

module.exports = { PongGame };
