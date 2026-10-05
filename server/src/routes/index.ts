import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/health', healthRoutes);

export default router;
