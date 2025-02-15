// gameRegistry.js
class GameRegistry {
    constructor() {
      this.games = new Map();       // gameId -> GameClass
      this.activeSessions = new Map(); // roomId -> gameInstance
    }
  
    registerGame(gameId, gameClass) {
      this.games.set(gameId, gameClass);
      console.log(`Registered game: ${gameId}`);
    }
  
    createGameSession(gameType, sessionConfig) {
      console.log('------------------',gameType)
      const GameClass = this.games.get(gameType);
      if (!GameClass) {console.log('------------------',gameType); 
        throw new Error(`Game type ${gameType} not found`);
      }
      const gameInstance = new GameClass(sessionConfig);
      this.activeSessions.set(sessionConfig.roomId, gameInstance);
      return gameInstance;
    }
  
    getGameSession(roomId) {
      return this.activeSessions.get(roomId);
    }
  
    removeGameSession(roomId) {
      this.activeSessions.delete(roomId);
    }
  
    handleGameAction(roomId, playerId, action) {
      console.log("[DEBUG] Handling game action for room:", roomId, "player:", playerId, "action:", action);
      const gameInstance = this.getGameSession(roomId);
      if (!gameInstance) {
        console.warn("[DEBUG] No active game session for room:", roomId);
        return null;
      }
      return gameInstance.handlePlayerAction(playerId, action);
    }
  }
  
  module.exports = new GameRegistry();