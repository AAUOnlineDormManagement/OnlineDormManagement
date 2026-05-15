const mongoose = require('mongoose');

const applicationControlSchema = new mongoose.Schema(
  {
    campus: { 
      type: String, 
      required: true, 
      trim: true,
      default: 'Any' 
    },
    locationCategory: { 
      type: String, 
      enum: ['addis', 'shager', 'other', 'all'], 
      required: true,
      default: 'all'
    },
    sponsorshipType: { 
      type: String, 
      enum: ['Government', 'Self-Sponsored', 'Both'], 
      required: true,
      default: 'Both'
    },
    isFreshmanRule: {
      type: Boolean,
      default: false
    },
    isOpen: { 

      type: Boolean, 
      default: true 
    },
    openedAt: {
      type: Date
    },
    closedAt: {
      type: Date
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }
  },
  { timestamps: true }
);

// Index for fast lookup in submitApplication
applicationControlSchema.index({ campus: 1, locationCategory: 1, sponsorshipType: 1 });

module.exports =
  mongoose.models.ApplicationControl ||
  mongoose.model('ApplicationControl', applicationControlSchema);
