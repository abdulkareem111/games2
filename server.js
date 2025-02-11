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

const app = express();

// Define baseUrl and assign it to global
global.baseUrl = 'http://0.0.0.0:2053';

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
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes); // Updated AI API route import

// Setup Socket.IO handlers
setupSocketHandlers(io);


const PORT = process.env.PORT || 2053;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
