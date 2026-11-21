export const ENDPOINTS = {
    // Auth
    LOGIN: "/web/login",
    SIGNUP: "/web/signup",
    INQUIRY: "/web/inquiry",
    LOGOUT: "/web/logout",
    REFRESH_TOKEN: "/web/refresh",
    OTP_VERIFY: "/web/otp-verify",
    FORGOT_PASSWORD: "/web/forgot-password",
    CHANGE_PASSWORD: "/web/change-password",
    SOCIAL_LOGIN: "/web/social-login",

    // User Profile
    USER_PROFILE: "/web/user-profile",
    USER_PACKAGES: "/web/user-packages",
    USER_CONSULTATIONS: "/web/user-consultations",
    UPLOAD_PROFILE_IMAGE: "/web/upload-profile-image",

    // Courses
    COURSES: "/web/courses",
    COURSE_LIKE: (courseId: string, userId: string) => `/web/courses/${courseId}/like/${userId}`,
    UPDATE_READING_COUNT: (courseId: string) => `/web/courses/update-reading/${courseId}`,
    UPDATE_LIKE: (courseId: string) => `/web/courses/update-like/${courseId}`,

    // Sliders
    SLIDERS: "/web/sliders",
    ADMIN_SLIDER: "/admin/slider",
    ADMIN_SLIDER_CREATE: "/admin/slider",
    ADMIN_SLIDER_UPDATE: (id: string) => `/admin/slider/${id}`,
    ADMIN_SLIDER_DELETE: (id: string) => `/admin/slider/${id}`,
    ADMIN_SLIDER_PRIMARY: (id: string) => `/admin/slider-primary/${id}`,
    ADMIN_SLIDER_SEQUENCE: "/admin/slider-sequence",

    // Blogs
    BLOGS: "/web/blogs",
    BLOG_DETAIL: (slug: string) => `/web/blogs/${slug}`,
    BLOG_CATEGORIES: "/web/blogs-categories",
    BLOG_COMMENTS: "/web/blog-comments",

    ADMIN_BLOG: "/admin/blog",
    ADMIN_BLOG_CREATE: "/admin/blog",
    ADMIN_BLOG_UPDATE: (id: string) => `/admin/blog/${id}`,
    ADMIN_BLOG_DELETE: `/admin/blog`,
    ADMIN_BLOG_COMMENTS: "/admin/blog-comments",
    ADMIN_BLOG_COMMENT_STATUS: (id: string) => `/admin/blog-comments/${id}/status`,

    // Blog Categories
    ADMIN_BLOG_CATEGORY: "/admin/blog-category",
    ADMIN_BLOG_CATEGORY_CREATE: "/admin/blog-category",
    ADMIN_BLOG_CATEGORY_UPDATE: (id: string) => `/admin/blog-category/${id}`,
    ADMIN_BLOG_CATEGORY_DELETE: (id: string) => `/admin/blog-category/${id}`,

    // Contact & Inquiry
    CONTACT_US: "/web/contact-us",
    ADMIN_INQUIRIES: "/admin/inquiries",
    ADMIN_INQUIRIES_BY_TYPE: (type: string) => `/admin/inquiries/${type}`,
    ADMIN_EXPORT_INQUIRIES: (type: string) => `/admin/export-inquiries/${type}`,
    ADMIN_APPLIED_JOBS: "/admin/applied-jobs",

    ADMIN_CONTACT: "/admin/contact",
    ADMIN_CONTACT_GET: "/admin/contact",
    ADMIN_CONTACT_CREATE: "/admin/contact",
    ADMIN_CONTACT_UPDATE: "/admin/contact",
    HOME_PUBLICATIONS: "/web/home-publications",

    // Subscription & Cart
    ADD_TO_CART: "/web/add-to-cart",
    CART_CHECKOUT: "/web/checkout",
    CART_ITEMS: "/web/cart-items",
    REMOVE_CART_ITEM: (id: string) => `/web/remove-cart-items/${id}`,
    APPLY_COUPON: "/web/apply-coupon",
    REMOVE_COUPON: (code: string) => `/web/remove-coupon/${code}`,

    // Common
    TEAMS: "/web/teams",
    SERVICES: "/web/services",
    SERVICES_DETAIL: "/web/services-detail",
    SERVICE_DETAIL: (slug: string) => `/web/services-detail/${slug}`,

    ADMIN_TEAMS: "/admin/teams",
    ADMIN_TEAM_CREATE: "/admin/teams",
    ADMIN_TEAM_UPDATE: (id: string) => `/admin/teams/${id}`,
    ADMIN_TEAM_DELETE: (id: string) => `/admin/teams/${id}`,

    // CMS Pages
    CMS_PAGES: "/web/cms-pages",
    CMS_PAGE_DETAIL: (slug: string) => `/web/cms-pages/${slug}`,
    SITEMAP: "/web/sitemap",

    ADMIN_CMS: "/admin/cms",
    ADMIN_CMS_CREATE: "/admin/cms",
    ADMIN_CMS_UPDATE: (id: string) => `/admin/cms/${id}`,
    ADMIN_CMS_DELETE: (id: string) => `/admin/cms/${id}`,
    ADMIN_CMS_DETAIL: (slug: string) => `/admin/cms/${slug}`,
    ADMIN_CMS_OPTIONAL_IMAGE_DELETE: (id: string) => `/admin/cms-optional-image/${id}`,

    // Payment Gateway
    PAYMENT_ORDER: "/web/payment-order",
    RAZORPAY_WEBHOOK: "/web/razorpay-webhook",
    Client_keys: "/web/client-keys",
    // Events
    UPCOMING_EVENTS: "/web/upcoming-events",
    PAST_EVENTS: "/web/past-events",
    EVENT_DETAIL: `/web/event-detail`,
    EVENT_REGISTER: "/web/inquiry",

    ADMIN_EVENTS: "/api/events",
    HOME_FEATURED_EVENT: "/web/home-featured-event",
    ADMIN_EVENT_CREATE: "/api/events",
    ADMIN_EVENT_UPDATE: (id: string) => `/api/events/${id}`,
    ADMIN_EVENT_DELETE: (id: string) => `/api/events/${id}`,

    // Event Links
    ADMIN_EVENT_LINKS: "/api/events-link",
    ADMIN_EVENT_LINK_CREATE: "/api/events-link",
    ADMIN_EVENT_LINK_UPDATE: (id: string) => `/api/events-link/${id}`,
    ADMIN_EVENT_LINK_DELETE: (id: string) => `/api/events-link/${id}`,

    // Publications/Magazines
    MAGAZINES: "/web/magazines",
    MAGAZINES_DETAIL: `/web/magazines-detail`,

    ADMIN_MAGAZINES: "/admin/magazines",
    ADMIN_MAGAZINE_CREATE: "/admin/magazines",
    ADMIN_MAGAZINE_UPDATE: (id: string) => `/admin/magazines/${id}`,
    ADMIN_MAGAZINE_DELETE: (id: string) => `/admin/magazines/${id}`,

    // Awards
    AWARDS: "/web/awards",
    AWARDS_DETAIL: `/web/awards-detail`,

    ADMIN_AWARDS: "/admin/awards",
    ADMIN_AWARD_CREATE: "/admin/awards",
    ADMIN_AWARD_UPDATE: (id: string) => `/admin/awards/${id}`,
    ADMIN_AWARD_DELETE: (id: string) => `/admin/awards/${id}`,

    // Settings & Admin
    CKEDITOR_IMAGE_UPLOAD: "/admin/ckeditor-image-upload",
    UPLOAD_IMAGE: "/admin/upload-image",
    INQUIRIES: (type: string) => `/admin/inquiries/${type}`,
    SET_STATIC_VALUE: "/admin/set-static-value",
    ORDERS: "/admin/orders",
    APPOINTMENTS: "/admin/appointments",
    FEEDBACKS: "/admin/feedbacks",
    FEEDBACK_STATUS: (id: string) => `/admin/feedbacks/${id}`,
    EXPORT_INQUIRIES: (type: string) => `/admin/export-inquiries/${type}`,
    EXPORT_PAYMENT_HISTORIES: (type: string) => `/admin/export-payment-histories/${type}`,
    ADD_WATERMARK: "/admin/add-watermark",

    // Dashboard Stats
    DASHBOARD_ORDERS: "/admin/dashboard/orders",
    DASHBOARD_BOOKINGS: "/admin/dashboard/bookings",
    DASHBOARD_USERS: "/admin/dashboard/users",

    // Users
    ADMIN_USERS: "/admin/users",
    USER_STATUS_CHANGE: (id: string) => `/admin/users/${id}`,
    UPDATE_USER_PROFILE: (id: string) => `/admin/users-profile/${id}`,

    // Coupons
    ADMIN_COUPONS: "/admin/coupons",
    ADMIN_COUPON_CREATE: "/admin/coupons",
    ADMIN_COUPON_UPDATE: (id: string) => `/admin/coupons/${id}`,
    ADMIN_COUPON_DELETE: (id: string) => `/admin/coupons/${id}`,
    ADMIN_COUPON_STATUS: (id: string) => `/admin/coupons/${id}/status`,

    // Masters
    ADMIN_MASTERS:(slug: string) => `/admin/masters?slug=${slug}`,
    ADMIN_MASTER_CREATE: "/admin/masters",
    ADMIN_MASTER_UPDATE: (id: string) => `/admin/masters/${id}`,
    ADMIN_MASTER_DELETE: (id: string) => `/admin/masters/${id}`,

    // Courses (Admin)
    ADMIN_COURSES: "/admin/courses",
    ADMIN_COURSE_CREATE: "/admin/courses",
    ADMIN_COURSE_UPDATE: (id: string) => `/admin/courses/${id}`,
    ADMIN_COURSE_DELETE: (id: string) => `/admin/courses/${id}`,

    // Services (Admin)
    ADMIN_SERVICES: "/admin/services",
    ADMIN_SERVICE_CREATE: "/admin/services",
    ADMIN_SERVICE_UPDATE: (id: string) => `/admin/services/${id}`,
    ADMIN_SERVICE_DETAIL: (id: string) => `/admin/services/${id}`,
    ADMIN_SERVICE_DELETE: (id: string) => `/admin/services/${id}`,

    // Key Clients
    ADMIN_KEY_CLIENTS: "/admin/key-clients",
    ADMIN_KEY_CLIENT_CREATE: "/admin/key-clients",
    ADMIN_KEY_CLIENT_DELETE: (id: string) => `/admin/key-clients/${id}`,

    // Breaking News
    ADMIN_BREAKING_NEWS: "/admin/breaking-news",
    ADMIN_BREAKING_NEWS_CREATE: "/admin/breaking-news",
    ADMIN_BREAKING_NEWS_UPDATE: (id: string | number) => `/admin/breaking-news/${id}`,
    ADMIN_BREAKING_NEWS_DELETE: (id: string | number) => `/admin/breaking-news/${id}`,

    // Testimonials
    TESTIMONIALS: "/admin/testimonials",
    ADMIN_TESTIMONIAL_CREATE: "/admin/testimonials",
    ADMIN_TESTIMONIAL_UPDATE: (id: string) => `/admin/testimonials/${id}`,
    ADMIN_TESTIMONIAL_DELETE: (id: string) => `/admin/testimonials/${id}`,

    // Test APIs
    TEST_EMAIL: "/test-email",

    // Legacy endpoints (keeping for backward compatibility)
    GET_MASTERS: (slug: string) => `/web/masters/${slug}`,
    UPLOADING_MEDIA: "/admin/ckeditor-image-upload",
    PROFILE: "/admin/profile",
    UPDATE_PASSWORD: "/admin/update-password",
    DASHBOARD_STATS: "/admin/dashboard-stats",
    USERS: "/admin/users",
    USER_TOGGLE_STATUS: "/admin/users/toggle-status",
    CLIENTS: "/admin/key-clients",
    CLIENT_CREATE: "/admin/key-clients",
    CLIENT_UPDATE: "/admin/key-clients",
    CLIENT_DELETE: "/admin/key-clients",
    EVENT_LINK: (id: string) => `/api/events-link/${id}`,
    EVENT_LINK_CREATE: `/api/events-link`,
    EVENT_LINK_UPDATE: (id: string) => `/api/events-link/${id}`,
    EVENT_LINK_DELETE: (id: string) => `/api/events-link/${id}`,
    CONTACT_LEADS: "/admin/contact-leads",
    CONTACT_LEAD_UPDATE: "/admin/contact-leads/update",
    CONTACT_LEAD_DELETE: "/admin/contact-leads/delete",
    ORDER_UPDATE_STATUS: "/admin/orders/update-status",
    ORDER_DELETE: "/admin/orders/delete",
    TEAM: "/admin/teams",
    TEAM_CREATE: "/admin/team/create",
    TEAM_UPDATE: "/admin/team/update",
    TEAM_DELETE: "/admin/team/delete",
    MAGAZINE_CREATE: "/admin/magazines/create",
    MAGAZINE_UPDATE: "/admin/magazines/update",
    MAGAZINE_DELETE: "/admin/magazines/delete",
    PARTNERS: "/admin/partners",
    PARTNER_CREATE: "/admin/partners/create",
    PARTNER_UPDATE: "/admin/partners/update",
    PARTNER_DELETE: "/admin/partners/delete",
    UPLOAD_MEDIA: "/admin/upload",
    NEWSLETTER_SUBSCRIBERS: "/admin/newsletter/subscribers",
    SETTINGS: "/admin/settings",
    SETTINGS_UPDATE: "/admin/settings/update",
    CMS: "/admin/cms",
    DELETE_OPTIONAL_IMAGE: (id: string) => `/admin/cms-optional-image/${id}`,


    ///////////// WEBSITE ENDPOINTS /////////////
    CONTACT_US_WEBSITE: "/web/contact-us",
    WEB_BREAKING_NEWS: "/web/breaking-news",
    GET_TESTIMONIALS: "/web/testimonials",
};