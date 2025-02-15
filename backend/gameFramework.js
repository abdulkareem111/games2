// gameFramework.js

/**
 * Base class for a game session.
 */
class GameFramework {
    constructor(config) {
      const {
        gameId,
        roomId,
        socket,
        maxPlayers,
        minPlayers = 2,
        duration,
        options = {}
      } = config;
  
      this.gameId = gameId;
      this.roomId = roomId;
      this.socket = socket;
      this.maxPlayers = maxPlayers;
      this.minPlayers = minPlayers;
      this.duration = duration;
      this.options = options;
  
      // Game state
      this.state = 'waiting'; // waiting, starting, active, paused, finished
      this.startTime = null;
      this.endTime = null;
      this.timer = null;
      this.roundNumber = 0;
  
      // Player management
      this.players = new Map(); // playerId -> playerData
      this.scores = new Map();
      this.disconnectedPlayers = new Map();
  
      // Bind context for callback methods
      this.handlePlayerAction = this.handlePlayerAction.bind(this);
      this.broadcastToPlayers = this.broadcastToPlayers.bind(this);
    }
  
    // Abstract methods (to be overridden)
    initializeGame() { throw new Error('initializeGame must be implemented'); }
    processPlayerAction(playerId, action) { throw new Error('processPlayerAction must be implemented'); }
    calculateScore(playerId, actionResult) { throw new Error('calculateScore must be implemented'); }
    getGameState() { throw new Error('getGameState must be implemented'); }
  
    addPlayer(playerId, playerData) {
      if (this.players.size >= this.maxPlayers) {
        throw new Error('Room is full');
      }
      if (this.disconnectedPlayers.has(playerId)) {
        // Reconnect player
        const prevData = this.disconnectedPlayers.get(playerId);
        this.players.set(playerId, { ...prevData, ...playerData });
        this.disconnectedPlayers.delete(playerId);
      } else {
        this.players.set(playerId, { ...playerData, joinedAt: Date.now() });
        this.scores.set(playerId, 0);
      }
      if (playerData.socketId) {
        const playerSocket = this.socket.sockets.sockets.get(playerData.socketId);
        if (playerSocket) playerSocket.join(`game:${this.roomId}`);
      }
      this.broadcastToPlayers('playerJoined', {
        playerId,
        playerCount: this.players.size,
        maxPlayers: this.maxPlayers
      });
      if (this.state === 'waiting' && this.players.size >= this.minPlayers) {
        this.startCountdown();
      }
    }
  
    removePlayer(playerId, temporary = false) {
      const playerData = this.players.get(playerId);
      if (!playerData) return;
      if (temporary) {
        this.disconnectedPlayers.set(playerId, { ...playerData, disconnectedAt: Date.now() });
      }
      this.players.delete(playerId);
      if (!temporary) this.scores.delete(playerId);
      this.broadcastToPlayers('playerLeft', {
        playerId,
        playerCount: this.players.size,
        maxPlayers: this.maxPlayers,
        temporary
      });
      if (this.state === 'active' && this.players.size < this.minPlayers) {
        this.endGame('insufficient_players');
      }
    }
  
    startCountdown() {
      this.state = 'starting';
      let countdown = 5;
      this.broadcastToPlayers('gameStarting', { countdown });
      const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          this.broadcastToPlayers('gameStarting', { countdown });
        } else {
          clearInterval(interval);
          this.startGame();
        }
      }, 1000);
    }
  
    startGame() {
      this.state = 'active';
      this.startTime = Date.now();
      this.roundNumber = 1;
      this.initializeGame();
      this.timer = setTimeout(() => this.endGame('time_up'), this.duration * 1000);
      this.broadcastToPlayers('gameStarted', {
        startTime: this.startTime,
        duration: this.duration,
        initialState: this.getGameState()
      });
    }
  
    pauseGame() {
      if (this.state !== 'active') return;
      this.state = 'paused';
      this.pausedAt = Date.now();
      clearTimeout(this.timer);
      this.broadcastToPlayers('gamePaused', {
        pausedAt: this.pausedAt,
        gameState: this.getGameState()
      });
    }
  
    resumeGame() {
      if (this.state !== 'paused') return;
      const pauseDuration = Date.now() - this.pausedAt;
      this.startTime += pauseDuration;
      this.state = 'active';
      const remainingTime = this.duration - ((Date.now() - this.startTime) / 1000);
      if (remainingTime > 0) {
        this.timer = setTimeout(() => this.endGame('time_up'), remainingTime * 1000);
      }
      this.broadcastToPlayers('gameResumed', { gameState: this.getGameState() });
    }
  
    endGame(reason) {
      this.state = 'finished';
      this.endTime = Date.now();
      clearTimeout(this.timer);
      const standings = Array.from(this.scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([playerId, score]) => ({
          playerId,
          score,
          playerData: this.players.get(playerId)
        }));
      const results = {
        reason,
        duration: (this.endTime - this.startTime) / 1000,
        standings,
        finalState: this.getGameState()
      };
      this.broadcastToPlayers('gameEnded', results);
      this.cleanup();
    }
  
    cleanup() {
      clearTimeout(this.timer);
      this.players.clear();
      this.scores.clear();
      this.disconnectedPlayers.clear();
    }
  
    handlePlayerAction(playerId, action) {
      if (this.state !== 'active' || !this.players.has(playerId)) {
        return { valid: false, error: 'Game is not active or player not in game' };
      }
      try {
        const actionResult = this.processPlayerAction(playerId, action);
        if (actionResult.valid) {
          const newScore = this.calculateScore(playerId, actionResult);
          this.scores.set(playerId, newScore);
          this.broadcastToPlayers('gameStateUpdate', {
            action,
            result: actionResult,
            scores: Object.fromEntries(this.scores),
            state: this.getGameState()
          });
        }
        return actionResult;
      } catch (err) {
        console.error('Error processing action:', err);
        return { valid: false, error: 'Error processing action' };
      }
    }
  
    broadcastToPlayers(eventName, data) {
      // console.log("[DEBUG] Broadcasting event:", eventName, "to room:", this.roomId, "with data:", data);
      this.socket.to(`game:${this.roomId}`).emit(eventName, {
        gameId: this.gameId,
        roomId: this.roomId,
        timestamp: Date.now(),
        ...data
      });
    }
  
    // Utility getters
    getPlayerScore(playerId) {
      return this.scores.get(playerId) || 0;
    }
  
    getAllScores() {
      return Object.fromEntries(this.scores);
    }
  
    getRemainingTime() {
      if (!this.startTime) return this.duration;
      if (this.state === 'paused') return this.duration - ((this.pausedAt - this.startTime) / 1000);
      return Math.max(0, this.duration - ((Date.now() - this.startTime) / 1000));
    }
  
    getPlayerCount() {
      return this.players.size;
    }
  
    getMetadata() {
      return {
        gameId: this.gameId,
        roomId: this.roomId,
        state: this.state,
        playerCount: this.players.size,
        maxPlayers: this.maxPlayers,
        startTime: this.startTime,
        duration: this.duration,
        remainingTime: this.getRemainingTime()
      };
    }
  }
  
  module.exports = GameFramework;