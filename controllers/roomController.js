const { query, handleDbError, pool } = require('../utils/db');
const db = require('../db');
const gameRegistry = require('../gameRegistry');

async function getRooms(req, res) {
  const { gameId } = req.query;
  if (!gameId) return res.status(400).json({ error: 'gameId is required' });

  // 1) Include BOTH 'waiting' AND 'active' statuses, but only if not full yet:
  const sql = `
    SELECT *
    FROM sessions
    WHERE game_id = ?
      AND status IN ('waiting','active')
      AND current_players < max_players
    ORDER BY created_at ASC
  `;
  try {
    const results = await db.query(sql, [gameId]);
    res.json(results);
  } catch (err) {
    handleDbError(res, err, 'Error fetching rooms');
  }
}

async function createRoom(req, res) {
  const { gameId, roomName, maxPlayers, waitTime, buyIn } = req.body;
  if (!gameId || !maxPlayers) {
    return res.status(400).json({ error: 'gameId and maxPlayers are required' });
  }

  const parsedMaxPlayers = parseInt(maxPlayers, 10);
  if (isNaN(parsedMaxPlayers) || parsedMaxPlayers <= 0) {
    return res.status(400).json({ error: 'Invalid maxPlayers value' });
  }

  let timer_end = null;
  if (waitTime && typeof waitTime === 'number') {
    timer_end = new Date(Date.now() + waitTime * 1000);
  }
  const parsedBuyIn = parseInt(buyIn, 10);
  const finalBuyIn = (!isNaN(parsedBuyIn) && parsedBuyIn > 0) ? parsedBuyIn : 1;

  const sql = `
    INSERT INTO sessions (game_id, room_name, status, current_players, max_players, timer_end, buy_in, prize_pool)
    VALUES (?, ?, 'waiting', 0, ?, ?, ?, 0)
  `;
  try {
    const result = await db.query(sql, [
      gameId,
      roomName || null,
      parsedMaxPlayers,
      timer_end,
      finalBuyIn
    ]);
    res.status(201).json({ message: 'Room created successfully', roomId: result.insertId });
  } catch (err) {
    handleDbError(res, err, 'Error creating room');
  }
}

async function getRoomById(req, res) {
  const { roomId } = req.params;
  const sql = 'SELECT * FROM sessions WHERE id = ?';
  try {
    const results = await db.query(sql, [roomId]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(results[0]);
  } catch (err) {
    handleDbError(res, err, 'Error fetching room');
  }
}

async function joinRoom(req, res) {
  let { roomId, userId } = req.body;
  roomId = Number(roomId); // ensure roomId is a number
  if (!roomId || !userId) {
    return res.status(400).json({ error: 'roomId and userId are required' });
  }

  try {
    // Allow joining if status is "waiting" OR "active":
    const [room] = await db.query(
      'SELECT * FROM sessions WHERE id = ? AND status IN ("waiting","active")',
      [roomId]
    );
    if (!room) {
      throw new Error('Room not found or not available');
    }

    // If the room is 'waiting' but already at max, it's full
    if (room.current_players >= room.max_players && room.status === 'waiting') {
      throw new Error('Room is full');
    }

    // Check if user is already in the room
    const existing = await db.query(
      'SELECT * FROM session_players WHERE session_id = ? AND user_id = ?',
      [roomId, userId]
    );
    if (existing.length > 0) {
      // Already joined
      return res.json({
        message: 'User already in room',
        roomId,
        currentPlayers: room.current_players,
        maxPlayers: room.max_players,
        status: room.status
      });
    }

    // Check user coins
    const [user] = await db.query('SELECT coins FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error('User not found');
    if (user.coins < room.buy_in) {
      throw new Error('Insufficient coins to join this room');
    }

    // Transaction: remove coins, add user to session, update session
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Deduct coins
      const newCoinBalance = user.coins - room.buy_in;
      await connection.query('UPDATE users SET coins = ? WHERE id = ?', [newCoinBalance, userId]);

      // Insert into session_players
      await connection.query(
        'INSERT INTO session_players (session_id, user_id, score) VALUES (?, ?, 0)',
        [roomId, userId]
      );

      // Update session
      let newPlayerCount = room.current_players + 1;
      let newStatus = room.status;

      // If the room was 'waiting' and we've just hit max players, change to active
      if (newStatus === 'waiting' && newPlayerCount >= room.max_players) {
        newStatus = 'active';
      }

      await connection.query(
        `UPDATE sessions
         SET current_players = ?, prize_pool = prize_pool + ?, status = ?
         WHERE id = ?`,
        [newPlayerCount, room.buy_in, newStatus, roomId]
      );

      await connection.commit();
      connection.release();

      // Notify clients about updated room
      global.io.to(`game:${roomId}`).emit('roomUpdate', {
        roomId,
        currentPlayers: newPlayerCount,
        maxPlayers: room.max_players,
        status: newStatus
      });

      // If status changed to active, create + start the game instance
      if (newStatus === 'active') {
        global.io.to(`game:${roomId}`).emit('gameStart', {
          roomId,
          message: 'Game is starting!'
        });

        // Create & start GuessBrandGame
        const sessionConfig = {
          gameId: room.game_id,
          roomId,
          socket: global.io,
          maxPlayers: room.max_players,
          minPlayers: 2,
          duration: 600,
          options: {}
        };

        const [gameRecord] = await db.query('SELECT name FROM games WHERE id = ?', [room.game_id]);
  let gameKey = 'guessbrandgame';
  if (gameRecord && gameRecord.name) {
    // Convert to lower case and remove spaces.
    gameKey = gameRecord.name.toLowerCase().replace(/\s+/g, '');
  }
        const gameInstance = gameRegistry.createGameSession(gameKey, sessionConfig);

        // Add all the already-joined players
        const allPlayers = await db.query(
          'SELECT user_id FROM session_players WHERE session_id = ?',
          [roomId]
        );
        for (let plr of allPlayers) {
          gameInstance.addPlayer(plr.user_id, { username: 'User' + plr.user_id });
        }

        // Start the brand guessing
        gameInstance.initializeGame();
      }

      // Return success
      return res.json({
        message: 'Joined room successfully',
        roomId,
        currentPlayers: newPlayerCount,
        maxPlayers: room.max_players,
        status: newStatus
      });
    } catch (errorInTransaction) {
      await connection.rollback();
      connection.release();
      throw errorInTransaction;
    }
  } catch (err) {
    console.error("joinRoom error:", err);
    return res.status(400).json({ error: err.message });
  }
}

async function finishRoom(req, res) {
  const { roomId, winners } = req.body;
  if (!roomId || !winners || !Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'roomId and an array of winners are required' });
  }
  try {
    const sessionResults = await db.query('SELECT * FROM sessions WHERE id = ?', [roomId]);
    if (sessionResults.length === 0) return res.status(404).json({ error: 'Session not found' });

    const session = sessionResults[0];
    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const totalPrize = session.prize_pool;
    const share = Math.floor(totalPrize / winners.length);

    // Mark session completed
    await db.query('UPDATE sessions SET status = "completed", end_time = NOW() WHERE id = ?', [roomId]);

    // Distribute prizes
    let distribution = [];
    await Promise.all(winners.map(async winnerId => {
      try {
        const userRes = await db.query('SELECT coins FROM users WHERE id = ?', [winnerId]);
        if (userRes.length === 0) return;
        const newBalance = userRes[0].coins + share;
        await db.query('UPDATE users SET coins = ? WHERE id = ?', [newBalance, winnerId]);
        distribution.push({ userId: winnerId, prize: share });
      } catch (e) {
        console.error('Error processing winner:', e);
      }
    }));

    res.json({ 
      message: 'Session completed successfully',
      totalPrize,
      winners: distribution
    });
  } catch (err) {
    handleDbError(res, err, 'Error finishing session');
  }
}

module.exports = {
  getRooms,
  createRoom,
  getRoomById,
  joinRoom,
  finishRoom
};
