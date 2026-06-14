const express = require('express');
const router = express.Router();
const { updateLocation, updateStatus, getNearbyAgents } = require('../controllers/agentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.patch('/location', protect, restrictTo('agent'), updateLocation);
router.patch('/status', protect, restrictTo('agent'), updateStatus);
router.get('/nearby', protect, restrictTo('admin'), getNearbyAgents);

module.exports = router;
