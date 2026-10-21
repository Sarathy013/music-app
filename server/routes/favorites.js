const express = require('express');
const router = express.Router();
const { getFavorites, addFavorite, removeFavorite, checkFavorite } = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getFavorites);
router.post('/', addFavorite);
router.get('/:trackId/check', checkFavorite);
router.delete('/:trackId', removeFavorite);

module.exports = router;
