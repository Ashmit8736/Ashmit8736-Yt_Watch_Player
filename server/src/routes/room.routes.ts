import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';

const router = Router();

router.get('/active', RoomController.getActiveRooms);
router.get('/latest', RoomController.getLatestRoom);

export default router;
