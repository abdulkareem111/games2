
const express = require('express');
const { getRooms, createRoom, getRoomById, joinRoom, finishRoom } = require('../controllers/roomController');

const router = express.Router();

router.get('/', getRooms);
router.post('/', createRoom);
router.get('/:roomId', getRoomById);
router.post('/join', joinRoom);
router.post('/finish', finishRoom);

module.exports = router;