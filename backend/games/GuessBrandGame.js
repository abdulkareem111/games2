// games/GuessBrandGame.js
const GameFramework = require('../gameFramework');

class GuessBrandGame extends GameFramework {
  constructor(config) {
    super(config);
    this.brands = GuessBrandGame.BRAND_LIST;
    this.currentBrand = null;
    this.currentMaskedBrand = '';
    this.roundDuration = 10; // seconds
    this.roundTimer = null;
    this.roundStartTime = null;
    this.correctGuesses = new Map();
    this.winningScore = 3;
  }

  initializeGame() {
    this.roundNumber = 0;
    this.correctGuesses.clear();
    console.log("[DEBUG] Initializing game. Setting roundNumber to", this.roundNumber);
    this.startNewRound();
  }
  getGameState() {
    return {
      roundNumber: this.roundNumber,
      maskedBrand: this.currentMaskedBrand,
      scores: Object.fromEntries(this.scores),   // if you want to show current scores
      correctGuesses: Object.fromEntries(this.correctGuesses),
      // Any other state you want to broadcast
    };
  }
  startNewRound() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundNumber++;
    this.roundStartTime = Date.now();
    const randomIndex = Math.floor(Math.random() * this.brands.length);
    this.currentBrand = this.brands[randomIndex];
    this.currentMaskedBrand = this.maskBrand(this.currentBrand, this.roundNumber);
    console.log("[DEBUG] Starting round", this.roundNumber, "with brand:", this.currentBrand, "and masked as:", this.currentMaskedBrand);
    this.broadcastToPlayers('newRound', {
      initialState: this.getGameState(), 
      duration: this.roundDuration
    });
    this.roundTimer = setTimeout(() => this.endRound('time_up'), this.roundDuration * 1000);
  }

  maskBrand(brand, roundNumber) {
    const removePercentage = Math.min(0.7, 0.3 + roundNumber * 0.1);
    let chars = brand.split('');
    const indices = chars.map((c, i) => (c !== ' ' ? i : -1)).filter(i => i !== -1);
    const totalToRemove = Math.floor(chars.length * removePercentage);
    for (let i = 0; i < totalToRemove && indices.length; i++) {
      const rand = Math.floor(Math.random() * indices.length);
      const index = indices.splice(rand, 1)[0];
      chars[index] = '_';
    }
    const masked = chars.join('');
    console.log("[DEBUG] Masking brand:", brand, "using removePercentage:", removePercentage, "result:", masked);
    return masked;
  }

  processPlayerAction(playerId, action) {
    console.log("[DEBUG] Processing action from player:", playerId, "Action:", action);
    if (action.type !== 'guess') return { valid: false };
    const guess = action.guess.toLowerCase().trim();
    const correct = guess === this.currentBrand.toLowerCase();
    if (correct) {
      const currentCorrect = this.correctGuesses.get(playerId) || 0;
      this.correctGuesses.set(playerId, currentCorrect + 1);
      console.log("[DEBUG] Player", playerId, "guessed correctly. Total correct:", currentCorrect + 1);
      if (currentCorrect + 1 >= this.winningScore) {
        console.log("[DEBUG] Player", playerId, "reached winning score. Ending game.");
        this.endGame('winner');
        return { valid: true, correct, gameWon: true };
      }
      this.startNewRound();
    } else {
      console.log("[DEBUG] Player", playerId, "guess incorrect.");
    }
    return { valid: true, correct, actualBrand: correct ? this.currentBrand : null };
  }

  calculateScore(playerId, actionResult) {
    if (!actionResult.correct) return this.getPlayerScore(playerId);
    const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
    const timeBonus = Math.max(0, Math.floor((this.roundDuration - timeElapsed) * 10));
    const newScore = this.getPlayerScore(playerId) + 100 + timeBonus;
    console.log("[DEBUG] Calculating score for player", playerId, "Time elapsed:", timeElapsed, "Bonus:", timeBonus, "New score:", newScore);
    return newScore;
  }

  endRound(reason) {
    console.log("[DEBUG] Ending round", this.roundNumber, "Reason:", reason, "Correct brand:", this.currentBrand);
    this.broadcastToPlayers('roundEnded', {
      reason,
      correctBrand: this.currentBrand,
      scores: this.getAllScores(),
      correctGuesses: Object.fromEntries(this.correctGuesses)
    });
    setTimeout(() => this.startNewRound(), 3000);
  }
}

GuessBrandGame.BRAND_LIST = [
  "Nike", "Adidas", "Coca Cola", "Pepsi", "Apple", "Microsoft", "Amazon", "Google",
  "Facebook", "Instagram", "Twitter", "Netflix", "Disney", "Samsung", "Sony",
  "McDonald's", "Burger King", "Starbucks", "Subway", "KFC"
  // Add additional brands as needed...
];

module.exports = { GuessBrandGame };