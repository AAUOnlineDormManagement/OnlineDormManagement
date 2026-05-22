const User = require('../models/User');
const Student = require('../models/Student');
const Proctor = require('../models/Proctor');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** UGR/7887/15 or UGR/7887/15/ → UGR/7887/15 */
function normalizeUgrInput(raw) {
  if (!raw) return null;
  let u = String(raw)
    .trim()
    // normalize common slash variants copied from phones/keyboards
    .replace(/[\\|]/g, '/')
    .replace(/\/+$/g, '')
    .replace(/\s+/g, '');
  const parts = u.split('/').filter((p) => p.length > 0);
  if (parts.length < 3) return null;
  if (parts[0].toUpperCase() !== 'UGR') return null;
  return `UGR/${parts[1]}/${parts[2]}`;
}

function isBcryptHash(value) {
  return /^\$2[abxy]\$\d{2}\$/.test(String(value || ''));
}

// Unified login for Student / Proctor / Admin
const loginUser = async (req, res) => {
  const body = req.body || {};
  let userId = (body.userId || body.userID || body.studentId || '').trim();
  // Normalize any backslash separators to forward slash
  userId = userId.replace(/[\\|]/g, '/');
  
  const passwordPlain = String(body.password ?? '').trim();

  console.log('🔐 Login attempt:', userId);

  if (!userId || !passwordPlain) {
    console.log('❌ Missing credentials in login attempt');
    return res.status(400).json({
      success: false,
      message: 'User ID and password are required'
    });
  }

  console.log(`🔐 Debug Login: Attempting ID="${userId}" with password length=${passwordPlain.length}`);

  try {
    let user = null;

    // 1) Exact match for normalized UGR (fixes trailing slash / spacing issues)
    const normalizedUgr = normalizeUgrInput(userId);
    if (normalizedUgr) {
      user = await User.findOne({ userID: normalizedUgr });
    }

    // 2) Exact userID as typed (case-sensitive stored value)
    if (!user) {
      user = await User.findOne({ userID: userId });
    }

    // 3) Case-insensitive userID / email (regex must escape special chars)
    if (!user) {
      const escaped = escapeRegex(userId);
      user = await User.findOne({
        $or: [
          { userID: { $regex: new RegExp('^' + escaped + '$', 'i') } },
          { email: { $regex: new RegExp('^' + escaped + '$', 'i') } },
        ],
      });
    }

    // 4) Fallback: if login id matches a userID in User table
    if (!user && normalizedUgr) {
      user = await User.findOne({ userID: normalizedUgr });
    }

    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    let isPasswordValid = false;
    if (isBcryptHash(user.password)) {
      isPasswordValid = await bcrypt.compare(passwordPlain, user.password);
    } else {
      // Legacy data compatibility: allow plain-text stored passwords once,
      // then upgrade them to bcrypt immediately on successful login.
      isPasswordValid = String(passwordPlain) === String(user.password || '').trim();
      if (isPasswordValid) {
        user.password = String(passwordPlain).trim();
        await user.save();
      }
    }
    console.log(`🔍 Password check for ${user.userID}: ${isPasswordValid ? 'MATCH' : 'FAIL'}`);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', userId);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        userID: user.userID,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'dormproject2026secret',
      { expiresIn: '30d' }
    );

    let student = null;
    let proctor = null;

    if (['Student', 'EventPoster', 'Vendor'].includes(user.role)) {
      student = await Student.findOne({ user: user._id }).select('-__v');
    } else if (user.role === 'Proctor') {
      proctor = await Proctor.findOne({ user: user._id }).populate('assignedBuilding').select('-__v');
    }

    console.log('✅ Login successful:', user.userID, 'Role:', user.role);

    // Log login attempt to file for inspection
    if (!process.env.VERCEL) {
      try {
        const fs = require('fs');
        const path = require('path');
        const logMsg = `${new Date().toISOString()} - Login: ${user.userID} - Match: ${isPasswordValid}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'login_debug_log.txt'), logMsg);
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      role: user.role,
      userID: user.userID,
      userId: user.userID,
      name: user.name,
      isFirstLogin: user.isFirstLogin,
      user: {
        id: user._id,
        userID: user.userID,
        userId: user.userID,
        name: user.name,
        email: user.email,
        role: user.role,
        campus: user.campus,
        isFirstLogin: user.isFirstLogin,
        assignedBuilding: user.assignedBuilding || (proctor ? proctor.assignedBuilding : null)
      },
      ...(student ? { student } : {}),
      ...(proctor ? { proctor } : {})
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: err.message || err.toString()
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let student = null;
    if (['Student', 'EventPoster', 'Vendor'].includes(user.role)) {
      student = await Student.findOne({ user: user._id }).select('-__v');
    }

    return res.json({
      success: true,
      user,
      ...(student ? { student } : {})
    });
  } catch (err) {
    console.error('❌ /auth/me error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await bcrypt.compare(String(oldPassword).trim(), user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    // Plain text — User pre-save hook hashes once
    user.password = String(newPassword).trim();
    user.isFirstLogin = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update profile picture
const updateProfile = async (req, res) => {
  const { name, campus, email, userID } = req.body;
  const userId = req.user._id || req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nextUserId = typeof userID === 'string' ? userID.trim() : '';
    const nextName = typeof name === 'string' ? name.trim() : '';
    const nextCampus = typeof campus === 'string' ? campus.trim() : '';
    const nextEmail = typeof email === 'string' ? email.trim() : '';

    if (nextUserId && nextUserId !== user.userID) {
      const existing = await User.findOne({ userID: nextUserId });
      if (existing) {
        return res.status(400).json({ success: false, message: 'User ID already in use' });
      }
      user.userID = nextUserId;
    }

    if (nextName) user.name = nextName;
    if (nextCampus) user.campus = nextCampus;
    if (nextEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nextEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      user.email = nextEmail;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        userID: user.userID,
        name: user.name,
        campus: user.campus,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old picture if exists
    if (user.profilePicture) {
      const fs = require('fs');
      const path = require('path');
      const oldPath = path.join(process.cwd(), user.profilePicture);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.error('Error deleting old profile pic:', e);
        }
      }
    }

    // Modern path format for static serving
    const filePath = `uploads/profiles/${req.file.filename}`;
    user.profilePicture = filePath;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture updated',
      profilePicture: filePath
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Face Recognition ────────────────────────────────────────────────────────

/**
 * Euclidean distance between two 128-float descriptor arrays.
 */
function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * POST /auth/register-face  (protected)
 * Body: { descriptor: number[] }  — 128-element float array from face-api.js
 */
const registerFace = async (req, res) => {
  try {
    const { descriptor } = req.body;

    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor. Expected a 128-element float array.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.faceDescriptor = descriptor;
    user.faceRegisteredAt = new Date();
    await user.save();

    console.log(`✅ Face registered for user: ${user.userID}`);
    return res.json({
      success: true,
      message: 'Face registered successfully',
      registeredAt: user.faceRegisteredAt
    });
  } catch (err) {
    console.error('❌ registerFace error:', err);
    return res.status(500).json({ success: false, message: 'Server error during face registration' });
  }
};

/**
 * POST /auth/face-login  (public)
 * Body: { descriptor: number[], userId?: string }
 * If userId is provided, performs a 1-to-1 match for that user.
 * If user has no faceDescriptor but has a profilePicture, registers the descriptor and logs them in.
 * If userId is not provided, performs a 1-to-many match among all registered faces.
 */
const faceLogin = async (req, res) => {
  try {
    const { descriptor, userId } = req.body;

    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor. Expected a 128-element float array.'
      });
    }

    let bestMatch = null;
    let bestDistance = Infinity;
    const THRESHOLD = 0.6;

    if (userId && String(userId).trim()) {
      const trimmedUserId = String(userId).trim();
      // Find the user by ID
      let targetUser = await User.findOne({ userID: trimmedUserId });
      if (!targetUser) {
        const normalizedUgr = normalizeUgrInput(trimmedUserId);
        if (normalizedUgr) {
          targetUser = await User.findOne({ userID: normalizedUgr });
        }
      }
      if (!targetUser) {
        const escaped = escapeRegex(trimmedUserId);
        targetUser = await User.findOne({
          $or: [
            { userID: { $regex: new RegExp('^' + escaped + '$', 'i') } },
            { email: { $regex: new RegExp('^' + escaped + '$', 'i') } }
          ]
        });
      }

      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (targetUser.faceDescriptor && targetUser.faceDescriptor.length === 128) {
        const dist = euclideanDistance(descriptor, targetUser.faceDescriptor);
        console.log(`🔍 Face login 1-to-1 match — distance: ${dist.toFixed(4)}, threshold: ${THRESHOLD}`);
        if (dist > THRESHOLD) {
          return res.status(401).json({
            success: false,
            message: 'Face not recognized. Please try again or use your password.'
          });
        }
        bestMatch = targetUser;
        bestDistance = dist;
      } else if (targetUser.profilePicture) {
        // Auto-register descriptor matching the client-side profile picture validation
        targetUser.faceDescriptor = descriptor;
        targetUser.faceRegisteredAt = new Date();
        await targetUser.save();
        bestMatch = targetUser;
        bestDistance = 0.0;
        console.log(`✅ Face descriptor registered automatically from profile picture for: ${targetUser.userID}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'No face biometrics or profile picture registered for this account.'
        });
      }
    } else {
      // General 1-to-many match
      const users = await User.find(
        { faceDescriptor: { $exists: true, $ne: null, $not: { $size: 0 } } }
      ).select('userID name email role campus isFirstLogin assignedBuilding faceDescriptor');

      if (!users.length) {
        return res.status(401).json({
          success: false,
          message: 'No faces are registered in the system yet.'
        });
      }

      for (const u of users) {
        const dist = euclideanDistance(descriptor, u.faceDescriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = u;
        }
      }

      console.log(`🔍 Face login — best distance: ${bestDistance.toFixed(4)}, threshold: ${THRESHOLD}`);

      if (!bestMatch || bestDistance > THRESHOLD) {
        return res.status(401).json({
          success: false,
          message: 'Face not recognized. Please try again or use your password.'
        });
      }
    }

    // Issue JWT — same payload as password login
    const token = jwt.sign(
      {
        id: bestMatch._id.toString(),
        userID: bestMatch.userID,
        role: bestMatch.role,
        name: bestMatch.name
      },
      process.env.JWT_SECRET || 'dormproject2026secret',
      { expiresIn: '30d' }
    );

    // Fetch related student/proctor data
    let student = null;
    let proctor = null;
    if (['Student', 'EventPoster', 'Vendor'].includes(bestMatch.role)) {
      student = await Student.findOne({ user: bestMatch._id }).select('-__v');
    } else if (bestMatch.role === 'Proctor') {
      proctor = await Proctor.findOne({ user: bestMatch._id }).populate('assignedBuilding').select('-__v');
    }

    console.log(`✅ Face login success: ${bestMatch.userID} (distance: ${bestDistance.toFixed(4)})`);

    return res.json({
      success: true,
      message: 'Face login successful',
      token,
      role: bestMatch.role,
      userID: bestMatch.userID,
      userId: bestMatch.userID,
      name: bestMatch.name,
      isFirstLogin: bestMatch.isFirstLogin,
      user: {
        id: bestMatch._id,
        userID: bestMatch.userID,
        userId: bestMatch.userID,
        name: bestMatch.name,
        email: bestMatch.email,
        role: bestMatch.role,
        campus: bestMatch.campus,
        isFirstLogin: bestMatch.isFirstLogin,
        assignedBuilding: bestMatch.assignedBuilding || (proctor ? proctor.assignedBuilding : null)
      },
      ...(student ? { student } : {}),
      ...(proctor ? { proctor } : {})
    });
  } catch (err) {
    console.error('❌ faceLogin error:', err);
    return res.status(500).json({ success: false, message: 'Server error during face login' });
  }
};

/**
 * DELETE /auth/remove-face  (protected)
 * Clears the stored face descriptor for the authenticated user.
 */
const removeFace = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.faceDescriptor = null;
    user.faceRegisteredAt = null;
    await user.save();

    console.log(`🗑️  Face removed for user: ${user.userID}`);
    return res.json({ success: true, message: 'Face data removed successfully' });
  } catch (err) {
    console.error('❌ removeFace error:', err);
    return res.status(500).json({ success: false, message: 'Server error during face removal' });
  }
};

/**
 * GET /auth/profile-picture/:userId
 * Public endpoint to fetch profile picture and biometric status of a user by their UGR/userID.
 */
const getProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    let user = await User.findOne({ userID: userId.trim() });
    if (!user) {
      const normalizedUgr = normalizeUgrInput(userId);
      if (normalizedUgr) {
        user = await User.findOne({ userID: normalizedUgr });
      }
    }
    if (!user) {
      const escaped = escapeRegex(userId);
      user = await User.findOne({
        $or: [
          { userID: { $regex: new RegExp('^' + escaped + '$', 'i') } },
          { email: { $regex: new RegExp('^' + escaped + '$', 'i') } }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      userID: user.userID,
      profilePicture: user.profilePicture,
      faceRegistered: !!(user.faceDescriptor && user.faceDescriptor.length === 128)
    });
  } catch (err) {
    console.error('❌ getProfilePicture error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching profile picture' });
  }
};

module.exports = {
  loginUser,
  changePassword,
  updateProfilePicture,
  updateProfile,
  me,
  registerFace,
  faceLogin,
  removeFace,
  getProfilePicture
};