const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Diagnostic request logger
app.use('/api', (req, res, next) => {
  const auth = req.headers.authorization;
  const tokenHint = auth ? (auth.substring(0, 15) + '...') : 'MISSING';
  const logMsg = `📡 [${new Date().toISOString()}] ${req.method} ${req.url} - Auth: ${tokenHint}\n`;
  if (!process.env.VERCEL) {
    try {
      fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), logMsg);
    } catch (e) {}
  }
  console.log(logMsg.trim());
  next();
});

// Serve uploaded files statically from the local uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

connectDB();

app.get('/', (req, res) => {
  res.send('Online Dormitory Management System - Backend Running');
});

const PORT = process.env.PORT || 5000;

// Test route to verify server is working
app.get('/api/test-server', (req, res) => {
  res.json({
    message: 'Server is working!',
    time: new Date(),
    routes: [
      '/api/auth/login',
      '/api/students/dashboard',
      '/api/students/test'
    ]
  });
});

// Routes
console.log('\n=== LOADING ROUTES ===');

// Auth routes (should work since login works)
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✓ Auth routes loaded');
} catch (error) {
  console.log('✗ Auth routes error:', error.message);
}

// Student routes - THIS IS CRITICAL
try {
  console.log('Attempting to load student routes...');
  const studentRoutes = require('./routes/studentRoutes');
  console.log('Student routes module loaded');

  app.use('/api/students', studentRoutes);
  console.log('✓ Student routes registered at /api/students');

  // Add a debug route directly
  app.get('/api/students/debug', (req, res) => {
    res.json({ message: 'Direct debug route works!' });
  });
} catch (error) {
  console.log('✗ ERROR loading student routes:');
  console.log('  Message:', error.message);
  console.log('  Stack:', error.stack);

  // Create simple student routes if loading fails
  console.log('Creating simple student routes as fallback...');
  app.get('/api/students/dashboard', (req, res) => {
    console.log('Fallback dashboard route called');
    res.json({
      success: true,
      message: 'Dashboard from fallback route',
      student: { name: 'Fallback Student', id: 'TEST123' }
    });
  });
}

// Other routes (keep your existing ones)
try {
  app.use('/api/dorm', require('./routes/dormRoutes'));
  console.log('✓ Dorm routes loaded');
} catch (error) {
  console.log('✗ Dorm routes error:', error.message);
}

try {
  app.use('/api/admin', require('./routes/adminRoutes'));
  console.log('✓ Admin routes loaded');
} catch (error) {
  console.log('✗ Admin routes error:', error.message);
}

try {
  app.use('/api/exit-clearance', require('./routes/exitClearanceRoutes'));
  console.log('✓ Exit clearance routes loaded');
} catch (error) {
  console.log('✗ Exit clearance routes error:', error.message);
}

try {
  app.use('/api/complaints', require('./routes/complaintRoutes'));
  console.log('✓ Complaint routes loaded');
} catch (error) {
  console.log('✗ Complaint routes error:', error.message);
}

try {
  app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
  console.log('✓ Maintenance routes loaded');
} catch (error) {
  console.log('✗ Maintenance routes error:', error.message);
}

try {
  app.use('/api/lost-found', require('./routes/lostFoundRoutes'));
  console.log('✓ Lost & Found routes loaded');
} catch (error) {
  console.log('✗ Lost & Found routes error:', error.message);
}

try {
  app.use('/api/events', require('./routes/events'));
  console.log('✓ Events routes loaded');
} catch (error) {
  console.log('✗ Events routes error:', error.message);
}

try {
  app.use('/api/notices', require('./routes/notices'));
  console.log('✓ Notices routes loaded');
} catch (error) {
  console.log('✗ Notices routes error:', error.message);
}

try {
  app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
  console.log('✓ Marketplace routes loaded');
} catch (error) {
  console.log('✗ Marketplace routes error:', error.message);
}

try {
  app.use('/api/orders', require('./routes/orderRoutes'));
  console.log('✓ Order routes loaded');
} catch (error) {
  console.log('✗ Order routes error:', error.message);
}

try {
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  console.log('✓ Notification routes loaded');
} catch (error) {
  console.log('✗ Notification routes error:', error.message);
}

try {
  app.use('/api/proctor', require('./routes/proctorRoutes'));
  console.log('✓ Proctor routes loaded');
} catch (error) {
  console.log('✗ Proctor routes error:', error.message);
}

try {
  app.use('/api/admin-dorm', require('./routes/adminDormRoutes'));
  console.log('✓ Admin Dorm routes loaded');
} catch (error) {
  console.log('✗ Admin Dorm routes error:', error.message);
}

try {
  app.use('/api/role-applications', require('./routes/roleApplicationRoutes'));
  console.log('✓ Role Application routes loaded');
} catch (error) {
  console.log('✗ Role Application routes error:', error.message);
}

try {
  app.use('/api/payment', require('./routes/paymentRoutes'));
  console.log('✓ Payment routes loaded');
} catch (error) {
  console.log('✗ Payment routes error:', error.message);
}

try {
  app.use('/api/users', require('./routes/userRoutes'));
  console.log('✓ User routes loaded');
} catch (error) {
  console.log('✗ User routes error:', error.message);
}

try {
  app.use('/api/operational-reports', require('./routes/reportRoutes'));
  console.log('✓ Operational Reports routes loaded');
} catch (error) {
  console.log('✗ Operational Reports routes error:', error.message);
}

try {
  app.use('/api/application-control', require('./routes/applicationControlRoutes'));
  console.log('✓ Application Control routes loaded');
} catch (error) {
  console.log('✗ Application Control routes error:', error.message);
}


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:', err);
  
  // Log to file for environment without console access
    if (!process.env.VERCEL) {
      try {
        const errorLog = `${new Date().toISOString()} - ${req.method} ${req.url}\n${err.stack}\n\n`;
        fs.appendFileSync(path.join(process.cwd(), 'server_error_log.txt'), errorLog);
      } catch (e) {}
    }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

console.log('=== ROUTES LOADED ===\n');

// Background Worker for Scheduled Notifications & Automated AA Assignment
const Notification = require('./models/Notification');
const DormApplication = require('./models/DormApplication');
const { assignStudentToRoom, findRoomForStudent, getOcrScheduler } = require('./controllers/dormController');

function isSelfSponsoredStudent(studentLike) {
  const raw = String(studentLike?.sponsorship || studentLike?.studentType || '').trim().toLowerCase();
  return raw.includes('self');
}

setInterval(async () => {
  try {
    const now = new Date();
    const pendingNotifs = await Notification.find({
      isSent: false,
      scheduledAt: { $lte: now }
    });

    if (pendingNotifs.length > 0) {
      console.log(`⏰ [${now.toISOString()}] Processing ${pendingNotifs.length} scheduled notifications...`);
      for (const notif of pendingNotifs) {
        notif.isSent = true;
        await notif.save();
        console.log(`✅ Sent scheduled notification "${notif.title}" to user ${notif.user}`);
      }
    }
    // 2. Process Waiting Addis Applications (Automated Assignment)
    const waitingApps = await DormApplication.find({
      status: 'Waiting',
      scheduledReleaseAt: { $lte: now }
    }).populate('student');

    if (waitingApps.length > 0) {
      console.log(`🏠 [${now.toISOString()}] Processing ${waitingApps.length} AA applications for automated assignment...`);
      for (const app of waitingApps) {
        try {
          const student = app.student;
          if (
            isSelfSponsoredStudent(student) &&
            !['Paid', 'Verified'].includes(String(app.paymentStatus || ''))
          ) {
            // Self-sponsored Addis flow: ask for payment only when a bed is actually available.
            const { room } = await findRoomForStudent(student, student.isSpecialNeed);
            if (room) {
              app.status = 'PaymentPending';
              console.log(`⏱️ Wait period over for ${student.fullName}. Bed found, moving to PaymentPending.`);
              if (student?.user) {
                await Notification.create({
                  user: student.user,
                  type: 'DormApplication',
                  title: 'Payment required',
                  message: 'A bed is available for you. Please complete the 1,500 ETB payment to secure your dorm assignment.',
                  data: { applicationId: String(app._id) },
                });
              }
            } else {
              app.status = 'Pending';
              app.scheduledReleaseAt = null;
              console.log(`⏳ Wait period over for ${student.fullName}, but no bed is available yet. Keeping Pending.`);
              if (student?.user) {
                await Notification.create({
                  user: student.user,
                  type: 'DormApplication',
                  title: 'No beds available',
                  message: 'Your waiting period is complete, but there is currently no bed available. We will notify you when one becomes available.',
                  data: { applicationId: String(app._id) },
                });
              }
            }
          } else {
            // Government or already paid Self-Sponsored -> Try assignment
            const success = await assignStudentToRoom(app, student);
            console.log(`✅ Automated Assignment for ${student.fullName}: ${success ? 'SUCCESS' : 'PENDING (No Room)'}`);
            if (student?.user) {
              if (success && app.assignedRoom) {
                await app.populate('assignedRoom');
                await Notification.create({
                  user: student.user,
                  type: 'DormApplication',
                  title: 'Dorm assigned',
                  message: `Your dorm has been assigned automatically after the waiting period. Room: ${app.assignedRoom.roomNumber || app.assignedRoom.name || 'Assigned'}.`,
                  data: {
                    applicationId: String(app._id),
                    roomId: String(app.assignedRoom._id),
                  },
                });
              } else {
                await Notification.create({
                  user: student.user,
                  type: 'DormApplication',
                  title: 'Assignment pending',
                  message: 'Your waiting period is over, but no room is available yet. We will continue assigning when space becomes available.',
                  data: { applicationId: String(app._id) },
                });
              }
            }
          }
          await app.save();
        } catch (assignErr) {
          console.error(`❌ Assignment Error for ${app._id}:`, assignErr.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Background Worker Error:', err.message);
  }
}, 10000); // Check every 10 seconds for precise Addis assignment

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log('\nTest endpoints:');
    console.log('  GET  /');
    console.log('  GET  /api/test-server');
    console.log('  GET  /api/students/debug');
    console.log('  GET  /api/students/dashboard');
    console.log('  POST /api/auth/login (local fix ready)');

    // Pre-warm OCR Workers
    console.log('🚀 Pre-warming OCR Scheduler...');
    getOcrScheduler().catch(err => console.error('❌ OCR Pre-warm error:', err));
  });
}
// End of file (payment integration check)