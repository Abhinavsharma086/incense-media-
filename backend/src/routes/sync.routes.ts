import { Router } from 'express';
import { getSyncStatus } from '../controllers/sync.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Allows both authenticated and fallback calls for client sync polling
router.get('/status', authenticate, getSyncStatus);

export default router;
