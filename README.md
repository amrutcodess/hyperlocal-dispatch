<h1 align="center">🚀 Hyper-Local Delivery Dispatcher</h1>

<p align="center">
  A production-ready, full-stack MERN application for real-time hyperlocal delivery management.<br/>
  Auto-dispatches orders to the nearest available delivery agent using MongoDB geospatial queries.
</p>

<p align="center">
  <a href="https://hyperlocal-dispatch.vercel.app"><strong>🌐 Live Demo → hyperlocal-dispatch.vercel.app</strong></a>
  &nbsp;|&nbsp;
  <a href="https://github.com/amrutcodess/hyperlocal-dispatch"><strong>📂 GitHub Repository</strong></a>
</p>

---

## 📖 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features — Admin / Merchant](#features--admin--merchant)
- [Features — Delivery Agent](#features--delivery-agent)
- [Features — Customer](#features--customer)
- [Core Backend Features](#core-backend-features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Real-time Architecture](#real-time-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Getting Started Locally](#getting-started-locally)
- [Environment Variables](#environment-variables)
- [Test Credentials](#test-credentials)

---

## Overview

Hyper-Local Delivery Dispatcher automates the process of **matching delivery agents to customer orders in real-time**, based on GPS proximity. When an Admin dispatches an order, the system finds the **nearest online agent within 5 km** using MongoDB's `$near` geospatial operator. Agents broadcast their GPS location live via Socket.io, and customers track their delivery on an interactive Leaflet map — all without a page refresh.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | SPA with fast Hot Module Replacement |
| **Styling** | Vanilla CSS (Glassmorphism) | Dark mode, gradients, micro-animations |
| **Maps** | Leaflet.js + OpenStreetMap | Interactive maps, live agent markers |
| **Real-time (Client)** | Socket.io-client | Live order and location updates |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | MongoDB + Mongoose | Document store with 2dsphere geo-indexes |
| **Authentication** | JWT + bcryptjs | Stateless auth, hashed passwords |
| **Real-time (Server)** | Socket.io | WebSocket event broadcasting |
| **Deployment** | Vercel | Serverless frontend + backend hosting |
| **Cloud Database** | MongoDB Atlas (Mumbai) | Managed cloud MongoDB |

---

## Project Structure

```
hyperlocal-dispatch/
│
├── backend/
│   ├── config/
│   │   └── db.js                   # Cached MongoDB connection (serverless-safe)
│   ├── controllers/
│   │   ├── authController.js       # Register & Login with JWT
│   │   ├── agentController.js      # Location updates, status toggle, nearby search
│   │   └── orderController.js      # Create, assign, dispatch, update orders
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT protect + role-based authorize()
│   │   └── errorMiddleware.js      # Global Express error handler
│   ├── models/
│   │   ├── User.js                 # User schema — GeoJSON location, bcrypt hook
│   │   └── Order.js                # Order schema — GeoJSON pickup/delivery, 2dsphere
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth/register, /api/auth/login
│   │   ├── agentRoutes.js          # /api/agents/location, /status, /nearby
│   │   └── orderRoutes.js          # Full CRUD + /dispatch
│   ├── seed.js                     # Sample data — 1 admin, 3 agents, 2 orders
│   └── server.js                   # Express + Socket.io entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Auth.jsx            # Login & Register forms with role picker
│       │   ├── Navbar.jsx          # Top nav — role badge, agent online toggle
│       │   ├── AdminDashboard.jsx  # Dispatcher console — map + orders table
│       │   ├── AgentDashboard.jsx  # Rider cockpit — active order + GPS sim
│       │   ├── CustomerDashboard.jsx  # Menu browser + map location picker
│       │   └── CustomerTracking.jsx   # Public live tracking page (/track/:id)
│       ├── App.jsx                 # React Router + auth state
│       └── index.css               # Design system — glassmorphism dark theme
│
├── vercel.json                     # Vercel routing — /api/* → serverless, SPA fallback
├── package.json                    # Root scripts: install-all, dev, seed
└── .gitignore
```

---

## Features — Admin / Merchant

The **Admin Dashboard** is the central command center for the entire delivery operation.

### 🗺️ Live Agent Map
- Embedded **Leaflet map** showing all online agents as real-time pins
- Agent markers update position automatically via Socket.io without page reload
- Click any agent pin to view their name, status, and current assignment

### 📋 Order Management Table
- Full list of all orders across all statuses
- Color-coded **status badges**: `pending` · `assigned` · `picked_up` · `delivered` · `cancelled`
- Real-time table updates when any order changes via WebSocket events

### ⚡ One-Click Auto-Dispatch
- Click **"Dispatch"** on any pending order
- Backend runs MongoDB `$near` query to find the **nearest online agent within 5 km**
- Agent is instantly assigned, their status is set to `busy`, and both the agent and customer are notified via Socket.io

### 📝 Manual Order Creation
- Form with customer name, delivery address, and items list
- Set pickup and delivery coordinates directly **by clicking on the map**
- Fare is auto-calculated using the **Haversine formula**: Rs. 50 base + Rs. 15/km

### 👥 Agent Status Board
- Sidebar listing all agents with live online/offline/busy status
- Shows which agent is assigned to which order in real-time

---

## Features — Delivery Agent

The **Agent Cockpit** is optimized for riders, usable on mobile or desktop.

### 🟢 Online / Offline Toggle
- Switch in the Navbar instantly marks availability
- When **offline**, the agent is excluded from all dispatch queries
- Status syncs to the database and broadcasts to all Admins

### 📦 Active Order Card
- Displays the currently assigned order: customer name, pickup address, delivery address, items, and fare
- Clear step-by-step action buttons to advance the order lifecycle

### 🔄 Order Status Progression
Tap buttons to move through the delivery flow:
```
Assigned → Picked Up → Delivered
```
Each update is broadcast to the Admin dashboard and the customer's tracking page in real time.

### 📍 GPS Simulator
- **"Simulate GPS Movement"** button starts an auto-movement interval
- Every 2 seconds, the agent's coordinates update toward the delivery destination
- Live position is broadcast to all connected Admins and the customer tracking room via Socket.io

### 🗺️ Mini Map
- Embedded Leaflet map on the agent's dashboard
- Shows the agent's real-time position and the delivery destination pin

---

## Features — Customer

### 🛒 Menu Browser
- Browse available food items with prices
- Add / remove items from cart with a live item counter
- Cart persists across tab switches

### 🗺️ Interactive Delivery Location Picker
- Click anywhere on an embedded Leaflet map to set your exact delivery coordinates
- No typing address required — pin drops where you click
- Fare preview updates live as you move the pin

### 🛍️ Order Placement
- Submits the order with all details to the backend
- Auto-dispatch triggers if a nearby agent is available
- Instant confirmation with order ID

### 📜 Order History
- Lists all past and current orders
- Shows real-time status badge and fare for each order

### 📡 Live Order Tracking
- Each order has a **"Track Live"** button
- Opens `/track/:orderId` — a **public, shareable URL**
- Shows the assigned agent's live GPS pin on a full-screen Leaflet map
- Auto-updates via Socket.io room subscription (`join_order_tracking`)

---

## Core Backend Features

### 🔐 Authentication System
- **Register:** `POST /api/auth/register` — accepts `name`, `email`, `password`, `role`, `location`
- **Login:** `POST /api/auth/login` — returns a signed JWT (valid 30 days)
- **Password Hashing:** Mongoose `pre('save')` hook hashes passwords with bcryptjs (10 salt rounds) — plain text is **never stored**
- **JWT Middleware:** `protect` verifies `Authorization: Bearer <token>` on every protected route
- **Role Guard:** `authorize('admin')` blocks non-admins from dispatch and order creation endpoints

### 📡 Geospatial Auto-Dispatch
The `User` model stores agent location as a **GeoJSON Point** with a `2dsphere` index. Dispatch query:
```js
User.findOne({
  role: 'agent',
  status: 'online',
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
      $maxDistance: 5000   // 5 km radius
    }
  }
})
```
The nearest agent is assigned atomically, their status set to `busy`, and a Socket.io event fires to all clients.

### 🌐 Real-time WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `join_order_tracking` | Client → Server | `orderId` — joins private tracking room |
| `order_updated` | Server → All clients | Full updated order object |
| `agent_location_updated` | Server → All clients | `{ agentId, coordinates }` |
| `new_order` | Server → Admin clients | New order notification |

### 🛡️ Error Handling
- Global `errorMiddleware.js` catches all thrown errors
- Handles Mongoose `CastError` (bad ObjectId → 404)
- Handles Mongoose `ValidationError` (schema violation → 400)
- Handles duplicate key errors (e.g., email taken → 400)
- Handles JWT errors (invalid/expired token → 401)
- Returns `503` with descriptive message if database is unreachable

### 💾 Serverless-Safe Database Connection
- Mongoose connection is **cached in `global.mongoose`** across serverless invocations
- `connectDB()` runs as an **Express middleware** per-request (not at module load)
- Connection timeout: 10 seconds — fails gracefully with a JSON error instead of hanging

---

## Database Schema

### User Schema
```
name        String    required, trimmed
email       String    required, unique, lowercase
password    String    required, bcrypt hashed (select: false)
role        String    enum: ['admin', 'customer', 'agent']
status      String    enum: ['online', 'offline', 'busy']  default: offline
location    GeoJSON   { type: 'Point', coordinates: [lng, lat] }
createdAt   Date      auto (Mongoose timestamps)
updatedAt   Date      auto (Mongoose timestamps)

Index:  location → 2dsphere
```

### Order Schema
```
customerName      String    required
deliveryAddress   String    required
pickupLocation    GeoJSON   { type: 'Point', coordinates: [lng, lat] }
deliveryLocation  GeoJSON   { type: 'Point', coordinates: [lng, lat] }
items             [String]  min 1 item required
fare              Number    Rs. calculated via Haversine formula
status            String    enum: ['pending','assigned','picked_up','delivered','cancelled']
customer          ObjectId  ref: User
assignedAgent     ObjectId  ref: User  (null until dispatched)
assignedAt        Date      null until dispatched
deliveredAt       Date      null until delivered
createdAt         Date      auto
updatedAt         Date      auto

Indexes:  pickupLocation → 2dsphere
          deliveryLocation → 2dsphere
```

---

## API Reference

### Auth — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register (admin / agent / customer) |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Agents — `/api/agents`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| PATCH | `/api/agents/location` | Private (Agent) | Update GPS coordinates |
| PATCH | `/api/agents/status` | Private (Agent) | Toggle online / offline |
| GET | `/api/agents/nearby` | Private (Admin) | Get online agents within radius |

### Orders — `/api/orders`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | Private (Admin/Customer) | Create a new order |
| GET | `/api/orders` | Private | Fetch orders (role-filtered) |
| GET | `/api/orders/:id` | Private | Get single order |
| PATCH | `/api/orders/:id/status` | Private (Agent) | Advance order status |
| POST | `/api/orders/:id/dispatch` | Private (Admin) | Auto-dispatch to nearest agent |
| DELETE | `/api/orders/:id` | Private (Admin) | Cancel / delete an order |

### Utility
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Server + DB health check |

---

## Real-time Architecture

```
Agent Dashboard (React)
    │
    │  PATCH /api/agents/location  (REST every 2s via GPS Simulator)
    ▼
Express Server (agentController)
    │
    │  io.emit('agent_location_updated', { agentId, coordinates })
    ▼
Socket.io Server
    ├──► Admin Dashboard      (all connected admin sockets)
    └──► Customer Tracking    (only the matching order_<id> room)
```

> **Note:** Vercel serverless does not support persistent WebSocket connections. Socket.io falls back to **long-polling** automatically, which works on Vercel. For full WebSocket support, deploy the backend to Railway or Render.

---

## Deployment Architecture

```
Vercel (Single Deployment — hyperlocal-dispatch.vercel.app)
├── @vercel/static-build  →  Vite build  →  /frontend/dist  (CDN cached)
└── @vercel/node          →  Express     →  backend/server.js (Serverless fn)

vercel.json routing:
  /api/*          →  backend/server.js   (REST API)
  /socket.io/*    →  backend/server.js   (Socket.io polling)
  /*              →  frontend/index.html  (React SPA fallback)

MongoDB Atlas — AWS Mumbai (ap-south-1)
  └── Connected via MONGO_URI environment variable in Vercel
```

---

## Getting Started Locally

### Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) — or use an Atlas URI

### 1. Clone the repo
```bash
git clone https://github.com/amrutcodess/hyperlocal-dispatch.git
cd hyperlocal-dispatch
```

### 2. Install all dependencies
```bash
npm run install-all
```

### 3. Configure environment variables
Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hyperlocal-dispatch
JWT_SECRET=your-super-secret-key-here
NODE_ENV=development
```

### 4. Seed the database with sample data
```bash
npm run seed --prefix backend
```
Creates 1 admin, 3 agents (at different distances), and 2 sample orders.

### 5. Start development servers
```bash
npm run dev
```
Starts backend on **port 5000** and frontend on **port 5173** concurrently.

Open: **http://localhost:5173**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `PORT` | Optional | Backend port (default: 5000) |
| `NODE_ENV` | Optional | `development` or `production` |

> ⚠️ Never commit `.env` to Git — it is excluded via `.gitignore`.

---

## Test Credentials

> Available after running the seed script on a local MongoDB.
> For the **live app**, register a new account via the UI.

| Role | Email | Password | Notes |
|---|---|---|---|
| 👑 Admin | `admin@gmail.com` | `password123` | Full dispatcher access |
| 🛵 Agent (Nearby) | `rider1@gmail.com` | `password123` | Online, ~1.2 km from seed orders |
| 🛵 Agent (Far) | `rider2@gmail.com` | `password123` | Online, ~15 km away |
| 🛵 Agent (Offline) | `rider3@gmail.com` | `password123` | Offline, excluded from dispatch |

---

## License

MIT © 2025 [amrutcodess](https://github.com/amrutcodess/hyperlocal-dispatch)
