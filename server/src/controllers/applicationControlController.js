const ApplicationControl = require('../models/ApplicationControl');

const getSettings = async (req, res) => {
  try {
    const settings = await ApplicationControl.find().sort({ campus: 1 });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpen, waitMinutes } = req.body;
    
    const setting = await ApplicationControl.findByIdAndUpdate(
      id,
      { isOpen, waitMinutes },
      { new: true }
    );
    
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSetting = async (req, res) => {
  try {
    const { campus, locationCategory, sponsorshipType, isOpen, waitMinutes } = req.body;
    
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
