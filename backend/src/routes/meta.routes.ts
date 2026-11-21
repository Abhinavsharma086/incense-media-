import { Router } from 'express';
import {
  getOAuthUrl,
  handleOAuthCallback,
  getConnectedAccounts,
  disconnectAccount,
  syncLeadsNow,
  getLeadForms,
  verifyWebhook,
  handleWebhookEvent,
} from '../controllers/meta.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// OAuth & Meta Settings Routes
router.get('/auth/url', authenticate, getOAuthUrl);
router.post('/auth/callback', authenticate, handleOAuthCallback);
router.get('/accounts', authenticate, getConnectedAccounts);
router.delete('/accounts/:id', authenticate, disconnectAccount);

// Lead Sync & Forms Routes
router.post('/sync', authenticate, syncLeadsNow);
router.get('/forms', authenticate, getLeadForms);

// Meta Webhook Public Endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhookEvent);

export default router;
