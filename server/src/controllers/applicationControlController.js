const ApplicationControl = require('../models/ApplicationControl');
const Notification = require('../models/Notification');
const Student = require('../models/Student');

const getSettings = async (req, res) => {
  try {
    let query = {};
    // CampusAdmins can only see their own campus settings
    if (req.user.role === 'CampusAdmin') {
      query = { campus: req.user.campus };
    }
    
    const settings = await ApplicationControl.find(query).sort({ campus: 1 });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpen, waitMinutes, openedAt, closedAt, isFreshmanRule } = req.body;
    
    const setting = await ApplicationControl.findById(id);
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    // Access control: CampusAdmin can only update their own campus
    if (req.user.role === 'CampusAdmin' && setting.campus !== req.user.campus) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only manage your own campus' });
    }
    
    const wasOpen = setting.isOpen;
    setting.isOpen = isOpen !== undefined ? isOpen : setting.isOpen;
    setting.waitMinutes = waitMinutes !== undefined ? waitMinutes : setting.waitMinutes;
    setting.openedAt = openedAt !== undefined ? openedAt : setting.openedAt;
    setting.closedAt = closedAt !== undefined ? closedAt : setting.closedAt;
    setting.isFreshmanRule = isFreshmanRule !== undefined ? isFreshmanRule : setting.isFreshmanRule;
    await setting.save();


    // Notify students if the window was opened
    if (setting.isOpen && !wasOpen) {
      await notifyCampusStudents(setting);
    }
    
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSetting = async (req, res) => {
  try {
    let { campus, locationCategory, sponsorshipType, isOpen, waitMinutes, openedAt, closedAt, isFreshmanRule } = req.body;
    
    // Access control: CampusAdmin can only create for their own campus
    if (req.user.role === 'CampusAdmin') {
      campus = req.user.campus;
    }

    const existing = await ApplicationControl.findOne({ campus, locationCategory, sponsorshipType });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Setting already exists for this combination' });
    }
    
    const setting = await ApplicationControl.create({
      campus,
      locationCategory,
      sponsorshipType,
      isOpen,
      waitMinutes,
      openedAt,
      closedAt,
      isFreshmanRule,
      createdBy: req.user._id
    });


    if (setting.isOpen) {
      await notifyCampusStudents(setting);
    }
    
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await ApplicationControl.findById(id);
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });

    // Access control
    if (req.user.role === 'CampusAdmin' && setting.campus !== req.user.campus) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await ApplicationControl.findByIdAndDelete(id);
    res.json({ success: true, message: 'Setting deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  createSetting,
  deleteSetting,
  notifyCampusStudents
};

async function notifyCampusStudents(setting) {
  try {
    const campus = setting.campus;
    const location = setting.locationCategory;
    const sponsorship = setting.sponsorshipType;

    let query = { isFreshman: { $ne: true } }; // Never notify freshmen
    if (campus !== 'Any') {
      // Since students don't have a 'campus' field directly in the Student model (it's derived from department usually)
      // We might need to find students who mapped to this campus or just notify all if 'Any'.
      // But let's check if we can filter by department.
      // For simplicity and breadth, we'll notify students whose derived campus matches.
    }

    // In this codebase, students are usually notified by user ID.
    // We'll find students matching the criteria.
    const students = await Student.find(query).populate('user');
    
    const notificationPromises = students.map(student => {
      if (!student.user) return null;
      
      return Notification.create({
        user: student.user._id,
        type: 'DormApplication',
        title: 'Application Window Opened',
        message: `The dorm application window for ${campus} campus (${location.toUpperCase()}) is now open!`,
        data: { campus, location }
      });
    }).filter(Boolean);

    await Promise.all(notificationPromises);
    console.log(`Sent notifications to ${notificationPromises.length} students about window opening for ${campus}`);
  } catch (err) {
    console.error('Error sending campus notifications:', err.message);
  }
}
