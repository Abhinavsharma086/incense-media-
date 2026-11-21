import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { calculateLineGst, numberToWordsIndian } from '../utils/gst.utils';
import { BusyApiService } from '../services/busy.service';

/**
 * Generate Next Proforma Number (e.g. PI/26-27/0001)
 */
const getNextProformaNumber = async (): Promise<{ proformaNumber: string; series: string; financialYear: string }> => {
  const settings = await prisma.accountingSetting.findFirst();
  const prefix = settings?.proformaPrefix || 'PI/26-27/';
  const financialYear = '26-27';

  const series = await prisma.numberSeries.upsert({
    where: { type: 'PROFORMA' },
    update: { currentSeq: { increment: 1 } },
    create: { type: 'PROFORMA', prefix, financialYear, currentSeq: 1 },
  });

  const formattedSeq = String(series.currentSeq).padStart(4, '0');
  const proformaNumber = `${prefix}${formattedSeq}`;
  return { proformaNumber, series: 'PI', financialYear };
};

/**
 * Get All Proforma Invoices
 */
export const getProformaInvoices = async (req: Request, res: Response) => {
  try {
    const { status, partyId, search } = req.query;

    const where: any = {};
    if (status) where.status = String(status);
    if (partyId) where.partyId = String(partyId);
    if (search) {
      where.OR = [
        { proformaNumber: { contains: String(search) } },
        { party: { name: { contains: String(search) } } },
      ];
    }

    const list = await prisma.proformaInvoice.findMany({
      where,
      include: {
        party: true,
        items: true,
        convertedInvoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch proforma invoices' });
  }
};

/**
 * Get Single PI Detail
 */
export const getProformaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const pi = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        party: true,
        items: { include: { item: true } },
        convertedInvoice: true,
      },
    });

    if (!pi) {
      res.status(404).json({ message: 'Proforma invoice not found' });
      return;
    }

    const settings = await prisma.accountingSetting.findFirst();

    res.json({ proforma: pi, settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch proforma invoice' });
  }
};

/**
 * Create Proforma Invoice
 */
export const createProformaInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      partyId,
      proformaDate,
      validUntil,
      placeOfSupply,
      freightCharges = 0,
      packingCharges = 0,
      discountAmount = 0,
      advanceReceived = 0,
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
      res.status(400).json({ message: 'Party and line items are required' });
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

    const { proformaNumber, series, financialYear } = await getNextProformaNumber();

    const pi = await prisma.proformaInvoice.create({
      data: {
        proformaNumber,
        series,
        financialYear,
        proformaDate: proformaDate ? new Date(proformaDate) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
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
        advanceReceived: Number(advanceReceived) || 0,
        status: 'DRAFT',
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

    // Optionally push PI to BUSY as Sales Order or Proforma Voucher
    BusyApiService.pushVoucher('PROFORMA', pi.id, pi.proformaNumber, {
      voucherType: companySettings?.proformaVoucherType || 'Proforma Invoice',
      voucherNumber: pi.proformaNumber,
      date: pi.proformaDate.toISOString().split('T')[0],
      partyName: party.name,
      partyGstin: party.gstin || undefined,
      partyState: party.state,
      amount: pi.grandTotal,
      items: pi.items.map((it) => ({
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
        prisma.proformaInvoice.update({
          where: { id: pi.id },
          data: {
            busyVoucherNo: busyRes.busyVoucherNo,
            busySyncStatus: 'SYNCED',
            busySyncedAt: new Date(),
          },
        }).catch(console.error);
      })
      .catch((err) => {
        prisma.proformaInvoice.update({
          where: { id: pi.id },
          data: { busySyncStatus: 'FAILED', busySyncError: err.message },
        }).catch(console.error);
      });

    res.json({ success: true, message: 'Proforma Invoice generated successfully!', proforma: pi });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create Proforma Invoice' });
  }
};

/**
 * 1-Click Convert Proforma Invoice to Tax Invoice
 */
export const convertPiToInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const pi = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: { party: true, items: true },
    });

    if (!pi) {
      res.status(404).json({ message: 'Proforma invoice not found' });
      return;
    }

    if (pi.status === 'CONVERTED') {
      res.status(400).json({ message: 'Proforma invoice is already converted to an Invoice' });
      return;
    }

    const companySettings = await prisma.accountingSetting.findFirst();

    const piAny = pi as any;

    // Generate Invoice Number
    const prefix = companySettings?.invoicePrefix || 'INV/26-27/';
    const series = await prisma.numberSeries.upsert({
      where: { type: 'INVOICE' },
      update: { currentSeq: { increment: 1 } },
      create: { type: 'INVOICE', prefix, financialYear: '26-27', currentSeq: 1 },
    });

    const formattedSeq = String(series.currentSeq).padStart(4, '0');
    const invoiceNumber = `${prefix}${formattedSeq}`;

    // Create Invoice with linked data
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        series: 'INV',
        financialYear: '26-27',
        invoiceDate: new Date(),
        partyId: pi.partyId,
        placeOfSupply: pi.placeOfSupply,
        isInterstate: pi.isInterstate,
        subtotal: pi.subtotal,
        discountAmount: pi.discountAmount,
        taxableAmount: pi.taxableAmount,
        cgstAmount: pi.cgstAmount,
        sgstAmount: pi.sgstAmount,
        igstAmount: pi.igstAmount,
        freightCharges: pi.freightCharges,
        packingCharges: pi.packingCharges,
        roundOff: pi.roundOff,
        grandTotal: pi.grandTotal,
        amountInWords: pi.amountInWords,
        paidAmount: pi.advanceReceived,
        balanceAmount: pi.grandTotal - pi.advanceReceived,
        status: pi.advanceReceived >= pi.grandTotal ? 'PAID' : pi.advanceReceived > 0 ? 'PARTIAL' : 'UNPAID',
        terms: pi.terms,
        notes: `Converted from Proforma Invoice ${pi.proformaNumber}`,
        convertedFromPiId: pi.id,
        items: {
          create: (piAny.items || []).map((it: any) => ({
            itemId: it.itemId,
            itemName: it.itemName,
            description: it.description,
            hsnSac: it.hsnSac,
            unit: it.unit,
            quantity: it.quantity,
            rate: it.rate,
            discountPct: it.discountPct,
            discountAmt: it.discountAmt,
            taxableAmount: it.taxableAmount,
            gstPercentage: it.gstPercentage,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          })),
        },
      },
    });

    // Update Proforma Invoice status
    await prisma.proformaInvoice.update({
      where: { id: pi.id },
      data: { status: 'CONVERTED' },
    });

    // Push new Tax Invoice to BUSY
    BusyApiService.pushVoucher('INVOICE', invoice.id, invoice.invoiceNumber, {
      voucherType: companySettings?.salesVoucherType || 'Sales',
      voucherNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate.toISOString().split('T')[0]!,
      partyName: piAny.party?.name || '',
      partyGstin: piAny.party?.gstin || undefined,
      partyState: piAny.party?.state || '',
      amount: invoice.grandTotal,
      items: (piAny.items || []).map((it: any) => ({
        itemName: it.itemName,
        qty: it.quantity,
        rate: it.rate,
        amount: it.totalAmount,
        hsnSac: it.hsnSac || undefined,
        unit: it.unit,
        gstPct: it.gstPercentage,
      })),
    }).catch(console.error);

    res.json({
      success: true,
      message: `Proforma Invoice ${pi.proformaNumber} converted to Tax Invoice ${invoice.invoiceNumber}`,
      invoice,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to convert Proforma Invoice' });
  }
};
