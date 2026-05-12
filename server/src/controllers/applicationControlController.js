const ApplicationControl = require('../models/ApplicationControl');

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
    const { isOpen, waitMinutes } = req.body;
    
    const setting = await ApplicationControl.findById(id);
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    // Access control: CampusAdmin can only update their own campus
    if (req.user.role === 'CampusAdmin' && setting.campus !== req.user.campus) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only manage your own campus' });
    }
    
    setting.isOpen = isOpen !== undefined ? isOpen : setting.isOpen;
    setting.waitMinutes = waitMinutes !== undefined ? waitMinutes : setting.waitMinutes;
    await setting.save();
    
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSetting = async (req, res) => {
  try {
    let { campus, locationCategory, sponsorshipType, isOpen, waitMinutes } = req.body;
    
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
      createdBy: req.user._id
    });
    
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
  deleteSetting
};
