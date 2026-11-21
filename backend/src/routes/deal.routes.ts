import { Router } from 'express';
import { getDeals, createDeal, updateDeal, updateDealStage, deleteDeal } from '../controllers/deal.controller';
import { authenticate, checkPermissionKey } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', checkPermissionKey('deals.view'), getDeals);
router.post('/', checkPermissionKey('deals.create'), createDeal);
router.put('/:id', checkPermissionKey('deals.edit'), updateDeal);
router.patch('/:id/stage', checkPermissionKey('deals.edit'), updateDealStage);
router.delete('/:id', checkPermissionKey('deals.delete'), deleteDeal);

export default router;
