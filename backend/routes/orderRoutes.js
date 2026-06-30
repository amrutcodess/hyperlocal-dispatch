const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderById, updateOrderStatus, dispatchOrder } = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.post('/', protect, restrictTo('admin', 'customer'), createOrder);
router.get('/', protect, getOrders);
router.get('/:id', getOrderById); // Public for live tracking
router.post('/:id/dispatch', protect, restrictTo('admin'), dispatchOrder);
router.patch('/:id/status', protect, restrictTo('agent'), updateOrderStatus);

module.exports = router;
