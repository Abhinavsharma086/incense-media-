import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { executePartialTableUpdate } from '../utils/dbUpdate.utils';

const formatImageUrl = (filename?: string | null, subfolder: string = 'services'): string | null => {
  if (!filename) return null;
  if (filename.startsWith('blob:') || filename.startsWith('data:')) return filename;
  const clean = filename.replace(/\\/g, '/').split('/').pop() || filename;
  if (!clean || clean === 'null' || clean === 'undefined') return null;
  return `https://api.incensemedia.in/uploads/${subfolder}/${clean}`;
};

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, parseInt((req.query.limit as string) || '10', 10));
    const search = ((req.query.search as string) || '').trim();
    const status = (req.query.status as string) || 'all';
    const offset = (page - 1) * limit;

    let whereSql = 'WHERE deletedAt IS NULL';
    const whereParams: any[] = [];

    if (search) {
      whereSql += ' AND (title LIKE ? OR description LIKE ?)';
      whereParams.push(`%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
      whereSql += ' AND isActive = ?';
      whereParams.push(status === 'active' || status === '1' ? 1 : 0);
    }

    const countQuery = 'SELECT COUNT(*) as total FROM `Services` ' + whereSql;
    const countRows: any[] = await prisma.$queryRawUnsafe(countQuery, ...whereParams);
    const total = Number(countRows[0]?.total || 0);

    const selectQuery = 'SELECT * FROM `Services` ' + whereSql + ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const rows: any[] = await prisma.$queryRawUnsafe(
      selectQuery,
      ...whereParams,
      limit,
      offset
    );

    const formatted = rows.map((s) => ({
      ...s,
      banner_url: formatImageUrl(s.banner, 'services'),
      bannerImageUrl: formatImageUrl(s.banner, 'services'),
      image_url: formatImageUrl(s.banner, 'services'),
      imageUrl: formatImageUrl(s.banner, 'services'),
      isActive: s.isActive === 1 || s.isActive === true || s.isActive === '1',
      packages: [],
      offers: [],
      service_gallery: [],
    }));

    res.json({
      success: true,
      data: {
        services: formatted,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error in getServices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch services', error: error?.message });
  }
};

export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const rows: any[] = await prisma.$queryRawUnsafe(
      'SELECT * FROM `Services` WHERE id = ? AND deletedAt IS NULL',
      id
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    const s = rows[0];
    res.json({
      success: true,
      data: {
        ...s,
        banner_url: formatImageUrl(s.banner, 'services'),
      bannerImageUrl: formatImageUrl(s.banner, 'services'),
      image_url: formatImageUrl(s.banner, 'services'),
      imageUrl: formatImageUrl(s.banner, 'services'),
        isActive: s.isActive === 1 || s.isActive === true || s.isActive === '1',
        packages: [],
        offers: [],
        service_gallery: [],
      },
    });
  } catch (error: any) {
    console.error('Error in getServiceById:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch service', error: error?.message });
  }
};

export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const description = (b.description || '').trim();
    const longDescription = (b.longDescription || b.long_description || '').trim();
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const categoryId = b.categoryId ? parseInt(b.categoryId, 10) : null;
    const isActive = b.isActive === 'false' || b.isActive === false || b.isActive === 0 ? 0 : 1;
    const metaTitle = b.metaTitle || null;
    const metaDescription = b.metaDescription || null;
    const metaKeywords = b.metaKeywords || null;
    
    let banner = b.banner || null;
    if (req.file) {
      banner = req.file.filename;
    }

    if (!title) {
      res.status(400).json({ success: false, message: 'Title is required' });
      return;
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Services` (`categoryId`, `title`, `slug`, `description`, `longDescription`, `banner`, `isActive`, `metaTitle`, `metaDescription`, `metaKeywords`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      categoryId,
      title,
      slug,
      description,
      longDescription,
      banner,
      isActive,
      metaTitle,
      metaDescription,
      metaKeywords
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Services` WHERE `title` = ? ORDER BY `id` DESC LIMIT 1', title);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: inserted[0] || null,
    });
  } catch (error: any) {
    console.error('Error in createService:', error);
    res.status(500).json({ success: false, message: 'Failed to create service', error: error?.message });
  }
};

export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid service ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.title !== undefined) {
      const title = String(b.title).trim();
      if (title.length > 0) {
        updates.title = title;
        if (b.slug === undefined) {
          updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
      }
    }
    if (b.slug !== undefined && String(b.slug).trim().length > 0) {
      updates.slug = String(b.slug).trim();
    }
    if (b.description !== undefined) updates.description = String(b.description).trim();
    if (b.longDescription !== undefined) updates.longDescription = String(b.longDescription).trim();
    if (b.categoryId !== undefined) {
      updates.categoryId = b.categoryId ? parseInt(b.categoryId, 10) : null;
    }
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }
    if (b.metaTitle !== undefined) updates.metaTitle = b.metaTitle || null;
    if (b.metaDescription !== undefined) updates.metaDescription = b.metaDescription || null;
    if (b.metaKeywords !== undefined) updates.metaKeywords = b.metaKeywords || null;

    if (req.file) {
      updates.banner = req.file.filename;
    } else if (b.banner && typeof b.banner === 'string' && !b.banner.startsWith('data:') && !b.banner.startsWith('blob:') && !b.banner.startsWith('http')) {
      updates.banner = b.banner;
    }

    const result = await executePartialTableUpdate('Services', id, updates);

    const updated: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Services` WHERE `id` = ?', id);

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updated[0] ? {
        ...updated[0],
        banner_url: formatImageUrl(updated[0].banner, 'services'),
        bannerImageUrl: formatImageUrl(updated[0].banner, 'services'),
        image_url: formatImageUrl(updated[0].banner, 'services'),
        imageUrl: formatImageUrl(updated[0].banner, 'services'),
      } : null,
      updatedFields: result.updatedFields,
    });
  } catch (error: any) {
    console.error('Error in updateService:', error);
    res.status(500).json({ success: false, message: 'Failed to update service', error: error?.message });
  }
};

export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Services` SET `deletedAt` = NOW() WHERE `id` = ?', id);

    res.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in deleteService:', error);
    res.status(500).json({ success: false, message: 'Failed to delete service', error: error?.message });
  }
};
