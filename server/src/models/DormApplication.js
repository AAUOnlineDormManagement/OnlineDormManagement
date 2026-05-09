// src/models/DormApplication.js
const mongoose = require('mongoose');

const dormApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    reason: {
      type: String,
      default: 'Dorm placement request',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    nationalIdFront: {
      type: String,
      required: true,
    },
    nationalIdBack: {
      type: String,
      required: true,
    },
    extractedAddress: {
      type: String,
      default: '',
    },
    isOutsideAddisSheger: {
      type: Boolean,
      default: false,
    },
    /** True when declared Addis/Sheger but sub-city is treated as outskirts (priority auto-assign). */
    isFarAddisOutskirts: {
      type: Boolean,
      default: false,
    },
    /** e.g. outside_addis_ababa | addis_outskirts_far | central_addis_or_review */
    priorityAutoAssignReason: {
      type: String,
      default: '',
    },
    originVerified: {
      type: Boolean,
      default: false,
    },
    originVerificationNote: {
      type: String,
      default: '',
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    isSpecialCase: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: ['NotRequired', 'Pending', 'Paid', 'Verified'],
      default: 'NotRequired',
    },
    paymentVerifiedAt: {
      type: Date,
    },
    paymentQueuedAt: {
      type: Date,
    },
    paymentReceiptPath: {
      type: String,
      default: null,
    },
    addisLetterPath: {
      type: String,
      default: null,
    },
    chapaTxRef: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Waiting', 'Assigned', 'PaymentPending', 'Rejected', 'Under Review', 'Approved'],
      default: 'Pending',
    },
    scheduledReleaseAt: {
      type: Date,
    },
    assignedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DormApplication || mongoose.model('DormApplication', dormApplicationSchema);
