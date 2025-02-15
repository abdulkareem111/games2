
const db = require('./db');
const gameRegistry = require('./gameRegistry');

function handleDbError(res, err, msg = 'Database error') {
  console.error(msg, err);
  return res.status(500).json({ error: msg });
}

function setupRoutes(app) {
  // Signup
  app.post('/api/signup', async (req, res) => {
    const { email, username, password } = req.body;
    const hashed_password = password; // For production, hash the password!
    const sql = 'INSERT INTO users (email, username, hashed_password) VALUES (?, ?, ?)';
    try {
      const result = await db.query(sql, [email, username, hashed_password]);
      res.status(201).json({ message: 'User created successfully', userId: result.insertId });
    } catch (err) {
      handleDbError(res, err, 'Error creating user');
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND hashed_password = ?';
    try {
      const results = await db.query(sql, [email, password]);
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      res.json({ message: 'Login successful', user: results[0] });
    } catch (err) {
      handleDbError(res, err, 'Login error');
    }
  });

  // Get Games
  app.get('/api/games', async (req, res) => {
    const sql = 'SELECT * FROM games';
    try {
      const results = await db.query(sql);
      res.json(results);
    } catch (err) {
      handleDbError(res, err, 'Error fetching games');
    }
  });

  // Stats
  app.get('/api/stats', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const winsQuery = `
      SELECT COUNT(*) as wins 
      FROM session_players sp
      JOIN sessions s ON sp.session_id = s.id
      WHERE sp.user_id = ? 
        AND sp.score = (
            SELECT MAX(score) 
            FROM session_players 
            WHERE session_id = sp.session_id
        )
    `;
    const historyQuery = `
      SELECT g.name as game, sp.score, s.end_time as date
      FROM session_players sp
      JOIN sessions s ON sp.session_id = s.id
      JOIN games g ON s.game_id = g.id
      WHERE sp.user_id = ?
      ORDER BY s.end_time DESC
      LIMIT 10
    `;
    try {
      const winsResults = await db.query(winsQuery, [userId]);
      const historyResults = await db.query(historyQuery, [userId]);
      res.json({ wins: winsResults[0].wins, history: historyResults });
    } catch (err) {
      handleDbError(res, err, 'Error fetching stats');
    }
  });

  // Admin endpoints
  app.get('/api/admin/stats', (req, res) => {
    const activeSessions = Array.from(gameRegistry.activeSessions.entries()).map(([roomId, game]) => ({
      roomId,
      gameId: game.gameId,
      playerCount: game.getPlayerCount(),
      state: game.state,
      metadata: game.getMetadata()
    }));
    res.json({
      activeSessions,
      totalSessions: gameRegistry.activeSessions.size,
      registeredGames: Array.from(gameRegistry.games.keys())
    });
  });

  app.get('/api/admin/games', async (req, res) => {
    const sql = 'SELECT * FROM games';
    try {
      const results = await db.query(sql);
      res.json(results);
    } catch (err) {
      handleDbError(res, err, 'Error fetching games');
    }
  });

  app.post('/api/admin/add-game', async (req, res) => {
    const { name, description, rules, session_duration, max_players } = req.body;
    if (!name || !description || !rules || !session_duration || !max_players) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const sql = `
      INSERT INTO games (name, description, rules, session_duration, max_players)
      VALUES (?, ?, ?, ?, ?)
    `;
    try {
      const result = await db.query(sql, [name, description, rules, session_duration, max_players]);
      res.json({ message: 'Game added successfully', gameId: result.insertId });
    } catch (err) {
      handleDbError(res, err, 'Error adding game');
    }
  });

  // Rooms: Get, Create, Join, Finish
  app.get('/api/rooms', async (req, res) => {
    const { gameId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'gameId is required' });
    const sql = `
      SELECT *
      FROM sessions
      WHERE game_id = ? AND status = 'waiting' AND current_players < max_players
      ORDER BY created_at ASC
    `;
    try {
      const results = await db.query(sql, [gameId]);
      res.json(results);
    } catch (err) {
      handleDbError(res, err, 'Error fetching rooms');
    }
  });

  app.post('/api/rooms', async (req, res) => {
    const { gameId, roomName, maxPlayers, waitTime, buyIn } = req.body;
    if (!gameId || !maxPlayers) return res.status(400).json({ error: 'gameId and maxPlayers are required' });

    const parsedMaxPlayers = parseInt(maxPlayers, 10);
    if (isNaN(parsedMaxPlayers) || parsedMaxPlayers <= 0) return res.status(400).json({ error: 'Invalid maxPlayers value' });

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
      const result = await db.query(sql, [gameId, roomName || null, parsedMaxPlayers, timer_end, finalBuyIn]);
      res.status(201).json({ message: 'Room created successfully', roomId: result.insertId });
    } catch (err) {
      handleDbError(res, err, 'Error creating room');
    }
  });

  app.get('/api/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const sql = 'SELECT * FROM sessions WHERE id = ?';
    try {
      const results = await db.query(sql, [roomId]);
      if (results.length === 0) return res.status(404).json({ error: 'Room not found' });
      res.json(results[0]);
    } catch (err) {
      handleDbError(res, err, 'Error fetching room');
    }
  });

  app.post('/api/rooms/join', (req, res) => {
    const { roomId, userId } = req.body;
    if (!roomId || !userId) return res.status(400).json({ error: 'roomId and userId are required' });

    const sqlRoom = 'SELECT * FROM sessions WHERE id = ? AND status = "waiting"';
    db.query(sqlRoom, [roomId])
      .then(results => {
        if (results.length === 0) throw new Error('Room not found or not available');
        const room = results[0];
        if (room.current_players >= room.max_players) throw new Error('Room is full');
        return db.query('SELECT * FROM session_players WHERE session_id = ? AND user_id = ?', [roomId, userId])
          .then(existing => {
            if (existing.length > 0) throw new Error('User already joined this room');
            return db.query('SELECT * FROM users WHERE id = ?', [userId]).then(userRes => {
              if (userRes.length === 0) throw new Error('User not found');
              const user = userRes[0];
              if (user.coins < room.buy_in) throw new Error('Insufficient coins to join this room');
              return new Promise((resolve, reject) => {
                db.pool.getConnection((err, connection) => {
                  if (err) return reject(new Error('Database connection error'));
                  connection.beginTransaction(err => {
                    if (err) {
                      connection.release();
                      return reject(new Error('Transaction error'));
                    }
                    const newCoinBalance = user.coins - room.buy_in;
                    connection.query('UPDATE users SET coins = ? WHERE id = ?', [newCoinBalance, userId], (err) => {
                      if (err) return connection.rollback(() => { connection.release(); reject(new Error('Error deducting coins')); });
                      connection.query('INSERT INTO session_players (session_id, user_id) VALUES (?, ?)', [roomId, userId], (err) => {
                        if (err) return connection.rollback(() => { connection.release(); reject(new Error('Error joining room')); });
                        const newPlayerCount = room.current_players + 1;
                        const newStatus = newPlayerCount >= room.max_players ? 'active' : 'waiting';
                        connection.query(`UPDATE sessions SET current_players = ?, prize_pool = prize_pool + ?, status = ? WHERE id = ?`,
                          [newPlayerCount, room.buy_in, newStatus, roomId], (err) => {
                            if (err) return connection.rollback(() => { connection.release(); reject(new Error('Error updating room')); });
                            connection.commit(err => {
                              if (err) return connection.rollback(() => { connection.release(); reject(new Error('Error committing transaction')); });
                              connection.release();
                              io.to(`room:${roomId}`).emit('roomUpdate', {
                                roomId,
                                currentPlayers: newPlayerCount,
                                maxPlayers: room.max_players,
                                status: newStatus
                              });
                              if (newStatus === 'active') {
                                io.to(`room:${roomId}`).emit('gameStart', { roomId, message: 'Game is starting!' });
                              }
                              resolve(res.json({ message: 'Joined room successfully', roomId, currentPlayers: newPlayerCount, maxPlayers: room.max_players, status: newStatus }));
                            });
                          });
                      });
                    });
                  });
                });
              });
            });
          });
      })
      .catch(err => res.status(400).json({ error: err.message }));
  });

  app.post('/api/rooms/finish', async (req, res) => {
    const { roomId, winners } = req.body;
    if (!roomId || !winners || !Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ error: 'roomId and an array of winners are required' });
    }
    try {
      const sessionResults = await db.query('SELECT * FROM sessions WHERE id = ?', [roomId]);
      if (sessionResults.length === 0) return res.status(404).json({ error: 'Session not found' });
      const session = sessionResults[0];
      if (session.status === 'completed') return res.status(400).json({ error: 'Session already completed' });
      const totalPrize = session.prize_pool;
      const share = Math.floor(totalPrize / winners.length);
      await db.query('UPDATE sessions SET status = "completed", end_time = NOW() WHERE id = ?', [roomId]);
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
      res.json({ message: 'Session completed successfully', totalPrize, winners: distribution });
    } catch (err) {
      handleDbError(res, err, 'Error finishing session');
    }
  });
}

module.exports = { setupRoutes };