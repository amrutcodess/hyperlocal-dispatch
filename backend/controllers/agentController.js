const User = require('../models/User');

// @desc    Update agent location
// @route   PATCH /api/agents/location
// @access  Private (Agent)
exports.updateLocation = async (req, res, next) => {
  try {
    const { longitude, latitude } = req.body;

    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({ message: 'Please provide longitude and latitude' });
    }

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({ message: 'Invalid coordinates. Longitude must be -180 to 180, Latitude -90 to 90.' });
    }

    req.user.location = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    await req.user.save();

    // Broadcast location update via WebSockets
    const io = req.app.get('socketio');
    if (io) {
      io.emit('agent_location_updated', {
        agentId: req.user._id,
        name: req.user.name,
        location: req.user.location,
        status: req.user.status,
      });
    }

    res.json({
      message: 'Location updated successfully',
      location: req.user.location,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update agent status
// @route   PATCH /api/agents/status
// @access  Private (Agent)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['online', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Please provide status: online or offline' });
    }

    // If agent is currently busy (on delivery), they shouldn't easily toggle to offline,
    // but let's allow it or warn. If they are busy, they remain busy until delivery completes,
    // or if they force offline, they can. Let's update status.
    req.user.status = status;
    await req.user.save();

    // Broadcast status update via WebSockets
    const io = req.app.get('socketio');
    if (io) {
      io.emit('agent_status_updated', {
        agentId: req.user._id,
        name: req.user.name,
        status: req.user.status,
        location: req.user.location,
      });
    }

    res.json({
      message: `Status updated to ${status}`,
      status: req.user.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby online agents (for Admin map/dispatch)
// @route   GET /api/agents/nearby
// @access  Private (Admin)
exports.getNearbyAgents = async (req, res, next) => {
  try {
    const { lng, lat, radius } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: 'Please provide longitude (lng) and latitude (lat) query parameters' });
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const searchRadius = parseFloat(radius) || 5000; // default to 5km (5000 meters)

    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Find agents who are online or busy within the 2dsphere radius
    const agents = await User.find({
      role: 'agent',
      status: { $in: ['online', 'busy'] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: searchRadius,
        },
      },
    }).select('-password');

    res.json(agents);
  } catch (error) {
    next(error);
  }
};
