// Deployment Heartbeat: 2026-04-26 01:14:00
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Avoid importing OCR/Tesseract code during serverless cold starts.
// In Vercel serverless functions, importing tesseract.js can be very heavy and lead to timeouts
// even for unrelated endpoints like /api/auth/login.

// Import models
const Student = require('./src/models/Student');
const User = require('./src/models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = new Set([
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000'
    ]);
    const envFrontend = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (envFrontend) allowedOrigins.add(envFrontend);
    const extraOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    for (const o of extraOrigins) allowedOrigins.add(o);
    
    // Allow requests with no origin (like mobile apps/curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is local or a vercel subdomain
    const normalizedOrigin = String(origin).replace(/\/+$/, '');
    const isLocal = allowedOrigins.has(normalizedOrigin);
    const isVercel = origin.endsWith('.vercel.app');
    
    if (isLocal || isVercel) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logger

// Serve static files from the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
console.log(`📂 Serving static files from: ${uploadsDir}`);
app.use('/uploads', express.static(uploadsDir));

// Vercel /tmp Serving (for temporary uploads if not found in project root)
if (process.env.VERCEL) {
  console.log('🚀 Enabling Vercel /tmp static serving...');
  app.use('/uploads', express.static('/tmp'));
}

// Database Image Serving Fallback (Permanent Storage Fix for Vercel)
// Express 5 path matching rejects '/uploads/*', so use a regex route.
app.get(/^\/uploads\/.*/, async (req, res, next) => {
  try {
    // Extract filename from the end of the path (e.g. /uploads/events/abc/123.jpg -> 123.jpg)
    const filename = path.basename(req.path);
    if (!filename || filename === 'uploads') return next();

    // Fallback: Fetch from Database
    const Upload = require('./src/models/Upload');
    const upload = await Upload.findOne({ filename });
    if (upload) {
      res.set('Content-Type', upload.mimeType || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(upload.data);
    }
    next();
  } catch (e) {
    next();
  }
});

// Serverless database connection caching
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// On Vercel/production, never fall back to localhost — it will always fail and surface as 500s.
// Require an explicit connection string via env vars.
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = (process.env.MONGODB_DB_NAME || 'dormitory_db').trim();

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    const err = new Error('Missing MONGODB_URI/MONGO_URI environment variable');
    err.code = 'MISSING_MONGODB_URI';
    throw err;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      family: 4, // prefer IPv4 to avoid intermittent SRV/DNS issues on some clients
      // Prevent accidental fallback to MongoDB's default "test" database in production.
      dbName: MONGODB_DB_NAME,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB newly connected');
      return mongooseInstance;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

// Immediately attempt a connection on startup (useful for non-serverless dev)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  connectDB().catch(console.error);
}

// Middleware to Ensure DB is connected for every request on Vercel
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('🚨 DB Connection Middleware Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Database connection failed', 
      error: err.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Debug database endpoint
app.get('/api/debug-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    // Prefer MONGODB_URI. Ignore placeholder values like "${MONGODB_URI}".
    const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const uri = rawUri && /^\$\{.+\}$/.test(String(rawUri).trim()) ? '' : rawUri;
    res.json({
      status: 'Diagnostic Info',
      envFound: !!uri,
      uriProvided: uri ? `${uri.substring(0, 15)}...` : 'Not Found',
      targetDbName: MONGODB_DB_NAME,
      readyState: mongoose.connection.readyState, // 0 = disc, 1 = conn, 2 = conn-ing
      dbName: mongoose.connection.name,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-dorm', require('./src/routes/adminDormRoutes'));
app.use('/api/dorm', require('./src/routes/dormRoutes'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/notices', require('./src/routes/notices'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/lost-found', require('./src/routes/lostFoundRoutes'));
app.use('/api/exit-clearance', require('./src/routes/exitClearanceRoutes'));
app.use('/api/complaints', require('./src/routes/complaintRoutes'));
app.use('/api/maintenance', require('./src/routes/maintenanceRoutes'));
app.use('/api/marketplace', require('./src/routes/marketplaceRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/proctor', require('./src/routes/proctorRoutes'));
app.use('/api/payment', require('./src/routes/paymentRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/operational-reports', require('./src/routes/reportRoutes'));
app.use('/api/role-applications', require('./src/routes/roleApplicationRoutes'));
app.use('/api/application-control', require('./src/routes/applicationControlRoutes'));


// Welcome route
app.get('/api', (req, res) => {
  res.json({
    message: 'Dormitory Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      admin: '/api/admin'
    }
  });
});

// Create test user on startup (for development only)
const createTestUser = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Check if test student exists
      const existingStudent = await Student.findOne({ studentID: 'UGR/0001/15' });

      if (!existingStudent) {
        // Create a user first, then a schema-compliant student linked to that user.
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('0001', 12);
        const testUser = new User({
          userID: 'UGR/0001/15',
          name: 'Belaynesh Getachew',
          email: 'belaynesh@university.edu',
          password: hashedPassword,
          role: 'Student',
          isFirstLogin: true
        });
        await testUser.save();

        const testStudent = new Student({
          user: testUser._id,
          studentID: 'UGR/0001/15',
          fullName: 'Belaynesh Getachew',
          year: 3,
          department: 'Computer Science',
          gender: 'Female',
          sponsorship: 'Government'
        });

        await testStudent.save();
        console.log('✅ Test student created and linked:', testStudent.fullName);
      }

      // Check if test user exists
      const existingUser = await User.findOne({ userID: 'UGR/0001/15' });

      if (!existingUser) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('0001', 12);

        const testUser = new User({
          userID: 'UGR/0001/15',
          name: 'Belaynesh Getachew',
          email: 'belaynesh@university.edu',
          password: hashedPassword,
          role: 'Student',
          isFirstLogin: true
        });

        await testUser.save();
        console.log('✅ Test user account created');

        // Link student to user
        const student = await Student.findOne({ studentId: 'UGR/0001/15' });
        if (student) {
          student.user = testUser._id;
          await student.save();
          console.log('✅ Student linked to user account');
        }
      }

      // Create test admin user
      const existingAdmin = await User.findOne({ userID: 'admin001' });

      if (!existingAdmin) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin001', 12);

        const adminUser = new User({
          userID: 'admin001',
          name: 'System Administrator',
          email: 'admin@dorm.com',
          password: hashedPassword,
          role: 'SuperAdmin',
          isFirstLogin: false
        });

        await adminUser.save();
        console.log('✅ Admin user created');
      }

    } catch (error) {
      console.error('❌ Error creating test users:', error);
    }
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// src/server.js - Last Synced: 2026-04-26 01:13:40
// Start server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API available at http://localhost:${PORT}/api`);

    // Create test users after server starts
    await createTestUser();

    // Pre-warm OCR Workers
    console.log('🚀 Pre-warming OCR Scheduler...');
    try {
      const { getOcrScheduler } = require('./src/controllers/dormController');
      getOcrScheduler().catch(err => console.error('❌ OCR Pre-warm error:', err));
    } catch (err) {
      console.error('❌ OCR Pre-warm load error:', err);
    }
  });
}

module.exports = app;