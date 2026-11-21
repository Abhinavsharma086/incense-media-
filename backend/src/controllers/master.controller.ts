import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { executePartialTableUpdate } from '../utils/dbUpdate.utils';

const formatImageUrl = (filename?: string | null, subfolder: string = 'masters'): string | null => {
  if (!filename) return null;
  if (filename.startsWith('blob:') || filename.startsWith('data:')) return filename;
  const clean = filename.replace(/\\/g, '/').split('/').pop() || filename;
  if (!clean || clean === 'null' || clean === 'undefined') return null;
  return `https://api.incensemedia.in/uploads/${subfolder}/${clean}`;
};

export const getMasters = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.query.slug as string;
    let query = 'SELECT * FROM `Masters` WHERE `deletedAt` IS NULL';
    const params: any[] = [];

    if (slug) {
      query += ' AND `slug` = ?';
      params.push(slug);
    }
    query += ' ORDER BY `id` DESC';

    const masters: any[] = await prisma.$queryRawUnsafe(query, ...params);
    const formatted = masters.map((m) => ({
      ...m,
      image_url: formatImageUrl(m.image, 'masters'),
      imageUrl: formatImageUrl(m.image, 'masters'),
      isActive: m.isActive === 1 || m.isActive === true || m.isActive === '1',
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error in getMasters:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch masters', error: error?.message });
  }
};

export const getMasterById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const masters: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Masters` WHERE `id` = ?', id);

    if (masters.length === 0) {
      res.status(404).json({ success: false, message: 'Master not found' });
      return;
    }

    const m = masters[0];
    res.json({
      success: true,
      data: {
        ...m,
        image_url: formatImageUrl(m.image, 'masters'),
      imageUrl: formatImageUrl(m.image, 'masters'),
        isActive: m.isActive === 1 || m.isActive === true || m.isActive === '1',
      },
    });
  } catch (error: any) {
    console.error('Error in getMasterById:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch master', error: error?.message });
  }
};

export const createMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const name = (b.name || '').trim();
    const slug = (b.slug || 'service-category').trim();
    const description = (b.description || '').trim();
    const isActive = b.isActive === 'true' || b.isActive === true || b.isActive === 1 || b.isActive === '1' ? 1 : 0;
    
    let image = b.image || null;
    if (req.file) {
      image = req.file.filename;
    }

    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Masters` (`name`, `slug`, `description`, `image`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      name,
      slug,
      description,
      image,
      isActive
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Masters` WHERE `name` = ? AND `slug` = ? ORDER BY `id` DESC LIMIT 1', name, slug);
    const result = inserted[0] || { name, slug, description, image, isActive: Boolean(isActive) };

    res.status(201).json({
      success: true,
      message: 'Master created successfully',
      data: {
        ...result,
        image_url: formatImageUrl(result.image, 'masters'),
        imageUrl: formatImageUrl(result.image, 'masters'),
        isActive: result.isActive === 1 || result.isActive === true || result.isActive === '1',
      },
    });
  } catch (error: any) {
    console.error('Error in createMaster:', error);
    res.status(500).json({ success: false, message: 'Failed to create master', error: error?.message });
  }
};

export const updateMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid master ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (name.length > 0) updates.name = name;
    }
    if (b.slug !== undefined && String(b.slug).trim().length > 0) {
      updates.slug = String(b.slug).trim();
    }
    if (b.description !== undefined) {
      updates.description = String(b.description).trim();
    }
    if (b.isActive !== undefined) {
      updates.isActive = b.isActive === 'true' || b.isActive === true || b.isActive === 1 || b.isActive === '1' ? 1 : 0;
    }

    if (req.file) {
      updates.image = req.file.filename;
    } else if (b.image && typeof b.image === 'string' && !b.image.startsWith('data:') && !b.image.startsWith('blob:') && !b.image.startsWith('http')) {
      updates.image = b.image;
    }

    const result = await executePartialTableUpdate('Masters', id, updates);

    const updated: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Masters` WHERE `id` = ?', id);
    const resultItem = updated[0] || null;

    res.json({
      success: true,
      message: 'Master updated successfully',
      data: resultItem ? {
        ...resultItem,
        image_url: formatImageUrl(resultItem.image, 'masters'),
        imageUrl: formatImageUrl(resultItem.image, 'masters'),
        isActive: resultItem.isActive === 1 || resultItem.isActive === true || resultItem.isActive === '1',
      } : null,
      updatedFields: result.updatedFields,
    });
  } catch (error: any) {
    console.error('Error in updateMaster:', error);
    res.status(500).json({ success: false, message: 'Failed to update master', error: error?.message });
  }
};

export const deleteMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Masters` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Master deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteMaster:', error);
    res.status(500).json({ success: false, message: 'Failed to delete master', error: error?.message });
  }
};
