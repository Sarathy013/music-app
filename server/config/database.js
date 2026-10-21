const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.log(`⚠️ MongoDB connection unavailable (${error.message}).`);
    console.log(`🚀 FreeBeat running in Persistent Local Data Store mode (server/data/db.json).`);
  }
};

module.exports = {
  connectDB,
  isDbConnected: () => isConnected,
};
