// gameLoader.js
const fs = require('fs');
const path = require('path');
const gameRegistry = require('./gameRegistry');

// Utility function to clear the entire require cache
function clearAllRequireCache() {
  Object.keys(require.cache).forEach((key) => {
    delete require.cache[key];
  });
}

function loadGames() {
  // 1. Completely clear the require cache
  clearAllRequireCache();

  // 2. Now reload and register all games
  const gamesDir = path.join(__dirname, 'games');
  if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir);

  fs.readdirSync(gamesDir)
    .filter((file) => file.endsWith('.js'))
    .forEach((file) => {
      const fullPath = path.join(gamesDir, file);
      const gameModule = require(fullPath); // Fresh require after clearing cache
      const gameId = file.replace('.js', '').toLowerCase();

      // Expect the module to export a Game Class (either default or as a property)
      const GameClass = gameModule.default || Object.values(gameModule)[0];
      gameRegistry.registerGame(gameId, GameClass);
      console.log(`Loaded and registered game: ${gameId}`);
    });
}

module.exports = { loadGames };
