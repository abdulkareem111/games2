const express = require('express');
const { getGames, addGame, updateGame } = require('../controllers/gameController');
const { loadGames } = require('../gameLoader');
const { authenticateToken } = require('../middlewares/auth');

const multer = require('multer');
const path = require('path');
// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function(req, file, cb){
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.use(authenticateToken);
router.get('/', getGames);
// Use multer middleware for handling image upload
router.post('/add-game', upload.single('image'), addGame);
router.post('/update-game', async (req, res) => {
  await updateGame(req, res);
  loadGames();
});

module.exports = router;