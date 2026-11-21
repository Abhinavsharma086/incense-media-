import { Request, Response } from 'express';
import prisma from '../utils/prisma';

let isTableInitialized = false;

const ensureReminderTable = async () => {
  if (isTableInitialized) return;
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`PaymentReminder\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`invoiceId\` VARCHAR(191) NOT NULL,
        \`partyId\` VARCHAR(191) NULL,
        \`employeeId\` VARCHAR(191) NULL,
        \`employeeName\` VARCHAR(191) NULL,
        \`reminderDate\` DATETIME NOT NULL,
        \`timeLimit\` DATETIME NULL,
        \`expectedAmount\` DOUBLE DEFAULT 0,
        \`priority\` VARCHAR(50) DEFAULT 'medium',
        \`reminderType\` VARCHAR(50) DEFAULT 'call',
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`notes\` TEXT NULL,
        \`actionTaken\` TEXT NULL,
        \`completedAt\` DATETIME NULL,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`PaymentReminder_invoiceId_idx\` (\`invoiceId\`),
        INDEX \`PaymentReminder_partyId_idx\` (\`partyId\`),
        INDEX \`PaymentReminder_employeeId_idx\` (\`employeeId\`),
        INDEX \`PaymentReminder_reminderDate_idx\` (\`reminderDate\`),
        INDEX \`PaymentReminder_status_idx\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    isTableInitialized = true;
  } catch (err: any) {
    console.warn('[DB] PaymentReminder table ensure warning:', err.message);
  }
};

/**
 * Get all payment reminders with filters & rich invoice/party details
 */
export const getPaymentReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureReminderTable();
    const { status, timeframe, employeeId, search, priority } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (priority && priority !== 'all') {
      where.priority = String(priority);
    }

    if (employeeId && employeeId !== 'all') {
      where.employeeId = String(employeeId);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeframe === 'overdue') {
      where.status = 'pending';
      where.reminderDate = { lt: now };
    } else if (timeframe === 'today') {
      where.status = 'pending';
      where.reminderDate = { gte: startOfToday, lte: endOfToday };
    } else if (timeframe === 'upcoming') {
      where.status = 'pending';
      where.reminderDate = { gt: endOfToday };
    } else if (timeframe === 'completed') {
      where.status = 'completed';
    }

    const reminders = await (prisma as any).paymentReminder.findMany({
      where,
      include: {
        invoice: {
          include: {
            party: true,
          },
        },
        party: true,
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { reminderDate: 'asc' }, // earliest deadline first
      ],
    });

    // Format and annotate with relative urgency tags
    let formatted = reminders.map((r: any) => {
      const remDate = new Date(r.reminderDate);
      const isOverdue = r.status === 'pending' && remDate.getTime() < now.getTime();
      const isDueToday = r.status === 'pending' && remDate >= startOfToday && remDate <= endOfToday;
      const hoursDiff = Math.round((remDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      return {
        ...r,
        party: r.party || r.invoice?.party || null,
        isOverdue,
        isDueToday,
        hoursDiff,
      };
    });

    if (search && String(search).trim() !== '') {
      const q = String(search).toLowerCase().trim();
      formatted = formatted.filter((r: any) => {
        const partyName = (r.party?.name || '').toLowerCase();
        const partyPhone = (r.party?.phone || '').toLowerCase();
        const invNum = (r.invoice?.invoiceNumber || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const empName = (r.employeeName || '').toLowerCase();
        return partyName.includes(q) || partyPhone.includes(q) || invNum.includes(q) || notes.includes(q) || empName.includes(q);
      });
    }

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('getPaymentReminders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch payment reminders' });
  }
};

/**
 * Get aggregated counts for badges & dashboard metrics
 */
export const getPaymentReminderCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureReminderTable();
    const { employeeId } = req.query;

    const baseWhere: any = {};
    if (employeeId && employeeId !== 'all') {
      baseWhere.employeeId = String(employeeId);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [total, pending, overdue, today, upcoming, completed] = await Promise.all([
      (prisma as any).paymentReminder.count({ where: baseWhere }),
      (prisma as any).paymentReminder.count({ where: { ...baseWhere, status: 'pending' } }),
      (prisma as any).paymentReminder.count({
        where: { ...baseWhere, status: 'pending', reminderDate: { lt: now } },
      }),
      (prisma as any).paymentReminder.count({
        where: { ...baseWhere, status: 'pending', reminderDate: { gte: startOfToday, lte: endOfToday } },
      }),
      (prisma as any).paymentReminder.count({
        where: { ...baseWhere, status: 'pending', reminderDate: { gt: endOfToday } },
      }),
      (prisma as any).paymentReminder.count({ where: { ...baseWhere, status: 'completed' } }),
    ]);

    res.json({
      success: true,
      counts: {
        total,
        pending,
        overdue,
        today,
        upcoming,
        completed,
      },
    });
  } catch (error: any) {
    console.error('getPaymentReminderCounts error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch reminder counts' });
  }
};

/**
 * Create or update a payment reminder for an invoice
 */
export const upsertPaymentReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureReminderTable();
    const {
      id,
      invoiceId,
      partyId,
      reminderDate,
      timeLimit,
      expectedAmount,
      priority = 'medium',
      reminderType = 'call',
      notes,
      employeeId,
      employeeName,
    } = req.body;

    if (!invoiceId) {
      res.status(400).json({ success: false, message: 'Invoice ID is required' });
      return;
    }

    if (!reminderDate) {
      res.status(400).json({ success: false, message: 'Reminder Date / Time Limit is required' });
      return;
    }

    // Lookup invoice to get partyId and balance if not provided
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { party: true },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const resolvedPartyId = partyId || invoice.partyId;
    const resolvedAmount = expectedAmount !== undefined ? parseFloat(expectedAmount) : invoice.balanceAmount;
    const parsedReminderDate = new Date(reminderDate);
    const parsedTimeLimit = timeLimit ? new Date(timeLimit) : parsedReminderDate;

    let reminder: any;

    if (id) {
      // Update existing reminder
      reminder = await (prisma as any).paymentReminder.update({
        where: { id },
        data: {
          reminderDate: parsedReminderDate,
          timeLimit: parsedTimeLimit,
          expectedAmount: resolvedAmount,
          priority,
          reminderType,
          notes,
          employeeId: employeeId || undefined,
          employeeName: employeeName || undefined,
          status: 'pending',
        },
      });
    } else {
      // Check if an active pending reminder already exists for this invoice
      const existing = await (prisma as any).paymentReminder.findFirst({
        where: { invoiceId, status: 'pending' },
      });

      if (existing) {
        reminder = await (prisma as any).paymentReminder.update({
          where: { id: existing.id },
          data: {
            reminderDate: parsedReminderDate,
            timeLimit: parsedTimeLimit,
            expectedAmount: resolvedAmount,
            priority,
            reminderType,
            notes: notes || existing.notes,
            employeeId: employeeId || existing.employeeId,
            employeeName: employeeName || existing.employeeName,
            status: 'pending',
          },
        });
      } else {
        reminder = await (prisma as any).paymentReminder.create({
          data: {
            invoiceId,
            partyId: resolvedPartyId,
            employeeId,
            employeeName,
            reminderDate: parsedReminderDate,
            timeLimit: parsedTimeLimit,
            expectedAmount: resolvedAmount,
            priority,
            reminderType,
            status: 'pending',
            notes,
          },
        });
      }
    }

    // Synchronize Invoice dueDate so accounting records mirror the agreed deadline
    try {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          dueDate: parsedReminderDate,
        },
      });
    } catch (invErr) {
      console.warn('Failed to update invoice dueDate:', invErr);
    }

    res.json({
      success: true,
      message: 'Payment reminder & time limit set successfully',
      data: reminder,
    });
  } catch (error: any) {
    console.error('upsertPaymentReminder error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to save payment reminder' });
  }
};

/**
 * Update reminder status (e.g. mark completed, rescheduled, or dismissed)
 */
export const updatePaymentReminderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureReminderTable();
    const { id } = req.params;
    const { status, actionTaken, newReminderDate } = req.body;

    if (!id) {
      res.status(400).json({ success: false, message: 'Reminder ID is required' });
      return;
    }

    const dataToUpdate: any = {};
    if (status) {
      dataToUpdate.status = status;
      if (status === 'completed') {
        dataToUpdate.completedAt = new Date();
      }
    }

    if (actionTaken) {
      dataToUpdate.actionTaken = actionTaken;
    }

    if (newReminderDate) {
      dataToUpdate.reminderDate = new Date(newReminderDate);
      dataToUpdate.timeLimit = new Date(newReminderDate);
      dataToUpdate.status = 'pending';
    }

    const updated = await (prisma as any).paymentReminder.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json({
      success: true,
      message: `Reminder status updated to ${status || 'updated'}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('updatePaymentReminderStatus error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update reminder' });
  }
};

/**
 * Delete a payment reminder
 */
export const deletePaymentReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureReminderTable();
    const { id } = req.params;

    await (prisma as any).paymentReminder.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error: any) {
    console.error('deletePaymentReminder error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete reminder' });
  }
};

