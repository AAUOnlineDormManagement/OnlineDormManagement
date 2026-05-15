const mongoose = require('mongoose');

const ProctorReportSchema = new mongoose.Schema({
  proctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  campus: { 
    type: String, 
    required: true 
  },
  reportType: { 
    type: String, 
    enum: [
      'Maintenance Report', 
      'Student Incident Report', 
      'Complaint Summary Report', 
      'Daily Shift Report', 
      'Lost & Found Report', 
      'General Observation / Suggestion'
    ],
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  building: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DormBuilding' 
  },
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room' 
  },
  relatedStudent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student' 
  },
  attachments: [{ 
    type: String 
  }],
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Low' 
  },
  status: { 
    type: String, 
    enum: ['Submitted', 'InProgress', 'Resolved', 'Closed'], 
    default: 'Submitted' 
  },
  adminComment: { 
    type: String 
  },
  resolvedAt: { 
    type: Date 
  }
}, { timestamps: true });

module.exports = mongoose.models.ProctorReport || mongoose.model('ProctorReport', ProctorReportSchema);
