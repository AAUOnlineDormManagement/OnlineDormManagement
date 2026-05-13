// src/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentID: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  year: { type: Number, required: true },
  department: { type: String, required: false, default: 'Undecided' },
  isFreshman: { type: Boolean, default: false },

  sponsorship: {
    type: String,
    enum: ['Government', 'Self-Sponsored'],
    required: true,
    default: 'Government'
  },
  paymentReceipt: {  // For self-sponsored students
    type: String,    // Path to uploaded receipt (null if government)
    default: null
  },
  isApprovedEventPoster: { type: Boolean, default: false },
  eventPosterID: { type: String, default: null },
  isStaffRelated: { type: Boolean, default: false },
  isSpecialNeed: { type: Boolean, default: false }
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);