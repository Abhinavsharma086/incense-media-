import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import leadRoutes from './routes/lead.routes';
import dealRoutes from './routes/deal.routes';
import followUpRoutes from './routes/followup.routes';
import scoringRoutes from './routes/scoring.routes';
import campaignRoutes from './routes/campaign.routes';
import metaRoutes from './routes/meta.routes';
import accountingRoutes from './routes/accounting.routes';
import unitRoutes from './routes/unit.routes';
import superAdminRoutes from './routes/superadmin.routes';
import syncRoutes from './routes/sync.routes';
import { syncLeadsNow } from './controllers/meta.controller';

import masterRoutes from './routes/master.routes';
import serviceRoutes from './routes/service.routes';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

dotenv.config();

const app = express();

// Disable ETag generation to guarantee clients never receive stale 304 responses
app.set('etag', false);

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Anti-Cache Middleware: Force all dynamic API & Admin responses to be strictly fresh across all browsers
app.use(['/api', '/admin'], (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Serve uploads directory
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Smart uploads resolver: if /uploads/:subfolder/:filename is requested but doesn't exist in subfolder, check root /uploads/:filename or vice versa
app.get('/uploads/:subfolder/:filename', (req, res, next) => {
  const { subfolder, filename } = req.params;
  const cleanFilename = path.basename(filename);
  
  // 1. Check root uploadDir (where CRM multer uploads files)
  const rootPath = path.join(uploadDir, cleanFilename);
  if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
    return res.sendFile(rootPath);
  }

  // 2. Check legacy node-app uploads
  const legacySubPath = path.join('/var/www/node-app/uploads', subfolder, cleanFilename);
  if (fs.existsSync(legacySubPath) && fs.statSync(legacySubPath).isFile()) {
    return res.sendFile(legacySubPath);
  }

  const legacyRootPath = path.join('/var/www/node-app/uploads', cleanFilename);
  if (fs.existsSync(legacyRootPath) && fs.statSync(legacyRootPath).isFile()) {
    return res.sendFile(legacyRootPath);
  }

  next();
});

// Also if /uploads/:filename is requested directly, check all known subfolders
app.get('/uploads/:filename', (req, res, next) => {
  const cleanFilename = path.basename(req.params.filename);
  const folders = ['events', 'blogs', 'ckeditor', 'magazines', 'page-banner', 'slider', 'services', 'awards', 'teams', 'masters', 'users', 'clients', 'courses'];
  for (const f of folders) {
    const p1 = path.join(uploadDir, f, cleanFilename);
    if (fs.existsSync(p1) && fs.statSync(p1).isFile()) {
      return res.sendFile(p1);
    }
    const p2 = path.join('/var/www/node-app/uploads', f, cleanFilename);
    if (fs.existsSync(p2) && fs.statSync(p2).isFile()) {
      return res.sendFile(p2);
    }
  }
  next();
});

// Image upload endpoints
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const uploadMiddleware = multer({ storage: uploadStorage });

const handleFileUpload = (req: any, res: any) => {
  const file = req.file || (Array.isArray(req.files) ? req.files[0] : (req.files ? (Object.values(req.files) as any).flat()[0] : null));
  if (!file) {
    res.status(400).json({ success: false, uploaded: false, error: { message: 'No file uploaded' } });
    return;
  }
  
  // Ensure copy to ckeditor subfolder if exists
  try {
    const ckDir = path.join(uploadDir, 'ckeditor');
    if (!fs.existsSync(ckDir)) fs.mkdirSync(ckDir, { recursive: true });
    const src = path.join(uploadDir, file.filename);
    const dst = path.join(ckDir, file.filename);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
    }
  } catch (_) {}

  const url = `https://api.incensemedia.in/uploads/${file.filename}`;
  res.json({
    success: true,
    uploaded: true,
    url,
    default: url,
    data: { url, image: url, banner: url, default: url },
  });
};

app.post('/admin/upload-image', uploadMiddleware.any(), handleFileUpload);
app.post('/api/upload-image', uploadMiddleware.any(), handleFileUpload);

app.post('/admin/ckeditor-image-upload', uploadMiddleware.any(), handleFileUpload);
app.post('/api/ckeditor-image-upload', uploadMiddleware.any(), handleFileUpload);

app.post('/admin/upload', uploadMiddleware.any(), handleFileUpload);
app.post('/api/upload', uploadMiddleware.any(), handleFileUpload);

// Masters & Service Categories routes (both /admin/masters and /api/masters)
app.use('/admin/masters', masterRoutes);
app.use('/api/masters', masterRoutes);

// Services routes (both /admin/services and /api/services)
app.use('/admin/services', serviceRoutes);
app.use('/api/services', serviceRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/sync', syncRoutes);

import cmsRoutes from './routes/cms.routes';

// CMS & Legacy Admin Routes connected directly to live incense_db
app.use('/admin', cmsRoutes);
app.use('/api', cmsRoutes);


import { syncWebsiteInquiriesToLeads } from './services/websiteLeadSync.service';

// Background Cron: Auto-sync Meta Leads every 15 minutes
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
setInterval(async () => {
  console.log('[CRON] Running 15-minute Meta Lead Auto-Sync...');
  try {
    const dummyReq = {} as any;
    const dummyRes = { json: () => {}, status: () => ({ json: () => {} }) } as any;
    await syncLeadsNow(dummyReq, dummyRes);
  } catch (err) {
    console.error('[CRON] Auto-sync failed:', err);
  }
}, FIFTEEN_MINUTES_MS);

// Background Cron: Auto-sync Website Inquiries into CRM Leads every 2 minutes
const TWO_MINUTES_MS = 2 * 60 * 1000;
setInterval(async () => {
  try {
    const res = await syncWebsiteInquiriesToLeads(false);
    if (res.newlySynced > 0) {
      console.log(`[CRON] Synced ${res.newlySynced} new website lead(s) to CRM.`);
    }
  } catch (err) {
    console.error('[CRON] Website inquiries sync failed:', err);
  }
}, TWO_MINUTES_MS);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Initial sync on boot
    try {
      console.log('[BOOT] Initializing website lead synchronization...');
      const stats = await syncWebsiteInquiriesToLeads(false);
      console.log(`[BOOT] Website lead sync complete: ${stats.newlySynced} newly synced, ${stats.alreadySynced} already synced (${stats.totalInquiries} total inquiries).`);
    } catch (bootErr) {
      console.warn('[BOOT] Initial website lead sync warning:', bootErr);
    }
});

