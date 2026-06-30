const Order = require('../models/Order');
const User = require('../models/User');

const calculateDistance = (lon1, lat1, lon2, lat2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// @desc    Create order (Customer places from a merchant, Admin creates directly)
// @route   POST /api/orders
// @access  Private (Admin & Customer)
exports.createOrder = async (req, res, next) => {
  try {
    let { customerName, deliveryAddress, pickupLocation, deliveryLocation, items, fare, merchantId } = req.body;

    let customerId = null;
    let resolvedMerchantId = merchantId || null;

    if (req.user.role === 'customer') {
      customerName = req.user.name;
      customerId = req.user._id;
      if (pickupLocation?.coordinates?.length === 2 && deliveryLocation?.coordinates?.length === 2) {
        const dist = calculateDistance(
          parseFloat(pickupLocation.coordinates[0]), parseFloat(pickupLocation.coordinates[1]),
          parseFloat(deliveryLocation.coordinates[0]), parseFloat(deliveryLocation.coordinates[1])
        );
        fare = Math.max(50, Math.round(50 + dist * 15));
      } else {
        fare = 120;
      }
    }

    if (req.user.role === 'admin') {
      resolvedMerchantId = req.user._id;
    }

    if (!customerName || !deliveryAddress || !pickupLocation || !deliveryLocation || !items) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items must be a non-empty array' });
    }

    const pickupLng = parseFloat(pickupLocation.coordinates[0]);
    const pickupLat = parseFloat(pickupLocation.coordinates[1]);
    const deliveryLng = parseFloat(deliveryLocation.coordinates[0]);
    const deliveryLat = parseFloat(deliveryLocation.coordinates[1]);

    if (isNaN(pickupLng) || isNaN(pickupLat) || isNaN(deliveryLng) || isNaN(deliveryLat)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const orderPickup = { type: 'Point', coordinates: [pickupLng, pickupLat] };
    const orderDelivery = { type: 'Point', coordinates: [deliveryLng, deliveryLat] };

    // Customer orders start as 'pending' — merchant dispatches manually
    // Admin orders auto-dispatch immediately
    let assignedAgentId = null;
    let orderStatus = 'pending';
    let assignedAtTime = null;
    let nearestAgent = null;

    if (req.user.role === 'admin') {
      nearestAgent = await User.findOne({
        role: 'agent', status: 'online',
        location: { $near: { $geometry: orderPickup, $maxDistance: 5000 } },
      });
      if (nearestAgent) {
        assignedAgentId = nearestAgent._id;
        orderStatus = 'assigned';
        assignedAtTime = new Date();
        nearestAgent.status = 'busy';
        await nearestAgent.save();
      }
    }

    const order = await Order.create({
      customerName, deliveryAddress,
      pickupLocation: orderPickup,
      deliveryLocation: orderDelivery,
      items, fare: parseFloat(fare) || 120, status: orderStatus,
      customer: customerId, merchant: resolvedMerchantId,
      assignedAgent: assignedAgentId, assignedAt: assignedAtTime,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('assignedAgent', 'name email status location')
      .populate('merchant', 'name email');

    const io = req.app.get('socketio');
    if (io) {
      io.emit('order_created', populatedOrder);
      if (nearestAgent) {
        io.emit(`agent_assigned_${nearestAgent._id}`, populatedOrder);
        io.emit('agent_status_updated', { agentId: nearestAgent._id, name: nearestAgent.name, status: 'busy', location: nearestAgent.location });
      }
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders (role-filtered)
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await Order.find({ $or: [{ merchant: req.user._id }, { merchant: null }] })
        .populate('assignedAgent', 'name email status location')
        .populate('merchant', 'name email')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'agent') {
      orders = await Order.find({ assignedAgent: req.user._id })
        .populate('assignedAgent', 'name email status location')
        .sort({ updatedAt: -1 });
    } else if (req.user.role === 'customer') {
      orders = await Order.find({ customer: req.user._id })
        .populate('assignedAgent', 'name email status location')
        .populate('merchant', 'name')
        .sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID (public for tracking)
// @route   GET /api/orders/:id
// @access  Public
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('assignedAgent', 'name email status location')
      .populate('merchant', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Merchant dispatches a pending order to nearest agent
// @route   POST /api/orders/:id/dispatch
// @access  Private (Admin)
exports.dispatchOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ message: `Order is already ${order.status}` });

    const nearestAgent = await User.findOne({
      role: 'agent', status: 'online',
      location: { $near: { $geometry: order.pickupLocation, $maxDistance: 5000 } },
    });

    if (!nearestAgent) {
      return res.status(404).json({ message: 'No online agents found within 5km of pickup' });
    }

    order.assignedAgent = nearestAgent._id;
    order.status = 'assigned';
    order.assignedAt = new Date();
    await order.save();

    nearestAgent.status = 'busy';
    await nearestAgent.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('assignedAgent', 'name email status location')
      .populate('merchant', 'name email');

    const io = req.app.get('socketio');
    if (io) {
      io.emit('order_updated', populatedOrder);
      io.emit(`agent_assigned_${nearestAgent._id}`, populatedOrder);
      io.emit('agent_status_updated', { agentId: nearestAgent._id, name: nearestAgent.name, status: 'busy', location: nearestAgent.location });
    }

    res.json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Agent updates order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Agent)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['picked_up', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Valid status: picked_up, delivered, or cancelled' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (status === 'picked_up' && order.status !== 'assigned') {
      return res.status(400).json({ message: 'Order must be assigned before picked up' });
    }
    if (status === 'delivered' && order.status !== 'picked_up') {
      return res.status(400).json({ message: 'Order must be picked up before delivered' });
    }

    order.status = status;
    if (status === 'delivered') { order.deliveredAt = new Date(); req.user.status = 'online'; await req.user.save(); }
    else if (status === 'cancelled') { req.user.status = 'online'; await req.user.save(); }
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('assignedAgent', 'name email status location');

    const io = req.app.get('socketio');
    if (io) {
      io.emit('order_updated', populatedOrder);
      io.emit(`order_updated_${order._id}`, populatedOrder);
      if (status === 'delivered' || status === 'cancelled') {
        io.emit('agent_status_updated', { agentId: req.user._id, name: req.user.name, status: 'online', location: req.user.location });
      }
    }

    res.json(populatedOrder);
  } catch (error) {
    next(error);
  }
};
