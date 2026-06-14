# Hyper-Local Delivery Dispatcher 🚀

A production-ready, full-stack **Hyper-Local Delivery Dispatcher** built with the MERN stack. It matches delivery agents with customer orders in real-time based on geospatial proximity using MongoDB's `$near` operator.

**Live Demo:** [https://hyperlocal-dispatch.vercel.app](https://hyperlocal-dispatch.vercel.app)

---

## Features

- **3 Roles:** Admin/Merchant, Delivery Agent, Customer
- **Auto-Dispatch:** Automatically finds the nearest online agent within 5km using MongoDB 2dsphere geospatial queries
- **Real-time Updates:** Socket.io WebSockets with REST polling fallback
- **Interactive Maps:** Leaflet maps with live agent tracking and GPS route simulation
- **Distance-based Fare:** Haversine formula to calculate fare dynamically (Rs. 50 base + Rs. 15/km)
- **Customer Portal:** Browse menu, set delivery location on map, track orders live
- **JWT Authentication:** Secure login with bcrypt password hashing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Leaflet, Socket.io-client |
| Backend | Node.js, Express.js |
| Database | MongoDB via Mongoose (2dsphere geospatial indexes) |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| Deployment | Vercel (Serverless) |

---

## Project Structure

```
hyperlocal-dispatch/
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── controllers/          # Auth, Order, Agent logic
│   ├── middleware/           # JWT auth, error handler
│   ├── models/               # User & Order Mongoose schemas
│   ├── routes/               # Express route definitions
│   ├── seed.js               # Sample data seeder
│   └── server.js             # Express + Socket.io server
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Auth.jsx              # Login & Register
│       │   ├── Navbar.jsx            # Nav with status toggle
│       │   ├── AdminDashboard.jsx    # Merchant dispatcher console
│       │   ├── AgentDashboard.jsx    # Rider cockpit + GPS simulator
│       │   ├── CustomerDashboard.jsx # Order food + track delivery
│       │   └── CustomerTracking.jsx  # Public live tracking page
│       ├── App.jsx
│       └── index.css         # Glassmorphism dark design system
├── vercel.json               # Vercel deployment config
└── package.json
```

---

## Getting Started Locally

### Prerequisites
- Node.js v18+
- MongoDB running locally (or Atlas URI)

### Installation

```bash
# Install all dependencies
npm run install-all

# Seed the database with sample data
npm run seed --prefix backend

# Start backend (port 5000) + frontend (port 5173) concurrently
npm run dev
```

### Environment Variables
Create `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/hyperlocal-dispatch
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Test Accounts (after seeding)
| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | password123 |
| Agent (Nearby) | rider1@gmail.com | password123 |
| Agent (Far) | rider2@gmail.com | password123 |

---

## Deployment (Vercel)

```bash
# Deploy to production
npx vercel --prod --yes
```

Set these environment variables in Vercel Dashboard:
- `MONGO_URI` → Your MongoDB Atlas connection string
- `JWT_SECRET` → A secure random string
- `NODE_ENV` → `production`
