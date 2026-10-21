const Favorite = require('../models/Favorite');
const { isDbConnected } = require('../config/database');
const store = require('../data/store');

// GET /api/favorites
exports.getFavorites = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const favorites = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 });
      return res.json({ success: true, favorites });
    }
    const favorites = store.getFavorites(req.user._id);
    res.json({ success: true, favorites });
  } catch (err) { next(err); }
};

// POST /api/favorites
exports.addFavorite = async (req, res, next) => {
  try {
    const { trackId, title, artist, album, duration, artworkUrl, streamUrl } = req.body;
    if (isDbConnected()) {
      const favorite = await Favorite.create({ user: req.user._id, trackId, title, artist, album, duration, artworkUrl, streamUrl });
      return res.status(201).json({ success: true, favorite });
    }
    const favorite = store.addFavorite(req.user._id, { trackId, title, artist, album, duration, artworkUrl, streamUrl });
    res.status(201).json({ success: true, favorite });
  } catch (err) { next(err); }
};

// DELETE /api/favorites/:trackId
exports.removeFavorite = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const result = await Favorite.findOneAndDelete({ user: req.user._id, trackId: req.params.trackId });
      if (!result) return res.status(404).json({ success: false, message: 'Favorite not found.' });
      return res.json({ success: true, message: 'Removed from favorites.' });
    }
    const removed = store.removeFavorite(req.user._id, req.params.trackId);
    if (!removed) return res.status(404).json({ success: false, message: 'Favorite not found.' });
    res.json({ success: true, message: 'Removed from favorites.' });
  } catch (err) { next(err); }
};

// GET /api/favorites/:trackId/check
exports.checkFavorite = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const fav = await Favorite.findOne({ user: req.user._id, trackId: req.params.trackId });
      return res.json({ success: true, isFavorite: !!fav });
    }
    const isFavorite = store.checkFavorite(req.user._id, req.params.trackId);
    res.json({ success: true, isFavorite });
  } catch (err) { next(err); }
};
