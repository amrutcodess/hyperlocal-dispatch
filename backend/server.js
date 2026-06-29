const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

app.set('socketio', io);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_order_tracking', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined tracking room: order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Standard Middlewares
app.use(cors());
app.use(express.json());

// DB connection middleware — runs before every API request in serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({
      message: 'Database connection failed. Please try again in a moment.',
      error: err.message,
    });
  }
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Health check route — useful for debugging Vercel deployments
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() });
});

// Serve Static Frontend Assets in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('Hyper-Local Delivery Dispatcher API is running...');
  });
}

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server only when NOT running as a Vercel serverless function
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Export the express app for Vercel
module.exports = app;
