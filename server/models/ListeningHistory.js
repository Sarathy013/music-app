const mongoose = require('mongoose');

const listeningHistorySchema = new mongoose.Schema(
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
    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fast lookup by user sorted by playedAt
listeningHistorySchema.index({ user: 1, playedAt: -1 });

module.exports = mongoose.model('ListeningHistory', listeningHistorySchema);
