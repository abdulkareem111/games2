const GameFramework = require('../gameFramework');

class TetrisGame extends GameFramework {
  constructor(config) {
    super(config);
    this.minPlayers = 2;
    this.maxPlayers = 2;
    this.gridWidth = 10;
    this.gridHeight = 20;
    this.gameActive = false;
    this.gameLoopInterval = null;
    this.gameSpeedMs = 500;
    this.roundNumber = 1;
    this.mode = config && config.mode ? config.mode : 'competitive'; // 'competitive' or 'cooperative'
    // players data: { playerId: { grid:[][], currentPiece:{}, score:0, ... } }
  }

  initializeGame() {
    try {
      const playerIds = Array.from(this.players.keys());
      if (playerIds.length !== 2) {
        console.log('Warning: Tetris game expects exactly 2 players.');
      }

      // Create an empty grid and set up each player
      playerIds.forEach(pid => {
        this.players.get(pid).grid = this.createEmptyGrid();
        this.players.get(pid).score = 0;
        this.players.get(pid).currentPiece = this.spawnTetromino();
      });

      this.gameActive = true;
      this.broadcastToPlayers('newRound', {
        initialState: this.getGameState()
      });
      this.startGameLoop();
    } catch (error) {
      console.error("Error in initializeGame:", error);
    }
  }

  createEmptyGrid() {
    try {
      const grid = [];
      for (let r = 0; r < 20; r++) {
        const row = new Array(10).fill(0);
        grid.push(row);
      }
      return grid;
    } catch (error) {
      console.error("Error in createEmptyGrid:", error);
      return [];
    }
  }

  spawnTetromino() {
    try {
      // Minimal set of Tetris shapes, each shape is array of relative coords
      const shapes = [
        {
          color: 'cyan',
          blocks: [[0,4],[0,5],[0,6],[0,7]] // I shape horizontal
        },
        {
          color: 'yellow',
          blocks: [[0,4],[0,5],[1,4],[1,5]] // O shape
        },
        {
          color: 'purple',
          blocks: [[0,4],[1,4],[1,5],[1,6]] // T shape
        },
        {
          color: 'green',
          blocks: [[0,5],[0,6],[1,4],[1,5]] // S shape
        },
        {
          color: 'red',
          blocks: [[0,4],[0,5],[1,5],[1,6]] // Z shape
        },
        {
          color: 'blue',
          blocks: [[0,4],[1,4],[1,5],[1,6]] // J shape
        },
        {
          color: 'orange',
          blocks: [[0,5],[1,5],[1,4],[1,3]] // L shape
        }
      ];
      const randIndex = Math.floor(Math.random() * shapes.length);
      const shapeObj = JSON.parse(JSON.stringify(shapes[randIndex]));
      return {
        color: shapeObj.color,
        blocks: shapeObj.blocks // array of [row, col]
      };
    } catch (error) {
      console.error("Error in spawnTetromino:", error);
      return null;
    }
  }

  startGameLoop() {
    try {
      this.gameLoopInterval = setInterval(() => {
        this.updateGame();
      }, this.gameSpeedMs);
    } catch (error) {
      console.error("Error in startGameLoop:", error);
    }
  }

  updateGame() {
    try {
      if (!this.gameActive) return;

      const playerIds = Array.from(this.players.keys());
      for (const pid of playerIds) {
        const pData = this.players.get(pid);
        if (!pData.currentPiece) {
          pData.currentPiece = this.spawnTetromino();
        }
        // Auto drop piece down by 1
        this.movePieceDown(pid);
      }
      // Broadcast updated state
      this.broadcastToPlayers('gameStateUpdate', {
        state: this.getGameState()
      });
    } catch (error) {
      console.error("Error in updateGame:", error);
    }
  }

  movePieceDown(playerId) {
    try {
      const pData = this.players.get(playerId);
      if (!pData.currentPiece) return;
      const newBlocks = pData.currentPiece.blocks.map(b => [b[0]+1, b[1]]);

      if (this.collision(pData.grid, newBlocks)) {
        // lock piece
        this.mergeTetromino(pData.grid, pData.currentPiece.blocks, pData.currentPiece.color);
        // clear lines
        const linesCleared = this.clearLines(playerId);
        if (linesCleared > 0) {
          pData.score += linesCleared * 100;
          this.broadcastToPlayers('lineCleared', {
            playerId: playerId,
            linesCleared: linesCleared,
            newScore: pData.score
          });
          if (this.mode === 'competitive') {
            this.sendGarbage(playerId, linesCleared);
          }
        }
        // spawn new piece
        pData.currentPiece = this.spawnTetromino();
        // check if new piece collides immediately => game over
        if (this.collision(pData.grid, pData.currentPiece.blocks)) {
          this.endGame('Player ' + playerId + ' topped out!');
        }
      } else {
        pData.currentPiece.blocks = newBlocks;
      }
    } catch (error) {
      console.error("Error in movePieceDown:", error);
    }
  }

  collision(grid, blocks) {
    try {
      for (let i = 0; i < blocks.length; i++) {
        const [r, c] = blocks[i];
        if (r < 0 || r >= this.gridHeight || c < 0 || c >= this.gridWidth) {
          return true;
        }
        if (r >= 0 && c >= 0 && r < this.gridHeight && c < this.gridWidth) {
          if (grid[r][c] !== 0) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error in collision:", error);
      return true;
    }
  }

  mergeTetromino(grid, blocks, color) {
    try {
      blocks.forEach(([r,c]) => {
        if (r >= 0 && r < this.gridHeight && c >= 0 && c < this.gridWidth) {
          grid[r][c] = color;
        }
      });
    } catch (error) {
      console.error("Error in mergeTetromino:", error);
    }
  }

  clearLines(playerId) {
    try {
      const pData = this.players.get(playerId);
      let cleared = 0;
      for (let r = 0; r < 20; r++) {
        if (pData.grid[r].every(cell => cell !== 0)) {
          cleared++;
          // remove line
          pData.grid.splice(r, 1);
          // insert empty line on top
          pData.grid.unshift(new Array(10).fill(0));
        }
      }
      return cleared;
    } catch (error) {
      console.error("Error in clearLines:", error);
      return 0;
    }
  }

  sendGarbage(clearingPlayerId, lines) {
    try {
      // simple approach: add 'lines' garbage rows to the other player
      const otherPlayerId = Array.from(this.players.keys()).find(pid => pid !== clearingPlayerId);
      if (!otherPlayerId) return;
      const otherData = this.players.get(otherPlayerId);
      for (let i = 0; i < lines; i++) {
        otherData.grid.shift();
        const garbageRow = new Array(10).fill('grey');
        // one hole at a random col
        const hole = Math.floor(Math.random() * 10);
        garbageRow[hole] = 0;
        otherData.grid.push(garbageRow);
      }
    } catch (error) {
      console.error("Error in sendGarbage:", error);
    }
  }

  processPlayerAction(playerId, action) {
    try {
      const pData = this.players.get(playerId);
      if (!pData) {
        return { valid: false, reason: 'No data for player' };
      }
      if (!pData.currentPiece) {
        return { valid: false, reason: 'No active piece' };
      }
      switch (action.type) {
        case 'rotate':
          this.rotatePiece(pData);
          break;
        case 'left':
          this.movePieceHorizontal(pData, -1);
          break;
        case 'right':
          this.movePieceHorizontal(pData, 1);
          break;
        case 'softDrop':
          this.movePieceDown(playerId);
          break;
        case 'hardDrop':
          while (!this.collision(pData.grid, pData.currentPiece.blocks.map(b => [b[0]+1, b[1]]))) {
            pData.currentPiece.blocks = pData.currentPiece.blocks.map(b => [b[0]+1, b[1]]);
          }
          this.movePieceDown(playerId);
          break;
        default:
          return { valid: false, reason: 'Unknown action type' };
      }
      return { valid: true };
    } catch (error) {
      console.error("Error in processPlayerAction:", error);
      return { valid: false, reason: 'Internal error' };
    }
  }

  movePieceHorizontal(pData, dir) {
    try {
      const newBlocks = pData.currentPiece.blocks.map(b => [b[0], b[1]+dir]);
      if (!this.collision(pData.grid, newBlocks)) {
        pData.currentPiece.blocks = newBlocks;
      }
    } catch (error) {
      console.error("Error in movePieceHorizontal:", error);
    }
  }

  rotatePiece(pData) {
    try {
      // Very basic rotation around the first block
      const pivot = pData.currentPiece.blocks[0];
      const newBlocks = pData.currentPiece.blocks.map(b => {
        const rowOffset = b[0] - pivot[0];
        const colOffset = b[1] - pivot[1];
        // rotate 90 deg clockwise
        return [
          pivot[0] + colOffset,
          pivot[1] - rowOffset
        ];
      });
      if (!this.collision(pData.grid, newBlocks)) {
        pData.currentPiece.blocks = newBlocks;
      }
    } catch (error) {
      console.error("Error in rotatePiece:", error);
    }
  }

  getGameState() {
    try {
      const state = {
        players: {},
        turnPlayerId: null,
        gridWidth: this.gridWidth,
        gridHeight: this.gridHeight,
        roundNumber: this.roundNumber
      };
      // pick a turnPlayerId arbitrarily (e.g., the first in the array)
      const playerIds = Array.from(this.players.keys());
      if (playerIds.length) {
        state.turnPlayerId = playerIds[0];
      }
      playerIds.forEach(pid => {
        const p = this.players.get(pid);
        state.players[pid] = {
          grid: p.grid,
          currentPiece: p.currentPiece,
          score: p.score
        };
      });
      return state;
    } catch (error) {
      console.error("Error in getGameState:", error);
      return {};
    }
  }

  calculateScore(playerId) {
    try {
      const pData = this.players.get(playerId);
      return pData.score || 0;
    } catch (error) {
      console.error("Error in calculateScore:", error);
      return 0;
    }
  }

  endGame(reason) {
    try {
      if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
      this.gameActive = false;
      const standings = this.getStandings();
      this.broadcastToPlayers('gameEnded', {
        reason,
        standings
      });
      super.endGame(reason);
    } catch (error) {
      console.error("Error in endGame:", error);
    }
  }

  getStandings() {
    try {
      const results = [];
      for (const [playerId, pData] of this.players.entries()) {
        results.push({
          playerId,
          score: pData.score,
          playerData: pData
        });
      }
      results.sort((a, b) => b.score - a.score);
      return results;
    } catch (error) {
      console.error("Error in getStandings:", error);
      return [];
    }
  }
}

module.exports = { TetrisGame };