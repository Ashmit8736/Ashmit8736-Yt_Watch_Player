import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { setupSockets } from './sockets';
import apiRoutes from './routes';
import { RedisService } from './services/RedisService';

const app = express();
app.use(cors());
app.use(express.json());

// API Routes (MVC Architecture)
app.use('/api', apiRoutes);

// Root health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Provide io instance to Express app
app.set('io', io);

// Initialize Redis Pub/Sub adapter if configured
RedisService.initialize(io);

// Setup SocketController event handling
setupSockets(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
