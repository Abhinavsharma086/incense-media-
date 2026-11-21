import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Accounting Dashboard Metrics Summary
 */
export const getAccountingDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const totalInvoices = await prisma.invoice.count();
    const totalSalesObj = await prisma.invoice.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, paidAmount: true, balanceAmount: true },
    });

    const pendingProformas = await prisma.proformaInvoice.count({
      where: { status: { in: ['DRAFT', 'SENT', 'APPROVED'] } },
    });

    const unpaidInvoices = await prisma.invoice.count({
      where: { status: { in: ['UNPAID', 'PARTIAL'] } },
    });

    const failedSyncs = await prisma.busySyncLog.count({
      where: { status: 'FAILED' },
    });

    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { party: true },
    });

    res.json({
      totalInvoices,
      totalSales: totalSalesObj._sum.grandTotal || 0,
      totalCollected: totalSalesObj._sum.paidAmount || 0,
      totalOutstanding: totalSalesObj._sum.balanceAmount || 0,
      pendingProformas,
      unpaidInvoices,
      failedSyncs,
      recentInvoices,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch accounting dashboard metrics' });
  }
};

/**
 * Sales Register & GST Summary Report (GSTR-1 Format)
 */
export const getSalesRegisterReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { status: { not: 'CANCELLED' } };

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(String(startDate));
      if (endDate) where.invoiceDate.lte = new Date(String(endDate));
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        party: true,
        items: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Summary calculations
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGrand = 0;

    invoices.forEach((inv) => {
      totalTaxable += inv.taxableAmount;
      totalCgst += inv.cgstAmount;
      totalSgst += inv.sgstAmount;
      totalIgst += inv.igstAmount;
      totalGrand += inv.grandTotal;
    });

    res.json({
      totalInvoicesCount: invoices.length,
      totals: {
        taxable: totalTaxable,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        grandTotal: totalGrand,
      },
      invoices,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch sales register report' });
  }
};

/**
 * Outstanding Ageing Analysis Report
 */
export const getOutstandingAgeingReport = async (req: Request, res: Response) => {
  try {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
      include: { party: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const now = new Date();
    const ageingBuckets = {
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket90_plus: 0,
      totalOutstanding: 0,
    };

    const partyWise: Record<string, any> = {};

    unpaidInvoices.forEach((inv) => {
      const days = Math.floor((now.getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 3600 * 24));
      const bal = inv.balanceAmount;

      ageingBuckets.totalOutstanding += bal;

      if (!partyWise[inv.partyId]) {
        partyWise[inv.partyId] = {
          partyName: inv.party.name,
          phone: inv.party.phone,
          creditDays: inv.party.creditDays,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucket90_plus: 0,
          total: 0,
        };
      }

      partyWise[inv.partyId].total += bal;

      if (days <= 30) {
        ageingBuckets.bucket0_30 += bal;
        partyWise[inv.partyId].bucket0_30 += bal;
      } else if (days <= 60) {
        ageingBuckets.bucket31_60 += bal;
        partyWise[inv.partyId].bucket31_60 += bal;
      } else if (days <= 90) {
        ageingBuckets.bucket61_90 += bal;
        partyWise[inv.partyId].bucket61_90 += bal;
      } else {
        ageingBuckets.bucket90_plus += bal;
        partyWise[inv.partyId].bucket90_plus += bal;
      }
    });

    res.json({
      summary: ageingBuckets,
      parties: Object.values(partyWise),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch ageing report' });
  }
};
