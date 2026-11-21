import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { calculateLineGst, numberToWordsIndian } from '../utils/gst.utils';
import { BusyApiService } from '../services/busy.service';

/**
 * Generate Next Auto Invoice Number (e.g. INV/26-27/0001)
 */
const getNextInvoiceNumber = async (): Promise<{ invoiceNumber: string; series: string; financialYear: string }> => {
  const settings = await prisma.accountingSetting.findFirst();
  const prefix = settings?.invoicePrefix || 'INV/26-27/';
  const financialYear = '26-27';

  const series = await prisma.numberSeries.upsert({
    where: { type: 'INVOICE' },
    update: { currentSeq: { increment: 1 } },
    create: { type: 'INVOICE', prefix, financialYear, currentSeq: 1 },
  });

  const formattedSeq = String(series.currentSeq).padStart(4, '0');
  const invoiceNumber = `${prefix}${formattedSeq}`;
  return { invoiceNumber, series: 'INV', financialYear };
};

/**
 * Get All Invoices with Filtering
 */
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { status, partyId, search } = req.query;

    const where: any = {};
    if (status) where.status = String(status);
    if (partyId) where.partyId = String(partyId);
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search) } },
        { party: { name: { contains: String(search) } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        party: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch invoices' });
  }
};

/**
 * Get Single Invoice Details by ID
 */
export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        party: true,
        items: { include: { item: true } },
        payments: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const settings = await prisma.accountingSetting.findFirst();

    res.json({ invoice, settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch invoice details' });
  }
};

/**
 * Create New GST Invoice
 */
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      partyId,
      invoiceDate,
      dueDate,
      placeOfSupply,
      freightCharges = 0,
      packingCharges = 0,
      discountAmount = 0,
      terms,
      notes,
      items = [],
      shipToName,
      shipToAddress,
      shipToGstin,
      shipToState,
      reverseCharge = 'N',
      grRrNo,
      transportName,
      vehicleNo,
      station,
      ewayBillNo,
    } = req.body;

    if (!partyId || !items.length) {
      res.status(400).json({ message: 'Party and at least one item line are required' });
      return;
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) {
      res.status(404).json({ message: 'Selected Party not found' });
      return;
    }

    const companySettings = await prisma.accountingSetting.findFirst();
    const companyState = companySettings?.companyState || 'Rajasthan';
    const isInterstate = party.state.trim().toLowerCase() !== companyState.trim().toLowerCase();

    // Calculate Items Math
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const processedItems = items.map((it: any) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.rate) || 0;
      const discPct = Number(it.discountPct) || 0;
      const discAmt = (qty * rate * discPct) / 100;
      const taxable = qty * rate - discAmt;
      const priceAfterDiscount = qty > 0 ? taxable / qty : rate;
      const gstPct = Number(it.gstPercentage) || 18;

      const gstCalc = calculateLineGst(taxable, gstPct, isInterstate);

      totalTaxable += taxable;
      totalCgst += gstCalc.cgstAmount;
      totalSgst += gstCalc.sgstAmount;
      totalIgst += gstCalc.igstAmount;

      return {
        itemId: it.itemId || null,
        itemName: it.itemName,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        unit: it.unit || 'Units',
        quantity: qty,
        rate,
        discountPct: discPct,
        discountAmt: discAmt,
        taxableAmount: taxable,
        priceAfterDiscount,
        gstPercentage: gstPct,
        cgstAmount: gstCalc.cgstAmount,
        sgstAmount: gstCalc.sgstAmount,
        igstAmount: gstCalc.igstAmount,
        totalAmount: gstCalc.totalAmount,
      };
    });

    const freight = Number(freightCharges) || 0;
    const packing = Number(packingCharges) || 0;
    const discount = Number(discountAmount) || 0;

    const rawGrandTotal = totalTaxable + totalCgst + totalSgst + totalIgst + freight + packing - discount;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));
    const amountInWords = numberToWordsIndian(roundedGrandTotal);

    const { invoiceNumber, series, financialYear } = await getNextInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        series,
        financialYear,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        partyId,
        shipToName: shipToName || null,
        shipToAddress: shipToAddress || null,
        shipToGstin: shipToGstin || null,
        shipToState: shipToState || null,
        reverseCharge,
        grRrNo: grRrNo || null,
        transportName: transportName || null,
        vehicleNo: vehicleNo || null,
        station: station || null,
        ewayBillNo: ewayBillNo || null,
        placeOfSupply: placeOfSupply || party.state,
        isInterstate,
        subtotal: totalTaxable,
        discountAmount: discount,
        taxableAmount: totalTaxable,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        freightCharges: freight,
        packingCharges: packing,
        roundOff,
        grandTotal: roundedGrandTotal,
        amountInWords,
        balanceAmount: roundedGrandTotal,
        status: 'UNPAID',
        terms: terms || companySettings?.termsAndConditions,
        notes,
        items: {
          create: processedItems,
        },
      },
      include: {
        party: true,
        items: true,
      },
    });

    // Auto-reduce stock for product items
    for (const line of processedItems) {
      if (line.itemId) {
        prisma.accountingItem.updateMany({
          where: { id: line.itemId, type: 'PRODUCT' },
          data: { currentStock: { decrement: line.quantity } },
        }).catch(console.error);
      }
    }

    // Auto-push to BUSY asynchronously
    BusyApiService.pushVoucher('INVOICE', invoice.id, invoice.invoiceNumber, {
      voucherType: companySettings?.salesVoucherType || 'Sales',
      voucherNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate.toISOString().split('T')[0],
      partyName: party.name,
      partyGstin: party.gstin || undefined,
      partyState: party.state,
      amount: invoice.grandTotal,
      items: invoice.items.map((it) => ({
        itemName: it.itemName,
        qty: it.quantity,
        rate: it.rate,
        amount: it.totalAmount,
        hsnSac: it.hsnSac || undefined,
        unit: it.unit,
        gstPct: it.gstPercentage,
      })),
    })
      .then((busyRes) => {
        prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            busyVoucherNo: busyRes.busyVoucherNo,
            busySyncStatus: 'SYNCED',
            busySyncedAt: new Date(),
            busySyncError: null,
          },
        }).catch(console.error);
      })
      .catch((err) => {
        prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            busySyncStatus: 'FAILED',
            busySyncError: err.message,
          },
        }).catch(console.error);
      });

    res.json({ success: true, message: 'Invoice generated successfully!', invoice });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create invoice' });
  }
};

/**
 * Manually Push Invoice to BUSY
 */
export const pushInvoiceToBusy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { party: true, items: true },
    });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const companySettings = await prisma.accountingSetting.findFirst();

    const invAny = invoice as any;
    const busyRes = await BusyApiService.pushVoucher('INVOICE', invoice.id, invoice.invoiceNumber, {
      voucherType: companySettings?.salesVoucherType || 'Sales',
      voucherNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate.toISOString().split('T')[0]!,
      partyName: invAny.party?.name || '',
      partyGstin: invAny.party?.gstin || undefined,
      partyState: invAny.party?.state || '',
      amount: invoice.grandTotal,
      items: (invAny.items || []).map((it: any) => ({
        itemName: it.itemName,
        qty: it.quantity,
        rate: it.rate,
        amount: it.totalAmount,
        hsnSac: it.hsnSac || undefined,
        unit: it.unit,
        gstPct: it.gstPercentage,
      })),
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        busyVoucherNo: busyRes.busyVoucherNo,
        busySyncStatus: 'SYNCED',
        busySyncedAt: new Date(),
        busySyncError: null,
      },
    });

    res.json({ success: true, message: 'Invoice pushed to BUSY successfully!', invoice: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to push invoice to BUSY' });
  }
};

/**
 * Cancel Invoice
 */
export const cancelInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = (req.params as any);
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true, message: 'Invoice cancelled', invoice: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel invoice' });
  }
};
