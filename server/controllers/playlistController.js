const Playlist = require('../models/Playlist');
const { isDbConnected } = require('../config/database');
const store = require('../data/store');

// GET /api/playlists
exports.getPlaylists = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const playlists = await Playlist.find({ user: req.user._id }).sort({ updatedAt: -1 });
      return res.json({ success: true, playlists });
    }
    const playlists = store.getPlaylists(req.user._id);
    res.json({ success: true, playlists });
  } catch (err) { next(err); }
};

// POST /api/playlists
exports.createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic } = req.body;
    if (isDbConnected()) {
      const playlist = await Playlist.create({ user: req.user._id, name, description, isPublic });
      return res.status(201).json({ success: true, playlist });
    }
    const playlist = store.createPlaylist(req.user._id, { name, description, isPublic });
    res.status(201).json({ success: true, playlist });
  } catch (err) { next(err); }
};

// GET /api/playlists/:id
exports.getPlaylist = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
      if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
      return res.json({ success: true, playlist });
    }
    const playlist = store.getPlaylist(req.user._id, req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
    res.json({ success: true, playlist });
  } catch (err) { next(err); }
};

// PUT /api/playlists/:id
exports.updatePlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic, coverImage } = req.body;
    if (isDbConnected()) {
      const playlist = await Playlist.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { name, description, isPublic, coverImage },
        { new: true, runValidators: true }
      );
      if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
      return res.json({ success: true, playlist });
    }
    const playlist = store.updatePlaylist(req.user._id, req.params.id, { name, description, isPublic, coverImage });
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
    res.json({ success: true, playlist });
  } catch (err) { next(err); }
};

// DELETE /api/playlists/:id
exports.deletePlaylist = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
      return res.json({ success: true, message: 'Playlist deleted.' });
    }
    const deleted = store.deletePlaylist(req.user._id, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Playlist not found.' });
    res.json({ success: true, message: 'Playlist deleted.' });
  } catch (err) { next(err); }
};

// POST /api/playlists/:id/tracks
exports.addTrack = async (req, res, next) => {
  try {
    const { trackId, title, artist, album, duration, artworkUrl, streamUrl } = req.body;
    if (isDbConnected()) {
      const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
      if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

      const exists = playlist.tracks.find((t) => t.trackId === trackId);
      if (exists) return res.status(400).json({ success: false, message: 'Track already in playlist.' });

      playlist.tracks.push({ trackId, title, artist, album, duration, artworkUrl, streamUrl, position: playlist.tracks.length });
      await playlist.save();
      return res.json({ success: true, playlist });
    }

    const playlist = store.addTrackToPlaylist(req.user._id, req.params.id, { trackId, title, artist, album, duration, artworkUrl, streamUrl });
    res.json({ success: true, playlist });
  } catch (err) {
    if (err.message === 'Track already in playlist') {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.message === 'Playlist not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// DELETE /api/playlists/:id/tracks/:trackId
exports.removeTrack = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
      if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
      playlist.tracks = playlist.tracks.filter((t) => t.trackId !== req.params.trackId);
      await playlist.save();
      return res.json({ success: true, playlist });
    }

    const playlist = store.removeTrackFromPlaylist(req.user._id, req.params.id, req.params.trackId);
    res.json({ success: true, playlist });
  } catch (err) {
    if (err.message === 'Playlist not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};
