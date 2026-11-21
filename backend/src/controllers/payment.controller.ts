import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BusyApiService } from '../services/busy.service';

/**
 * Generate Next Receipt Number (e.g. REC/26-27/0001)
 */
const getNextReceiptNumber = async (): Promise<string> => {
  const settings = await prisma.accountingSetting.findFirst();
  const prefix = 'REC/26-27/';

  const series = await prisma.numberSeries.upsert({
    where: { type: 'RECEIPT' },
    update: { currentSeq: { increment: 1 } },
    create: { type: 'RECEIPT', prefix, financialYear: '26-27', currentSeq: 1 },
  });

  const formattedSeq = String(series.currentSeq).padStart(4, '0');
  return `${prefix}${formattedSeq}`;
};

/**
 * Get All Payments / Receipts
 */
export const getPayments = async (req: Request, res: Response) => {
  try {
    const { partyId, invoiceId } = req.query;
    const where: any = {};
    if (partyId) where.partyId = String(partyId);
    if (invoiceId) where.invoiceId = String(invoiceId);

    const payments = await prisma.paymentReceipt.findMany({
      where,
      include: {
        invoice: true,
        party: true,
      },
      orderBy: { receiptDate: 'desc' },
    });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch payments' });
  }
};

/**
 * Record New Payment Receipt
 */
export const createPaymentReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, amount, paymentMode, referenceNo, receiptDate, notes } = req.body;

    if (!invoiceId || !amount || Number(amount) <= 0) {
      res.status(400).json({ message: 'Valid Invoice ID and amount are required' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { party: true },
    });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const receiptAmount = Number(amount);
    const receiptNumber = await getNextReceiptNumber();

    const payment = await prisma.paymentReceipt.create({
      data: {
        receiptNumber,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        invoiceId: invoice.id,
        partyId: invoice.partyId,
        amount: receiptAmount,
        paymentMode: paymentMode || 'Bank Transfer',
        referenceNo,
        notes,
      },
      include: {
        invoice: true,
        party: true,
      },
    });

    // Recalculate Invoice Paid & Balance Amount
    const newPaidAmount = invoice.paidAmount + receiptAmount;
    const newBalanceAmount = Math.max(0, invoice.grandTotal - newPaidAmount);

    let newStatus = 'UNPAID';
    if (newBalanceAmount === 0) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL';
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
      },
    });

    // Update Party Balance
    await prisma.party.update({
      where: { id: invoice.partyId },
      data: {
        currentBalance: { decrement: receiptAmount },
      },
    });

    // Push Receipt Voucher to BUSY
    const companySettings = await prisma.accountingSetting.findFirst();
    BusyApiService.pushVoucher('PAYMENT', payment.id, payment.receiptNumber, {
      voucherType: companySettings?.receiptVoucherType || 'Receipt',
      voucherNumber: payment.receiptNumber,
      date: payment.receiptDate.toISOString().split('T')[0],
      partyName: invoice.party.name,
      partyGstin: invoice.party.gstin || undefined,
      partyState: invoice.party.state,
      amount: payment.amount,
      narration: `Payment received against Invoice ${invoice.invoiceNumber}. Ref: ${referenceNo || 'N/A'}`,
    })
      .then((busyRes) => {
        prisma.paymentReceipt.update({
          where: { id: payment.id },
          data: {
            busyVoucherNo: busyRes.busyVoucherNo,
            busySyncStatus: 'SYNCED',
            busySyncedAt: new Date(),
          },
        }).catch(console.error);
      })
      .catch((err) => {
        prisma.paymentReceipt.update({
          where: { id: payment.id },
          data: { busySyncStatus: 'FAILED', busySyncError: err.message },
        }).catch(console.error);
      });

    res.json({ success: true, message: 'Payment recorded successfully', payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to record payment' });
  }
};

/**
 * Customer Ledger Statement
 */
export const getCustomerLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { partyId } = (req.params as any);

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) {
      res.status(404).json({ message: 'Party not found' });
      return;
    }

    const invoices = await prisma.invoice.findMany({
      where: { partyId },
      orderBy: { invoiceDate: 'asc' },
    });

    const receipts = await prisma.paymentReceipt.findMany({
      where: { partyId },
      orderBy: { receiptDate: 'asc' },
    });

    // Merge transactions into chronological ledger
    const transactions: any[] = [];

    invoices.forEach((inv) => {
      transactions.push({
        date: inv.invoiceDate,
        type: 'INVOICE',
        refNo: inv.invoiceNumber,
        debit: inv.grandTotal,
        credit: 0,
        status: inv.status,
      });
    });

    receipts.forEach((rec) => {
      transactions.push({
        date: rec.receiptDate,
        type: 'RECEIPT',
        refNo: rec.receiptNumber,
        debit: 0,
        credit: rec.amount,
        mode: rec.paymentMode,
      });
    });

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = party.openingBalance;
    const statement = transactions.map((t) => {
      runningBalance += t.debit - t.credit;
      return { ...t, runningBalance };
    });

    res.json({ party, openingBalance: party.openingBalance, closingBalance: runningBalance, statement });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch ledger statement' });
  }
};
