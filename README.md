# 🎬 Real-Time YouTube Watch Party System

A modern, high-performance, real-time synchronized YouTube Watch Party web application built with **React 18**, **TypeScript**, **Node.js**, **Express**, **Socket.IO**, **SQLite**, and **Redis Pub/Sub**.

---

## 🌟 Key Features

1. **Real-Time Video Synchronization:**
   - Play, Pause, Seek (scrubbing), and Change Video synchronized across all connected participants with sub-second accuracy.
   - Dynamic elapsed-time calculation on room join/refresh (matches live broadcast state).
   - Auto-pause when the host disconnects or reloads to prevent desynchronization.

2. **Role-Based Access Control (RBAC):**
   - 👑 **Host (Room Creator / Owner):** Full control over video playback, can promote participants to Moderator, kick users, or transfer ownership.
   - 🛡️ **Moderator (Co-Host):** Can play, pause, seek, and change videos.
   - 👥 **Participant / Viewer:** Watch-only synchronized mode to prevent stream tampering.
   - 🔄 **Host Ownership Transfer:** Seamlessly pass Host rights to any participant.

3. **Participant Request & Admin Approval Workflow:**
   - Participants and Viewers can submit requests to **Change the Video** or **Request Moderator Permissions**.
   - Host and Moderators receive real-time actionable approval toasts (`Approve` / `Decline`).
   - On approval, the action is automatically executed and broadcasted across the room with a system announcement.

4. **User Authentication & Session Management:**
   - Full Registration & Login with Full Name, Username, and Password.
   - Password encryption using `bcryptjs` and session persistence via JWT (JSON Web Tokens).
   - Show / Hide password toggles and instant form validation.
   - Active Room Discovery & auto-fill on home page with reserved Host slot protection.

5. **Interactive Live Room Features:**
   - 💬 **Live Chat Box:** Real-time messaging with system notifications and a 500-character sanitization limit.
   - 🎈 **Live Flying Emoji Reactions:** Instagram/YouTube Live-style floating animations over the video player synced in real time.

---

## 🧱 OOP Backend Architecture

The WebSocket backend follows strict Object-Oriented Programming (OOP) design patterns:

```
server/src/
├── models/
│   ├── Participant.ts    # Participant class encapsulating identity, socket state, and RBAC helper methods
│   ├── Room.ts           # Room class managing participant maps, live elapsed-time calculation, and broadcast logic
│   ├── User.ts           # User entity for SQLite persistence
│   └── VideoState.ts     # Video playback state model
├── controllers/
│   ├── socket.controller.ts # SocketController managing event subscriptions and request/approval lifecycles
│   ├── auth.controller.ts   # Authentication REST endpoints
│   └── room.controller.ts   # Room discovery REST endpoints
└── services/
    ├── RoomManager.ts    # Centralized singleton managing rooms and participant lifecycles
    ├── AuthService.ts    # User credential verification and JWT generation
    └── RedisService.ts   # Redis Pub/Sub adapter initialization and multi-node clustering
```

---

## ⚡ Horizontal Scalability (Redis Pub/Sub Architecture)

For supporting **1,000+ concurrent users, 100+ rooms, and multi-server clusters**, the system incorporates Redis Pub/Sub:

- **`RedisService` (`src/services/RedisService.ts`):**
  - Powered by `@socket.io/redis-adapter` and `ioredis`.
  - When multiple server instances run behind a Load Balancer (e.g. AWS ALB or NGINX), Redis Pub/Sub broadcasts room events across all nodes.
  - **Graceful Fallback:** If `REDIS_URL` is omitted, the server automatically runs using the in-memory adapter for zero-config local development.

```
       [ Client A ]            [ Client B ]
            │                       │
      (WebSocket)              (WebSocket)
            ▼                       ▼
   ┌─────────────────┐     ┌─────────────────┐
   │ Server Node 1   │     │ Server Node 2   │
   └────────┬────────┘     └────────┬────────┘
            │                       │
            └──────► [ REDIS ] ◄────┘
                   (Pub / Sub)
```

---

## 📡 WebSocket Events Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client ➔ Server | `{ roomId, username, create }` | Join or create room with assigned role |
| `leave_room` | Client ➔ Server | `{}` | Leave current room |
| `sync_state` | Server ➔ Clients | `{ playState, currentTime, videoId }` | Live synchronized video state |
| `play` | Client ➔ Server | `{}` | Play video (Host/Mod only) |
| `pause` | Client ➔ Server | `{}` | Pause video (Host/Mod only) |
| `seek` | Client ➔ Server | `{ time }` | Seek/scrub video time (Host/Mod only) |
| `change_video` | Client ➔ Server | `{ videoId }` | Switch YouTube video (Host/Mod only) |
| `assign_role` | Client ➔ Server | `{ userId, role }` | Promote/demote participant (Host only) |
| `remove_participant` | Client ➔ Server | `{ userId }` | Kick user from room (Host only) |
| `request_change` | Client ➔ Server | `{ action, value }` | Participant requests video change or control |
| `action_requested` | Server ➔ Host/Mod | `{ requestId, requesterName, action, value }` | Notification sent to Host/Mod for approval |
| `approve_request` | Host/Mod ➔ Server | `{ requestId, requesterId, action, value }` | Host/Mod approves requested action |
| `reject_request` | Host/Mod ➔ Server | `{ requestId, requesterId }` | Host/Mod declines requested action |
| `user_joined` | Server ➔ Clients | `{ username, userId, role, participants }` | Broadcast new participant |
| `user_left` | Server ➔ Clients | `{ username, userId, participants }` | Broadcast participant departure |
| `role_assigned` | Server ➔ Clients | `{ userId, username, role, participants }` | Broadcast role update |
| `participant_removed` | Server ➔ Client | `{ message }` | Direct kick notification |
| `chat_message` | Bidirectional | `{ text, username, userId, timestamp }` | Live room chat (max 500 chars) |
| `reaction` | Bidirectional | `{ emoji, username, userId }` | Live floating emoji reactions |

---

## 🚀 Setup & Running Locally

### 1. Prerequisites
- Node.js (v18 or v20+)
- npm or yarn

### 2. Backend Setup:
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
*Backend runs on `http://localhost:3001`*

### 3. Frontend Setup:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🌐 Production Deployment Guide

### A. Deploy Backend (Render / Railway)
1. Push this repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Set the Root Directory to `server`.
4. Configure Build & Start commands:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Add Environment Variables in the hosting dashboard:
   - `PORT` = `3001` (or default assigned by host)
   - `JWT_SECRET` = `<your-secure-random-secret>`
   - `CLIENT_URL` = `https://your-frontend.vercel.app`
   - `REDIS_URL` = `<your-upstash-redis-url>` *(Optional for horizontal clustering)*

> [!NOTE]
> SQLite uses a local file (`dev.sqlite`). On free ephemeral hosting (like Render Free Tier), local disk restarts wipe file storage. For permanent cloud storage in production, connect a cloud database (PostgreSQL / Supabase / Turso SQLite) or add a persistent disk volume.

### B. Deploy Frontend (Vercel)
1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Set Framework Preset to **Vite** and Root Directory to `client`.
3. Add Environment Variables:
   - `VITE_API_BASE_URL` = `https://your-backend-service.onrender.com`
   - `VITE_SOCKET_URL` = `https://your-backend-service.onrender.com`
4. Click **Deploy**.
