import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BusyApiService } from '../services/busy.service';

/**
 * Get BUSY Sync Logs
 */
export const getSyncLogs = async (req: Request, res: Response) => {
  try {
    const { status, entityType } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (entityType) where.entityType = String(entityType);

    const logs = await prisma.busySyncLog.findMany({
      where,
      orderBy: { syncedAt: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch sync logs' });
  }
};

/**
 * Retry Failed BUSY Sync
 */
export const retryFailedSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const log = await prisma.busySyncLog.findUnique({ where: { id } });

    if (!log) {
      res.status(404).json({ message: 'Sync log not found' });
      return;
    }

    if (log.entityType === 'INVOICE') {
      const inv = await prisma.invoice.findUnique({
        where: { id: log.entityId },
        include: { party: true, items: true },
      });

      if (!inv) {
        res.status(404).json({ message: 'Linked invoice not found' });
        return;
      }

      const companySettings = await prisma.accountingSetting.findFirst();
      const busyRes = await BusyApiService.pushVoucher('INVOICE', inv.id, inv.invoiceNumber, {
        voucherType: companySettings?.salesVoucherType || 'Sales',
        voucherNumber: inv.invoiceNumber,
        date: inv.invoiceDate.toISOString().split('T')[0],
        partyName: inv.party.name,
        partyGstin: inv.party.gstin || undefined,
        partyState: inv.party.state,
        amount: inv.grandTotal,
        items: inv.items.map((it) => ({
          itemName: it.itemName,
          qty: it.quantity,
          rate: it.rate,
          amount: it.totalAmount,
          hsnSac: it.hsnSac || undefined,
          unit: it.unit,
          gstPct: it.gstPercentage,
        })),
      });

      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          busyVoucherNo: busyRes.busyVoucherNo,
          busySyncStatus: 'SYNCED',
          busySyncedAt: new Date(),
          busySyncError: null,
        },
      });
    }

    res.json({ success: true, message: 'Sync retry executed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Retry failed' });
  }
};
