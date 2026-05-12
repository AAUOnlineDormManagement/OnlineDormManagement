const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSettings,
  updateSettings,
  createSetting,
  deleteSetting
} = require('../controllers/applicationControlController');

const router = express.Router();

router.use(protect);
router.use(authorize('CampusAdmin', 'SuperAdmin'));

router.get('/', getSettings);
router.post('/', createSetting);
router.put('/:id', updateSettings);
router.delete('/:id', deleteSetting);

module.exports = router;
