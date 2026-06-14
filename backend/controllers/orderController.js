const Order = require('../models/Order');
const User = require('../models/User');

// Helper to calculate distance in km using Haversine formula
const calculateDistance = (lon1, lat1, lon2, lat2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// @desc    Create a new order (Admin or Customer) & auto-assign nearest online agent
// @route   POST /api/orders
// @access  Private (Admin & Customer)
exports.createOrder = async (req, res, next) => {
  try {
    let { customerName, deliveryAddress, pickupLocation, deliveryLocation, items, fare } = req.body;

    let customerId = null;
    if (req.user.role === 'customer') {
      customerName = req.user.name;
      customerId = req.user._id;

      // Auto-calculate fare based on distance (Rs 50 base + Rs 15 per km)
      if (
        pickupLocation && pickupLocation.coordinates && pickupLocation.coordinates.length === 2 &&
        deliveryLocation && deliveryLocation.coordinates && deliveryLocation.coordinates.length === 2
      ) {
        const dist = calculateDistance(
          parseFloat(pickupLocation.coordinates[0]), parseFloat(pickupLocation.coordinates[1]),
          parseFloat(deliveryLocation.coordinates[0]), parseFloat(deliveryLocation.coordinates[1])
        );
        fare = Math.max(50, Math.round(50 + dist * 15));
      } else {
        fare = 120; // Default fallback fare
      }
    }

    // Basic Validation
    if (!customerName || !deliveryAddress || !pickupLocation || !deliveryLocation || !items || fare === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items must be a non-empty array' });
    }

    if (
      !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2 ||
      !deliveryLocation.coordinates || deliveryLocation.coordinates.length !== 2
    ) {
      return res.status(400).json({ message: 'Pickup and delivery locations must have coordinates [lng, lat]' });
    }

    const pickupLng = parseFloat(pickupLocation.coordinates[0]);
    const pickupLat = parseFloat(pickupLocation.coordinates[1]);
    const deliveryLng = parseFloat(deliveryLocation.coordinates[0]);
    const deliveryLat = parseFloat(deliveryLocation.coordinates[1]);

    if (
      isNaN(pickupLng) || isNaN(pickupLat) || isNaN(deliveryLng) || isNaN(deliveryLat) ||
      pickupLng < -180 || pickupLng > 180 || pickupLat < -90 || pickupLat > 90 ||
      deliveryLng < -180 || deliveryLng > 180 || deliveryLat < -90 || deliveryLat > 90
    ) {
      return res.status(400).json({ message: 'Invalid pickup or delivery coordinates' });
    }

    // Prepare GeoJSON locations
    const orderPickup = { type: 'Point', coordinates: [pickupLng, pickupLat] };
    const orderDelivery = { type: 'Point', coordinates: [deliveryLng, deliveryLat] };

    // --- Automatic Dispatch Algorithm ---
    const nearestAgent = await User.findOne({
      role: 'agent',
      status: 'online',
      location: {
        $near: {
          $geometry: orderPickup,
          $maxDistance: 5000, // 5km
        },
      },
    });

    let assignedAgentId = null;
    let orderStatus = 'pending';
    let assignedAtTime = null;

    if (nearestAgent) {
      assignedAgentId = nearestAgent._id;
      orderStatus = 'assigned';
      assignedAtTime = new Date();

      // Update agent status to busy
      nearestAgent.status = 'busy';
      await nearestAgent.save();
    }

    // Create the order
    const order = await Order.create({
      customerName,
      deliveryAddress,
      pickupLocation: orderPickup,
      deliveryLocation: orderDelivery,
      items,
      fare: parseFloat(fare),
      status: orderStatus,
      customer: customerId,
      assignedAgent: assignedAgentId,
      assignedAt: assignedAtTime,
    });

    // Populate the assigned agent's info
    const populatedOrder = await Order.findById(order._id).populate('assignedAgent', 'name email status location');

    // Broadcast update via WebSockets
    const io = req.app.get('socketio');
    if (io) {
      io.emit('order_created', populatedOrder);

      if (nearestAgent) {
        io.emit(`agent_assigned_${nearestAgent._id}`, populatedOrder);
        io.emit('agent_status_updated', {
          agentId: nearestAgent._id,
          name: nearestAgent.name,
          status: 'busy',
          location: nearestAgent.location,
        });
      }
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders based on role
// @route   GET /api/orders
// @access  Private (Admin, Agent, Customer)
exports.getOrders = async (req, res, next) => {
  try {
    let orders;

    if (req.user.role === 'admin') {
      orders = await Order.find({}).populate('assignedAgent', 'name email status location').sort({ createdAt: -1 });
    } else if (req.user.role === 'agent') {
      orders = await Order.find({ assignedAgent: req.user._id }).populate('assignedAgent', 'name email status location').sort({ updatedAt: -1 });
    } else if (req.user.role === 'customer') {
      orders = await Order.find({ customer: req.user._id }).populate('assignedAgent', 'name email status location').sort({ createdAt: -1 });
    }

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get details for a specific order (For tracking - Public or Auth)
// @route   GET /api/orders/:id
// @access  Public
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('assignedAgent', 'name email status location');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
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
      return res.status(400).json({ message: 'Please provide valid status: picked_up, delivered, or cancelled' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure only the assigned agent can update the order status
    if (order.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this order' });
    }

    // Validate state transitions
    if (status === 'picked_up' && order.status !== 'assigned') {
      return res.status(400).json({ message: 'Order must be assigned before being picked up' });
    }
    if (status === 'delivered' && order.status !== 'picked_up') {
      return res.status(400).json({ message: 'Order must be picked up before being marked delivered' });
    }

    order.status = status;

    if (status === 'delivered') {
      order.deliveredAt = new Date();

      // Release agent: make them online again
      req.user.status = 'online';
      await req.user.save();
    } else if (status === 'cancelled') {
      // If order is cancelled, make the agent online again
      req.user.status = 'online';
      await req.user.save();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('assignedAgent', 'name email status location');

    // Broadcast update via WebSockets
    const io = req.app.get('socketio');
    if (io) {
      io.emit('order_updated', populatedOrder);
      io.emit(`order_updated_${order._id}`, populatedOrder);

      // Broadcast agent status release
      if (status === 'delivered' || status === 'cancelled') {
        io.emit('agent_status_updated', {
          agentId: req.user._id,
          name: req.user.name,
          status: 'online',
          location: req.user.location,
        });
      }
    }

    res.json(populatedOrder);
  } catch (error) {
    next(error);
  }
};
