const express = require("express");
const { sendPrompt } = require("../aiUtils"); // Ensure correct import
const fs = require("fs");
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticateToken);

let prompt = `I will provide you two example files. The game should use same backend, socket events, logics and APIs. just give me 1 html and 1 js file code. dont say anything else
    Return the result as a JSON object with two keys: "htmlFile" (containing the HTML code) and "jsFile" (containing the JavaScript code). dont add any extra quotations or backticks
      Your code should be same as below provided code files.
    
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
          this.endGame('Player ' + leftPlayerId + ' won (score ' + this.winningScore + ')');
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
          this.endGame('Player ' + rightPlayerId + ' won (score ' + this.winningScore + ')');
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
    
    //pongGame.html

    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <title>Pong Game</title>
    
    <!-- Bootstrap CSS -->
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    
    <style>
      /* Updated dark/neon theme */
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        height: 100%;
        background-color: #0d0d0d;
        font-family: Arial, sans-serif;
        color: #fff;
      }
      .game-container {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding: 1rem;
        background-color: #181818;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.8);
      }
      #pongCanvas {
        border: 3px solid #39ff14; /* Neon green border */
        display: block;
        background-color: #000;
        border-radius: 4px;
      }
      .message {
        margin: 1rem 0;
        padding: 1rem;
        border-radius: 5px;
        display: none;
      }
      .message.success {
        background-color: #39ff14;
        color: #000;
      }
      .message.error {
        background-color: #ff5722;
        color: #000;
      }
      /* Updated: Countdown Timer Overlay */
      #countdownTimer {
        position: fixed;  /* Changed from absolute to fixed */
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8rem;
        color: #39ff14;
        z-index: 2000;
        display: none;
      }
    </style>
    </head>
    <body>
    <div class="game-container container-fluid">
      <div class="row">
        <!-- Left Column: Game Canvas + Buttons -->
        <div class="col-md-8 d-flex flex-column align-items-center">
          <h2>Pong Game - Room <span id="roomIdLabel"></span></h2>
          <div>Round: <span id="roundNumber">1</span></div>
    
          <canvas
            id="pongCanvas"
            width="800"
            height="400"
            class="my-3"
          ></canvas>
    
          <!-- Simple controls (optional) -->
          <div class="mt-3">
            <button id="moveUpBtn" class="btn btn-secondary btn-sm">Move Up</button>
            <button id="moveDownBtn" class="btn btn-secondary btn-sm">Move Down</button>
            <button id="stopBtn" class="btn btn-secondary btn-sm">Stop</button>
          </div>
    
          <div id="message" class="message"></div>
        </div>
    
        <!-- Right Column: Scoreboard -->
        <div class="col-md-4">
          <h5 class="mt-3">Scoreboard</h5>
          <div id="scoresList" class="p-2 border rounded" style="min-height: 150px;">
            <!-- Scores appear here -->
          </div>
        </div>
      </div>
    </div>
    <!-- New: Countdown Timer Overlay -->
    <div id="countdownTimer"></div>
    
    
    
    <div class="modal fade" id="endGameModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="endGameModalLabel" aria-hidden="true">
    <!-- ...existing modal content... -->
    <div class="modal-dialog">
      <div class="modal-content bg-dark text-light">
        <div class="modal-header">
          <h5 class="modal-title" id="endGameModalLabel">Game Over!</h5>
          <!-- Removed closable button -->
        </div>
        <div class="modal-body" id="endGameDetails">
          <!-- Final scores/standings will go here -->
        </div>
        <div class="modal-footer">
          <button id="goHomeButton" class="btn btn-primary" onclick="window.location.href='/'">Go Home</button>
        </div>
      </div>
    </div>
  </div>
    
    
    <!-- Socket.io -->
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    
    <!-- Bootstrap JS (for modal functionality) -->
    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
    ></script>
    
    <!-- Include EndGameScreen.js -->
    <script src="/components/EndGameScreen.js"></script>
    
    <!-- Include constants.js -->
    <script src="/constants.js"></script>
    
    <script>
      const canvas = document.getElementById('pongCanvas');
      const ctx = canvas.getContext('2d');
      let socket;
      let currentUser;
      let currentRoom;
    
      let gameState = {
        paddles: {}, // { playerId: { x, y, width, height, score } }
        ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 0 },
        roundNumber: 1
      };
    
      // 1) Get/Set current user from localStorage
      currentUser = JSON.parse(localStorage.getItem('currentUser') || "null");
      if (!currentUser || !currentUser.id) {
        const id = prompt("Enter your player id:");
        currentUser = { id };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
    
      // 2) Get roomId from URL
      const params = new URLSearchParams(window.location.search);
      currentRoom = params.get('roomId');
      document.getElementById('roomIdLabel').textContent = currentRoom || 'N/A';
    
      // Init socket using BASE_URL from constants.js
      socket = io(BASE_URL);
      console.log(BASE_URL);
      socket.on('connect', () => {
        console.log("Socket connected:", socket.id);
        // Join the room
        if (currentRoom) {
          socket.emit('joinRoomSocket', {
            roomId: currentRoom,
            playerId: currentUser.id
          });
        }
      });
    
      socket.on('disconnect', () => {
        console.log("Socket disconnected");
      });
    
      socket.on('error', (err) => {
        console.error("Socket error:", err);
      });
    
      // newRound
      socket.on('newRound', (data) => {
        console.log("Received newRound:", data);
        document.getElementById('roundNumber').textContent = data.roundNumber || 1;
        showMessage("Round " + (data.roundNumber || 1) + " started!", "success");
        renderEndGameScreen(); // dynamically add the end game modal if not already in the DOM
      });
    
      // gameStateUpdate
      socket.on('gameStateUpdate', (data) => {
        // data = { state, scores }
        if (data.state) {
          gameState = data.state;
        }
        updateScoreboard(data.scores);
        renderGame();
      });
    
      // roundEnded
      socket.on('roundEnded', (data) => {
        console.log("Received roundEnded:", data);
        showMessage("Round ended! Reason: " + data.reason, "error");
        updateScoreboard(data.scores);
      });
    
      // gameEnded
      socket.on('gameEnded', (data) => {
        console.log("Received gameEnded:", data);
    
        // Build final results
        let html = '<p><strong>Reason:</strong> ' + data.reason + '</p>';
        if (data.standings && data.standings.length) {
          const winner = data.standings[0];
          html += '<p><strong>Winner:</strong> ' + (winner.playerData.username || winner.playerId) +
                  ' (Score: ' + winner.score + ')</p>';
          if (data.standings.length > 1) {
            html += '<h5>Other Standings:</h5>';
            data.standings.slice(1).forEach((player) => {
              html += '<p>Player ' + player.playerId + ': ' + player.score + ' pts</p>';
            });
          }
        }
        document.getElementById('endGameDetails').innerHTML = html;
    
        // Show the modal
        const endGameModal = new bootstrap.Modal(document.getElementById('endGameModal'));
        endGameModal.show();
    
        // NEW: Trigger finishRoom API to update DB scores after game ends
        if (data.standings && data.standings.length) {
          const winner = data.standings[0];
          // NEW: Pass only the first winner
          fetch('/api/rooms/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: currentRoom, winners: [winner.playerId] })
          })
          .then(response => response.json())
          .then(result => console.log('Finished room:', result))
          .catch(err => console.error('Finish room failed:', err));
        }
      });
    
      // New: Listen for gameStarting event to show countdown timer
      socket.on('gameStarting', (data) => {
        console.log("Received gameStarting event with countdown:", data.countdown);
        const timerEl = document.getElementById('countdownTimer');
        timerEl.style.display = 'flex';
        timerEl.textContent = data.countdown;
        // Update countdown every second if needed
        const countdownInterval = setInterval(() => {
          let current = parseInt(timerEl.textContent, 10);
          if (current > 1) {
            timerEl.textContent = current - 1;
          } else {
            clearInterval(countdownInterval);
            timerEl.style.display = 'none';
          }
        }, 1000);
      });
    
      // Button event listeners
      document.getElementById('moveUpBtn').addEventListener('click', () => emitMove('up'));
      document.getElementById('moveDownBtn').addEventListener('click', () => emitMove('down'));
      document.getElementById('stopBtn').addEventListener('click', () => emitMove('stop'));
    
      // Keyboard events - prevent scrolling & send movement
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          emitMove('up');
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          emitMove('down');
        }
      });
      document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          emitMove('stop');
        }
      });
    
      // Go Home button - navigate to your "home" page
      document.getElementById('goHomeButton').addEventListener('click', () => {
        // Replace "index.html" with your home page or route
        window.location.href = '/';
      });
    
      function emitMove(direction) {
        if (currentRoom && currentUser) {
          socket.emit('gameAction', {
            roomId: currentRoom,
            playerId: currentUser.id,
            action: {
              type: 'move',
              direction
            }
          });
        }
      }
    
      function showMessage(text, type) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.className = 'message ' + type;
        msg.style.display = 'block';
        // Optionally hide after a few seconds
        setTimeout(() => {
          msg.style.display = 'none';
        }, 3000);
      }
    
      function updateScoreboard(scores) {
        const scoresList = document.getElementById('scoresList');
        if (!scores || Object.keys(scores).length === 0) {
          scoresList.innerHTML = '<p>No scores yet</p>';
          return;
        }
    
        let html = '';
        for (const [playerId, score] of Object.entries(scores)) {
          html += '<p>Player <strong>' + playerId + '</strong>: ' + score + ' pts</p>';
        }
        scoresList.innerHTML = html;
      }
    
      function renderGame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Render ball
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
        ctx.fill();
    
        // Render paddles
        if (gameState.paddles) {
          Object.values(gameState.paddles).forEach((paddle) => {
            ctx.fillStyle = 'blue';
            ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
          });
        }
      }
    </script>
    </body>
    </html>
    
    `;

// Use the global `prompt` inside the route
router.post("/complete", async (req, res) => {
    let { nameOfGame, description, systemPrompt } = req.body;
    nameOfGame = nameOfGame.trim();

    prompt1 = `This is a prompt: ` + description + `Make it better like below, example prompt: Make a multiplayer Tic-Tac-Toe game that meets the following requirements: 1. The game is played on a 3x3 grid. Players take turns placing their mark (X or O) in an empty cell by clicking on it. 2. The first player to get three in a row (horizontally, vertically, or diagonally) wins. If the grid is full with no winner, the game is a draw. 3. Exactly 2 players are allowed. The first player to join is assigned "X" and the second is assigned "O". **Make sure that the assignment of marks occurs after both players have joined (e.g. within the initializeGame() method) rather than in the constructor**, so that the correct player IDs are available for validation. 4. When a user clicks a cell, their assigned mark should appear in that cell in red. 5. The game should display whose turn it is by updating a "turnIndicator" element. 6. On game initialization, broadcast a "newRound" event with the initial game state.  Just give prompt text, dont say anything else`;
    const aiResponse1 = await sendPrompt(prompt1, systemPrompt,'gpt-4o-mini');
    // return res.json({
    //   success: true,
    //   message: aiResponse1,
    // });
    // return aiResponse1;
    prompt = description + prompt;
    // console.log(prompt);

    let prompt22= aiResponse1 +" "+ prompt;
    console.log(prompt22);
    if (!nameOfGame) {
      return res.status(400).json({ error: "nameOfGame is required" });
    }
  
    try {
      // Send the predefined prompt to AI
      let aiResponse = await sendPrompt(prompt22, systemPrompt,'o1');
      console.log('ai response: '+aiResponse);
      aiResponse = aiResponse.trim();
      if (aiResponse.startsWith("```")) {
        // Remove the starting fence (it might include "json" after the backticks)
        aiResponse = aiResponse.replace(/^```(?:json)?\s*\n?/, "");
        // Remove the trailing fence
        if (aiResponse.endsWith("```")) {
          aiResponse = aiResponse.substring(0, aiResponse.length - 3);
        }
      }
      // Parse the response correctly
      const filesObject = JSON.parse(aiResponse);
  
      // Extract HTML & JS code
      const htmlContent = filesObject.htmlFile;
      const jsContent = filesObject.jsFile;
  
      // Write files using nameOfGame as filename
      fs.writeFileSync(`./public/games/${nameOfGame}.htm`, htmlContent, "utf8");
      fs.writeFileSync(`./games/${nameOfGame}.js`, jsContent, "utf8");
      const jsFileName=`${nameOfGame}.js`;
      const htmlFileName=`${nameOfGame}.htm`;

      // Respond with success
      return res.json({
        success: true,
        message: "Files created successfully!",
        files: {
          htmlPath: `./public/games/${nameOfGame}.html`,
          jsPath: `./games/${nameOfGame}.js`,
          jsFileName,
          htmlFileName
        },
      });
    } catch (error) {
      console.error("Error in /complete route:", error);
      return res.status(500).json({ error: error.message });
    }
  });


  // Use the global `prompt` inside the route
  router.post("/completeUpdate", async (req, res) => {
    let { nameOfGame, description, systemPrompt, model } = req.body;
    nameOfGame = nameOfGame.trim();
  
    // If model is not provided, set it to "o1"
    model = model ? model.trim() : "gpt-4o-mini";
  
    const prompt1 = `just give me 1 complete updated html and 1 complete updated js file code. dont say anything else
      Return the result as a JSON object with two keys: "htmlFile" (containing the HTML code) and "jsFile" (containing the JavaScript code). dont add any extra quotations or backticks`;
  
    const prompt2 = description + " " + prompt1;
  
    if (!nameOfGame) {
      return res.status(400).json({ error: "nameOfGame is required" });
    }
  
    try {
      // Send the prompt with the chosen or default model
      let aiResponse = await sendPrompt(prompt2, systemPrompt, model);
      console.log("ai response: " + aiResponse);
      aiResponse = aiResponse.trim();
  
      // Strip out possible ```json fences
      if (aiResponse.startsWith("```")) {
        aiResponse = aiResponse.replace(/^```(?:json)?\s*\n?/, "");
        if (aiResponse.endsWith("```")) {
          aiResponse = aiResponse.substring(0, aiResponse.length - 3);
        }
      }
  
      // Parse the response as JSON
      const filesObject = JSON.parse(aiResponse);
  
      // Extract HTML & JS code
      const htmlContent = filesObject.htmlFile;
      const jsContent = filesObject.jsFile;
  
      // Write files using nameOfGame as the filename
      fs.writeFileSync(`./public/games/${nameOfGame}.htm`, htmlContent, "utf8");
      fs.writeFileSync(`./games/${nameOfGame}.js`, jsContent, "utf8");
  
      const jsFileName = `${nameOfGame}.js`;
      const htmlFileName = `${nameOfGame}.htm`;
  
      // Respond with success
      return res.json({
        success: true,
        message: "Files created successfully!",
        files: {
          htmlPath: `./public/games/${nameOfGame}.html`,
          jsPath: `./games/${nameOfGame}.js`,
          jsFileName,
          htmlFileName,
        },
      });
    } catch (error) {
      console.error("Error in /completeUpdate route:", error);
      return res.status(500).json({ error: error.message });
    }
  });
  
module.exports = router;
