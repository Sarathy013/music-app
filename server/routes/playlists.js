const express = require('express');
const router = express.Router();
const {
  getPlaylists, createPlaylist, getPlaylist,
  updatePlaylist, deletePlaylist, addTrack, removeTrack,
} = require('../controllers/playlistController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getPlaylists);
router.post('/', createPlaylist);
router.get('/:id', getPlaylist);
router.put('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);
router.post('/:id/tracks', addTrack);
router.delete('/:id/tracks/:trackId', removeTrack);

module.exports = router;
