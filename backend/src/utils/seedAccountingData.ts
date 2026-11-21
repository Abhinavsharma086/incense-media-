import prisma from './prisma';
import { calculateLineGst, numberToWordsIndian } from './gst.utils';
import { BusyApiService } from '../services/busy.service';

export const populateTestEntries = async () => {
  console.log('Seeding accounting test entries...');

  // 1. Seed Company Settings if missing
  let settings = await prisma.accountingSetting.findFirst();
  if (!settings) {
    settings = await prisma.accountingSetting.create({
      data: {
        busyApiUrl: 'http://localhost:8080/api/busy',
        busyCompanyName: 'INCENSE MEDIA',
        companyGstin: '27AAAAA0000A1Z5',
        companyState: 'Maharashtra',
        companyAddress: '101, Commercial Complex, Link Road, Andheri East, Mumbai - 400069',
        bankName: 'HDFC Bank',
        bankAccountNo: '50200012345678',
        bankIfsc: 'HDFC0001234',
        bankBranch: 'Mumbai Main Branch',
        invoicePrefix: 'INV/26-27/',
        proformaPrefix: 'PI/26-27/',
        salesVoucherType: 'Sales',
        proformaVoucherType: 'Proforma Invoice',
        receiptVoucherType: 'Receipt',
        termsAndConditions: '1. Goods once sold will not be taken back.\n2. Payment due within 30 days.\n3. Interest @ 18% p.a. will be charged on overdue bills.',
      },
    });
  }

  // 2. Seed Parties (Customers)
  const party1 = await prisma.party.upsert({
    where: { busyCode: 'BUSY-P-APEX' },
    update: {},
    create: {
      name: 'Apex Traders Pvt Ltd',
      busyCode: 'BUSY-P-APEX',
      gstin: '27AABCA1234F1Z1',
      state: 'Maharashtra',
      address: '402 Trade Tower, Andheri East',
      city: 'Mumbai',
      pincode: '400069',
      phone: '9820011223',
      email: 'accounts@apextraders.com',
      creditDays: 30,
      busySyncStatus: 'SYNCED',
    },
  });

  const party2 = await prisma.party.upsert({
    where: { busyCode: 'BUSY-P-ROYA' },
    update: {},
    create: {
      name: 'Royal Fragrances Ltd',
      busyCode: 'BUSY-P-ROYA',
      gstin: '24AAACR5678B1Z9',
      state: 'Gujarat',
      address: 'GIDC Industrial Area, Sector 2',
      city: 'Ahmedabad',
      pincode: '380015',
      phone: '9879944556',
      email: 'billing@royalfragrances.com',
      creditDays: 45,
      busySyncStatus: 'SYNCED',
    },
  });

  const party3 = await prisma.party.upsert({
    where: { busyCode: 'BUSY-P-FRAG' },
    update: {},
    create: {
      name: 'Fragrance Craft & Co',
      busyCode: 'BUSY-P-FRAG',
      gstin: '27BCCDE9876C1Z2',
      state: 'Maharashtra',
      address: 'Shop 12, Perfume Market, Fort',
      city: 'Mumbai',
      pincode: '400001',
      phone: '9930055443',
      email: 'info@fragrancecraft.in',
      creditDays: 15,
      busySyncStatus: 'SYNCED',
    },
  });

  // 3. Seed Accounting Items
  const item1 = await prisma.accountingItem.upsert({
    where: { busyCode: 'BUSY-I-INCE' },
    update: {},
    create: {
      name: 'Incense Stick Raw Material (Batch A)',
      busyCode: 'BUSY-I-INCE',
      hsnSac: '33074100',
      unit: 'Kg',
      salesRate: 250,
      gstPercentage: 18,
      busySyncStatus: 'SYNCED',
    },
  });

  const item2 = await prisma.accountingItem.upsert({
    where: { busyCode: 'BUSY-I-PREM' },
    update: {},
    create: {
      name: 'Premium Essential Oil 100ml',
      busyCode: 'BUSY-I-PREM',
      hsnSac: '33012990',
      unit: 'Bottle',
      salesRate: 850,
      gstPercentage: 18,
      busySyncStatus: 'SYNCED',
    },
  });

  const item3 = await prisma.accountingItem.upsert({
    where: { busyCode: 'BUSY-I-BAMB' },
    update: {},
    create: {
      name: 'Bamboo Sticks Premium Grade',
      busyCode: 'BUSY-I-BAMB',
      hsnSac: '14011000',
      unit: 'Bundle',
      salesRate: 120,
      gstPercentage: 12,
      busySyncStatus: 'SYNCED',
    },
  });

  // 4. Seed Invoice #1 (Intra-State CGST+SGST)
  const existingInv1 = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV/26-27/0001' } });
  if (!existingInv1) {
    const inv1Taxable = 100 * 250 + 20 * 850; // 25000 + 17000 = 42000
    const inv1Gst = calculateLineGst(inv1Taxable, 18, false);
    const grand1 = Math.round(inv1Gst.totalAmount);

    const inv1 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV/26-27/0001',
        series: 'INV',
        financialYear: '26-27',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        partyId: party1.id,
        placeOfSupply: 'Maharashtra',
        isInterstate: false,
        subtotal: inv1Taxable,
        taxableAmount: inv1Taxable,
        cgstAmount: inv1Gst.cgstAmount,
        sgstAmount: inv1Gst.sgstAmount,
        igstAmount: 0,
        freightCharges: 500,
        grandTotal: grand1 + 500,
        amountInWords: numberToWordsIndian(grand1 + 500),
        paidAmount: 10000,
        balanceAmount: grand1 + 500 - 10000,
        status: 'PARTIAL',
        busyVoucherNo: 'BUSY-INV-0001',
        busySyncStatus: 'SYNCED',
        busySyncedAt: new Date(),
        items: {
          create: [
            {
              itemId: item1.id,
              itemName: item1.name,
              hsnSac: item1.hsnSac,
              unit: item1.unit,
              quantity: 100,
              rate: 250,
              taxableAmount: 25000,
              gstPercentage: 18,
              cgstAmount: 2250,
              sgstAmount: 2250,
              totalAmount: 29500,
            },
            {
              itemId: item2.id,
              itemName: item2.name,
              hsnSac: item2.hsnSac,
              unit: item2.unit,
              quantity: 20,
              rate: 850,
              taxableAmount: 17000,
              gstPercentage: 18,
              cgstAmount: 1530,
              sgstAmount: 1530,
              totalAmount: 20060,
            },
          ],
        },
      },
    });

    // Receipt for Invoice #1
    await prisma.paymentReceipt.create({
      data: {
        receiptNumber: 'REC/26-27/0001',
        receiptDate: new Date(),
        invoiceId: inv1.id,
        partyId: party1.id,
        amount: 10000,
        paymentMode: 'Bank Transfer',
        referenceNo: 'UTR987654321',
        notes: 'Advance part payment received',
        busyVoucherNo: 'BUSY-REC-0001',
        busySyncStatus: 'SYNCED',
        busySyncedAt: new Date(),
      },
    });
  }

  // 5. Seed Invoice #2 (Inter-State IGST)
  const existingInv2 = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV/26-27/0002' } });
  if (!existingInv2) {
    const inv2Taxable = 50 * 850; // 42500
    const inv2Gst = calculateLineGst(inv2Taxable, 18, true);
    const grand2 = Math.round(inv2Gst.totalAmount);

    const inv2 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV/26-27/0002',
        series: 'INV',
        financialYear: '26-27',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 45 * 86400000),
        partyId: party2.id,
        placeOfSupply: 'Gujarat',
        isInterstate: true,
        subtotal: inv2Taxable,
        taxableAmount: inv2Taxable,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: inv2Gst.igstAmount,
        grandTotal: grand2,
        amountInWords: numberToWordsIndian(grand2),
        paidAmount: grand2,
        balanceAmount: 0,
        status: 'PAID',
        busyVoucherNo: 'BUSY-INV-0002',
        busySyncStatus: 'SYNCED',
        busySyncedAt: new Date(),
        items: {
          create: [
            {
              itemId: item2.id,
              itemName: item2.name,
              hsnSac: item2.hsnSac,
              unit: item2.unit,
              quantity: 50,
              rate: 850,
              taxableAmount: 42500,
              gstPercentage: 18,
              igstAmount: 7650,
              totalAmount: 50150,
            },
          ],
        },
      },
    });

    // Receipt for Invoice #2
    await prisma.paymentReceipt.create({
      data: {
        receiptNumber: 'REC/26-27/0002',
        receiptDate: new Date(),
        invoiceId: inv2.id,
        partyId: party2.id,
        amount: grand2,
        paymentMode: 'UPI',
        referenceNo: 'UPI/2026/092811',
        notes: 'Full payment via UPI',
        busyVoucherNo: 'BUSY-REC-0002',
        busySyncStatus: 'SYNCED',
        busySyncedAt: new Date(),
      },
    });
  }

  // 6. Seed Proforma Invoices
  const existingPi1 = await prisma.proformaInvoice.findUnique({ where: { proformaNumber: 'PI/26-27/0001' } });
  if (!existingPi1) {
    await prisma.proformaInvoice.create({
      data: {
        proformaNumber: 'PI/26-27/0001',
        series: 'PI',
        financialYear: '26-27',
        proformaDate: new Date(),
        validUntil: new Date(Date.now() + 15 * 86400000),
        partyId: party2.id,
        placeOfSupply: 'Gujarat',
        isInterstate: true,
        subtotal: 25000,
        taxableAmount: 25000,
        igstAmount: 4500,
        grandTotal: 29500,
        amountInWords: numberToWordsIndian(29500),
        status: 'SENT',
        busyVoucherNo: 'BUSY-PI-0001',
        busySyncStatus: 'SYNCED',
        items: {
          create: [
            {
              itemId: item1.id,
              itemName: item1.name,
              hsnSac: item1.hsnSac,
              unit: item1.unit,
              quantity: 100,
              rate: 250,
              taxableAmount: 25000,
              gstPercentage: 18,
              igstAmount: 4500,
              totalAmount: 29500,
            },
          ],
        },
      },
    });
  }

  // Update NumberSeries
  await prisma.numberSeries.upsert({
    where: { type: 'INVOICE' },
    update: { currentSeq: 3 },
    create: { type: 'INVOICE', prefix: 'INV/26-27/', financialYear: '26-27', currentSeq: 3 },
  });

  await prisma.numberSeries.upsert({
    where: { type: 'PROFORMA' },
    update: { currentSeq: 2 },
    create: { type: 'PROFORMA', prefix: 'PI/26-27/', financialYear: '26-27', currentSeq: 2 },
  });

  await prisma.numberSeries.upsert({
    where: { type: 'RECEIPT' },
    update: { currentSeq: 3 },
    create: { type: 'RECEIPT', prefix: 'REC/26-27/', financialYear: '26-27', currentSeq: 3 },
  });

  console.log('Seeding completed successfully!');
};
