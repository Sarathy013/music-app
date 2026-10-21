const ListeningHistory = require('../models/ListeningHistory');
const { isDbConnected } = require('../config/database');
const store = require('../data/store');

// GET /api/history
exports.getHistory = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    if (isDbConnected()) {
      const history = await ListeningHistory.find({ user: req.user._id })
        .sort({ playedAt: -1 })
        .limit(Number(limit));
      return res.json({ success: true, history });
    }
    const history = store.getHistory(req.user._id, Number(limit));
    res.json({ success: true, history });
  } catch (err) { next(err); }
};

// POST /api/history
exports.addToHistory = async (req, res, next) => {
  try {
    const { trackId, title, artist, album, duration, artworkUrl, streamUrl } = req.body;
    if (isDbConnected()) {
      const entry = await ListeningHistory.create({
        user: req.user._id, trackId, title, artist, album, duration, artworkUrl, streamUrl,
      });
      return res.status(201).json({ success: true, entry });
    }
    const entry = store.addToHistory(req.user._id, { trackId, title, artist, album, duration, artworkUrl, streamUrl });
    res.status(201).json({ success: true, entry });
  } catch (err) { next(err); }
};

// DELETE /api/history  (clear all)
exports.clearHistory = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      await ListeningHistory.deleteMany({ user: req.user._id });
      return res.json({ success: true, message: 'History cleared.' });
    }
    store.clearHistory(req.user._id);
    res.json({ success: true, message: 'History cleared.' });
  } catch (err) { next(err); }
};
