const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trackId: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String },
    album: { type: String },
    duration: { type: Number },
    artworkUrl: { type: String },
    streamUrl: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate favorites
favoriteSchema.index({ user: 1, trackId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
