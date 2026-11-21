import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getCMSPage,
  saveCMSPage,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getMagazines,
  createMagazine,
  updateMagazine,
  deleteMagazine,
  getInquiries,
  createInquiry,
  deleteInquiry,
  syncWebsiteLeadsController,
  exportInquiries,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getAwards,
  createAward,
  updateAward,
  deleteAward,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getBreakingNews,
  createBreakingNews,
  updateBreakingNews,
  deleteBreakingNews,
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getMasters,
  createMaster,
  updateMaster,
  deleteMaster,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getContactSettings,
  saveContactSettings,
  deleteOptionalImage,
  getLegacyUsers,
  createLegacyUser,
  getEventLinks,
  createEventLink,
  updateEventLink,
  deleteEventLink,
  setSliderPrimary,
  updateSliderSequence,
  getBlogComments,
  updateBlogCommentStatus,
  uploadCkeditorImage,
  uploadGenericImage,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  toggleUserStatus,
  getKeyClients,
  createKeyClient,
  deleteKeyClient,
  getDashboardStats,
  getOrderDashboardStats,
  getUserDashboardStats,
  getBookingDashboardStats,
  getAdminProfile,
  updateAdminPassword,
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getNewsletterSubscribers,
  updateFeedbackStatus,
} from '../controllers/cms.controller';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024,
  },
});

const router = Router();

// Blogs
router.get('/blog', getBlogs);
router.post(
  '/blog',
  upload.fields([
    { name: 'blog_image', maxCount: 1 },
    { name: 'banner_image', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]),
  createBlog
);
router.get('/blog/:id', getBlogById);
router.put(
  '/blog/:id',
  upload.fields([
    { name: 'blog_image', maxCount: 1 },
    { name: 'banner_image', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]),
  updateBlog
);
router.delete('/blog/:id', deleteBlog);

// Blog Categories
router.get('/blog-category', getBlogCategories);
router.post('/blog-category', createBlogCategory);
router.put('/blog-category/:id', updateBlogCategory);
router.delete('/blog-category/:id', deleteBlogCategory);

// Sliders
router.get('/slider', getSliders);
router.post('/slider', upload.single('image_url'), createSlider);
router.put('/slider/:id', upload.single('image_url'), updateSlider);
router.delete('/slider/:id', deleteSlider);

// CMS Detail & Save
router.get(['/cms', '/cms/:slug', '/cms-detail/:slug'], getCMSPage);
router.post(['/cms', '/cms/:slug'], upload.single('banner'), saveCMSPage);
router.put(['/cms/:id', '/cms-detail/:slug'], upload.single('banner'), saveCMSPage);
router.delete('/cms-optional-image/:id', deleteOptionalImage);

// Events
router.get('/events', getEvents);
router.post(
  '/events',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'icon', maxCount: 1 },
    { name: 'optional_image', maxCount: 20 },
  ]),
  createEvent
);
router.put(
  '/events/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'icon', maxCount: 1 },
    { name: 'optional_image', maxCount: 20 },
  ]),
  updateEvent
);
router.delete('/events/:id', deleteEvent);

// Magazines
router.get('/magazines', getMagazines);
router.post(
  '/magazines',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
  ]),
  createMagazine
);
router.put(
  '/magazines/:id',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
  ]),
  updateMagazine
);
router.delete('/magazines/:id', deleteMagazine);

// Inquiries & Website Leads
router.get('/inquiries', getInquiries);
router.get('/inquiries/:type', getInquiries);
router.post(['/inquiries', '/inquiries/:type', '/contact-us', '/contact'], createInquiry);
router.delete('/inquiries/:id', deleteInquiry);
router.post(['/inquiries/sync-to-crm', '/inquiries/sync-website', '/sync-website-leads'], syncWebsiteLeadsController);
router.get('/export-inquiries/:type', exportInquiries);
router.get('/applied-jobs', getInquiries);

// Teams
router.get('/teams', getTeams);
router.post('/teams', upload.single('team_image'), createTeam);
router.put('/teams/:id', upload.single('team_image'), updateTeam);
router.delete('/teams/:id', deleteTeam);

// Awards
router.get('/awards', getAwards);
router.post(
  '/awards',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image_url', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'brochureFile', maxCount: 1 },
    { name: 'brochureImage', maxCount: 1 },
    { name: 'optional_image', maxCount: 10 },
  ]),
  createAward
);
router.put(
  '/awards/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image_url', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'brochureFile', maxCount: 1 },
    { name: 'brochureImage', maxCount: 1 },
    { name: 'optional_image', maxCount: 10 },
  ]),
  updateAward
);
router.delete('/awards/:id', deleteAward);

// Testimonials
router.get('/testimonials', getTestimonials);
router.post('/testimonials', upload.single('image_url'), createTestimonial);
router.put('/testimonials/:id', upload.single('image_url'), updateTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);

// Breaking News
router.get('/breaking-news', getBreakingNews);
router.post('/breaking-news', createBreakingNews);
router.put('/breaking-news/:id', updateBreakingNews);
router.delete('/breaking-news/:id', deleteBreakingNews);

// Services
router.get('/services', getServices);
router.get('/services/:id', getServiceById);
router.post('/services', upload.single('banner'), createService);
router.put('/services/:id', upload.single('banner'), updateService);
router.delete('/services/:id', deleteService);

// Masters (Service Categories, etc.)
router.get('/masters', getMasters);
router.post('/masters', upload.single('image'), createMaster);
router.put('/masters/:id', upload.single('image'), updateMaster);
router.delete('/masters/:id', deleteMaster);

// Courses
router.get('/courses', getCourses);
router.post(
  '/courses',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]),
  createCourse
);
router.put(
  '/courses/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'banner_image', maxCount: 1 },
  ]),
  updateCourse
);
router.delete('/courses/:id', deleteCourse);

// Contact Settings
router.get(['/contact', '/settings'], getContactSettings);
router.post(
  ['/contact', '/settings', '/settings/update'],
  upload.fields([
    { name: 'fevicon_icon', maxCount: 1 },
    { name: 'front_logo', maxCount: 1 },
    { name: 'admin_logo', maxCount: 1 },
  ]),
  saveContactSettings
);

// Legacy Users
router.get('/users', getLegacyUsers);
router.post('/users', createLegacyUser);
router.post('/users/toggle-status', toggleUserStatus);
router.put('/users/:id', toggleUserStatus);

// Event Links
router.get(['/events-link', '/events-link/:id'], getEventLinks);
router.post(
  '/events-link',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  createEventLink
);
router.put(
  '/events-link/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  updateEventLink
);
router.delete('/events-link/:id', deleteEventLink);

// Slider Primary & Sequence
router.post('/slider-primary/:id', setSliderPrimary);
router.post('/slider-sequence', updateSliderSequence);

// Blog Comments
router.get('/blog-comments', getBlogComments);
router.put('/blog-comments/:id/status', updateBlogCommentStatus);

// Uploads
router.post('/ckeditor-image-upload', upload.single('upload'), uploadCkeditorImage);
router.post(['/upload-image', '/upload'], upload.single('image'), uploadGenericImage);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Orders / Appointments / Feedbacks
router.get(['/orders', '/appointments', '/feedbacks'], getOrders);
router.put(['/orders/:id', '/orders/update-status/:id'], updateOrderStatus);
router.delete(['/orders/:id', '/orders/delete/:id'], deleteOrder);
router.put('/feedbacks/:id', updateFeedbackStatus);

// Key Clients
router.get(['/key-clients', '/clients'], getKeyClients);
router.post(
  ['/key-clients', '/clients'],
  upload.fields([
    { name: 'client_logo', maxCount: 10 },
    { name: 'image', maxCount: 10 },
  ]),
  createKeyClient
);
router.delete(['/key-clients/:id', '/clients/:id'], deleteKeyClient);

// Dashboard Stats
router.get('/dashboard-stats', getDashboardStats);
router.get('/dashboard/orders', getOrderDashboardStats);
router.get('/dashboard/users', getUserDashboardStats);
router.get('/dashboard/bookings', getBookingDashboardStats);

// Profile & Password
router.get('/profile', getAdminProfile);
router.post(['/update-password', '/update-password/:id'], updateAdminPassword);
router.put(['/update-password', '/update-password/:id'], updateAdminPassword);

// Team Action Aliases
router.post('/team/create', upload.single('team_image'), createTeam);
router.put('/team/update/:id', upload.single('team_image'), updateTeam);
router.delete('/team/delete/:id', deleteTeam);

// Magazine Action Aliases
router.post(
  '/magazines/create',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
  ]),
  createMagazine
);
router.put(
  '/magazines/update/:id',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
  ]),
  updateMagazine
);
router.delete('/magazines/delete/:id', deleteMagazine);

// Partners
router.get('/partners', getPartners);
router.post(['/partners', '/partners/create'], createPartner);
router.put(['/partners/:id', '/partners/update/:id'], updatePartner);
router.delete(['/partners/:id', '/partners/delete/:id'], deletePartner);

// Newsletter Subscribers
router.get(['/newsletter/subscribers', '/subscribers'], getNewsletterSubscribers);

export default router;


