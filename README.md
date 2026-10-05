# YouTube Watch Party

A real-time, synchronized YouTube watching experience. Users create or join rooms, and everyone in a room sees the same video state (play/pause, seek position, current video) with role-based control over playback.

**Live demo:** _to be added after deployment_ (frontend: `https://<your-app>.vercel.app`, backend: `https://<your-api>.onrender.com`)

**Tech stack:** React 18 · TypeScript · Vite · Node.js · Express · Socket.IO · SQLite · Redis (optional) · YouTube IFrame API

---

## Table of Contents

1. [Features](#features)
2. [Role-Based Access Control](#role-based-access-control)
3. [Architecture](#architecture)
4. [WebSocket Event Reference](#websocket-event-reference)
5. [Project Structure](#project-structure)
6. [Local Setup](#local-setup)
7. [Environment Variables](#environment-variables)
8. [Deployment](#deployment)
9. [Testing Notes](#testing-notes)
10. [Design Decisions and Trade-offs](#design-decisions-and-trade-offs)

---

## Features

**Core**

- **Real-time synchronization** of play, pause, seek and change-video across all participants over WebSockets (Socket.IO).
- **Room model:** create a room and receive a 6-character room code and shareable link; join by link, by code, or from the list of live rooms.
- **YouTube integration:** the YouTube IFrame Player API with native controls hidden, so all playback is driven by room state.
- **Late-join synchronization:** the server computes the elapsed playback time, so users joining or refreshing land on the current position.
- **Role-based access control** enforced on the server (Host, Moderator, Participant, Viewer).
- **Approval workflow:** participants cannot change playback directly. They can request a video change or a Moderator promotion, and the Host or a Moderator approves or declines the request.
- **Participant list** with live role badges. The Host can assign roles, remove participants, and transfer the Host role.

**Bonus**

- Live text chat (500-character limit, trimmed server-side).
- Floating emoji reactions broadcast to the room.
- Authentication: registration and login with bcrypt-hashed passwords and JWT sessions. Login is required to create or join a room.
- Persistent storage of rooms, participants and video state in SQLite.
- Horizontal scaling support through the Socket.IO Redis adapter (Pub/Sub). Falls back to the in-memory adapter when Redis is not configured.
- Object-oriented domain model (`Participant`, `Room`) and controller/service separation on the backend.

---

## Role-Based Access Control

| Capability | Host | Moderator | Participant / Viewer |
| :--- | :---: | :---: | :---: |
| Play / pause | Yes | Yes | No |
| Seek (seek bar) | Yes | Yes | No |
| Change video | Yes | Yes | Request only |
| Approve / decline requests | Yes | Yes | No |
| Assign roles | Yes | No | No |
| Remove participants | Yes | No | No |
| Transfer Host (assign `Host` to another user) | Yes | No | No |
| Chat and reactions | Yes | Yes | Yes |

How it is enforced:

- The creator of a room becomes **Host**. Everyone else joins as **Participant**.
- Every privileged socket event is validated **on the server** before it is processed. The role is read from the database for the sending socket, never from the client payload. Rejected events return an `error` event and change nothing.
- The `Participant` class (`server/src/models/Participant.ts`) centralizes the permission rules: `canControlPlayback()` (Host or Moderator) and `canManageRoles()` (Host only). Controllers call these methods instead of comparing role strings.
- `assign_role` validates the requested role against the `Role` enum.
- Identity is taken from the verified **JWT** supplied in the Socket.IO handshake. The `username` sent by a client is ignored, so a user cannot impersonate another user (or the Host).
- Role changes are broadcast (`role_assigned`) so every client updates its participant list and enables or disables controls accordingly.

---

## Architecture

```
        Browser A (Host)                 Browser B (Participant)
  React + YouTube IFrame Player       React + YouTube IFrame Player
              |  Socket.IO (WebSocket)            |
              +----------------+------------------+
                               v
                  Node.js / Express server
        +--------------------------------------------+
        |  socketAuthMiddleware  (verifies JWT)      |
        |  SocketController      (events + RBAC)     |
        |  RoomManager           (rooms, state, DB)  |
        +----------------------+---------------------+
                               |
                 SQLite (rooms, participants, video_states, users)
                               |
              Redis Pub/Sub (optional, multi-instance fan-out)
```

**Request flow for a synchronized action (e.g. Host presses Pause):**

1. The client emits `pause` over its WebSocket connection.
2. The server resolves the sender from the database and checks `canControlPlayback()`. Unauthorized senders receive an `error` event.
3. `RoomManager.updateVideoState()` persists the new state with a timestamp.
4. The server emits `sync_state` to the Socket.IO room (`io.to(roomId)`), reaching every participant, including those connected to other server instances when Redis is enabled.
5. Each client's `YouTubePlayer` reconciles its player with the received state (play/pause, seek if drift exceeds 2 seconds, load video if the ID changed).

**Why WebSockets:** playback events must reach all participants within milliseconds, and the server must push updates without clients polling. A persistent bidirectional connection gives low latency, and Socket.IO adds rooms, automatic reconnection, and fallback transports.

**Late join / refresh:** while a video is playing, `RoomManager.getRoom()` adds the time elapsed since the last update to `currentTime`. A client that joins therefore starts at the correct position.

**Host leaves:** when the Host disconnects, playback is paused for the room so participants do not drift. When the last participant leaves, the room is deleted.

**Scaling:** with `REDIS_URL` set, the `@socket.io/redis-adapter` publishes room broadcasts across instances so participants connected to different servers stay in sync. Run multiple instances behind a load balancer with sticky sessions for the Socket.IO polling handshake.

---

## WebSocket Event Reference

Authentication: the client passes its JWT in the handshake (`io(url, { auth: { token } })`).

| Event | Direction | Payload | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `join_room` | Client to Server | `{ roomId?, create? }` | Authenticated | Join or create a room. Username comes from the JWT. |
| `room_joined` | Server to Client | `{ roomId }` | - | Confirms the join to the joining client. |
| `leave_room` | Client to Server | `{}` | Member | Leave the current room. |
| `user_joined` | Server to Room | `{ username, userId, role, participants }` | - | A participant joined (list includes roles). |
| `user_left` | Server to Room | `{ username, userId, participants }` | - | A participant left or was removed. |
| `sync_state` | Server to Room/Client | `{ playState, currentTime, videoId, updatedAt }` | - | Authoritative video state. |
| `play` | Client to Server | `{}` | Host, Moderator | Start playback. |
| `pause` | Client to Server | `{}` | Host, Moderator | Pause playback. |
| `seek` | Client to Server | `{ time }` | Host, Moderator | Seek to a position (seconds). |
| `change_video` | Client to Server | `{ videoId }` | Host, Moderator | Load a different video. |
| `assign_role` | Client to Server | `{ userId, role }` | Host | Assign a role. Assigning `Host` transfers ownership. |
| `role_assigned` | Server to Room | `{ userId, username, role, participants }` | - | A role changed. |
| `remove_participant` | Client to Server | `{ userId }` | Host | Remove a participant. |
| `participant_removed` | Server to Client | `{ message }` | - | Sent to the removed user. |
| `request_change` | Client to Server | `{ action, value? }` | Member | Ask for a change. `action` is `change_video` or `request_mod`. |
| `action_requested` | Server to Host/Mods | `{ requestId, requesterId, requesterName, action, value }` | - | A pending request. |
| `approve_request` | Client to Server | `{ requestId, requesterId, requesterName, action, value }` | Host, Moderator | Approve and execute the request. |
| `reject_request` | Client to Server | `{ requestId, requesterId, requesterName }` | Host, Moderator | Decline the request. |
| `request_approved` / `request_rejected` | Server to Client | `{ requestId, message }` | - | Decision sent to the requester. |
| `chat_message` | Bidirectional | `{ text }` out, `{ userId, username, text, timestamp }` in | Member | Room chat. |
| `reaction` | Bidirectional | `{ emoji }` out, `{ userId, username, emoji }` in | Member | Floating emoji reaction. |
| `error` | Server to Client | `{ message }` | - | Validation or permission failure. |

**REST endpoints**

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create an account. Returns user and JWT. |
| `POST` | `/api/auth/login` | Log in. Returns user and JWT. |
| `GET` | `/api/auth/me` | Current user (requires Bearer token). |
| `GET` | `/api/auth/check/:username` | Check whether a username exists. |
| `GET` | `/api/rooms/active` | List live rooms. |
| `GET` | `/health` | Health check, including Redis status. |

---

## Project Structure

```
.
├── client/                      # React + TypeScript + Vite frontend
│   ├── vercel.json              # SPA rewrite so /room/:id works on refresh
│   └── src/
│       ├── app/                 # App shell and router
│       ├── pages/               # HomePage (auth, create/join), RoomPage
│       ├── components/          # YouTubePlayer, PlayerControls, ParticipantList,
│       │                        # ChatBox, ReactionControls, ReactionOverlay, RoomHeader
│       ├── context/             # AuthContext, SocketContext, RoomContext
│       ├── services/            # Axios API client, Socket.IO client
│       └── constants/           # Event names and roles
└── server/                      # Node.js + Express + Socket.IO backend
    └── src/
        ├── server.ts            # HTTP server, CORS, Socket.IO bootstrap
        ├── sockets/             # Socket wiring
        ├── controllers/         # SocketController (events + RBAC), Auth, Room
        ├── models/              # Participant, Room, VideoState, User
        ├── services/            # RoomManager, AuthService, RedisService
        ├── middlewares/         # JWT middleware for Express and Socket.IO
        ├── config/db.ts         # SQLite connection and schema
        └── constants/           # Events, roles, errors
```

Frontend state is kept in three React contexts: `AuthContext` (user and JWT), `SocketContext` (single Socket.IO connection, reconnected when the token changes), and `RoomContext` (participants, current user, video state). The `YouTubePlayer` component loads the IFrame API, translates `sync_state` into player calls, and, for Host/Moderator, translates player actions and the seek bar into socket events.

---

## Local Setup

**Prerequisites:** Node.js 18+ and npm. Redis is optional.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env      # then edit values
npm run dev               # http://localhost:3001
```

```bash
# 2. Frontend (new terminal)
cd client
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

Open `http://localhost:5173`, register two accounts (use a second browser profile or a private window for the second user), create a room with one account, and join it with the other using the room link or code.

**Production build**

```bash
cd server && npm run build && npm start     # compiles to dist/ and runs node dist/server.js
cd client && npm run build                  # outputs client/dist
```

---

## Environment Variables

**Server (`server/.env`)**

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | No | Port to listen on. Default `3001`. |
| `JWT_SECRET` | Yes in production | Secret used to sign JWTs. The server refuses to start in production without it. |
| `CLIENT_URL` | Yes in production | Allowed frontend origin for CORS (e.g. `https://your-app.vercel.app`). |
| `NODE_ENV` | Recommended | Set to `production` when deployed. Enables strict CORS. |
| `REDIS_URL` | No | Redis connection URL (e.g. Upstash `rediss://...`). Enables multi-instance scaling. |
| `REDIS_HOST`, `REDIS_PORT` | No | Alternative to `REDIS_URL`. |

**Client (`client/.env`)**

| Variable | Description |
| :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the backend REST API. |
| `VITE_SOCKET_URL` | URL of the backend WebSocket server (same as the API in this project). |

Never commit `.env` files. They are listed in `.gitignore`.

---

## Deployment

The frontend and backend are deployed separately.

### Backend (Render or Railway)

1. Push the repository to GitHub.
2. Create a **Web Service** with the **Root Directory** set to `server`.
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`
5. Set environment variables: `NODE_ENV=production`, `JWT_SECRET=<random string>`, `CLIENT_URL=<your frontend URL>`, and optionally `REDIS_URL`.
6. Verify with `GET <backend-url>/health`.

Both Render and Railway support WebSocket connections, which Socket.IO requires.

### Frontend (Vercel or Netlify)

1. Import the repository and set the **Root Directory** to `client` (framework preset: Vite).
2. Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the backend URL.
3. Deploy. `client/vercel.json` rewrites all paths to `index.html`, so room links such as `/room/ABC123` keep working on refresh. On Netlify, add an equivalent `_redirects` rule: `/* /index.html 200`.

After the frontend URL is known, update `CLIENT_URL` on the backend and redeploy it.

> **Persistence note:** SQLite writes to a local file. On free hosting tiers with an ephemeral disk (such as Render Free), data is lost on restart or redeploy. Rooms are short-lived by design and the server clears stale room state on startup, but registered users would also be lost. For durable accounts, attach a persistent disk or move to a managed database (PostgreSQL, Turso).

---

## Testing Notes

The role logic and synchronization were verified with a scripted multi-client test (Socket.IO clients as Host, Moderator and Participant) and a headless-browser run of the real UI. Verified behavior includes:

- Host actions (play, seek, change video) reach every participant.
- Participant attempts to play, pause, seek, change video, assign roles, or approve requests are rejected.
- Invalid roles are rejected, and a Moderator cannot remove the Host.
- A request raised by a Participant reaches the Host and Moderators, and approval applies the change for the whole room.
- Connections without a valid token cannot join, and a spoofed username does not grant Host rights.
- In the browser: shared links work for logged-in users, logged-out visitors are sent to the login page with the room pre-filled, the seek bar is disabled for participants, and a Host seek is mirrored on the participant's screen.

---

## Design Decisions and Trade-offs

- **Server-authoritative state.** Clients never decide the video state; they send intents and render `sync_state`. This keeps all participants consistent and makes role enforcement possible.
- **Persisted state plus computed elapsed time.** Storing `currentTime` with a timestamp avoids a constant tick from the server while still supporting late joiners.
- **Single room-state source.** SQLite is accessed through `RoomManager`, so storage can be swapped without touching the event handlers.
- **Drift tolerance.** Clients only seek when they differ from the room state by more than 2 seconds, which avoids stutter from tiny differences.
- **Known limitations.** Playback position is reconciled on state changes rather than on a continuous heartbeat, so a participant who manually stalls (e.g. buffering) will resync on the next event. A user opening the same account in two tabs replaces the first tab's room membership. SQLite is not suited to multi-instance deployments; use a shared database if you scale beyond one server.
