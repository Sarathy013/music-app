const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { isDbConnected } = require('../config/database');
const store = require('../data/store');

const JWT_SECRET = process.env.JWT_SECRET || 'vibestream_jwt_secret_dev_key_2026';
const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email and password.' });
    }

    if (isDbConnected()) {
      const user = await User.create({ username, email, password });
      const token = signToken(user._id);
      return res.status(201).json({
        success: true,
        token,
        user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture },
      });
    }

    const user = await store.createUser({ username, email, password });
    const token = signToken(user._id);
    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    if (isDbConnected()) {
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = signToken(user._id);
      return res.json({
        success: true,
        token,
        user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture },
      });
    }

    const user = await store.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    return res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/google
exports.googleLogin = async (req, res, next) => {
  try {
    const { email, name, picture, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanGoogleId = googleId || `gid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const cleanName = (name || cleanEmail.split('@')[0] || 'Google User').trim();

    if (isDbConnected()) {
      let user = await User.findOne({
        $or: [{ googleId: cleanGoogleId }, { email: cleanEmail }],
      });

      if (user) {
        let updated = false;
        if (!user.googleId && cleanGoogleId) {
          user.googleId = cleanGoogleId;
          updated = true;
        }
        if (picture && (!user.profilePicture || user.profilePicture !== picture)) {
          user.profilePicture = picture;
          updated = true;
        }
        if (user.authProvider !== 'google') {
          user.authProvider = 'google';
          updated = true;
        }
        if (updated) await user.save();
      } else {
        let baseUsername = cleanName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
        if (baseUsername.length < 3) baseUsername = 'User_' + Math.floor(1000 + Math.random() * 9000);
        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
          username = `${baseUsername}_${counter++}`;
        }

        user = await User.create({
          username,
          email: cleanEmail,
          googleId: cleanGoogleId,
          authProvider: 'google',
          profilePicture: picture || null,
        });
      }

      const token = signToken(user._id);
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
          authProvider: 'google',
        },
      });
    }

    // In-memory fallback
    const user = await store.findOrCreateGoogleUser({
      googleId: cleanGoogleId,
      email: cleanEmail,
      name: cleanName,
      picture: picture || null,
    });

    const token = signToken(user._id);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        authProvider: 'google',
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const user = await User.findById(req.user._id);
      return res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture } });
    }

    const user = await store.findUserById(req.user._id);
    res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { username, profilePicture } = req.body;

    if (isDbConnected()) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { username, profilePicture },
        { new: true, runValidators: true }
      );
      return res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture } });
    }

    const user = await store.updateUser(req.user._id, { username, profilePicture });
    res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (isDbConnected()) {
      const user = await User.findById(req.user._id).select('+password');
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      user.password = newPassword;
      await user.save();
      const token = signToken(user._id);
      return res.json({ success: true, token, message: 'Password updated successfully.' });
    }

    await store.changePassword(req.user._id, currentPassword, newPassword);
    const token = signToken(req.user._id);
    res.json({ success: true, token, message: 'Password updated successfully.' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};
