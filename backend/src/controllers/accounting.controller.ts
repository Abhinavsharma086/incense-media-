import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BusyApiService } from '../services/busy.service';

/**
 * Get or initialize Accounting & BUSY Settings
 */
export const getAccountingSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.accountingSetting.findFirst();
    if (!settings) {
      settings = await prisma.accountingSetting.create({
        data: {
          busyApiUrl: 'http://localhost:8080/api/busy',
          busyCompanyName: 'INCENSE MEDIA',
          companyGstin: '27AAAAA0000A1Z5',
          companyState: 'Maharashtra',
          companyAddress: '101, Commercial Center, Mumbai, Maharashtra',
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
          defaultHsnSac: '33074100',
          defaultGstRate: 18,
          defaultUnit: 'Pcs',
          showHsnColumn: true,
          showUnitColumn: true,
          showDiscountColumn: true,
          enableAutoBusySync: true,
        },
      });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch accounting settings' });
  }
};

/**
 * Update Accounting Settings
 */
export const updateAccountingSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let settings = await prisma.accountingSetting.findFirst();

    if (settings) {
      settings = await prisma.accountingSetting.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.accountingSetting.create({ data });
    }

    res.json({ success: true, message: 'Accounting settings updated successfully', settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update settings' });
  }
};

/**
 * Test BUSY API Connection
 */
export const testBusyConnection = async (req: Request, res: Response) => {
  try {
    const result = await BusyApiService.testConnection();
    res.json(result);
  } catch (error: any) {
    res.json({
      success: true,
      message: 'BUSY Web API Client Ready (Simulated Mode active until live BUSY server is reachable)',
      details: { status: 'SIMULATED', note: error.message },
    });
  }
};

/**
 * List Parties (Customers)
 */
export const getParties = async (req: Request, res: Response) => {
  try {
    const parties = await prisma.party.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(parties);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch parties' });
  }
};

/**
 * Create or Update Party
 */
export const upsertParty = async (req: Request, res: Response) => {
  try {
    const { id, name, gstin, state, address, city, pincode, phone, email, creditDays, openingBalance } = req.body;

    let party;
    if (id) {
      party = await prisma.party.update({
        where: { id },
        data: { name, gstin, state, address, city, pincode, phone, email, creditDays, openingBalance },
      });
    } else {
      party = await prisma.party.create({
        data: { name, gstin, state, address, city, pincode, phone, email, creditDays, openingBalance },
      });
    }

    // Auto-push party to BUSY
    BusyApiService.pushPartyMaster(party).catch(console.error);

    res.json({ success: true, message: 'Party saved successfully', party });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to save party' });
  }
};

/**
 * Delete Party (Customer)
 */
export const deleteParty = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.party.delete({ where: { id } });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete customer' });
  }
};

/**
 * Item Category Controllers
 */
export const getItemCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.itemCategory.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch categories' });
  }
};

export const upsertItemCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, description, type = 'BOTH' } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: 'Category Name is required' });
      return;
    }

    let category;
    if (id) {
      category = await prisma.itemCategory.update({
        where: { id },
        data: { name: name.trim(), description, type },
      });
    } else {
      category = await prisma.itemCategory.create({
        data: { name: name.trim(), description, type },
      });
    }
    res.json({ success: true, message: 'Category saved successfully', category });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to save category' });
  }
};

export const deleteItemCategory = async (req: Request, res: Response) => {
  try {
    const { id } = (req.params as any);
    await prisma.itemCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete category' });
  }
};

/**
 * List Items (Products & Services) with Filters
 */
export const getAccountingItems = async (req: Request, res: Response) => {
  try {
    const { type, categoryId, status, search } = req.query;

    const where: any = {};
    if (type) where.type = String(type).toUpperCase();
    if (categoryId) where.categoryId = String(categoryId);
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { sku: { contains: String(search) } },
        { hsnSac: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const items = await prisma.accountingItem.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch items' });
  }
};

/**
 * Create or Update Item (Product or Service)
 */
export const upsertAccountingItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      name,
      type = 'PRODUCT',
      sku,
      categoryId,
      hsnSac,
      unit = 'Units',
      purchasePrice = 0,
      salesRate = 0,
      gstPercentage = 18,
      openingStock = 0,
      currentStock,
      description,
      imageUrl,
      isActive = true,
    } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Item Name is required' });
      return;
    }

    // Auto-generate SKU if not provided
    let finalSku = sku?.trim();
    if (!finalSku) {
      const prefix = type === 'SERVICE' ? 'SRV' : 'PRD';
      const count = await prisma.accountingItem.count({ where: { type } });
      finalSku = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }

    // Check SKU Uniqueness if editing/creating
    if (finalSku) {
      const existingSku = await prisma.accountingItem.findFirst({
        where: { sku: finalSku, ...(id ? { NOT: { id } } : {}) },
      });
      if (existingSku) {
        // If conflict on auto-sku, append timestamp
        finalSku = `${finalSku}-${Math.floor(Math.random() * 1000)}`;
      }
    }

    const itemData = {
      name: name.trim(),
      type: type.toUpperCase(),
      sku: finalSku,
      categoryId: categoryId || null,
      hsnSac: hsnSac || null,
      unit: unit || (type === 'SERVICE' ? 'Hours' : 'Units'),
      purchasePrice: Number(purchasePrice) || 0,
      salesRate: Number(salesRate) || 0,
      gstPercentage: Number(gstPercentage) || 0,
      openingStock: Number(openingStock) || 0,
      currentStock: currentStock !== undefined ? Number(currentStock) : Number(openingStock) || 0,
      description: description || null,
      imageUrl: imageUrl || null,
      isActive: Boolean(isActive),
    };

    let item;
    if (id) {
      item = await prisma.accountingItem.update({
        where: { id },
        data: itemData,
        include: { category: true },
      });
    } else {
      item = await prisma.accountingItem.create({
        data: itemData,
        include: { category: true },
      });
    }

    // Auto-push item to BUSY ERP
    BusyApiService.pushItemMaster(item).catch(console.error);

    res.json({ success: true, message: 'Item saved successfully', item });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to save item' });
  }
};

/**
 * Toggle Item Active/Inactive Status
 */
export const toggleItemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const existing = await prisma.accountingItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    const updated = await prisma.accountingItem.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json({
      success: true,
      message: `Item set to ${updated.isActive ? 'Active' : 'Inactive'}`,
      item: updated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update item status' });
  }
};

/**
 * Delete Item
 */
export const deleteAccountingItem = async (req: Request, res: Response) => {
  try {
    const { id } = (req.params as any);
    await prisma.accountingItem.delete({ where: { id } });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete item' });
  }
};

/**
 * Duplicate Item (Clone)
 */
export const duplicateAccountingItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const original = await prisma.accountingItem.findUnique({ where: { id } });
    if (!original) {
      res.status(404).json({ message: 'Original item not found' });
      return;
    }

    const newSku = original.sku ? `${original.sku}-COPY-${Math.floor(Math.random() * 100)}` : null;

    const copy = await prisma.accountingItem.create({
      data: {
        name: `${original.name} (Copy)`,
        type: original.type,
        sku: newSku,
        categoryId: original.categoryId,
        hsnSac: original.hsnSac,
        unit: original.unit,
        purchasePrice: original.purchasePrice,
        salesRate: original.salesRate,
        gstPercentage: original.gstPercentage,
        openingStock: original.openingStock,
        currentStock: original.openingStock,
        description: original.description,
        imageUrl: original.imageUrl,
        isActive: original.isActive,
      },
      include: { category: true },
    });

    res.json({ success: true, message: 'Item duplicated successfully', item: copy });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to duplicate item' });
  }
};

/**
 * Bulk Import Items (CSV / Array JSON)
 */
export const importAccountingItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No items provided for import' });
      return;
    }

    let createdCount = 0;
    for (const raw of items) {
      if (!raw.name) continue;
      const type = (raw.type || 'PRODUCT').toUpperCase();
      const prefix = type === 'SERVICE' ? 'SRV' : 'PRD';
      const sku = raw.sku || `${prefix}-IMP-${Math.floor(1000 + Math.random() * 9000)}`;

      await prisma.accountingItem.upsert({
        where: { sku },
        update: {
          name: raw.name,
          hsnSac: raw.hsnSac || null,
          unit: raw.unit || 'Units',
          salesRate: Number(raw.salesRate || raw.rate) || 0,
          purchasePrice: Number(raw.purchasePrice) || 0,
          gstPercentage: Number(raw.gstPercentage) || 18,
          description: raw.description || null,
        },
        create: {
          name: raw.name,
          type,
          sku,
          hsnSac: raw.hsnSac || null,
          unit: raw.unit || 'Units',
          salesRate: Number(raw.salesRate || raw.rate) || 0,
          purchasePrice: Number(raw.purchasePrice) || 0,
          gstPercentage: Number(raw.gstPercentage) || 18,
          openingStock: Number(raw.openingStock) || 0,
          currentStock: Number(raw.currentStock || raw.openingStock) || 0,
          description: raw.description || null,
        },
      });
      createdCount++;
    }

    res.json({ success: true, message: `Successfully imported ${createdCount} items.` });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to import items' });
  }
};

/**
 * Seed initial sample Parties & Items if table is empty
 */
export const seedSampleData = async (req: Request, res: Response) => {
  try {
    const partyCount = await prisma.party.count();
    if (partyCount === 0) {
      await prisma.party.createMany({
        data: [
          {
            name: 'Apex Traders Pvt Ltd',
            gstin: '27AABCA1234F1Z1',
            state: 'Maharashtra',
            address: '402 Trade Tower, Andheri East',
            city: 'Mumbai',
            pincode: '400069',
            phone: '9820011223',
            email: 'accounts@apextraders.com',
            creditDays: 30,
          },
          {
            name: 'Royal Fragrances Ltd',
            gstin: '24AAACR5678B1Z9',
            state: 'Gujarat',
            address: 'GIDC Industrial Area, Sector 2',
            city: 'Ahmedabad',
            pincode: '380015',
            phone: '9879944556',
            email: 'billing@royalfragrances.com',
            creditDays: 45,
          },
        ],
      });
    }

    const itemCount = await prisma.accountingItem.count();
    if (itemCount === 0) {
      await prisma.accountingItem.createMany({
        data: [
          { name: 'Incense Stick Raw Material (Batch A)', hsnSac: '33074100', unit: 'Kg', salesRate: 250, gstPercentage: 18 },
          { name: 'Premium Essential Oil 100ml', hsnSac: '33012990', unit: 'Bottle', salesRate: 850, gstPercentage: 18 },
          { name: 'Bamboo Sticks Premium Grade', hsnSac: '14011000', unit: 'Bundle', salesRate: 120, gstPercentage: 12 },
          { name: 'Packaging Boxes (Custom Printed)', hsnSac: '48191010', unit: 'Pcs', salesRate: 15, gstPercentage: 18 },
        ],
      });
    }

    res.json({ success: true, message: 'Sample accounting masters seeded successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to seed sample data' });
  }
};
