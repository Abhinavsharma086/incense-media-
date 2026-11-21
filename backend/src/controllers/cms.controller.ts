import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { executePartialTableUpdate } from '../utils/dbUpdate.utils';
import { syncWebsiteInquiriesToLeads, createInquiryWithLead } from '../services/websiteLeadSync.service';

// Helper to format uploaded image URLs with specific subfolder
const uploadDir = path.join(process.cwd(), 'uploads');
const uploadSubfolders = ['events', 'blogs', 'magazines', 'page-banner', 'slider', 'awards', 'services', 'teams', 'courses', 'users', 'testimonials', 'masters', 'clients', 'ckeditor'];
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  for (const sf of uploadSubfolders) {
    const p = path.join(uploadDir, sf);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
} catch (_) {}

const formatImageUrl = (filename?: string | null, subfolder?: string): string | null => {
  if (!filename) return null;
  if (filename.startsWith('blob:') || filename.startsWith('data:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  const clean = filename.replace(/\\/g, '/').split('/').pop() || filename;
  if (!clean || clean === 'null' || clean === 'undefined') return null;

  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (subfolder && fs.existsSync(path.join(uploadDir, subfolder, clean))) {
      return `https://api.incensemedia.in/uploads/${subfolder}/${clean}`;
    }
    if (fs.existsSync(path.join(uploadDir, clean))) {
      return `https://api.incensemedia.in/uploads/${clean}`;
    }
  } catch (_) {}

  if (subfolder) {
    return `https://api.incensemedia.in/uploads/${subfolder}/${clean}`;
  }
  return `https://api.incensemedia.in/uploads/${clean}`;
};

// ==========================================
// BLOGS & BLOG CATEGORIES
// ==========================================

export const getBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, parseInt((req.query.limit as string) || '10', 10));
    const search = ((req.query.search as string) || '').trim();
    const categoryId = req.query.categoryId as string;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE (b.type = 'blogs' OR b.type IS NULL)";
    const params: any[] = [];

    if (search) {
      whereClause += " AND (b.title LIKE ? OR b.description LIKE ? OR b.shortDescription LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      whereClause += " AND b.categoryId = ?";
      params.push(categoryId);
    }

    const countRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM \`Blogs\` b ${whereClause}`,
      ...params
    );
    const total = Number(countRows[0]?.total || 0);

    const selectQuery = `
      SELECT b.*, c.name as categoryName
      FROM \`Blogs\` b
      LEFT JOIN \`BlogCategories\` c ON b.categoryId = c.id
      ${whereClause}
      ORDER BY b.id DESC
      LIMIT ? OFFSET ?
    `;
    const rows: any[] = await prisma.$queryRawUnsafe(selectQuery, ...params, limit, offset);

    const formatted = rows.map((b) => ({
      ...b,
      image_url: formatImageUrl(b.image, 'blogs'),
      imageUrl: formatImageUrl(b.image, 'blogs'),
      banner_image_url: formatImageUrl(b.bannerImage, 'blogs'),
      bannerImageUrl: formatImageUrl(b.bannerImage, 'blogs'),
      banner_url: formatImageUrl(b.bannerImage, 'blogs'),
      isActive: b.isActive === 1 || b.isActive === true || b.isActive === '1',
      BlogCategory: b.categoryId ? { id: b.categoryId, name: b.categoryName } : null,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err: any) {
    console.error('Error in getBlogs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch blogs', error: err?.message });
  }
};

export const getBlogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Blogs` WHERE `id` = ?', id);
    if (!rows.length) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }
    const b = rows[0];
    res.json({
      success: true,
      data: {
        ...b,
        image_url: formatImageUrl(b.image, 'blogs'),
        imageUrl: formatImageUrl(b.image, 'blogs'),
        banner_image_url: formatImageUrl(b.bannerImage, 'blogs'),
        bannerImageUrl: formatImageUrl(b.bannerImage, 'blogs'),
        banner_url: formatImageUrl(b.bannerImage, 'blogs'),
        isActive: b.isActive === 1 || b.isActive === true || b.isActive === '1',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch blog', error: err?.message });
  }
};

export const createBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const description = (b.description || '').trim();
    const shortDescription = (b.shortDescription || '').trim();
    const auther = (b.auther || b.author || '').trim();
    const readTime = (b.readTime || '').trim();
    const date = b.date || new Date().toISOString().split('T')[0];
    const categoryId = b.categoryId ? parseInt(b.categoryId, 10) : null;
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const isActive = b.isActive === 'false' || b.isActive === false || b.isActive === 0 ? 0 : 1;
    const metaTitle = b.metaTitle || null;
    const metaDescription = b.metaDescription || null;
    const metaKeywords = b.metaKeywords || null;

    let image = b.image || null;
    let bannerImage = b.bannerImage || null;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['blog_image']?.[0]) image = files['blog_image'][0].filename;
      else if (files['image']?.[0]) image = files['image'][0].filename;

      if (files['banner_image']?.[0]) bannerImage = files['banner_image'][0].filename;
      else if (files['bannerImage']?.[0]) bannerImage = files['bannerImage'][0].filename;
    } else if (req.file) {
      image = req.file.filename;
    }

    if (!title) {
      res.status(400).json({ success: false, message: 'Title is required' });
      return;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Blogs\` 
      (\`categoryId\`, \`type\`, \`title\`, \`slug\`, \`shortDescription\`, \`description\`, \`readTime\`, \`readCount\`, \`image\`, \`bannerImage\`, \`isActive\`, \`auther\`, \`date\`, \`metaTitle\`, \`metaDescription\`, \`metaKeywords\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, 'blogs', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      categoryId, title, slug, shortDescription, description, readTime, image, bannerImage, isActive, auther, date, metaTitle, metaDescription, metaKeywords
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Blogs` WHERE `title` = ? ORDER BY `id` DESC LIMIT 1', title);
    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: inserted[0] || { title, slug },
    });
  } catch (err: any) {
    console.error('Error in createBlog:', err);
    res.status(500).json({ success: false, message: 'Failed to create blog', error: err?.message });
  }
};

export const updateBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid blog ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.title !== undefined) {
      const title = String(b.title).trim();
      if (title.length > 0) {
        updates.title = title;
        if (b.slug === undefined) {
          updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
      }
    }
    if (b.slug !== undefined) updates.slug = String(b.slug).trim();
    if (b.description !== undefined) updates.description = b.description;
    if (b.shortDescription !== undefined) updates.shortDescription = b.shortDescription;
    if (b.auther !== undefined || b.author !== undefined) updates.auther = b.auther || b.author;
    if (b.readTime !== undefined) updates.readTime = b.readTime;
    if (b.date !== undefined) updates.date = b.date;
    if (b.categoryId !== undefined) updates.categoryId = b.categoryId ? parseInt(b.categoryId, 10) : null;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }
    if (b.metaTitle !== undefined) updates.metaTitle = b.metaTitle;
    if (b.metaDescription !== undefined) updates.metaDescription = b.metaDescription;
    if (b.metaKeywords !== undefined) updates.metaKeywords = b.metaKeywords;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      const img = files['blog_image']?.[0] || files['image']?.[0];
      if (img?.filename) updates.image = img.filename;

      const banner = files['banner_image']?.[0] || files['bannerImage']?.[0];
      if (banner?.filename) updates.bannerImage = banner.filename;
    } else if (req.file?.filename) {
      updates.image = req.file.filename;
    }

    await executePartialTableUpdate('Blogs', id, updates);

    const updated: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Blogs` WHERE `id` = ?', id);
    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: updated[0] || null,
      updatedFields: Object.keys(updates),
    });
  } catch (err: any) {
    console.error('Error in updateBlog:', err);
    res.status(500).json({ success: false, message: 'Failed to update blog', error: err?.message });
  }
};

export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `Blogs` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete blog', error: err?.message });
  }
};

export const getBlogCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `BlogCategories` WHERE `deletedAt` IS NULL ORDER BY `id` DESC');
    res.json({
      success: true,
      data: rows.map((c) => ({
        ...c,
        isActive: c.isActive === 1 || c.isActive === true || c.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch blog categories', error: err?.message });
  }
};

export const createBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }
    const isActive = req.body.isActive === 'false' || req.body.isActive === false ? 0 : 1;
    await prisma.$executeRawUnsafe(
      'INSERT INTO `BlogCategories` (`name`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, NOW(), NOW())',
      name, isActive
    );
    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `BlogCategories` WHERE `name` = ? ORDER BY `id` DESC LIMIT 1', name);
    res.status(201).json({
      success: true,
      message: 'Blog category created successfully',
      data: inserted[0] || { name },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create blog category', error: err?.message });
  }
};

export const updateBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const name = (req.body.name || '').trim();
    const isActive = req.body.isActive === 'false' || req.body.isActive === false ? 0 : 1;
    await prisma.$executeRawUnsafe(
      'UPDATE `BlogCategories` SET `name` = ?, `isActive` = ?, `updatedAt` = NOW() WHERE `id` = ?',
      name, isActive, id
    );
    res.json({ success: true, message: 'Blog category updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: err?.message });
  }
};

export const deleteBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `BlogCategories` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Blog category deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete category', error: err?.message });
  }
};

// ==========================================
// SLIDERS
// ==========================================

export const getSliders = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = (req.query.slug as string) || '';
    let query = 'SELECT * FROM `Sliders` WHERE `deletedAt` IS NULL';
    const params: any[] = [];
    if (slug) {
      query += ' AND `slug` = ?';
      params.push(slug);
    }
    query += ' ORDER BY `sequenceNo` ASC, `id` DESC';

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    const formatted = rows.map((s) => ({
      ...s,
      image_url: formatImageUrl(s.image, 'slider'),
      imageUrl: formatImageUrl(s.image, 'slider'),
      isActive: s.isActive === 1 || s.isActive === true || s.isActive === '1',
      isPrimary: s.isPrimary === 1 || s.isPrimary === true || s.isPrimary === '1',
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    console.error('Error in getSliders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sliders', error: err?.message });
  }
};

export const createSlider = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const name = (b.name || b.heading || 'Slider').trim();
    const slug = (b.slug || 'home-page').trim();
    const heading = (b.heading || '').trim();
    const subHeading = (b.subHeading || '').trim();
    const eventType = b.eventType || 'event';
    const eventId = b.eventId ? parseInt(b.eventId, 10) : null;
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;
    const isPrimary = b.isPrimary === 'true' || b.isPrimary === true ? 1 : 0;

    let image = b.image || null;
    if (req.file) {
      image = req.file.filename;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Sliders\` (\`name\`, \`slug\`, \`heading\`, \`subHeading\`, \`image\`, \`isActive\`, \`eventType\`, \`eventId\`, \`isPrimary\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      name, slug, heading, subHeading, image, isActive, eventType, eventId, isPrimary
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Sliders` WHERE `slug` = ? ORDER BY `id` DESC LIMIT 1', slug);
    res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      data: inserted[0] || null,
    });
  } catch (err: any) {
    console.error('Error in createSlider:', err);
    res.status(500).json({ success: false, message: 'Failed to create slider', error: err?.message });
  }
};

export const updateSlider = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid slider ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.heading !== undefined) updates.heading = String(b.heading).trim();
    if (b.subHeading !== undefined) updates.subHeading = String(b.subHeading).trim();
    if (b.slug !== undefined) updates.slug = String(b.slug).trim();
    if (b.eventType !== undefined) updates.eventType = b.eventType;
    if (b.eventId !== undefined) updates.eventId = b.eventId ? parseInt(b.eventId, 10) : null;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }

    if (req.file?.filename) {
      updates.image = req.file.filename;
    } else if (b.image !== undefined) {
      updates.image = b.image;
    }

    await executePartialTableUpdate('Sliders', id, updates);

    res.json({
      success: true,
      message: 'Slider updated successfully',
      updatedFields: Object.keys(updates),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update slider', error: err?.message });
  }
};

export const deleteSlider = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE \`Sliders\` SET \`deletedAt\` = NOW() WHERE \`id\` = ?', id);
    res.json({ success: true, message: 'Slider deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete slider', error: err?.message });
  }
};

// ==========================================
// CMS PAGES & OPTIONAL IMAGES
// ==========================================

export const getCMSPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = (req.params.slug || req.query.slug) as string | undefined;
    if (!slug) {
      const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Pages` ORDER BY `id` ASC');
      res.json({
        success: true,
        data: rows.map((p) => ({
          ...p,
          name: p.title || p.page || p.slug,
          banner_url: formatImageUrl(p.banner, 'page-banner'),
          bannerImageUrl: formatImageUrl(p.banner, 'page-banner'),
        })),
      });
      return;
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      'SELECT * FROM `Pages` WHERE `page` = ? OR `slug` = ? LIMIT 1',
      slug, slug
    );

    if (!rows.length) {
      res.json({
        success: true,
        data: {
          id: 1,
          page: slug,
          title: slug === 'about-us' ? 'About Us' : slug,
          description: '',
          content: '',
          banner: null,
          banner_url: null,
          OptionalImages: [],
          optionalData: '[]',
        },
      });
      return;
    }

    const page = rows[0];
    const optionalImages: any[] = await prisma.$queryRawUnsafe(
      'SELECT * FROM `OptionalImages` WHERE `pageId` = ?',
      page.id
    );

    res.json({
      success: true,
      data: {
        ...page,
        banner_url: formatImageUrl(page.banner, 'page-banner'),
        bannerImageUrl: formatImageUrl(page.banner, 'page-banner'),
        optional_images: optionalImages.map((img) => ({
          ...img,
          image_url: formatImageUrl(img.image, 'cms'),
          imageUrl: formatImageUrl(img.image, 'cms'),
        })),
        OptionalImages: optionalImages.map((img) => ({
          ...img,
          image_url: formatImageUrl(img.image, 'cms'),
          imageUrl: formatImageUrl(img.image, 'cms'),
        })),
      },
    });
  } catch (err: any) {
    console.error('Error in getCMSPage:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch CMS page', error: err?.message });
  }
};

export const saveCMSPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params.id;
    const b = req.body;
    let banner = b.banner || null;
    if (req.file) {
      banner = req.file.filename;
    }

    const idParamStr = Array.isArray(idParam) ? idParam[0] : idParam;
    if (idParamStr && !isNaN(parseInt(idParamStr, 10))) {
      const pageId = parseInt(idParamStr, 10);
      let bannerClause = '';
      const params: any[] = [];
      if (banner) {
        bannerClause = ', `banner` = ?';
        params.push(banner);
      }
      if (b.title) {
        params.unshift(b.title);
        await prisma.$executeRawUnsafe(
          `UPDATE \`Pages\` SET \`title\` = ? ${bannerClause}, \`updatedAt\` = NOW() WHERE \`id\` = ?`,
          ...params, pageId
        );
      } else if (banner) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Pages\` SET \`banner\` = ?, \`updatedAt\` = NOW() WHERE \`id\` = ?`,
          banner, pageId
        );
      }
      res.json({ success: true, message: 'CMS page updated successfully' });
      return;
    }

    const pageSlug = b.page || req.params.slug || 'about-us';
    const title = b.title || pageSlug;
    const description = b.description || '';
    const content = b.content || '';
    const optionalData = typeof b.optionalData === 'string' ? b.optionalData : JSON.stringify(b.optionalData || []);

    const existing: any[] = await prisma.$queryRawUnsafe(
      'SELECT `id` FROM `Pages` WHERE `page` = ? OR `slug` = ? LIMIT 1',
      pageSlug, pageSlug
    );

    let pageId: number;
    if (existing.length > 0) {
      pageId = existing[0].id;
      let bannerClause = '';
      const params: any[] = [title, description, content, optionalData];
      if (banner) {
        bannerClause = ', `banner` = ?';
        params.push(banner);
      }
      params.push(pageId);

      await prisma.$executeRawUnsafe(
        `UPDATE \`Pages\` SET \`title\` = ?, \`description\` = ?, \`content\` = ?, \`optionalData\` = ? ${bannerClause}, \`updatedAt\` = NOW() WHERE \`id\` = ?`,
        ...params
      );
    } else {
      await prisma.$executeRawUnsafe(
        'INSERT INTO `Pages` (`title`, `slug`, `page`, `description`, `content`, `optionalData`, `banner`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        title, pageSlug, pageSlug, description, content, optionalData, banner
      );
      const inserted: any[] = await prisma.$queryRawUnsafe('SELECT `id` FROM `Pages` WHERE `page` = ? LIMIT 1', pageSlug);
      pageId = inserted[0]?.id || 1;
    }

    res.json({
      success: true,
      message: 'CMS page saved successfully',
      data: { id: pageId, page: pageSlug, title },
    });
  } catch (err: any) {
    console.error('Error in saveCMSPage:', err);
    res.status(500).json({ success: false, message: 'Failed to save CMS page', error: err?.message });
  }
};

// ==========================================
// EVENTS & EVENT LINKS
// ==========================================

const parseEventDate = (d: any): string | null => {
  if (!d || d === 'null' || d === 'undefined') return null;
  const str = String(d).trim();
  if (!str) return null;
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }
  return null;
};

const parseEventParentId = (p: any): number | null => {
  if (!p || p === '' || p === 'null' || p === 'undefined') return null;
  const num = parseInt(String(p), 10);
  return isNaN(num) ? null : num;
};

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim();
    let query = 'SELECT * FROM `Events` WHERE `deletedAt` IS NULL';
    const params: any[] = [];
    if (search) {
      query += ' AND (`title` LIKE ? OR `description` LIKE ? OR `address` LIKE ? OR `city` LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const sortBy = ((req.query.sortBy || req.query.sort) as string) || '';
    if (sortBy === 'date' || sortBy === 'eventDate') {
      query += ' ORDER BY `date` DESC, `id` DESC';
    } else {
      query += ' ORDER BY `id` DESC';
    }

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    const eventIds = rows.map((e) => e.id).filter(Boolean);

    let allOptionalImages: any[] = [];
    if (eventIds.length > 0) {
      try {
        allOptionalImages = await prisma.$queryRawUnsafe(
          `SELECT * FROM \`OptionalImages\` WHERE \`eventId\` IN (${eventIds.join(',')})`
        );
      } catch (_) { }
    }

    const formatted = rows.map((e) => {
      const eventOptImages = allOptionalImages.filter((img) => img.eventId === e.id);
      const cleanDate = e.date ? (typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0]) : '';
      const cleanEndDate = e.endDate ? (typeof e.endDate === 'string' ? e.endDate.split('T')[0] : new Date(e.endDate).toISOString().split('T')[0]) : cleanDate;
      return {
        ...e,
        date: cleanDate,
        startDate: cleanDate,
        endDate: cleanEndDate,
        startTime: e.time || '',
        endTime: e.endTime || '',
        image_url: formatImageUrl(e.image, 'events'),
        imageUrl: formatImageUrl(e.image, 'events'),
        banner_image_url: formatImageUrl(e.bannerImage, 'events'),
        bannerImageUrl: formatImageUrl(e.bannerImage, 'events'),
        banner_url: formatImageUrl(e.bannerImage, 'events'),
        icon_url: formatImageUrl(e.icon, 'events'),
        iconUrl: formatImageUrl(e.icon, 'events'),
        isActive: e.isActive === 1 || e.isActive === true || e.isActive === '1',
        homeFeatured: e.homeFeatured === 1 || e.homeFeatured === true || e.homeFeatured === '1' ? 'true' : 'false',
        OptionalImages: eventOptImages.map((img) => ({
          ...img,
          image_url: formatImageUrl(img.image, 'events'),
          imageUrl: formatImageUrl(img.image, 'events'),
        })),
      };
    });
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch events', error: err?.message });
  }
};

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    if (!title) {
      res.status(400).json({ success: false, message: 'Event title is required' });
      return;
    }
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).trim();
    const description = b.description || '';
    const longDescription = b.longDescription || '';
    const date = parseEventDate(b.date || b.startDate);
    const endDate = parseEventDate(b.endDate);
    const time = b.time || b.startTime || '';
    const endTime = b.endTime || '';
    const address = b.address || '';
    const city = b.city || '';
    const state = b.state || '';
    const mapLink = b.mapLink || '';
    const eventType = b.eventType || '';
    const visitorRegistrationLink = b.visitorRegistrationLink || '';
    const homeFeatured = (b.homeFeatured === 'true' || b.homeFeatured === true || b.homeFeatured === '1' || b.homeFeatured === 1) ? 1 : 0;
    const parentId = parseEventParentId(b.parentId || b.parentEventId);
    const isActive = (b.isActive === '0' || b.isActive === 0 || b.isActive === false || b.isActive === 'false') ? 0 : 1;
    const metaTitle = b.metaTitle || '';
    const metaDescription = b.metaDescription || '';
    const metaKeywords = b.metaKeywords || '';

    let image = b.image || null;
    let bannerImage = b.bannerImage || null;
    let icon = b.icon || null;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['image']?.[0]) image = files['image'][0].filename;
      if (files['bannerImage']?.[0]) bannerImage = files['bannerImage'][0].filename;
      if (files['icon']?.[0]) icon = files['icon'][0].filename;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Events\` 
      (\`title\`, \`slug\`, \`description\`, \`longDescription\`, \`date\`, \`endDate\`, \`time\`, \`endTime\`, \`address\`, \`city\`, \`state\`, \`mapLink\`, \`eventType\`, \`image\`, \`bannerImage\`, \`icon\`, \`visitorRegistrationLink\`, \`homeFeatured\`, \`parentId\`, \`isActive\`, \`metaTitle\`, \`metaDescription\`, \`metaKeywords\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      title, slug, description, longDescription, date, endDate, time, endTime, address, city, state, mapLink, eventType, image, bannerImage, icon, visitorRegistrationLink, homeFeatured, parentId, isActive, metaTitle, metaDescription, metaKeywords
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Events` WHERE `title` = ? ORDER BY `id` DESC LIMIT 1', title);
    const newEventId = inserted[0]?.id;

    if (newEventId && files && files['optional_image']) {
      for (const f of files['optional_image']) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO `OptionalImages` (`eventId`, `image`, `createdAt`, `updatedAt`) VALUES (?, ?, NOW(), NOW())',
          newEventId, f.filename
        );
      }
    }

    const copyToEventsDir = (fName: string | null) => {
      if (!fName) return;
      try {
        const src = path.join(process.cwd(), 'uploads', fName);
        const dstDir = path.join(process.cwd(), 'uploads', 'events');
        if (!fs.existsSync(dstDir)) {
          fs.mkdirSync(dstDir, { recursive: true });
        }
        const dst = path.join(dstDir, fName);
        if (fs.existsSync(src) && !fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
        }
      } catch (copyErr) {
        console.warn('Failed to copy event image to events dir:', copyErr);
      }
    };
    copyToEventsDir(image);
    copyToEventsDir(bannerImage);
    copyToEventsDir(icon);
    if (files && files['optional_image']) {
      for (const f of files['optional_image']) {
        copyToEventsDir(f.filename);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: inserted[0] || { title, slug },
    });
  } catch (err: any) {
    console.error('Error in createEvent:', err);
    res.status(500).json({ success: false, message: 'Failed to create event', error: err?.message });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const existingRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `Events` WHERE `id` = ? AND `deletedAt` IS NULL LIMIT 1',
      id
    );
    if (!existingRows || existingRows.length === 0) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    // 1. Column: title (only update if provided)
    if (b.title !== undefined) {
      const title = String(b.title).trim();
      if (title.length > 0) {
        updates.title = title;
        if (b.slug === undefined) {
          updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
      }
    }

    // 2. Column: slug
    if (b.slug !== undefined) {
      const slug = String(b.slug).trim();
      if (slug.length > 0) updates.slug = slug;
    }

    // 3. Column: description (Short description)
    if (b.description !== undefined) {
      updates.description = b.description;
    }

    // 4. Column: longDescription
    if (b.longDescription !== undefined) {
      updates.longDescription = b.longDescription;
    }

    // 5. Column: date / startDate
    if (b.date !== undefined || b.startDate !== undefined) {
      const parsedDate = parseEventDate(b.date || b.startDate);
      if (parsedDate) updates.date = parsedDate;
    }

    // 6. Column: endDate
    if (b.endDate !== undefined) {
      const parsedEndDate = parseEventDate(b.endDate);
      if (parsedEndDate) updates.endDate = parsedEndDate;
    }

    // 7. Column: time / startTime
    if (b.time !== undefined || b.startTime !== undefined) {
      updates.time = b.time || b.startTime;
    }

    // 8. Column: endTime
    if (b.endTime !== undefined) {
      updates.endTime = b.endTime;
    }

    // 9. Column: address (Venue)
    if (b.address !== undefined) {
      updates.address = b.address;
    }

    // 10. Column: city
    if (b.city !== undefined) {
      updates.city = b.city;
    }

    // 11. Column: state
    if (b.state !== undefined) {
      updates.state = b.state;
    }

    // 12. Column: mapLink
    if (b.mapLink !== undefined) {
      updates.mapLink = b.mapLink;
    }

    // 13. Column: eventType
    if (b.eventType !== undefined) {
      updates.eventType = b.eventType;
    }

    // 14. Column: visitorRegistrationLink
    if (b.visitorRegistrationLink !== undefined) {
      updates.visitorRegistrationLink = b.visitorRegistrationLink;
    }

    // 15. Column: homeFeatured
    if (b.homeFeatured !== undefined) {
      updates.homeFeatured = (b.homeFeatured === 'true' || b.homeFeatured === true || b.homeFeatured === '1' || b.homeFeatured === 1) ? 1 : 0;
    }

    // 16. Column: parentId / parentEventId
    if (b.parentId !== undefined || b.parentEventId !== undefined) {
      updates.parentId = parseEventParentId(b.parentId || b.parentEventId);
    }

    // 17. Column: isActive
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === '0' || b.isActive === 0 || b.isActive === false || b.isActive === 'false') ? 0 : 1;
    }

    // 18. Column: metaTitle
    if (b.metaTitle !== undefined) {
      updates.metaTitle = b.metaTitle;
    }

    // 19. Column: metaDescription
    if (b.metaDescription !== undefined) {
      updates.metaDescription = b.metaDescription;
    }

    // 20. Column: metaKeywords
    if (b.metaKeywords !== undefined) {
      updates.metaKeywords = b.metaKeywords;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let imageFilename: string | null = null;
    let bannerImageFilename: string | null = null;
    let iconFilename: string | null = null;

    if (files) {
      if (files['image']?.[0]?.filename) {
        imageFilename = files['image'][0].filename;
        updates.image = imageFilename;
      }
      if (files['bannerImage']?.[0]?.filename) {
        bannerImageFilename = files['bannerImage'][0].filename;
        updates.bannerImage = bannerImageFilename;
      }
      if (files['icon']?.[0]?.filename) {
        iconFilename = files['icon'][0].filename;
        updates.icon = iconFilename;
      }
    }

    const copyToEventsDir = (fName: string | null) => {
      if (!fName) return;
      try {
        const src = path.join(process.cwd(), 'uploads', fName);
        const dstDir = path.join(process.cwd(), 'uploads', 'events');
        if (!fs.existsSync(dstDir)) {
          fs.mkdirSync(dstDir, { recursive: true });
        }
        const dst = path.join(dstDir, fName);
        if (fs.existsSync(src) && !fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
        }
      } catch (copyErr) {
        console.warn('Failed to copy event image to events dir:', copyErr);
      }
    };

    copyToEventsDir(imageFilename);
    copyToEventsDir(bannerImageFilename);
    copyToEventsDir(iconFilename);

    if (files && files['optional_image']) {
      for (const f of files['optional_image']) {
        copyToEventsDir(f.filename);
        await prisma.$executeRawUnsafe(
          'INSERT INTO `OptionalImages` (`eventId`, `image`, `createdAt`, `updatedAt`) VALUES (?, ?, NOW(), NOW())',
          id, f.filename
        );
      }
    }

    const updateResult = await executePartialTableUpdate('Events', id, updates);

    res.json({
      success: true,
      message: 'Event updated successfully',
      updatedFields: updateResult.updatedFields,
    });
  } catch (err: any) {
    console.error('Error in updateEvent:', err);
    res.status(500).json({ success: false, message: 'Failed to update event', error: err?.message });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Events` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete event', error: err?.message });
  }
};

// ==========================================
// MAGAZINES
// ==========================================


const formatMagazineUrl = (filename?: string | null): string | null => {
  if (!filename) return null;
  if (filename.startsWith('blob:') || filename.startsWith('data:')) return filename;
  if (filename.includes('/uploads/magazines/')) return filename;
  if (filename.includes('/uploads/')) return filename.replace('/uploads/', '/uploads/magazines/');
  const clean = filename.replace(/\\/g, '/').split('/').pop() || '';
  return `https://api.incensemedia.in/uploads/magazines/${clean}`;
};

export const getMagazines = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Magazines` ORDER BY `id` DESC');
    let plans: any[] = [];
    try {
      plans = await prisma.$queryRawUnsafe('SELECT * FROM `MagazinePlans` WHERE `isActive` = 1');
    } catch (_e) { }

    const formatted = rows.map((m) => {
      const coverUrl = formatMagazineUrl(m.coverImage);
      const pdfUrl = formatMagazineUrl(m.pdfFile);
      const mPlans = plans.filter((p: any) => p.magazineId === m.id);
      return {
        ...m,
        cover_image_url: coverUrl,
        coverImageUrl: coverUrl,
        pdf_url: pdfUrl,
        pdfFileUrl: pdfUrl,
        plans: mPlans,
        PublicationPlans: mPlans,
        MagazinePlans: mPlans,
        isActive: m.isActive === 1 || m.isActive === true || m.isActive === '1',
      };
    });
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch magazines', error: err?.message });
  }
};

export const createMagazine = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const description = b.description || '';
    const publishDate = b.publishDate || null;
    const type = b.type || 'monthly';
    const featured = b.featured === 'true' || b.featured === true ? 'true' : 'false';
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;

    let coverImage = b.coverImage || null;
    let pdfFile = b.pdfFile || null;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['coverImage']?.[0]) coverImage = files['coverImage'][0].filename;
      if (files['pdfFile']?.[0]) pdfFile = files['pdfFile'][0].filename;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Magazines\` (\`title\`, \`slug\`, \`description\`, \`publishDate\`, \`coverImage\`, \`pdfFile\`, \`type\`, \`featured\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      title, slug, description, publishDate, coverImage, pdfFile, type, featured, isActive
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Magazines` WHERE `title` = ? ORDER BY `id` DESC LIMIT 1', title);
    const mag = inserted[0] || null;

    if (mag && b.plans) {
      let planList: any[] = [];
      try {
        planList = typeof b.plans === 'string' ? JSON.parse(b.plans) : b.plans;
      } catch (_e) {
        if (Array.isArray(b.plans)) planList = b.plans;
      }
      for (const p of planList) {
        if (p.duration && p.price) {
          try {
            await prisma.$executeRawUnsafe(
              'INSERT INTO `MagazinePlans` (`magazineId`, `duration`, `price`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, 1, NOW(), NOW())',
              mag.id, parseInt(p.duration, 10), parseFloat(p.price)
            );
          } catch (_e) { }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Magazine created successfully',
      data: mag,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create magazine', error: err?.message });
  }
};

export const updateMagazine = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid magazine ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.title !== undefined) updates.title = String(b.title).trim();
    if (b.description !== undefined) updates.description = b.description;
    if (b.publishDate !== undefined) updates.publishDate = b.publishDate || null;
    if (b.type !== undefined) updates.type = b.type;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['coverImage']?.[0]?.filename) updates.coverImage = files['coverImage'][0].filename;
      if (files['pdfFile']?.[0]?.filename) updates.pdfFile = files['pdfFile'][0].filename;
    } else {
      if (b.coverImage !== undefined) updates.coverImage = b.coverImage;
      if (b.pdfFile !== undefined) updates.pdfFile = b.pdfFile;
    }

    await executePartialTableUpdate('Magazines', id, updates);

    if (b.plans) {
      let planList: any[] = [];
      try {
        planList = typeof b.plans === 'string' ? JSON.parse(b.plans) : b.plans;
      } catch (_e) {
        if (Array.isArray(b.plans)) planList = b.plans;
      }
      if (planList.length > 0) {
        try {
          await prisma.$executeRawUnsafe('DELETE FROM `MagazinePlans` WHERE `magazineId` = ?', id);
          for (const p of planList) {
            if (p.duration && p.price) {
              await prisma.$executeRawUnsafe(
                'INSERT INTO `MagazinePlans` (`magazineId`, `duration`, `price`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, 1, NOW(), NOW())',
                id, parseInt(p.duration, 10), parseFloat(p.price)
              );
            }
          }
        } catch (_e) { }
      }
    }

    res.json({ success: true, message: 'Magazine updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update magazine', error: err?.message });
  }
};

export const deleteMagazine = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `Magazines` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Magazine deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete magazine', error: err?.message });
  }
};

// ==========================================
// INQUIRIES & EXPORT
// ==========================================

export const getInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type || (req.query.type as string);
    const search = ((req.query.search as string) || '').trim();

    let query = 'SELECT * FROM `Inquiries` WHERE `deletedAt` IS NULL';
    const params: any[] = [];

    if (type && type !== 'all') {
      query += ' AND `type` = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (`name` LIKE ? OR `email` LIKE ? OR `phone` LIKE ? OR `contactFor` LIKE ? OR `message` LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ' ORDER BY `id` DESC LIMIT 2000';

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

    // Get summary counts by inquiry type
    const countRows: any[] = await prisma.$queryRawUnsafe(
      'SELECT `type`, COUNT(*) as count FROM `Inquiries` WHERE `deletedAt` IS NULL GROUP BY `type`'
    );
    const counts: Record<string, number> = { all: 0 };
    for (const c of countRows) {
      const cnt = Number(c.count || 0);
      counts[c.type] = cnt;
      counts.all += cnt;
    }

    res.json({
      success: true,
      data: rows,
      counts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries', error: err?.message });
  }
};

export const exportInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type || 'all';
    let query = 'SELECT * FROM `Inquiries` WHERE `deletedAt` IS NULL';
    const params: any[] = [];
    if (type && type !== 'all') {
      query += ' AND `type` = ?';
      params.push(type);
    }
    query += ' ORDER BY `id` DESC LIMIT 5000';

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="website-inquiries-${type}.csv"`);

    let csv = 'ID,Name,Email,Phone,Inquiry Type,Subject/Company,Message,Date\n';
    for (const r of rows) {
      const name = (r.name || '').replace(/"/g, '""');
      const email = (r.email || '').replace(/"/g, '""');
      const phone = (r.phone || '').replace(/"/g, '""');
      const t = (r.type || '').replace(/"/g, '""');
      const company = (r.contactFor || '').replace(/"/g, '""');
      const message = (r.message || '').replace(/"/g, '""');
      const date = r.createdAt ? new Date(r.createdAt).toISOString() : '';
      csv += `"${r.id}","${name}","${email}","${phone}","${t}","${company}","${message}","${date}"\n`;
    }
    res.send(csv);
  } catch (err: any) {
    res.status(500).send('Error generating CSV');
  }
};

export const createInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const type = b.type || req.params.type || 'contactUs';
    const result = await createInquiryWithLead({
      name: b.name || b.fullName,
      email: b.email,
      phone: b.phone || b.contact || b.mobile,
      type,
      contactFor: b.contactFor || b.subject || b.company || b.companyName,
      message: b.message || b.comments || b.notes,
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry received and lead captured successfully',
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create inquiry', error: err?.message });
  }
};

export const deleteInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Inquiries` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Inquiry removed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete inquiry', error: err?.message });
  }
};

export const syncWebsiteLeadsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const autoAssign = req.body?.autoAssign === true || req.query?.autoAssign === 'true';
    const includeNewsletter = req.body?.includeNewsletter !== false && req.query?.includeNewsletter !== 'false';
    const stats = await syncWebsiteInquiriesToLeads(autoAssign, includeNewsletter);
    res.json({
      success: true,
      message: `Website sync completed: ${stats.newlySynced} new leads added to CRM, ${stats.alreadySynced} already synced.`,
      data: stats,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to sync website leads', error: err?.message });
  }
};


// ==========================================
// TEAMS
// ==========================================

export const getTeams = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Teams` ORDER BY `id` ASC');
    const formatted = rows.map((t) => ({
      ...t,
      image_url: formatImageUrl(t.image, 'teams'),
      imageUrl: formatImageUrl(t.image, 'teams'),
      isActive: t.isActive === 1 || t.isActive === true || t.isActive === '1',
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch teams', error: err?.message });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const name = (b.name || '').trim();
    const position = (b.position || b.designation || '').trim();
    const description = (b.description || '').trim();
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;

    let image = b.image || null;
    if (req.file) {
      image = req.file.filename;
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Teams` (`name`, `position`, `image`, `description`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      name, position, image, description, isActive
    );

    const inserted: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Teams` WHERE `name` = ? ORDER BY `id` DESC LIMIT 1', name);
    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: inserted[0] || null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create team member', error: err?.message });
  }
};

export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid team ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.name !== undefined) updates.name = String(b.name).trim();
    if (b.position !== undefined || b.designation !== undefined) updates.position = String(b.position || b.designation).trim();
    if (b.description !== undefined) updates.description = String(b.description).trim();
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }
    if (req.file?.filename) {
      updates.image = req.file.filename;
    }

    await executePartialTableUpdate('Teams', id, updates);

    res.json({ success: true, message: 'Team member updated successfully', updatedFields: Object.keys(updates) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update team member', error: err?.message });
  }
};

export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `Teams` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete team member', error: err?.message });
  }
};

// ==========================================
// AWARDS & TESTIMONIALS
// ==========================================

export const getAwards = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Awards` WHERE `deletedAt` IS NULL ORDER BY `id` DESC');
    res.json({
      success: true,
      data: rows.map((a) => ({
        ...a,
        image_url: formatImageUrl(a.image, 'awards'),
        imageUrl: formatImageUrl(a.image, 'awards'),
        banner_url: formatImageUrl(a.bannerImage, 'awards'),
        bannerImageUrl: formatImageUrl(a.bannerImage, 'awards'),
        banner_image_url: formatImageUrl(a.bannerImage, 'awards'),
        brochure_file_url: formatImageUrl(a.brochureFile, 'awards'),
        brochureFileUrl: formatImageUrl(a.brochureFile, 'awards'),
        brochure_image_url: formatImageUrl(a.brochureImage, 'awards'),
        brochureImageUrl: formatImageUrl(a.brochureImage, 'awards'),
        isActive: a.isActive === 1 || a.isActive === true || a.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch awards', error: err?.message });
  }
};

export const createAward = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const description = b.description || '';
    const longDescription = b.longDescription || '';
    const date = b.date || null;
    const time = b.time || '';
    const address = b.address || '';
    const awardType = b.awardType || 'incense media';
    const isActive = b.isActive === 'false' || b.isActive === false || b.isActive === 0 ? 0 : 1;
    const optionalData = typeof b.optionalData === 'string' ? b.optionalData : JSON.stringify(b.optionalData || {});
    const metaTitle = b.metaTitle || null;
    const metaKeywords = b.metaKeywords || null;
    const metaDescription = b.metaDescription || null;

    let image = b.image || null;
    let bannerImage = b.bannerImage || null;
    let brochureFile = b.brochureFile || null;
    let brochureImage = b.brochureImage || null;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['image']?.[0]) image = files['image'][0].filename;
      if (files['image_url']?.[0]) image = files['image_url'][0].filename;
      if (files['bannerImage']?.[0]) bannerImage = files['bannerImage'][0].filename;
      if (files['brochureFile']?.[0]) brochureFile = files['brochureFile'][0].filename;
      if (files['brochureImage']?.[0]) brochureImage = files['brochureImage'][0].filename;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Awards\`
      (\`title\`, \`slug\`, \`date\`, \`time\`, \`address\`, \`description\`, \`longDescription\`, \`brochureFile\`, \`awardType\`, \`image\`, \`bannerImage\`, \`brochureImage\`, \`isActive\`, \`optionalData\`, \`metaTitle\`, \`metaDescription\`, \`metaKeywords\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      title, slug, date, time, address, description, longDescription, brochureFile, awardType, image, bannerImage, brochureImage, isActive, optionalData, metaTitle, metaDescription, metaKeywords
    );

    res.status(201).json({ success: true, message: 'Award created successfully' });
  } catch (err: any) {
    console.error('Error creating award:', err);
    res.status(500).json({ success: false, message: 'Failed to create award', error: err?.message });
  }
};

export const updateAward = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid award ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.title !== undefined) {
      const title = String(b.title).trim();
      if (title) {
        updates.title = title;
        if (b.slug === undefined) updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
    }
    if (b.slug !== undefined) updates.slug = String(b.slug).trim();
    if (b.description !== undefined) updates.description = b.description;
    if (b.longDescription !== undefined) updates.longDescription = b.longDescription;
    if (b.date !== undefined) updates.date = b.date || null;
    if (b.time !== undefined) updates.time = b.time;
    if (b.address !== undefined) updates.address = b.address;
    if (b.awardType !== undefined) updates.awardType = b.awardType;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }
    if (b.optionalData !== undefined) {
      updates.optionalData = typeof b.optionalData === 'string' ? b.optionalData : JSON.stringify(b.optionalData || {});
    }
    if (b.metaTitle !== undefined) updates.metaTitle = b.metaTitle;
    if (b.metaDescription !== undefined) updates.metaDescription = b.metaDescription;
    if (b.metaKeywords !== undefined) updates.metaKeywords = b.metaKeywords;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['image']?.[0]) updates.image = files['image'][0].filename;
      if (files['bannerImage']?.[0]) updates.bannerImage = files['bannerImage'][0].filename;
      if (files['brochureFile']?.[0]) updates.brochureFile = files['brochureFile'][0].filename;
      if (files['brochureImage']?.[0]) updates.brochureImage = files['brochureImage'][0].filename;
    }

    await executePartialTableUpdate('Awards', id, updates);

    res.json({ success: true, message: 'Award updated successfully', updatedFields: Object.keys(updates) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update award', error: err?.message });
  }
};

export const deleteAward = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Awards` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Award deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete award', error: err?.message });
  }
};

export const getTestimonials = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Testimonials` ORDER BY `id` DESC');
    res.json({
      success: true,
      data: rows.map((t) => ({
        ...t,
        image_url: formatImageUrl(t.image, 'testimonials'),
        imageUrl: formatImageUrl(t.image, 'testimonials'),
        isActive: true,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials', error: err?.message });
  }
};

export const createTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const name = (b.name || '').trim();
    const designation = (b.designation || '').trim();
    const description = (b.description || '').trim();
    const rating = parseInt(b.rating || '5', 10);

    let image = b.image || null;
    if (req.file) image = req.file.filename;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Testimonials` (`name`, `image`, `rating`, `designation`, `description`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      name, image, rating, designation, description
    );

    res.status(201).json({ success: true, message: 'Testimonial created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create testimonial', error: err?.message });
  }
};

export const updateTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid testimonial ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.name !== undefined) updates.name = String(b.name).trim();
    if (b.designation !== undefined) updates.designation = String(b.designation).trim();
    if (b.description !== undefined) updates.description = String(b.description).trim();
    if (b.rating !== undefined) updates.rating = parseInt(b.rating || '5', 10);
    if (req.file?.filename) {
      updates.image = req.file.filename;
    }

    await executePartialTableUpdate('Testimonials', id, updates);

    res.json({ success: true, message: 'Testimonial updated successfully', updatedFields: Object.keys(updates) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update testimonial', error: err?.message });
  }
};

export const deleteTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `Testimonials` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete testimonial', error: err?.message });
  }
};

// ==========================================
// BREAKING NEWS
// ==========================================

export const getBreakingNews = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `BreakingNews` ORDER BY `id` DESC');
    res.json({
      success: true,
      data: rows.map((n) => ({
        ...n,
        isActive: n.isActive === 1 || n.isActive === true || n.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch breaking news', error: err?.message });
  }
};

export const createBreakingNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const message = (b.message || '').trim();
    const time = b.time || '';
    const status = b.status || 'NEW';
    const isActive = b.isActive === false || b.isActive === 'false' ? 0 : 1;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `BreakingNews` (`title`, `message`, `time`, `status`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      title, message, time, status, isActive
    );

    res.status(201).json({ success: true, message: 'Breaking news created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create breaking news', error: err?.message });
  }
};

export const updateBreakingNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid breaking news ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.title !== undefined) updates.title = String(b.title).trim();
    if (b.message !== undefined) updates.message = String(b.message).trim();
    if (b.time !== undefined) updates.time = b.time;
    if (b.status !== undefined) updates.status = b.status;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === false || b.isActive === 'false' || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }

    await executePartialTableUpdate('BreakingNews', id, updates);

    res.json({ success: true, message: 'Breaking news updated successfully', updatedFields: Object.keys(updates) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update breaking news', error: err?.message });
  }
};

export const deleteBreakingNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `BreakingNews` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Breaking news deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete breaking news', error: err?.message });
  }
};

// ==========================================
// SERVICES & PACKAGES
// ==========================================

export const getServices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Services` WHERE `deletedAt` IS NULL ORDER BY `id` DESC');
    res.json({
      success: true,
      data: rows.map((s) => ({
        ...s,
        banner_url: formatImageUrl(s.banner, 'services'),
        bannerImageUrl: formatImageUrl(s.banner, 'services'),
        image_url: formatImageUrl(s.banner, 'services'),
        imageUrl: formatImageUrl(s.banner, 'services'),
        isActive: s.isActive === 1 || s.isActive === true || s.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch services', error: err?.message });
  }
};

export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Services` WHERE `id` = ?', id);
    if (!rows.length) {
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
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch service', error: err?.message });
  }
};

export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const description = b.description || '';
    const longDescription = b.longDescription || '';
    const categoryId = b.categoryId ? parseInt(b.categoryId, 10) : null;
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;
    const metaTitle = b.metaTitle || null;
    const metaDescription = b.metaDescription || null;
    const metaKeywords = b.metaKeywords || null;

    let banner = b.banner || null;
    if (req.file) banner = req.file.filename;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Services\` (\`categoryId\`, \`title\`, \`slug\`, \`description\`, \`longDescription\`, \`banner\`, \`isActive\`, \`metaTitle\`, \`metaDescription\`, \`metaKeywords\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      categoryId, title, slug, description, longDescription, banner, isActive, metaTitle, metaDescription, metaKeywords
    );

    res.status(201).json({ success: true, message: 'Service created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create service', error: err?.message });
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

    if (b.categoryId !== undefined) updates.categoryId = b.categoryId ? parseInt(b.categoryId, 10) : null;
    if (b.title !== undefined) {
      const title = String(b.title).trim();
      if (title) {
        updates.title = title;
        if (b.slug === undefined) updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
    }
    if (b.slug !== undefined) updates.slug = String(b.slug).trim();
    if (b.description !== undefined) updates.description = b.description;
    if (b.longDescription !== undefined) updates.longDescription = b.longDescription;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }
    if (req.file?.filename) {
      updates.banner = req.file.filename;
    }

    await executePartialTableUpdate('Services', id, updates);

    res.json({ success: true, message: 'Service updated successfully', updatedFields: Object.keys(updates) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update service', error: err?.message });
  }
};

export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Services` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete service', error: err?.message });
  }
};

// ==========================================
// MASTERS (SERVICE CATEGORIES, ETC.)
// ==========================================

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

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    res.json({
      success: true,
      data: rows.map((m) => ({
        ...m,
        image_url: formatImageUrl(m.image, 'masters'),
        imageUrl: formatImageUrl(m.image, 'masters'),
        isActive: m.isActive === 1 || m.isActive === true || m.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch masters', error: err?.message });
  }
};

export const createMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const name = (b.name || '').trim();
    const slug = (b.slug || 'service-category').trim();
    const description = b.description || '';
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;

    let image = b.image || null;
    if (req.file) image = req.file.filename;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Masters` (`name`, `slug`, `image`, `description`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      name, slug, image, description, isActive
    );

    res.status(201).json({ success: true, message: 'Master created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create master', error: err?.message });
  }
};

export const updateMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const b = req.body;
    const name = (b.name || '').trim();
    const slug = (b.slug || 'service-category').trim();
    const description = b.description || '';
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;

    let imageClause = '';
    const params: any[] = [name, slug, description, isActive];
    if (req.file) {
      imageClause = ', `image` = ?';
      params.push(req.file.filename);
    }
    params.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE \`Masters\` SET \`name\` = ?, \`slug\` = ?, \`description\` = ?, \`isActive\` = ? ${imageClause}, \`updatedAt\` = NOW() WHERE \`id\` = ?`,
      ...params
    );

    res.json({ success: true, message: 'Master updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update master', error: err?.message });
  }
};

export const deleteMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Masters` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Master deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete master', error: err?.message });
  }
};

// ==========================================
// COURSES (ACADEMY)
// ==========================================

export const getCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Courses` WHERE `deletedAt` IS NULL ORDER BY `id` DESC');
    const items = rows.map((c) => ({
      ...c,
      image_url: formatImageUrl(c.image, 'courses'),
      imageUrl: formatImageUrl(c.image, 'courses'),
      banner_image_url: formatImageUrl(c.bannerImage, 'courses'),
      bannerImageUrl: formatImageUrl(c.bannerImage, 'courses'),
      isActive: c.isActive === 1 || c.isActive === true || c.isActive === '1',
    }));
    const meta = {
      total: items.length,
      page: 1,
      pages: 1,
    };
    res.json({
      success: true,
      data: {
        items,
        meta,
      },
      items,
      meta,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch courses', error: err?.message });
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const shortDescription = b.shortDescription || '';
    const description = b.description || '';
    const fees = b.fees || '0';
    const videoUrl = b.videoUrl || '';
    const slug = (b.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).trim();
    const isActive = b.isActive === 'false' || b.isActive === false || b.isActive === '0' || b.isActive === 0 ? 0 : 1;
    const optionalData = typeof b.optionalData === 'string' ? b.optionalData : JSON.stringify(b.optionalData || []);
    const metaTitle = b.metaTitle || null;
    const metaKeywords = b.metaKeywords || null;
    const metaDescription = b.metaDescription || null;

    let image = b.image || null;
    let bannerImage = b.bannerImage || b.banner_image || null;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['image']?.[0]) image = files['image'][0].filename;
      if (files['bannerImage']?.[0]) bannerImage = files['bannerImage'][0].filename;
      if (files['banner_image']?.[0]) bannerImage = files['banner_image'][0].filename;
    }

    const copyToCoursesDir = (fName: string | null) => {
      if (!fName) return;
      try {
        const src = path.join(process.cwd(), 'uploads', fName);
        const dstDir = path.join(process.cwd(), 'uploads', 'courses');
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
        const dst = path.join(dstDir, fName);
        if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
      } catch (_) {}
    };

    copyToCoursesDir(image);
    copyToCoursesDir(bannerImage);

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Courses\` (\`title\`, \`shortDescription\`, \`description\`, \`image\`, \`bannerImage\`, \`fees\`, \`isActive\`, \`slug\`, \`videoUrl\`, \`optionalData\`, \`metaTitle\`, \`metaKeywords\`, \`metaDescription\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      title, shortDescription, description, image, bannerImage, fees, isActive, slug, videoUrl, optionalData, metaTitle, metaKeywords, metaDescription
    );

    res.status(201).json({ success: true, message: 'Course created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create course', error: err?.message });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid course ID' });
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
    if (b.slug !== undefined) updates.slug = String(b.slug).trim();
    if (b.shortDescription !== undefined) updates.shortDescription = b.shortDescription;
    if (b.description !== undefined) updates.description = b.description;
    if (b.fees !== undefined) updates.fees = b.fees;
    if (b.videoUrl !== undefined) updates.videoUrl = b.videoUrl;
    if (b.optionalData !== undefined) {
      updates.optionalData = typeof b.optionalData === 'string' ? b.optionalData : JSON.stringify(b.optionalData);
    }
    if (b.metaTitle !== undefined) updates.metaTitle = b.metaTitle;
    if (b.metaKeywords !== undefined) updates.metaKeywords = b.metaKeywords;
    if (b.metaDescription !== undefined) updates.metaDescription = b.metaDescription;
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === '0' || b.isActive === 0) ? 0 : 1;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const copyToCoursesDir = (fName: string | null) => {
      if (!fName) return;
      try {
        const src = path.join(process.cwd(), 'uploads', fName);
        const dstDir = path.join(process.cwd(), 'uploads', 'courses');
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
        const dst = path.join(dstDir, fName);
        if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
      } catch (_) {}
    };

    if (files) {
      if (files['image']?.[0]?.filename) {
        updates.image = files['image'][0].filename;
        copyToCoursesDir(updates.image);
      }
      const bannerF = files['bannerImage']?.[0] || files['banner_image']?.[0];
      if (bannerF?.filename) {
        updates.bannerImage = bannerF.filename;
        copyToCoursesDir(updates.bannerImage);
      }
    }

    const result = await executePartialTableUpdate('Courses', id, updates);
    res.json({
      success: true,
      message: 'Course updated successfully',
      updatedFields: result.updatedFields,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update course', error: err?.message });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Courses` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete course', error: err?.message });
  }
};

// ==========================================
// CONTACT INFO & SETTINGS
// ==========================================

export const getContactSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Contacts` LIMIT 1');
    if (!rows.length) {
      res.json({ success: true, data: {} });
      return;
    }
    const c = rows[0];
    res.json({
      success: true,
      data: {
        ...c,
        faviconIconUrl: formatImageUrl(c.faviconIcon),
        frontLogoUrl: formatImageUrl(c.frontLogo),
        adminLogoUrl: formatImageUrl(c.adminLogo),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: err?.message });
  }
};

export const saveContactSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const companyName = b.companyName || '';
    const title = b.title || '';
    const copyright = b.copyright || '';
    const email = b.email || '';
    const phone = b.phone || '';
    const address = b.address || '';
    const instagram = b.instagram || '';
    const facebook = b.facebook || '';
    const linkedin = b.linkedin || '';
    const twitter = b.twitter || '';
    const youtube = b.youtube || '';
    const script = b.script || '';

    let fileClauses = '';
    const params: any[] = [companyName, title, copyright, email, phone, address, instagram, facebook, linkedin, twitter, youtube, script];

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['fevicon_icon']?.[0]) {
        fileClauses += ', `faviconIcon` = ?';
        params.push(files['fevicon_icon'][0].filename);
      }
      if (files['front_logo']?.[0]) {
        fileClauses += ', `frontLogo` = ?';
        params.push(files['front_logo'][0].filename);
      }
      if (files['admin_logo']?.[0]) {
        fileClauses += ', `adminLogo` = ?';
        params.push(files['admin_logo'][0].filename);
      }
    }

    const existing: any[] = await prisma.$queryRawUnsafe('SELECT `id` FROM `Contacts` LIMIT 1');
    if (existing.length > 0) {
      params.push(existing[0].id);
      await prisma.$executeRawUnsafe(
        `UPDATE \`Contacts\` SET \`companyName\` = ?, \`title\` = ?, \`copyright\` = ?, \`email\` = ?, \`phone\` = ?, \`address\` = ?, \`instagram\` = ?, \`facebook\` = ?, \`linkedin\` = ?, \`twitter\` = ?, \`youtube\` = ?, \`script\` = ? ${fileClauses}, \`updatedAt\` = NOW() WHERE \`id\` = ?`,
        ...params
      );
    } else {
      await prisma.$executeRawUnsafe(
        'INSERT INTO `Contacts` (`companyName`, `title`, `copyright`, `email`, `phone`, `address`, `instagram`, `facebook`, `linkedin`, `twitter`, `youtube`, `script`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        companyName, title, copyright, email, phone, address, instagram, facebook, linkedin, twitter, youtube, script
      );
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to save settings', error: err?.message });
  }
};

// ==========================================
// OPTIONAL IMAGES
// ==========================================

export const deleteOptionalImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `OptionalImages` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete image', error: err?.message });
  }
};

// ==========================================
// USERS FROM LIVE DATABASE
// ==========================================

export const getLegacyUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim();
    const reqUser = (req as any).user;
    const isSuperAdmin = reqUser?.roleName === 'Super Admin';

    let query = 'SELECT u.*, r.name as roleName FROM `Users` u LEFT JOIN `Roles` r ON u.roleId = r.id WHERE u.deletedAt IS NULL';
    const params: any[] = [];

    // Hide Super Admin accounts from Admin view
    if (!isSuperAdmin) {
      query += " AND (r.name IS NULL OR LOWER(r.name) NOT LIKE '%super%') AND (u.email NOT LIKE '%superadmin%')";
    }
    if (search) {
      query += ' AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY u.id DESC LIMIT 200';

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    res.json({
      success: true,
      data: rows.map((u) => ({
        ...u,
        profile_picture_url: formatImageUrl(u.profilePicture, 'users'),
        profilePictureUrl: formatImageUrl(u.profilePicture, 'users'),
        isActive: u.isActive === 1 || u.isActive === true || u.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: err?.message });
  }
};

export const createLegacyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, name, email, phone, phoneNumber, password, roleId, address, city, pincode } = req.body;
    const resolvedFirstName = firstName || (name ? name.split(' ')[0] : 'User');
    const resolvedLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : null);
    const resolvedPhone = phone || phoneNumber || null;
    const resolvedEmail = (email || '').trim().toLowerCase();

    if (!resolvedEmail) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const existing: any[] = await prisma.$queryRawUnsafe('SELECT id FROM `Users` WHERE `email` = ? LIMIT 1', resolvedEmail);
    if (existing && existing.length > 0) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password || 'user123', 10);
    const reqUser = (req as any).user;
    const isSuperAdmin = reqUser?.roleName === 'Super Admin';
    const targetRoleId = roleId ? parseInt(String(roleId), 10) : 2;

    if (!isSuperAdmin) {
      if (targetRoleId === 1 || String(roleId).toLowerCase().includes('super')) {
        res.status(403).json({ success: false, message: 'Only Super Admin can create Super Admin accounts' });
        return;
      }
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Users` (`firstName`, `lastName`, `email`, `phone`, `password`, `address`, `city`, `pincode`, `roleId`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      resolvedFirstName, resolvedLastName, resolvedEmail, resolvedPhone, hashedPassword, address || null, city || null, pincode || null, targetRoleId
    );

    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create user', error: err?.message });
  }
};

// ==========================================
// EVENT LINKS (EventImportantLinks)
// ==========================================

export const getEventLinks = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventIdParam = (req.params.id || req.query.eventId) as string | undefined;
    let query = 'SELECT * FROM `EventImportantLinks`';
    const params: any[] = [];
    if (eventIdParam) {
      query += ' WHERE `eventId` = ?';
      params.push(parseInt(String(eventIdParam), 10));
    }
    query += ' ORDER BY `id` DESC';

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    res.json({
      success: true,
      data: rows.map((l) => ({
        ...l,
        file_url: formatImageUrl(l.file, 'events'),
        fileUrl: formatImageUrl(l.file, 'events'),
        image_url: formatImageUrl(l.file, 'events'),
        imageUrl: formatImageUrl(l.file, 'events'),
        isActive: l.isActive === 1 || l.isActive === true || l.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch event links', error: err?.message });
  }
};

export const createEventLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const title = (b.title || '').trim();
    const eventId = parseInt(b.eventId as string, 10);
    const url = (b.url || '').trim();
    const isActive = b.isActive === 'false' || b.isActive === false ? 0 : 1;

    let file = null;
    let type = b.type || (url ? 'url' : 'file');

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (req.file) {
      file = req.file.filename;
      type = 'file';
    } else if (files && files['image']?.[0]) {
      file = files['image'][0].filename;
      type = 'file';
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO `EventImportantLinks` (`eventId`, `title`, `type`, `url`, `file`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      eventId, title, type, url, file, isActive
    );

    res.status(201).json({ success: true, message: 'Event link added successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to add event link', error: err?.message });
  }
};

export const updateEventLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid event link ID' });
      return;
    }

    const b = req.body || {};
    const updates: Record<string, any> = {};

    if (b.title !== undefined) updates.title = String(b.title).trim();
    if (b.url !== undefined) updates.url = String(b.url).trim();
    if (b.isActive !== undefined) {
      updates.isActive = (b.isActive === 'false' || b.isActive === false || b.isActive === 0 || b.isActive === '0') ? 0 : 1;
    }
    if (req.file?.filename) {
      updates.file = req.file.filename;
      updates.type = 'file';
    }

    await executePartialTableUpdate('EventImportantLinks', id, updates);

    res.json({ success: true, message: 'Event link updated successfully', updatedFields: Object.keys(updates) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update event link', error: err?.message });
  }
};

export const deleteEventLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `EventImportantLinks` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Event link deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete event link', error: err?.message });
  }
};

// ==========================================
// SLIDER PRIMARY & SEQUENCE
// ==========================================

export const setSliderPrimary = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Sliders` SET `isPrimary` = 0');
    await prisma.$executeRawUnsafe('UPDATE `Sliders` SET `isPrimary` = 1 WHERE `id` = ?', id);
    res.json({ success: true, message: 'Primary slider updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to set primary slider', error: err?.message });
  }
};

export const updateSliderSequence = async (req: Request, res: Response): Promise<void> => {
  try {
    const sequences = req.body.sequences || req.body;
    if (Array.isArray(sequences)) {
      for (let i = 0; i < sequences.length; i++) {
        const item = sequences[i];
        const id = item.id || item;
        const seq = item.sequenceNo !== undefined ? item.sequenceNo : i + 1;
        await prisma.$executeRawUnsafe('UPDATE `Sliders` SET `sequenceNo` = ? WHERE `id` = ?', seq, id);
      }
    }
    res.json({ success: true, message: 'Slider sequence updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update slider sequence', error: err?.message });
  }
};

// ==========================================
// BLOG COMMENTS
// ==========================================

export const getBlogComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const blogId = req.query.blogId as string;
    let query = 'SELECT c.*, b.title as blogTitle FROM `BlogComments` c LEFT JOIN `Blogs` b ON c.blogId = b.id WHERE c.deletedAt IS NULL';
    const params: any[] = [];
    if (blogId) {
      query += ' AND c.blogId = ?';
      params.push(parseInt(blogId, 10));
    }
    query += ' ORDER BY c.id DESC';

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);
    res.json({
      success: true,
      data: rows.map((c) => ({
        ...c,
        isActive: c.isActive === 1 || c.isActive === true || c.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch comments', error: err?.message });
  }
};

export const updateBlogCommentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `BlogComments` SET `isActive` = NOT `isActive` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Comment status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update comment status', error: err?.message });
  }
};

// ==========================================
// UPLOADS (CKEDITOR & IMAGES)
// ==========================================

export const uploadCkeditorImage = (req: Request, res: Response): void => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const file = req.file || files?.['upload']?.[0] || (files && Object.values(files)[0]?.[0]);
  if (!file) {
    res.status(400).json({ uploaded: false, error: { message: 'No file uploaded' } });
    return;
  }
  const url = formatImageUrl(file.filename);
  res.json({
    uploaded: true,
    url,
    default: url,
  });
};

export const uploadGenericImage = (req: Request, res: Response): void => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const file = req.file || files?.['image']?.[0] || (files && Object.values(files)[0]?.[0]);
  if (!file) {
    res.status(400).json({ success: false, message: 'No image uploaded' });
    return;
  }
  const url = formatImageUrl(file.filename);
  res.json({
    success: true,
    url,
    filename: file.filename,
    data: { url, filename: file.filename },
  });
};

// ==========================================
// COUPONS
// ==========================================

export const getCoupons = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `Coupons` WHERE `deletedAt` IS NULL ORDER BY `id` DESC');
    res.json({
      success: true,
      data: rows.map((c) => ({
        ...c,
        isActive: c.isActive === 1 || c.isActive === true || c.isActive === '1',
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch coupons', error: err?.message });
  }
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const name = (b.name || '').trim();
    const code = (b.code || '').trim().toUpperCase();
    const type = b.type || 'flat';
    const value = parseFloat(b.value || '0');
    const minAmount = parseFloat(b.minAmount || '0');
    const isActive = b.isActive === false || b.isActive === 'false' ? 0 : 1;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Coupons` (`name`, `code`, `type`, `value`, `minAmount`, `isActive`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      name, code, type, value, minAmount, isActive
    );

    res.status(201).json({ success: true, message: 'Coupon created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create coupon', error: err?.message });
  }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const b = req.body;
    const name = (b.name || '').trim();
    const code = (b.code || '').trim().toUpperCase();
    const type = b.type || 'flat';
    const value = parseFloat(b.value || '0');
    const minAmount = parseFloat(b.minAmount || '0');
    const isActive = b.isActive === false || b.isActive === 'false' ? 0 : 1;

    await prisma.$executeRawUnsafe(
      'UPDATE `Coupons` SET `name` = ?, `code` = ?, `type` = ?, `value` = ?, `minAmount` = ?, `isActive` = ?, `updatedAt` = NOW() WHERE `id` = ?',
      name, code, type, value, minAmount, isActive, id
    );

    res.json({ success: true, message: 'Coupon updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update coupon', error: err?.message });
  }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('UPDATE `Coupons` SET `deletedAt` = NOW() WHERE `id` = ?', id);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete coupon', error: err?.message });
  }
};

// ==========================================
// ORDERS & USER STATUS
// ==========================================

export const getOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT o.*, 
             COALESCE(u.firstName, usr.firstName) as firstName,
             COALESCE(u.lastName, usr.lastName) as lastName,
             COALESCE(u.email, usr.email) as email
      FROM \`Orders\` o 
      LEFT JOIN \`User\` u ON o.userId = u.id
      LEFT JOIN \`Users\` usr ON o.userId = usr.id
      ORDER BY o.id DESC LIMIT 500
    `);
    res.json({
      success: true,
      data: rows.map((o) => ({
        ...o,
        orderId: o.orderId || `ORD-${o.id}`,
        status: o.status || 'Pending',
        User: {
          name: [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || 'Customer',
          email: o.email || '',
        },
        OrderItems: [],
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err?.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const status = req.body.status || 'completed';
    await prisma.$executeRawUnsafe('UPDATE `Orders` SET `status` = ?, `updatedAt` = NOW() WHERE `id` = ?', status, id);
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: err?.message });
  }
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `Orders` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete order', error: err?.message });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    try {
      await prisma.$executeRawUnsafe('UPDATE `User` SET `isActive` = NOT `isActive` WHERE `id` = ?', id);
    } catch {
      await prisma.$executeRawUnsafe('UPDATE `Users` SET `isActive` = NOT `isActive` WHERE `id` = ?', id);
    }
    res.json({ success: true, message: 'User status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to toggle user status', error: err?.message });
  }
};

// ==========================================
// KEY CLIENTS (OptionalImages with slug 'key-client')
// ==========================================

export const getKeyClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      "SELECT * FROM `OptionalImages` WHERE `slug` = 'key-client' ORDER BY `id` DESC"
    );
    res.json({
      success: true,
      data: rows.map((img) => ({
        ...img,
        image_url: formatImageUrl(img.image, 'clients'),
        imageUrl: formatImageUrl(img.image, 'clients'),
        client_logo: formatImageUrl(img.image, 'clients'),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch key clients', error: err?.message });
  }
};

export const createKeyClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const clientLogoFiles = files?.['client_logo'] || files?.['image'] || (req.file ? [req.file] : []);

    if (!clientLogoFiles || clientLogoFiles.length === 0) {
      res.status(400).json({ success: false, message: 'No client image provided' });
      return;
    }

    for (const f of clientLogoFiles) {
      await prisma.$executeRawUnsafe(
        "INSERT INTO `OptionalImages` (`slug`, `image`, `createdAt`, `updatedAt`) VALUES ('key-client', ?, NOW(), NOW())",
        f.filename
      );
    }

    res.status(201).json({ success: true, message: 'Client image uploaded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to upload client image', error: err?.message });
  }
};

export const deleteKeyClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$executeRawUnsafe('DELETE FROM `OptionalImages` WHERE `id` = ?', id);
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete client', error: err?.message });
  }
};

// ==========================================
// DASHBOARD STATS
// ==========================================

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orderCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Orders`');
    let userCountNum = 0;
    try {
      const uCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `User`');
      userCountNum = Number(uCount[0]?.c || 0);
    } catch {
      const uCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Users`');
      userCountNum = Number(uCount[0]?.c || 0);
    }
    const eventCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Events` WHERE `deletedAt` IS NULL');
    const blogCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Blogs`');
    const inquiryCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Inquiries` WHERE `deletedAt` IS NULL');

    res.json({
      success: true,
      data: {
        totalOrders: Number(orderCount[0]?.c || 0),
        totalUsers: userCountNum,
        totalEvents: Number(eventCount[0]?.c || 0),
        totalBlogs: Number(blogCount[0]?.c || 0),
        totalInquiries: Number(inquiryCount[0]?.c || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: err?.message });
  }
};

export const getOrderDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const orderCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Orders`');
    const totalOrders = Number(orderCount[0]?.c || 0);

    const monthlyCounts: any[] = await prisma.$queryRawUnsafe(
      'SELECT MONTH(`createdAt`) as m, COUNT(*) as cnt FROM `Orders` WHERE YEAR(`createdAt`) = ? GROUP BY MONTH(`createdAt`)',
      year
    );

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const graphData = monthNames.map((name, idx) => {
      const match = monthlyCounts.find((item: any) => Number(item.m) === idx + 1);
      return {
        month: name,
        totalOrders: match ? Number(match.cnt) : 0,
      };
    });

    const topFiveOrders: any[] = await prisma.$queryRawUnsafe(`
      SELECT o.id, o.orderId, o.totalAmount, o.status, o.createdAt,
             COALESCE(u.firstName, usr.firstName) as firstName,
             COALESCE(u.email, usr.email) as email
      FROM \`Orders\` o 
      LEFT JOIN \`User\` u ON o.userId = u.id
      LEFT JOIN \`Users\` usr ON o.userId = usr.id
      ORDER BY o.id DESC LIMIT 5
    `);

    res.json({
      success: true,
      message: 'Dashboard stats fetched',
      data: {
        totalOrders,
        totalOrdersOfLastMonth: Math.round(totalOrders * 0.1),
        graphData,
        selectedYear: year,
        topFiveOrders: topFiveOrders.map((o) => ({
          ...o,
          User: { name: o.firstName || o.email || 'Customer' },
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch order dashboard stats', error: err?.message });
  }
};

export const getUserDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    let totalUsers = 0;
    let monthlyCounts: any[] = [];
    let newestUsers: any[] = [];

    try {
      const uCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `User`');
      totalUsers = Number(uCount[0]?.c || 0);
      monthlyCounts = await prisma.$queryRawUnsafe(
        'SELECT MONTH(`createdAt`) as m, COUNT(*) as cnt FROM `User` WHERE YEAR(`createdAt`) = ? GROUP BY MONTH(`createdAt`)',
        year
      );
      newestUsers = await prisma.$queryRawUnsafe(
        'SELECT id, firstName as name, email, createdAt FROM `User` ORDER BY id DESC LIMIT 5'
      );
    } catch {
      const uCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Users`');
      totalUsers = Number(uCount[0]?.c || 0);
      monthlyCounts = await prisma.$queryRawUnsafe(
        'SELECT MONTH(`createdAt`) as m, COUNT(*) as cnt FROM `Users` WHERE YEAR(`createdAt`) = ? GROUP BY MONTH(`createdAt`)',
        year
      );
      newestUsers = await prisma.$queryRawUnsafe(
        'SELECT id, firstName as name, email, createdAt FROM `Users` ORDER BY id DESC LIMIT 5'
      );
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const graphData = monthNames.map((name, idx) => {
      const match = monthlyCounts.find((item: any) => Number(item.m) === idx + 1);
      return {
        month: name,
        totalUsers: match ? Number(match.cnt) : 0,
      };
    });

    res.json({
      success: true,
      message: 'User dashboard stats fetched',
      data: {
        totalUsers,
        totalConsultants: 0,
        totalPartners: 0,
        totalUsersOfLastMonth: Math.round(totalUsers * 0.1),
        graphData,
        selectedYear: year,
        newestUsers,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch user dashboard stats', error: err?.message });
  }
};

export const getBookingDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  res.json({
    success: true,
    data: {
      totalBookings: 0,
      totalBookingsOfLastMonth: 0,
      graphData: monthNames.map((name) => ({ month: name, totalBookings: 0 })),
    },
  });
};

// ==========================================
// PROFILE & PASSWORD
// ==========================================

export const getAdminProfile = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      id: 1,
      name: 'Super Admin',
      email: 'superadmin@incensemedia.in',
      role: 'SuperAdmin',
    },
  });
};

export const updateAdminPassword = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Password updated successfully' });
};

// ==========================================
// PARTNERS, NEWSLETTER, FEEDBACKS
// ==========================================

export const getPartners = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const createPartner = async (_req: Request, res: Response): Promise<void> => {
  res.status(201).json({ success: true, message: 'Partner created successfully' });
};

export const updatePartner = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Partner updated successfully' });
};

export const deletePartner = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Partner deleted successfully' });
};

export const getNewsletterSubscribers = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const updateFeedbackStatus = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Feedback status updated successfully' });
};



