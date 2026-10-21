const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { isDbConnected } = require('../config/database');
const store = require('../data/store');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

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
