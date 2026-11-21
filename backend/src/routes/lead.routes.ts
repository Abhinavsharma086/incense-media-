import { Router } from 'express';
import {
  getLeads,
  createLead,
  batchImportLeads,
  updateLead,
  deleteLead,
  getDashboardStats,
  getLeadById,
  getLeadTimeline,
  addLeadActivity,
  autoAssignLeadHandler,
  manualAssignLeadHandler,
  bulkAssignLeadsHandler,
  distributeLeadsHandler,
  assignLeadsBySerialOrQuantityHandler,
  autoWaterfallAssignHandler,
  roundRobinWorkloadAssignHandler,
  reassignLeadHandler,
  unassignAllLeadsHandler,
  distributeLeadsEquallyHandler,
  getWorkflowStatusHandler,
  updateWorkflowStatusHandler,
  getWorkloadsHandler,
  getUnassignedLeadsHandler,
  getLeadCategories,
  createLeadCategory,
  updateLeadCategory,
  deleteLeadCategory,
  checkDuplicateLead,
  checkBatchConflictsHandler,
  getLeadReminderCounts,
  getLeadReminders,
  handleLeadReminderAction,
} from '../controllers/lead.controller';
import { getDuplicateLeads, mergeLeads, autoDeduplicateLeads } from '../controllers/leadMerge.controller';
import { syncWebsiteLeadsController } from '../controllers/cms.controller';
import { authenticate, checkPermissionKey } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', checkPermissionKey('leads.view'), getDashboardStats);
router.get('/duplicates', checkPermissionKey('leads.view'), getDuplicateLeads);
router.get('/check-duplicate', checkPermissionKey('leads.view'), checkDuplicateLead);
router.post('/check-batch-conflicts', checkPermissionKey('leads.view'), checkBatchConflictsHandler);
router.post('/merge', checkPermissionKey('leads.edit'), mergeLeads);
router.post('/auto-deduplicate', checkPermissionKey('leads.edit'), autoDeduplicateLeads);
router.post('/clean-duplicates', checkPermissionKey('leads.edit'), autoDeduplicateLeads);
router.post('/sync-website', checkPermissionKey('leads.create'), syncWebsiteLeadsController);

// Lead Assignment Endpoints
router.get('/workload', checkPermissionKey('leads.view'), getWorkloadsHandler);
router.get('/unassigned', checkPermissionKey('leads.view'), getUnassignedLeadsHandler);
router.post('/assign/auto', checkPermissionKey('leads.edit'), autoAssignLeadHandler);
router.post('/assign/manual', checkPermissionKey('leads.edit'), manualAssignLeadHandler);
router.post('/assign/bulk', checkPermissionKey('leads.edit'), bulkAssignLeadsHandler);
router.post('/assign/distribute', checkPermissionKey('leads.edit'), distributeLeadsHandler);
router.post('/assign/serial-quantity', checkPermissionKey('leads.edit'), assignLeadsBySerialOrQuantityHandler);
router.post('/assign/auto-waterfall', checkPermissionKey('leads.edit'), autoWaterfallAssignHandler);
router.post('/assign/round-robin-workload', checkPermissionKey('leads.edit'), roundRobinWorkloadAssignHandler);
router.post('/assign/unassign-all', checkPermissionKey('leads.edit'), unassignAllLeadsHandler);
router.post('/assign/equal-distribute', checkPermissionKey('leads.edit'), distributeLeadsEquallyHandler);
router.get('/assign/workflow-status', checkPermissionKey('leads.view'), getWorkflowStatusHandler);
router.post('/assign/workflow-status', checkPermissionKey('leads.edit'), updateWorkflowStatusHandler);
router.post('/assign/reassign', checkPermissionKey('leads.approve'), reassignLeadHandler);

// Lead Reminders Endpoints (MUST be before /:id)
router.get('/reminders/counts', checkPermissionKey('leads.view'), getLeadReminderCounts);
router.get('/reminders', checkPermissionKey('leads.view'), getLeadReminders);
router.post('/reminders/action', checkPermissionKey('leads.edit'), handleLeadReminderAction);

// Categories Endpoints (MUST be before /:id)
router.get('/categories', checkPermissionKey('leads.view'), getLeadCategories);
router.post('/categories', checkPermissionKey('leads.create'), createLeadCategory);
router.put('/categories/:id', checkPermissionKey('leads.edit'), updateLeadCategory);
router.post('/categories/:id/update', checkPermissionKey('leads.edit'), updateLeadCategory);
router.delete('/categories/:id', (req, res, next) => {
  const user = (req as any).user;
  if (user?.roleName === 'Super Admin' || user?.roleName === 'Admin' || user?.isDevToken) return next();
  return checkPermissionKey('leads.edit')(req, res, next);
}, deleteLeadCategory);
router.post('/categories/:id/delete', (req, res, next) => {
  const user = (req as any).user;
  if (user?.roleName === 'Super Admin' || user?.roleName === 'Admin' || user?.isDevToken) return next();
  return checkPermissionKey('leads.edit')(req, res, next);
}, deleteLeadCategory);

router.get('/:id/timeline', checkPermissionKey('leads.view'), getLeadTimeline);
router.get('/:id/activities', checkPermissionKey('leads.view'), getLeadTimeline);
router.post('/:id/activities', checkPermissionKey('leads.view'), addLeadActivity);
router.get('/:id', checkPermissionKey('leads.view'), getLeadById);
router.get('/', checkPermissionKey('leads.view'), getLeads);
router.post('/batch-import', checkPermissionKey('leads.create'), batchImportLeads);
router.post('/', checkPermissionKey('leads.create'), createLead);
router.put('/:id', checkPermissionKey('leads.edit'), updateLead);
router.delete('/:id', checkPermissionKey('leads.delete'), deleteLead);

export default router;
