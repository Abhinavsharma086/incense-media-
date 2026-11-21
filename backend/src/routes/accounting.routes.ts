import {
  getPaymentReminders,
  getPaymentReminderCounts,
  upsertPaymentReminder,
  updatePaymentReminderStatus,
  deletePaymentReminder,
} from '../controllers/reminder.controller';
import { Router } from 'express';
import {
  getAccountingSettings,
  updateAccountingSettings,
  testBusyConnection,
  getParties,
  upsertParty,
  deleteParty,
  getItemCategories,
  upsertItemCategory,
  deleteItemCategory,
  getAccountingItems,
  upsertAccountingItem,
  toggleItemStatus,
  deleteAccountingItem,
  duplicateAccountingItem,
  importAccountingItems,
  seedSampleData,
} from '../controllers/accounting.controller';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  pushInvoiceToBusy,
  cancelInvoice,
} from '../controllers/invoice.controller';
import {
  getProformaInvoices,
  getProformaById,
  createProformaInvoice,
  convertPiToInvoice,
} from '../controllers/proforma.controller';
import {
  getPayments,
  createPaymentReceipt,
  getCustomerLedger,
} from '../controllers/payment.controller';
import {
  getAccountingDashboardMetrics,
  getSalesRegisterReport,
  getOutstandingAgeingReport,
} from '../controllers/accountingReport.controller';
import {
  getSyncLogs,
  retryFailedSync,
} from '../controllers/syncLog.controller';
import { authenticate, checkPermissionKey } from '../middleware/auth.middleware';

const router = Router();

// Settings & BUSY Auth
router.get('/settings', authenticate, checkPermissionKey('settings.view'), getAccountingSettings);
router.post('/settings', authenticate, checkPermissionKey('settings.edit'), updateAccountingSettings);
router.get('/busy/test', authenticate, checkPermissionKey('settings.view'), testBusyConnection);
router.post('/seed', authenticate, checkPermissionKey('settings.edit'), seedSampleData);

// Dashboard Metrics
router.get('/dashboard', authenticate, checkPermissionKey('accounting.view'), getAccountingDashboardMetrics);

// Masters: Parties, Categories & Items
router.get('/parties', authenticate, checkPermissionKey('accounting.view'), getParties);
router.post('/parties', authenticate, checkPermissionKey('accounting.create'), upsertParty);
router.delete('/parties/:id', authenticate, checkPermissionKey('accounting.delete'), deleteParty);

router.get('/categories', authenticate, checkPermissionKey('products.view'), getItemCategories);
router.post('/categories', authenticate, checkPermissionKey('products.create'), upsertItemCategory);
router.delete('/categories/:id', authenticate, checkPermissionKey('products.delete'), deleteItemCategory);

router.get('/items', authenticate, checkPermissionKey('products.view'), getAccountingItems);
router.post('/items', authenticate, checkPermissionKey('products.create'), upsertAccountingItem);
router.put('/items/:id/status', authenticate, checkPermissionKey('products.edit'), toggleItemStatus);
router.delete('/items/:id', authenticate, checkPermissionKey('products.delete'), deleteAccountingItem);
router.post('/items/:id/duplicate', authenticate, checkPermissionKey('products.create'), duplicateAccountingItem);
router.post('/items/import', authenticate, checkPermissionKey('products.create'), importAccountingItems);

// Invoices
router.get('/invoices', authenticate, checkPermissionKey('accounting.view'), getInvoices);
router.get('/invoices/:id', authenticate, checkPermissionKey('accounting.view'), getInvoiceById);
router.post('/invoices', authenticate, checkPermissionKey('accounting.create'), createInvoice);
router.post('/invoices/:id/push-busy', authenticate, checkPermissionKey('accounting.approve'), pushInvoiceToBusy);
router.post('/invoices/:id/cancel', authenticate, checkPermissionKey('accounting.delete'), cancelInvoice);

// Proforma Invoices
router.get('/proformas', authenticate, checkPermissionKey('accounting.view'), getProformaInvoices);
router.get('/proformas/:id', authenticate, checkPermissionKey('accounting.view'), getProformaById);
router.post('/proformas', authenticate, checkPermissionKey('accounting.create'), createProformaInvoice);
router.post('/proformas/:id/convert', authenticate, checkPermissionKey('accounting.edit'), convertPiToInvoice);

// Payments & Ledger
router.get('/payments', authenticate, checkPermissionKey('payments.view'), getPayments);
router.post('/payments', authenticate, checkPermissionKey('payments.create'), createPaymentReceipt);
router.get('/ledger/:partyId', authenticate, checkPermissionKey('payments.view'), getCustomerLedger);

// Reports & Sync Logs
router.get('/reports/sales-register', authenticate, checkPermissionKey('reports.view'), getSalesRegisterReport);
router.get('/reports/ageing', authenticate, checkPermissionKey('reports.view'), getOutstandingAgeingReport);
router.get('/sync-logs', authenticate, checkPermissionKey('accounting.view'), getSyncLogs);
router.post('/sync-logs/:id/retry', authenticate, checkPermissionKey('accounting.approve'), retryFailedSync);


// Payment Reminders & Time Limits
router.get('/reminders', authenticate, getPaymentReminders);
router.get('/reminders/counts', authenticate, getPaymentReminderCounts);
router.post('/reminders', authenticate, upsertPaymentReminder);
router.put('/reminders/:id/status', authenticate, updatePaymentReminderStatus);
router.delete('/reminders/:id', authenticate, deletePaymentReminder);

export default router;
