// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // If we're already connected, don't re-connect
    if (mongoose.connection.readyState >= 1) return;

    // Prefer MONGODB_URI. Some environments set MONGO_URI to a placeholder like "${MONGODB_URI}"
    // which would break the connection if chosen first.
    const rawMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
    const dbName = (process.env.MONGODB_DB_NAME || 'dormitory_db').trim();
    const uri = rawMongoUri && /^\$\{.+\}$/.test(rawMongoUri.trim()) ? '' : rawMongoUri;
    const source = process.env.MONGODB_URI ? 'MONGODB_URI' : process.env.MONGO_URI ? 'MONGO_URI' : process.env.DATABASE_URL ? 'DATABASE_URL' : 'NONE';
    if (uri) console.log(`🔌 Connecting to MongoDB via ${source}`);
    
    if (!uri) {
      console.error('❌ MongoDB connection string is not defined in environment variables. Checked: MONGODB_URI, MONGO_URI, DATABASE_URL');
      throw new Error('Database connection string is missing');
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      family: 4, // reduce SRV/DNS flakiness on some Windows networks
      dbName,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Error: ${error.message}`);
    // Keep the process alive in dev so transient DNS/TLS outages can recover.
    throw error; // Rethrow so middleware can handle the 500 response
  }
};

module.exports = connectDB;