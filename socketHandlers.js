const gameRegistry = require('./gameRegistry');
const db = require('./db'); // corrected import

function setupSocketHandlers(io) {
  io.on('connection', socket => {
    console.log('New client connected:', socket.id);

    socket.on('gameAction', data => {
      let { roomId, playerId, action } = data;
      roomId = Number(roomId); // ensure roomId is a number
      const result = gameRegistry.handleGameAction(roomId, playerId, action);
      if (result && result.error) {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('createRoom', data => {
      const { gameType, roomConfig } = data;
      try {
        const sessionConfig = {
          gameId: `${gameType}_${Date.now()}`,
          roomId: roomConfig.roomId,
          socket: io,
          maxPlayers: roomConfig.maxPlayers || 4,
          minPlayers: roomConfig.minPlayers || 2,
          duration: roomConfig.duration || 300,
          ...roomConfig.gameSpecificConfig
        };
        const gameInstance = gameRegistry.createGameSession(gameType, sessionConfig);
        socket.emit('roomCreated', { roomId: sessionConfig.roomId, gameType });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('joinRoom', data => {
      const { roomId, playerId } = data;
      const gameInstance = gameRegistry.getGameSession(roomId);
      if (gameInstance) {
        try {
          gameInstance.addPlayer(playerId, { socketId: socket.id });
          socket.join(`game:${roomId}`);
          socket.emit('joinedRoom', { roomId, gameId: gameInstance.gameId, gameState: gameInstance.getGameState() });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      } else {
        socket.emit('error', { message: 'Room not found' });
      }
    });

    // socket.on('joinRoomSocket', ({ roomId, playerId }) => {
    //   console.log(`joinRoomSocket: Player ${playerId} joining game:${roomId}`);
    //   socket.join(`game:${roomId}`);
    // });

    // socket.on('joinRoomSocket', ({ roomId, playerId }) => {
    //   console.log(`User ${playerId} joining room ${roomId}`);
    //   socket.join(`room:${roomId}`);
    //   db.query('SELECT * FROM sessions WHERE id = ?', [roomId])
    //     .then(results => {
    //       if (results.length > 0) {
    //         const room = results[0];
    //         io.in(`room:${roomId}`).emit('roomUpdate', {
    //           roomId,
    //           currentPlayers: room.current_players,
    //           maxPlayers: room.max_players,
    //           status: room.status
    //         });
    //         if (room.status === 'active') {
    //           io.in(`room:${roomId}`).emit('gameStart', { roomId, message: 'Game is starting!' });
    //         }
    //       }
    //     })
    //     .catch(err => console.error(err));
    // });


    socket.on('joinRoomSocket', ({ roomId, playerId, userId }) => {
      roomId = Number(roomId); // ensure roomId is a number
      const theId = playerId || userId; 
      console.log(`joinRoomSocket: Player ${theId} joining game:${roomId}`);
      
      socket.join(`game:${roomId}`);
    
      // If you want to broadcast a roomUpdate, do:
      db.query('SELECT * FROM sessions WHERE id = ?', [roomId])
        .then(results => {
          if (results.length > 0) {
            const room = results[0];
            io.in(`game:${roomId}`).emit('roomUpdate', {
              roomId,
              currentPlayers: room.current_players,
              maxPlayers: room.max_players,
              status: room.status
            });
            if (room.status === 'active') {
              io.in(`game:${roomId}`).emit('gameStart', {
                roomId,
                message: 'Game is starting!'
              });
            }
          }
        })
        .catch(err => console.error(err));
    });
    

    socket.on('leaveRoom', data => {
      const { roomId, playerId } = data;
      const gameInstance = gameRegistry.getGameSession(roomId);
      if (gameInstance) {
        gameInstance.removePlayer(playerId);
        socket.leave(`game:${roomId}`);
        socket.emit('leftRoom', { roomId });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      gameRegistry.activeSessions.forEach((game, roomId) => {
        const playerEntry = Array.from(game.players.entries()).find(([, data]) => data.socketId === socket.id);
        if (playerEntry) {
          const [playerId] = playerEntry;
          game.removePlayer(playerId, true);
        }
      });
    });
  });
}

module.exports = { setupSocketHandlers };