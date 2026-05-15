// src/routes/adminRoutes.js
const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
  getAllApplications,
  getApplicationById,
  reviewApplication, 
  assignProctorToBuilding 
} = require('../controllers/adminController');
const {
  getOverview,
  listStudents,
  listBuildings,
  listProctors,
  getReportSeries
} = require('../controllers/adminDashboardController');
const {
  getAllProctorReports,
  updateReportStatus
} = require('../controllers/proctorReportController');
const Log = require('../models/Log');  
const router = express.Router();

router.use(protect);
router.use(authorize('Proctor', 'CampusAdmin', 'SuperAdmin'));

router.get('/applications', getAllApplications);
router.get('/applications/:id', getApplicationById);
router.put('/applications/:id/review', reviewApplication);
router.post('/assign-proctor', assignProctorToBuilding);

// Admin dashboard data
router.get('/overview', getOverview);
router.get('/students', listStudents);
router.get('/buildings', listBuildings);
// Proctor management (Admin)
const { 
  getAllProctors,
  createProctor,
  updateProctor,
  deleteProctor
} = require('../controllers/proctorAdminController');

router.get('/proctors', listProctors);
router.post('/proctors', createProctor);
router.put('/proctors/:id', updateProctor);
router.delete('/proctors/:id', deleteProctor);
router.get('/reports', getReportSeries);

// Proctor Reports
router.get('/proctor-reports', getAllProctorReports);
router.put('/proctor-reports/:id/status', updateReportStatus);

// Get action logs (for accountability)
router.get('/logs', async (req, res) => {
  try {
    const logs = await Log.find({})
      .populate('user', 'name userID role campus')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;