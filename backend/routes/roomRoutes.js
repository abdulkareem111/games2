const express = require('express');
const { getRooms, createRoom, getRoomById, joinRoom, finishRoom } = require('../controllers/roomController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, getRooms);
router.post('/', authenticateToken, createRoom);
router.get('/:roomId', authenticateToken, getRoomById);
router.post('/join', authenticateToken, joinRoom);
router.post('/finish', finishRoom);

module.exports = router;