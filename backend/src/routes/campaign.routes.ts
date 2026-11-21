import { Router } from 'express';
import { 
    getCampaigns, 
    getCampaign, 
    createCampaign, 
    updateCampaign, 
    deleteCampaign,
    getCampaignDashboardStats
} from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard-stats', getCampaignDashboardStats);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

export default router;
