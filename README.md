<h1 align="center">🚀 Hyper-Local Delivery Dispatcher</h1>

<p align="center">
  A production-ready, full-stack MERN application for real-time hyperlocal delivery management.<br/>
  Auto-dispatches orders to the nearest available delivery agent using MongoDB geospatial queries.
</p>

<p align="center">
  <a href="https://hyperlocal-dispatch.vercel.app"><strong>🌐 Live Demo → hyperlocal-dispatch.vercel.app</strong></a> &nbsp;|&nbsp;
  <a href="https://github.com/amrutcodess/hyperlocal-dispatch"><strong>📂 GitHub Repo</strong></a>
</p>

---

## 📍 Project Location

| Location | Path / URL |
|---|---|
| **Local codebase** | `C:\Users\DELL\.gemini\antigravity\scratch\hyperlocal-dispatch` |
| **Live App (Vercel)** | https://hyperlocal-dispatch.vercel.app |
| **GitHub Repository** | https://github.com/amrutcodess/hyperlocal-dispatch |
| **Vercel Dashboard** | https://vercel.com/amrut-s-projects2/hyperlocal-dispatch |

---

## 📖 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features by Role](#features-by-role)
  - [Admin / Merchant](#1-admin--merchant-portal)
  - [Delivery Agent](#2-delivery-agent-cockpit)
  - [Customer](#3-customer-portal)
- [Core Backend Features](#core-backend-features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Real-time Architecture](#real-time-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Getting Started Locally](#getting-started-locally)
- [Environment Variables](#environment-variables)
- [Test Credentials](#test-credentials)
- [Q&A — Project Features & MERN Stack](#qa--project-features--mern-stack)

---

## Overview

Hyper-Local Delivery Dispatcher solves the problem of **matching delivery agents to customer orders in real-time**, based on GPS proximity. When an Admin places or dispatches an order, the system automatically finds the **nearest online agent** within a 5 km radius using MongoDB's `$near` geospatial operator. Agents update their location in real time via the dashboard, and customers track their delivery live on an interactive Leaflet map.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | UI framework with fast HMR |
| **Styling** | Vanilla CSS (Glassmorphism) | Dark mode, gradients, animations |
| **Maps** | Leaflet.js + OpenStreetMap | Interactive maps, agent pins |
| **Real-time** | Socket.io (client) | Live order & location updates |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | MongoDB + Mongoose | Document store with 2dsphere indexes |
| **Auth** | JWT + bcryptjs | Stateless authentication |
| **Real-time** | Socket.io (server) | WebSocket event broadcasting |
| **Deployment** | Vercel | Serverless hosting (frontend + backend) |
| **Cloud DB** | MongoDB Atlas | Managed cloud database |

---

## Project Structure

```
hyperlocal-dispatch/
│
├── backend/                        # Node.js + Express API
│   ├── config/
│   │   └── db.js                   # MongoDB connection via Mongoose
│   ├── controllers/
│   │   ├── authController.js       # Register & Login logic
│   │   ├── agentController.js      # Location update, status toggle, nearby search
│   │   └── orderController.js      # Create, assign, update, fetch orders
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT verification + role-based access
│   │   └── errorMiddleware.js      # Global Express error handler
│   ├── models/
│   │   ├── User.js                 # User schema (Admin / Agent) with GeoJSON + bcrypt
│   │   └── Order.js                # Order schema with GeoJSON pickup/delivery + 2dsphere
│   ├── routes/
│   │   ├── authRoutes.js           # POST /api/auth/register, /api/auth/login
│   │   ├── agentRoutes.js          # PATCH location/status, GET nearby agents
│   │   └── orderRoutes.js          # CRUD orders + status updates + dispatch
│   ├── seed.js                     # Populates DB with sample admin, agents & orders
│   ├── server.js                   # Express app + Socket.io bootstrap
│   └── package.json
│
├── frontend/                       # React 19 + Vite SPA
│   └── src/
│       ├── components/
│       │   ├── Auth.jsx            # Login & Register forms with role selection
│       │   ├── Navbar.jsx          # Top nav with role badge, agent status toggle
│       │   ├── AdminDashboard.jsx  # Dispatcher console — map, orders table, dispatch btn
│       │   ├── AgentDashboard.jsx  # Rider cockpit — active order card, GPS simulator
│       │   ├── CustomerDashboard.jsx  # Browse menu, set location, place order
│       │   └── CustomerTracking.jsx   # Live order tracking page with agent pin on map
│       ├── App.jsx                 # React Router setup + auth state management
│       ├── index.css               # Full design system — tokens, glassmorphism, animations
│       └── main.jsx                # React DOM entry point
│
├── vercel.json                     # Vercel routing — API → serverless, SPA fallback
├── package.json                    # Root scripts (install-all, dev, seed)
├── .gitignore                      # Excludes node_modules, .env, dist
└── README.md
```

---

## Features by Role

### 1. Admin / Merchant Portal

The **Admin Dashboard** is the central command center for managing the entire delivery operation.

| Feature | Description |
|---|---|
| **Live Agent Map** | Leaflet map showing all online agents as colored pins with real-time location updates via Socket.io |
| **Order Management Table** | Full sortable list of all orders with status badges (`pending`, `assigned`, `picked_up`, `delivered`, `cancelled`) |
| **One-Click Auto-Dispatch** | Clicking "Dispatch" on a pending order triggers MongoDB's `$near` geospatial query to find the closest online agent within 5 km |
| **Manual Order Creation** | Form to enter customer name, delivery address, item list, and set pickup/delivery coordinates on the map |
| **Fare Calculation** | Auto-calculates fare using Haversine formula: Rs. 50 base + Rs. 15/km |
| **Agent Status Board** | Real-time sidebar listing all agents, their online/offline status, and current assignments |
| **WebSocket Updates** | Receives `order_updated` and `agent_location_updated` events to refresh UI without page reload |

---

### 2. Delivery Agent Cockpit

The **Agent Dashboard** is optimized for riders on mobile or desktop.

| Feature | Description |
|---|---|
| **Online/Offline Toggle** | Navbar switch to mark availability — when offline, the agent is excluded from all dispatch queries |
| **Active Order Card** | Shows current assigned order details: customer, pickup address, delivery address, fare, and items list |
| **Status Progression** | Buttons to advance order through the lifecycle: `Assigned → Picked Up → Delivered` |
| **GPS Simulator** | "Simulate GPS Movement" button that auto-updates the agent's coordinates every 2 seconds, moving toward the delivery location |
| **Mini Map** | Embedded Leaflet map showing agent's current position and the delivery destination pin |
| **Real-time Broadcast** | Every location update is broadcast via Socket.io to all connected Admin dashboards and customer tracking pages |

---

### 3. Customer Portal

The **Customer Dashboard** provides a simple, clean ordering experience.

| Feature | Description |
|---|---|
| **Menu Browser** | Browse available food items with prices, add/remove from cart with item counter |
| **Interactive Map Picker** | Click on an embedded Leaflet map to set your exact delivery location (no typing address required) |
| **Live Fare Preview** | Fare is calculated and displayed in real-time as you set your delivery location |
| **Order Placement** | Submits order to backend with all details — triggers auto-dispatch if an agent is available |
| **Order History** | Lists all past and current orders with their status and fare |
| **Live Tracking** | Each order has a "Track Live" button that opens a full-screen tracking page |

#### Customer Tracking Page (`/track/:orderId`)
- Public URL — shareable with anyone
- Shows assigned agent's live pin on a Leaflet map
- Auto-refreshes agent position via Socket.io `order_tracking` room
- Displays order status, ETA estimate, and order items

---

## Core Backend Features

### 🔐 Authentication System
- **Registration:** `POST /api/auth/register` accepts `name`, `email`, `password`, `role`
- **Login:** `POST /api/auth/login` returns a signed JWT (valid 30 days)
- **Password Hashing:** bcryptjs `pre('save')` hook on User model — plain text passwords are **never stored**
- **JWT Middleware:** `protect` middleware verifies `Authorization: Bearer <token>` on every protected route
- **Role Authorization:** `authorize('admin')` middleware blocks non-admin users from dispatch endpoints

### 📡 Geospatial Auto-Dispatch
- The `User` model stores agent location as a **GeoJSON Point** (`{ type: 'Point', coordinates: [lng, lat] }`)
- A `2dsphere` index is applied on the `location` field in MongoDB
- When dispatching, the backend runs:
  ```js
  User.findOne({
    role: 'agent',
    status: 'online',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
        $maxDistance: 5000  // 5 km in metres
      }
    }
  })
  ```
- The nearest agent is assigned, their status is set to `'busy'`, and a Socket.io event is emitted

### 🌐 Real-time WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `join_order_tracking` | Client → Server | `orderId` — joins a private tracking room |
| `order_updated` | Server → Client | Full updated order object |
| `agent_location_updated` | Server → Client | `{ agentId, coordinates }` |
| `new_order` | Server → Client (Admin) | New order created notification |

### 🛡️ Error Handling
- Global `errorMiddleware.js` catches all Express errors
- Handles Mongoose `CastError` (invalid ObjectId → 404)
- Handles Mongoose `ValidationError` (model validation fails → 400)
- Handles duplicate key errors (e.g., email already registered → 400)

---

## Database Schema

### User Schema (`models/User.js`)
```
name        String    (required, trimmed)
email       String    (required, unique, lowercase)
password    String    (required, hashed by bcrypt, select: false)
role        String    enum: ['admin', 'customer', 'agent']
status      String    enum: ['online', 'offline', 'busy']  default: offline
location    GeoJSON   { type: 'Point', coordinates: [lng, lat] }
createdAt   Date      (auto — Mongoose timestamps)
updatedAt   Date      (auto — Mongoose timestamps)

Indexes:    location → 2dsphere
```

### Order Schema (`models/Order.js`)
```
customerName      String    (required)
deliveryAddress   String    (required)
pickupLocation    GeoJSON   { type: 'Point', coordinates: [lng, lat] }
deliveryLocation  GeoJSON   { type: 'Point', coordinates: [lng, lat] }
items             [String]  (min 1 item required)
fare              Number    (Rs. calculated by Haversine formula)
status            String    enum: ['pending','assigned','picked_up','delivered','cancelled']
customer          ObjectId  ref: User
assignedAgent     ObjectId  ref: User  (null until dispatched)
assignedAt        Date      (null until dispatched)
deliveredAt       Date      (null until delivered)
createdAt         Date      (auto)
updatedAt         Date      (auto)

Indexes:    pickupLocation → 2dsphere
            deliveryLocation → 2dsphere
```

---

## API Reference

### Auth Routes — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user (admin/agent/customer) |
| POST | `/api/auth/login` | Public | Login and receive JWT token |

### Agent Routes — `/api/agents`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| PATCH | `/api/agents/location` | Private (Agent) | Update GPS coordinates |
| PATCH | `/api/agents/status` | Private (Agent) | Toggle online/offline status |
| GET | `/api/agents/nearby` | Private (Admin) | Get online agents within radius |

### Order Routes — `/api/orders`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | Private (Admin/Customer) | Create a new order |
| GET | `/api/orders` | Private | Get all orders (admin: all, agent/customer: own) |
| GET | `/api/orders/:id` | Private | Get single order by ID |
| PATCH | `/api/orders/:id/status` | Private (Agent) | Update order status (picked_up / delivered) |
| POST | `/api/orders/:id/dispatch` | Private (Admin) | Auto-dispatch order to nearest agent |
| DELETE | `/api/orders/:id` | Private (Admin) | Cancel/delete an order |

---

## Real-time Architecture

```
React Client (Agent Dashboard)
    │
    │   PATCH /api/agents/location   (REST)
    ▼
Express Server (orderController / agentController)
    │
    │   io.emit('agent_location_updated', { agentId, coordinates })
    ▼
Socket.io Server
    │
    ├──► Admin Dashboard (all connected admins)
    └──► Customer Tracking Page (joined order room via 'join_order_tracking')
```

On Vercel, Socket.io runs in **polling mode** (WebSocket upgrade is not supported in Vercel's serverless environment). For production WebSocket support, deploying the backend to Railway or Render is recommended.

---

## Deployment Architecture

```
Vercel (Single Deployment)
├── Frontend:  @vercel/static-build  →  Vite build → /frontend/dist
└── Backend:   @vercel/node          →  Express serverless → backend/server.js

vercel.json routing:
├── /api/*         → backend/server.js  (Express API)
├── /socket.io/*   → backend/server.js  (Socket.io polling)
└── /*             → frontend/index.html (React SPA fallback)

MongoDB Atlas (Cloud Database)
└── Connected via MONGO_URI environment variable in Vercel
```

---

## Getting Started Locally

### Prerequisites
- Node.js v18+
- MongoDB installed and running locally (`mongod`)
- Git

### Step 1 — Clone the repository
```bash
git clone https://github.com/amrutcodess/hyperlocal-dispatch.git
cd hyperlocal-dispatch
```

### Step 2 — Install all dependencies
```bash
npm run install-all
```
This installs root, backend, and frontend dependencies in one command.

### Step 3 — Configure environment variables
Create the file `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hyperlocal-dispatch
JWT_SECRET=your-super-secret-key-here
NODE_ENV=development
```

### Step 4 — Seed the database (optional but recommended)
```bash
npm run seed --prefix backend
```
This creates 1 admin, 3 agents, and 2 sample orders.

### Step 5 — Start development servers
```bash
npm run dev
```
This starts both backend (port 5000) and frontend (port 5173) concurrently.

Open: **http://localhost:5173**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ Yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT tokens |
| `PORT` | Optional | Backend port (default: 5000) |
| `NODE_ENV` | Optional | `development` or `production` |

> ⚠️ **Never commit `.env` to Git.** It is excluded via `.gitignore`.

---

## Test Credentials

> Only available after running `npm run seed --prefix backend` on a local MongoDB.
> For the live Vercel app, register a new account.

| Role | Email | Password |
|---|---|---|
| 👑 Admin | `admin@gmail.com` | `password123` |
| 🛵 Agent (Online, Nearby ~1.2km) | `rider1@gmail.com` | `password123` |
| 🛵 Agent (Online, Far ~15km) | `rider2@gmail.com` | `password123` |
| 🛵 Agent (Offline, Close ~100m) | `rider3@gmail.com` | `password123` |

---

## Q&A — Project Features & MERN Stack

### 🟢 Project Feature Questions

**Q1. What is the Hyper-Local Delivery Dispatcher?**
> It is a full-stack web application that automates the process of assigning delivery orders to the nearest available delivery agent in real time using MongoDB geospatial queries, WebSockets, and an interactive map interface.

**Q2. How does auto-dispatch work?**
> When an Admin clicks "Dispatch" on a pending order, the backend runs a MongoDB `$near` geospatial query on the `User` collection with a `2dsphere` index. It finds the nearest agent whose `role` is `'agent'`, `status` is `'online'`, and is within 5,000 metres of the order's pickup coordinates. That agent is immediately assigned and notified via Socket.io.

**Q3. What geospatial query does MongoDB use for finding nearby agents?**
> The `$near` operator combined with `$maxDistance` on a `2dsphere` indexed field. The query looks like:
> ```js
> User.findOne({
>   role: 'agent', status: 'online',
>   location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 5000 } }
> })
> ```

**Q4. How is fare calculated?**
> Using the **Haversine formula**, which computes the straight-line distance between two GPS coordinates (pickup and delivery). Fare = Rs. 50 (base) + Rs. 15 × distance (in km).

**Q5. What are the three user roles and what can each do?**
> - **Admin/Merchant:** Creates orders, dispatches to agents, views all agents on the live map, manages the fleet.
> - **Agent:** Goes online/offline, accepts assigned orders, updates order status (picked up / delivered), simulates GPS movement.
> - **Customer:** Browses menu, sets delivery location on map, places orders, tracks delivery in real-time.

**Q6. How does real-time tracking work?**
> When a customer opens the tracking page, the frontend Socket.io client emits `join_order_tracking` with the `orderId`. The server places that socket in a private room (`order_<id>`). Whenever the assigned agent updates their location, the server broadcasts `agent_location_updated` to that room. The customer's map pin moves in real-time.

**Q7. What happens if no agent is within 5 km?**
> The dispatch API returns a `404 Not Found` error with the message: `"No online agents found within 5km of the pickup location."` The order remains in `pending` status, and the Admin can retry later.

**Q8. How is the agent's location stored and updated?**
> Location is stored in MongoDB as a GeoJSON Point: `{ type: 'Point', coordinates: [longitude, latitude] }`. Agents call `PATCH /api/agents/location` with their new coordinates, which updates the document and broadcasts to all admins via Socket.io.

**Q9. What is the GPS Simulator feature?**
> On the Agent Dashboard, clicking "Simulate GPS Movement" starts an interval that automatically increments the agent's coordinates by a small amount every 2 seconds, mimicking movement toward the delivery destination. This triggers live map updates on the admin and customer tracking pages.

**Q10. How does the Customer Tracking page work without login?**
> The `/track/:orderId` route is public (no `protect` middleware). It accepts an order ID in the URL, fetches the order data and the assigned agent's current location, and subscribes to the `order_<id>` Socket.io room for live updates.

---

### 🔵 MERN Stack Questions

**Q11. What does MERN stand for?**
> - **M** — MongoDB (NoSQL document database)
> - **E** — Express.js (web framework for Node.js)
> - **R** — React.js (frontend UI library)
> - **N** — Node.js (JavaScript runtime environment)

**Q12. Why was MongoDB chosen over a relational database (like MySQL)?**
> MongoDB was chosen because:
> - It natively supports **GeoJSON** and **2dsphere indexes** for geospatial queries, which are critical to this project
> - Its flexible document model suits varying order structures
> - Mongoose provides a clean schema + validation layer on top
> - Horizontal scaling and Atlas cloud hosting make it production-ready with minimal configuration

**Q13. What is Mongoose and why is it used?**
> Mongoose is an ODM (Object Document Mapper) for MongoDB and Node.js. It provides:
> - **Schema definition** with data types, validations, and defaults
> - **Pre/post hooks** (e.g., hashing passwords before saving)
> - **Populated references** between documents (e.g., `assignedAgent` ref to `User`)
> - **Model methods** and query helpers for clean controller code

**Q14. How does JWT authentication work in this project?**
> 1. User registers/logs in via `POST /api/auth/login`
> 2. Server verifies credentials and signs a JWT using `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })`
> 3. Client stores the token in memory/localStorage and sends it as `Authorization: Bearer <token>` on every API call
> 4. `authMiddleware.js` decodes the token using `jwt.verify()`, fetches the user from DB, and attaches it to `req.user`
> 5. Role-based `authorize('admin')` middleware then checks `req.user.role`

**Q15. What is the role of Express.js in this project?**
> Express.js serves as the HTTP server framework that:
> - Defines REST API routes (`/api/auth`, `/api/agents`, `/api/orders`)
> - Applies middleware (CORS, JSON parsing, JWT auth, error handling)
> - Integrates with Socket.io via a shared `http.Server` instance
> - Serves the React static build in production
> - Exports the `app` for Vercel's serverless functions

**Q16. Why is React used with Vite instead of Create React App?**
> Vite offers significantly faster dev server startup and Hot Module Replacement (HMR) compared to CRA's Webpack-based tooling. Vite uses native ES modules in development and Rollup for production builds, resulting in smaller bundle sizes. The build output (`dist/`) is served as a static site on Vercel.

**Q17. How does Socket.io integrate with Express?**
> ```js
> const server = http.createServer(app);      // Wrap Express in an HTTP server
> const io = socketio(server, { cors: {} });  // Attach Socket.io to same server
> app.set('socketio', io);                    // Share io instance with controllers
> server.listen(PORT);                        // Single port for both HTTP + WebSocket
> ```
> Inside controllers, `req.app.get('socketio').emit(...)` broadcasts events.

**Q18. What is a 2dsphere index in MongoDB?**
> A `2dsphere` index enables MongoDB to efficiently execute geospatial queries on GeoJSON data (points, lines, polygons). It is required for operators like `$near`, `$geoWithin`, and `$geoIntersects`. Without this index, MongoDB cannot compute distance-based queries. It is declared in Mongoose as: `userSchema.index({ location: '2dsphere' })`.

**Q19. How is the MERN app deployed on Vercel?**
> Vercel's `vercel.json` configures two builds:
> - `@vercel/node` — Wraps `backend/server.js` as a serverless function for all `/api/*` routes
> - `@vercel/static-build` — Runs `vite build` on the frontend and serves `dist/` as a CDN-cached static site
>
> React Router is supported via the SPA fallback route (`/* → index.html`).

**Q20. What is bcryptjs and why is it used instead of storing plain text passwords?**
> bcryptjs is a library that hashes passwords using the Blowfish cipher with a configurable cost factor (salt rounds). Plain text passwords are never stored — if the database is breached, attackers only get hashes which are computationally infeasible to reverse. The Mongoose `pre('save')` hook automatically hashes the password before any document is saved: `this.password = await bcrypt.hash(this.password, 10)`.

**Q21. What is CORS and how is it handled?**
> CORS (Cross-Origin Resource Sharing) is a browser security policy that blocks frontend JavaScript from calling a different domain's API. In development, React runs on `localhost:5173` and the backend on `localhost:5000` — different origins. The `cors` npm package is used as Express middleware to add `Access-Control-Allow-Origin: *` headers, permitting cross-origin requests.

**Q22. What is the difference between `req.body`, `req.params`, and `req.query`?**
> - `req.body` — Data sent in the HTTP request body (POST/PATCH/PUT, parsed by `express.json()`)
> - `req.params` — URL path parameters (e.g., `/api/orders/:id` → `req.params.id`)
> - `req.query` — URL query string parameters (e.g., `/api/agents/nearby?lat=12.97&lng=77.59`)

**Q23. How does the frontend communicate with the backend in production?**
> Since both are deployed on the same Vercel domain (`hyperlocal-dispatch.vercel.app`), the frontend uses relative API paths like `/api/auth/login`. No absolute URL or environment variable for the API base URL is needed — Vercel's routing rules direct `/api/*` to the serverless Express function automatically.

---

## License

MIT © 2025 [amrutcodess](https://github.com/amrutcodess)
