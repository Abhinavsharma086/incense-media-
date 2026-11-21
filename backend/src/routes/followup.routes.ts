import { Router } from 'express';
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp } from '../controllers/followup.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getFollowUps);
router.post('/', createFollowUp);
router.put('/:id', updateFollowUp);
router.delete('/:id', deleteFollowUp);

export default router;
