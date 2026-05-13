// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true
  },
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Student', 'Proctor', 'CampusAdmin', 'SuperAdmin', 'EventPoster', 'Vendor', 'Admin', 'admin', 'proctore', 'super admin'],
    default: 'Student'
  },
  gender: { type: String, enum: ['Male', 'Female'] },
  assignedBuilding: { type: mongoose.Schema.Types.ObjectId, ref: 'DormBuilding' },
  campus: { type: String, default: 'Main Campus' },
  phone: { type: String },
  profilePicture: { type: String },
  isFirstLogin: { type: Boolean, default: true }
});

// Hash plain-text passwords only (avoids double-hashing if value is already a bcrypt hash)
userSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    const pwd = String(this.password);
    if (/^\$2[ab]\$\d{2}\$/.test(pwd)) {
      return;
    }
    this.password = await bcrypt.hash(pwd, 12);
  }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);