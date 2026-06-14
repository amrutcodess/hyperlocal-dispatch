const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Order = require('./models/Order');

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hyperlocal-dispatch');
    console.log('Connected to DB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing Users and Orders.');

    // Seed Admin
    const admin = await User.create({
      name: 'Admin Merchant',
      email: 'admin@gmail.com',
      password: 'password123', // Will be hashed by pre-save hook
      role: 'admin',
      status: 'online',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716], // Bangalore center
      },
    });

    console.log('Created Admin User:', admin.email);

    // Seed Agents
    // Agent 1: Online, nearby (within 5km of Bangalore center)
    const agent1 = await User.create({
      name: 'Rider Nearby (Online)',
      email: 'rider1@gmail.com',
      password: 'password123',
      role: 'agent',
      status: 'online',
      location: {
        type: 'Point',
        coordinates: [77.6000, 12.9750], // ~1.2 km from Bangalore center
      },
    });

    // Agent 2: Online, far away (greater than 5km from Bangalore center)
    const agent2 = await User.create({
      name: 'Rider Far Away (Online)',
      email: 'rider2@gmail.com',
      password: 'password123',
      role: 'agent',
      status: 'online',
      location: {
        type: 'Point',
        coordinates: [77.7200, 12.9300], // ~15 km away
      },
    });

    // Agent 3: Offline, extremely close (but offline!)
    const agent3 = await User.create({
      name: 'Rider Very Close (Offline)',
      email: 'rider3@gmail.com',
      password: 'password123',
      role: 'agent',
      status: 'offline',
      location: {
        type: 'Point',
        coordinates: [77.5950, 12.9720], // ~100m away, but offline
      },
    });

    console.log('Created Agents:');
    console.log(`- ${agent1.name} (${agent1.email}) - Coordinates: ${agent1.location.coordinates}`);
    console.log(`- ${agent2.name} (${agent2.email}) - Coordinates: ${agent2.location.coordinates}`);
    console.log(`- ${agent3.name} (${agent3.email}) - Coordinates: ${agent3.location.coordinates}`);

    // Seed Orders
    // Order 1: Completed order
    const order1 = await Order.create({
      customerName: 'Alice Smith',
      deliveryAddress: '123 Residency Road, Bangalore',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [77.6096, 12.9816],
      },
      items: ['Double Cheese Pizza', 'Choco Lava Cake', 'Coca Cola'],
      fare: 150,
      status: 'delivered',
      assignedAgent: agent1._id,
      assignedAt: new Date(Date.now() - 3600000), // 1 hour ago
      deliveredAt: new Date(Date.now() - 1800000), // 30 mins ago
    });

    // Order 2: Pending order (unassigned)
    const order2 = await Order.create({
      customerName: 'Bob Johnson',
      deliveryAddress: '456 Brigade Road, Bangalore',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5910, 12.9690],
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [77.6210, 12.9590],
      },
      items: ['Gourmet Burger Combo', 'Vanilla Milkshake'],
      fare: 220,
      status: 'pending',
      assignedAgent: null,
    });

    console.log('Created Sample Orders:');
    console.log(`- Order 1 (Delivered): ${order1.customerName} - Fare: Rs.${order1.fare}`);
    console.log(`- Order 2 (Pending): ${order2.customerName} - Fare: Rs.${order2.fare}`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
