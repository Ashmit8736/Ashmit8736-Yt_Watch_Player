# 🎬 YouTube Watch Party System

A real-time, synchronized YouTube Watch Party web application built with **React**, **TypeScript**, **Node.js**, **Express**, **Socket.IO**, and **SQLite**.

---

## 🌟 Key Features

1. **Real-Time Video Synchronization:**
   - Play, Pause, Seek (scrubbing), and Change Video synchronized across all participants with millisecond accuracy.
   - Dynamic elapsed-time calculation on room join/refresh (just like live broadcast matching).
   - Auto-pause when host refreshes or disconnects to maintain synchronization.

2. **Role-Based Access Control (RBAC):**
   - **Host:** Room creator (full controls, kick users, promote to moderator, transfer host).
   - **Moderator:** Can play, pause, seek, and change videos.
   - **Participant / Viewer:** Watch-only mode with disabled playback tampering.
   - **Transfer Host:** Host can transfer ownership to another participant seamlessly.

3. **User Authentication & Guest Access:**
   - Register with Full Name, Username, and Password.
   - Secure password hashing with `bcryptjs` and 7-day session JWT tokens.
   - Show / Hide password toggle.
   - Instant guest room creation and joining.

4. **Live Interactive Features:**
   - **Real-Time Chat:** Floating chat bubble sidebar for instant communication and video approval requests.
   - **Live Flying Reactions:** YouTube/Instagram Live-style floating emoji animations over the video player synced in real-time across all clients.

---

## 🧱 OOP Architecture for WebSocket Server

The WebSocket backend is designed following strict Object-Oriented Programming (OOP) principles:

- **`Participant` Class (`src/domain/Participant.ts`):**
  - Encapsulates user identity, socket connection, and role-based validation methods (`isHost()`, `canControlPlayback()`, `canManageRoles()`, `setRole()`).
- **`Room` Class (`src/domain/Room.ts`):**
  - Encapsulates room state, participant collections, live elapsed-time calculation, and broadcast helpers (`broadcast()`, `broadcastExcept()`, `syncAll()`).
- **`MessageHandler` Class (`src/domain/MessageHandler.ts`):**
  - Encapsulates all incoming WebSocket event listeners and connects socket events to domain logic.

---

## ⚡ Horizontal Scalability (Redis Pub/Sub Architecture)

For handling **1,000+ concurrent users, 100+ rooms, and multi-server clusters**, the system includes a scalable Redis adapter layer:

- **`RedisService` (`src/services/RedisService.ts`):**
  - Powered by `@socket.io/redis-adapter` and `ioredis`.
  - When multiple server instances run behind a Load Balancer (e.g., NGINX or AWS ALB), the Redis Pub/Sub channel broadcasts room events across all server nodes so users connected to different servers stay in 100% sync.
  - **Graceful Fallback:** If no Redis server is present (e.g., in local development), the server automatically and gracefully runs on the in-memory Socket.io adapter without crashing.

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
| `join_room` | Client ➔ Server | `{ roomId, username }` | Join/create room with assigned role |
| `leave_room` | Client ➔ Server | `{ roomId }` | Leave current room |
| `sync_state` | Server ➔ Clients | `{ playState, currentTime, videoId }` | Live synchronized video state |
| `play` | Client ➔ Server | `{}` | Play video (Host/Mod only) |
| `pause` | Client ➔ Server | `{}` | Pause video (Host/Mod only) |
| `seek` | Client ➔ Server | `{ time }` | Seek/scrub video time (Host/Mod only) |
| `change_video` | Client ➔ Server | `{ videoId }` | Switch YouTube video (Host/Mod only) |
| `assign_role` | Client ➔ Server | `{ userId, role }` | Promote/demote participant (Host only) |
| `remove_participant` | Client ➔ Server | `{ userId }` | Kick user from room (Host only) |
| `user_joined` | Server ➔ Clients | `{ username, userId, role, participants }` | Broadcast new participant |
| `user_left` | Server ➔ Clients | `{ username, userId, participants }` | Broadcast participant departure |
| `role_assigned` | Server ➔ Clients | `{ userId, username, role, participants }` | Broadcast role update |
| `participant_removed` | Server ➔ Clients | `{ userId, message }` | Direct kick notification |
| `chat_message` | Bidirectional | `{ text, username, userId, timestamp }` | Live room chat |
| `reaction` | Bidirectional | `{ emoji, username, userId }` | Live floating emoji reactions |

---

## 🚀 Setup & Running Locally

### 1. Backend:
```bash
cd server
npm install
npm run dev
```
*Runs on `http://localhost:3001`*

### 2. Frontend:
```bash
cd client
npm install
npm run dev
```
*Runs on `http://localhost:5173`*

---

## 🌐 Production Deployment

- **Frontend:** Deploy to **Vercel** or **Netlify**.
- **Backend:** Deploy to **Render** or **Railway** (set `PORT=3001` and optionally `REDIS_URL`).
