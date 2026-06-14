const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, location } = req.body;

    // Validate request parameters
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide name, email, password, and role' });
    }

    if (role !== 'admin' && role !== 'agent' && role !== 'customer') {
      return res.status(400).json({ message: 'Role must be admin, agent, or customer' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Set location coordinate if provided (defaults to [0, 0] if not)
    let userLocation = { type: 'Point', coordinates: [0, 0] };
    if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      const [lng, lat] = location.coordinates;
      if (typeof lng === 'number' && typeof lat === 'number') {
        userLocation = {
          type: 'Point',
          coordinates: [lng, lat],
        };
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      status: role === 'agent' ? 'offline' : 'online', // Admins are always online in a sense, agents start offline
      location: userLocation,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        location: user.location,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // If logging in, reset status to online if agent
      if (user.role === 'agent' && user.status === 'offline') {
        user.status = 'online';
        await user.save();
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        location: user.location,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};
