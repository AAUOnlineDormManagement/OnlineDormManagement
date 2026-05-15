const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getDashboard,
  getStudents,
  getProfile,
  getReports,
  getOverview
} = require('../controllers/proctorController');
const {
  submitProctorReport,
  getMyReports
} = require('../controllers/proctorReportController');
const upload = require('../middleware/uploadMiddleware');

// All proctor routes require authentication and Proctor role
router.use(protect);
router.use(authorize('Proctor'));

// Dashboard
router.get('/dashboard', getDashboard);

// Get students in proctor's assigned building
router.get('/students', getStudents);

// Get proctor profile
router.get('/profile', getProfile);

// Reports and Overview
router.get('/overview', getOverview);

// Legacy reports (if any)
router.get('/reports', getReports);

// New Proctor Reports
router.post('/proctor-reports', upload.array('attachments', 5), submitProctorReport);
router.get('/proctor-reports/my', getMyReports);

module.exports = router;

