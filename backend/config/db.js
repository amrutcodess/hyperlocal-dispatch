const mongoose = require('mongoose');

// Cache the connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If already connected, reuse the existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is in progress, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
    };

    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise so the next call retries
    cached.promise = null;
    console.error(`MongoDB connection error: ${error.message}`);
    throw error; // Let the controller return a 500 instead of crashing the process
  }

  return cached.conn;
};

module.exports = connectDB;
