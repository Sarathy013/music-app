const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Playlist name is required'],
      trim: true,
      maxlength: [100, 'Playlist name too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description too long'],
    },
    coverImage: {
      type: String,
      default: null,
    },
    tracks: [
      {
        trackId: { type: String, required: true },       // External provider ID
        title: { type: String, required: true },
        artist: { type: String },
        album: { type: String },
        duration: { type: Number },
        artworkUrl: { type: String },
        streamUrl: { type: String },
        addedAt: { type: Date, default: Date.now },
        position: { type: Number, default: 0 },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);
