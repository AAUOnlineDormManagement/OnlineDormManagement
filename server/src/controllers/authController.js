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
  const { userId: incomingUserId = '', password: incomingPassword = '' } = req.body || {};
  let userId = (incomingUserId || req.body.userID || req.body.studentId || '')
    .trim()
    .replace(/[\\|]/g, '/');
  const passwordPlain = String(incomingPassword).trim();

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

module.exports = {
  loginUser,
  changePassword,
  updateProfilePicture,
  updateProfile,
  me
};