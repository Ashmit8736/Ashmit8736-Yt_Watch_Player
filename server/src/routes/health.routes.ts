import { Router, Request, Response } from 'express';
import { RedisService } from '../services/RedisService';

const router = Router();

// GET /api/health - Server health and Redis status
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    redis: RedisService.getStatus()
  });
});

export default router;
