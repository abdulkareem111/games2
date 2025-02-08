// gameLoader.js
const fs = require('fs');
const path = require('path');
const gameRegistry = require('./gameRegistry');

function loadGames() {
  const gamesDir = path.join(__dirname, 'games');
  if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir);
  fs.readdirSync(gamesDir)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
      const gameModule = require(path.join(gamesDir, file));
      const gameId = file.replace('.js', '').toLowerCase();
      // Expect the module to export the game class as default or as a property.
      const GameClass = gameModule.default || Object.values(gameModule)[0];
      gameRegistry.registerGame(gameId, GameClass);
      console.log(`Loaded and registered game: ${gameId}`);
    });
}

module.exports = { loadGames };