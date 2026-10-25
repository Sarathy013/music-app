const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname);
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultData = {
  users: [],
  favorites: [],
  history: [],
  playlists: [],
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local db:', err.message);
    return defaultData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local db:', err.message);
  }
}

const store = {
  // ─── Users ─────────────────────────────────────────────────────────
  async createUser({ username, email, password }) {
    const db = readDB();
    const existing = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
    );
    if (existing) {
      const err = new Error(existing.email.toLowerCase() === email.toLowerCase() ? 'Email already registered' : 'Username already taken');
      err.status = 400;
      throw err;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      profilePicture: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeDB(db);
    return user;
  },

  async findUserByEmail(email) {
    const db = readDB();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    const db = readDB();
    return db.users.find((u) => u._id === id) || null;
  },

  async updateUser(id, updates) {
    const db = readDB();
    const user = db.users.find((u) => u._id === id);
    if (!user) throw new Error('User not found');
    if (updates.username) user.username = updates.username;
    if (updates.profilePicture !== undefined) user.profilePicture = updates.profilePicture;
    user.updatedAt = new Date().toISOString();
    writeDB(db);
    return user;
  },

  async changePassword(id, currentPassword, newPassword) {
    const db = readDB();
    const user = db.users.find((u) => u._id === id);
    if (!user) throw new Error('User not found');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const err = new Error('Current password is incorrect.');
      err.status = 401;
      throw err;
    }
    user.password = await bcrypt.hash(newPassword, 12);
    user.updatedAt = new Date().toISOString();
    writeDB(db);
    return user;
  },

  // ─── Favorites ─────────────────────────────────────────────────────
  getFavorites(userId) {
    const db = readDB();
    return db.favorites.filter((f) => f.user === userId).reverse();
  },

  addFavorite(userId, track) {
    const db = readDB();
    const exists = db.favorites.find((f) => f.user === userId && String(f.trackId) === String(track.trackId));
    if (exists) return exists;
    const favorite = {
      _id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      user: userId,
      trackId: String(track.trackId),
      title: track.title,
      artist: track.artist,
      album: track.album || null,
      duration: track.duration || 0,
      artworkUrl: track.artworkUrl || null,
      streamUrl: track.streamUrl || null,
      createdAt: new Date().toISOString(),
    };
    db.favorites.push(favorite);
    writeDB(db);
    return favorite;
  },

  removeFavorite(userId, trackId) {
    const db = readDB();
    const idx = db.favorites.findIndex((f) => f.user === userId && String(f.trackId) === String(trackId));
    if (idx === -1) return false;
    db.favorites.splice(idx, 1);
    writeDB(db);
    return true;
  },

  checkFavorite(userId, trackId) {
    const db = readDB();
    return db.favorites.some((f) => f.user === userId && String(f.trackId) === String(trackId));
  },

  // ─── Listening History ─────────────────────────────────────────────
  getHistory(userId, limit = 50) {
    const db = readDB();
    return db.history.filter((h) => h.user === userId).reverse().slice(0, limit);
  },

  addToHistory(userId, track) {
    const db = readDB();
    const trackId = String(track.trackId || track.id);
    // Remove previous entry of the same track to prevent repeated songs in history
    db.history = db.history.filter(
      (h) => !(h.user === userId && (String(h.trackId) === trackId || (h.title?.toLowerCase() === track.title?.toLowerCase() && h.artist?.toLowerCase() === track.artist?.toLowerCase())))
    );
    const entry = {
      _id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      user: userId,
      trackId,
      title: track.title,
      artist: track.artist,
      album: track.album || null,
      duration: track.duration || 0,
      artworkUrl: track.artworkUrl || null,
      streamUrl: track.streamUrl || null,
      playedAt: new Date().toISOString(),
    };
    db.history.push(entry);
    writeDB(db);
    return entry;
  },

  clearHistory(userId) {
    const db = readDB();
    db.history = db.history.filter((h) => h.user !== userId);
    writeDB(db);
  },

  // ─── Playlists ─────────────────────────────────────────────────────
  getPlaylists(userId) {
    const db = readDB();
    return db.playlists.filter((p) => p.user === userId).reverse();
  },

  createPlaylist(userId, { name, description = '', isPublic = false }) {
    const db = readDB();
    const playlist = {
      _id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      user: userId,
      name,
      description,
      isPublic,
      coverImage: null,
      tracks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.playlists.push(playlist);
    writeDB(db);
    return playlist;
  },

  getPlaylist(userId, playlistId) {
    const db = readDB();
    return db.playlists.find((p) => p._id === playlistId && p.user === userId) || null;
  },

  updatePlaylist(userId, playlistId, updates) {
    const db = readDB();
    const pl = db.playlists.find((p) => p._id === playlistId && p.user === userId);
    if (!pl) return null;
    if (updates.name) pl.name = updates.name;
    if (updates.description !== undefined) pl.description = updates.description;
    if (updates.isPublic !== undefined) pl.isPublic = updates.isPublic;
    if (updates.coverImage !== undefined) pl.coverImage = updates.coverImage;
    pl.updatedAt = new Date().toISOString();
    writeDB(db);
    return pl;
  },

  deletePlaylist(userId, playlistId) {
    const db = readDB();
    const idx = db.playlists.findIndex((p) => p._id === playlistId && p.user === userId);
    if (idx === -1) return false;
    db.playlists.splice(idx, 1);
    writeDB(db);
    return true;
  },

  addTrackToPlaylist(userId, playlistId, track) {
    const db = readDB();
    const pl = db.playlists.find((p) => p._id === playlistId && p.user === userId);
    if (!pl) throw new Error('Playlist not found');
    const trackId = String(track.trackId || track.id);
    const exists = pl.tracks.find(
      (t) => String(t.trackId) === trackId || (t.title?.toLowerCase() === track.title?.toLowerCase() && t.artist?.toLowerCase() === track.artist?.toLowerCase())
    );
    if (exists) throw new Error('Track already in playlist');
    pl.tracks.push({
      trackId,
      title: track.title,
      artist: track.artist,
      album: track.album || null,
      duration: track.duration || 0,
      artworkUrl: track.artworkUrl || null,
      streamUrl: track.streamUrl || null,
      position: pl.tracks.length,
    });
    pl.updatedAt = new Date().toISOString();
    writeDB(db);
    return pl;
  },

  removeTrackFromPlaylist(userId, playlistId, trackId) {
    const db = readDB();
    const pl = db.playlists.find((p) => p._id === playlistId && p.user === userId);
    if (!pl) throw new Error('Playlist not found');
    pl.tracks = pl.tracks.filter((t) => String(t.trackId) !== String(trackId));
    pl.updatedAt = new Date().toISOString();
    writeDB(db);
    return pl;
  },
};

module.exports = store;
