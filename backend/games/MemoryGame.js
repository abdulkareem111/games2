// File: games/MemoryGame.js
const GameFramework = require('../gameFramework');

class MemoryGame extends GameFramework {
  constructor(config) {
    super(config);

    this.cards = [];
    this.flippedCards = []; // indexes of currently flipped (max 2)
    this.matchedCount = 0;
    this.scoreMap = new Map();
    this.numPairs = 6; // total pairs
  }

  initializeGame() {
    this.roundNumber = 1;
    // Generate pairs: we’ll label them 1..6, each repeated twice
    const arr = [];
    for (let i = 1; i <= this.numPairs; i++) {
      arr.push(i, i);
    }
    // Shuffle
    arr.sort(() => 0.5 - Math.random());

    // Create card objects
    this.cards = arr.map(value => ({
      value,
      matched: false,
      flipped: false
    }));

    this.broadcastToPlayers('newRound', {
      initialState: this.getGameState()
    });
    this.broadcastState();
  }

  processPlayerAction(playerId, action) {
    // action = { type: 'flip', index: # }
    if (!this.scoreMap.has(playerId)) {
      this.scoreMap.set(playerId, 0);
    }
    if (action.type === 'flip') {
      const index = action.index;
      if (this.cards[index].matched || this.cards[index].flipped) {
        return { valid: false, reason: 'Already flipped or matched' };
      }
      this.cards[index].flipped = true;
      this.flippedCards.push(index);

      if (this.flippedCards.length === 2) {
        // Check match
        const [i1, i2] = this.flippedCards;
        if (this.cards[i1].value === this.cards[i2].value) {
          // match
          this.cards[i1].matched = true;
          this.cards[i2].matched = true;
          this.matchedCount++;
          const score = (this.scoreMap.get(playerId) || 0) + 1;
          this.scoreMap.set(playerId, score);

          if (this.matchedCount >= this.numPairs) {
            this.endGame('All pairs matched!');
            return { valid: true };
          }
        } else {
          // no match -> flip back
          setTimeout(() => {
            this.cards[i1].flipped = false;
            this.cards[i2].flipped = false;
            this.broadcastState();
          }, 1000); // small delay so players can see
        }
        this.flippedCards = [];
      }

      this.broadcastState();
      return { valid: true };
    }
    return { valid: false };
  }

  broadcastState() {
    this.broadcastToPlayers('gameStateUpdate', {
      state: this.getGameState(),
      scores: this.getAllScores()
    });
  }

  calculateScore(playerId) {
    return this.scoreMap.get(playerId) || 0;
  }

  getGameState() {
    return {
      cards: this.cards,
      roundNumber: this.roundNumber
    };
  }

  endGame(reason) {
    // Build standings
    const standings = [];
    for (let [playerId, score] of this.scoreMap.entries()) {
      standings.push({ playerId, score });
    }
    standings.sort((a, b) => b.score - a.score);

    this.broadcastToPlayers('gameEnded', { reason, standings });
    super.endGame(reason);
  }
}

module.exports = { MemoryGame };
