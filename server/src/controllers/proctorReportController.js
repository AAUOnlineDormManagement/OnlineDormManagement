const ProctorReport = require('../models/ProctorReport');
const User = require('../models/User');
const { persistFileToDb } = require('../utils/dbStorage');

exports.submitProctorReport = async (req, res) => {
  try {
    const { reportType, title, description, building, room, relatedStudent, priority } = req.body;
    
    if (!reportType || !title || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const proctor = await User.findById(req.user.id);
    if (!proctor || (proctor.role !== 'Proctor' && proctor.role !== 'proctore')) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only proctors can submit reports.' });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const persisted = await persistFileToDb(file.path);
        if (persisted) attachments.push(`/api/uploads/${persisted.filename}`);
      }
    } else if (req.file) {
      const persisted = await persistFileToDb(req.file.path);
      if (persisted) attachments.push(`/api/uploads/${persisted.filename}`);
    }

    const report = await ProctorReport.create({
      proctor: proctor._id,
      campus: proctor.campus || 'Main Campus',
      reportType,
      title,
      description,
      building: building || undefined,
      room: room || undefined,
      relatedStudent: relatedStudent || undefined,
      priority: priority || 'Low',
      attachments
    });

    return res.status(201).json({ success: true, message: 'Report submitted successfully.', report });
  } catch (error) {
    console.error('Error submitting proctor report:', error);
    res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const reports = await ProctorReport.find({ proctor: req.user.id })
      .populate('building', 'name')
      .populate('room', 'roomNumber')
      .populate('relatedStudent', 'fullName studentID')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching my reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
};

exports.getAllProctorReports = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    let query = {};
    if (admin.role === 'CampusAdmin' || admin.role === 'Admin' || admin.role === 'admin') {
      query.campus = admin.campus;
    } else if (admin.role !== 'SuperAdmin' && admin.role !== 'super admin') {
       return res.status(403).json({ success: false, message: 'Unauthorized role to view all reports.' });
    }

    const reports = await ProctorReport.find(query)
      .populate('proctor', 'name email phone campus')
      .populate('building', 'name')
      .populate('room', 'roomNumber')
      .populate('relatedStudent', 'fullName studentID')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching all proctor reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body;

    const report = await ProctorReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const admin = await User.findById(req.user.id);
    const isAdmin = ['CampusAdmin', 'Admin', 'admin'].includes(admin.role);
    const isSuperAdmin = ['SuperAdmin', 'super admin'].includes(admin.role);

    if (isAdmin && report.campus !== admin.campus) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You can only update reports for your campus.' });
    }

    if (!isAdmin && !isSuperAdmin) {
       return res.status(403).json({ success: false, message: 'Unauthorized. Only admins can update reports.' });
    }

    if (status) report.status = status;
    if (adminComment !== undefined) report.adminComment = adminComment;

    if (status === 'Resolved' || status === 'Closed') {
      report.resolvedAt = new Date();
    }

    await report.save();

    return res.status(200).json({ success: true, message: 'Report updated successfully.', report });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ success: false, message: 'Failed to update report.' });
  }
};
