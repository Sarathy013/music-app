const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDbConnected } = require('../config/database');
const store = require('../data/store');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'vibestream_jwt_secret_dev_key_2026';
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isDbConnected()) {
      req.user = await User.findById(decoded.id).select('-password');
    } else {
      const user = await store.findUserById(decoded.id);
      if (user) {
        req.user = {
          _id: user._id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
        };
      }
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

module.exports = { protect };
