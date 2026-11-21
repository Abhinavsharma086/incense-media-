import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import {
  getDashboardStats,
  getAdmins,
  createAdmin,
  updateAdmin,
  toggleAdminSuspension,
  resetAdminPassword,
  forceLogoutAdmin,
  deleteAdmin,
  getAdminLoginHistory,
  getAdminPermissions,
  updateAdminPermissions,
  getGlobalSettings,
  updateGlobalSettings,
  getActivityLogs,
  getAdminPermissionKeys,
  updateAdminPermissionKeys,
  copyAdminPermissions,
  getPermissionTemplates,
  createPermissionTemplate,
  applyPermissionTemplate,
  getMyPermissions,
} from '../controllers/superadmin.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Current user permissions endpoint (accessible by any logged in admin/user)
router.get('/my-permissions', getMyPermissions);

// Require Super Admin for remaining management routes
router.use(requireSuperAdmin);

// Dashboard Overview & Stats
router.get('/dashboard/stats', getDashboardStats);

// Admin Management (CRUD)
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.patch('/admins/:id/suspend', toggleAdminSuspension);
router.post('/admins/:id/reset-password', resetAdminPassword);
router.post('/admins/:id/force-logout', forceLogoutAdmin);
router.delete('/admins/:id', deleteAdmin);
router.get('/admins/:id/history', getAdminLoginHistory);

// Granular Permissions (Module matrix & Function keys)
router.get('/admins/:id/permissions', getAdminPermissions);
router.put('/admins/:id/permissions', updateAdminPermissions);
router.get('/admins/:id/permission-keys', getAdminPermissionKeys);
router.put('/admins/:id/permission-keys', updateAdminPermissionKeys);
router.post('/admins/copy-permissions', copyAdminPermissions);
router.post('/admins/:id/apply-template', applyPermissionTemplate);

// Permission Templates
router.get('/permission-templates', getPermissionTemplates);
router.post('/permission-templates', createPermissionTemplate);

// Global Settings & Feature Flags
router.get('/settings', getGlobalSettings);
router.put('/settings', updateGlobalSettings);

// Activity & Audit Logs
router.get('/logs', getActivityLogs);

export default router;
