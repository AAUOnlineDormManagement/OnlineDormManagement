const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  loginUser, changePassword, me, updateProfilePicture, updateProfile,
  registerFace, faceLogin, removeFace
} = require('../controllers/authController');

const upload = require('../middleware/uploadMiddleware');

router.post('/login', loginUser);
// Return current authenticated user info
router.get('/me', protect, me);

// Optional "verify token" endpoint used by client
router.get('/verify', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put('/change-password', protect, changePassword);
router.post('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.put('/profile-update', protect, updateProfile);

// ── Face Recognition ──────────────────────────────────────────────────────────
router.post('/register-face', protect, registerFace);   // Save face descriptor (authenticated)
router.post('/face-login', faceLogin);                  // Face-based login (public)
router.delete('/remove-face', protect, removeFace);     // Remove face data (authenticated)

// Test endpoint to verify server is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Auth route is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;