require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const { loadGames } = require('./gameLoader');
const { setupRoutes } = require('./routes');
const { setupSocketHandlers } = require('./socketHandlers');
const userRoutes = require('./routes/userRoutes');
const statsRoutes = require('./routes/statsRoutes');
const roomRoutes = require('./routes/roomRoutes');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes'); // Updated AI API route import
const socialRoutes = require('./routes/socialRoutes'); // New social login routes import

const { authenticateToken } = require('./middlewares/auth');  // New middleware import

const app = express();
// Define baseUrl and assign it to global
global.baseUrl = process.env.BASE_URL || 'http://0.0.0.0:2053';

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  credentials: true
}));

// Parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the public folder
app.use(express.static('public'));

const server = http.createServer(app);
server.timeout = 600000; // 10 minutes

// Configure Socket.IO with explicit CORS settings
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// Added: assign io to global for controllers use
global.io = io;

// Load all games at startup
loadGames();

// Setup API routes
app.use('/api/users', userRoutes); // signup and login remain public
app.use('/api/stats', authenticateToken, statsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/games', authenticateToken, gameRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/ai', authenticateToken, aiRoutes); // Secured route
// New social login routes (no token authentication required)
app.use('/api/auth', socialRoutes);

// Setup Socket.IO handlers
setupSocketHandlers(io);


const PORT = process.env.PORT || 2053;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
