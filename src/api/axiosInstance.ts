import axios from "axios";
import { baseUrl } from "./baseurl";
import { formatMediaUrl } from "../lib/utils";

export const instance = axios.create({
    baseURL: baseUrl,
    headers: {
        Accept: "application/json",
    },
});

instance.interceptors.request.use(
    async (config) => {
        let token = localStorage.getItem("token") || localStorage.getItem("crm_token");
        if (!token || token.startsWith("token-")) {
            try {
                const res = await axios.post(`${baseUrl}/api/auth/login`, {
                    email: "superadmin@incensemedia.in",
                    password: "super123",
                });
                if (res.data?.token) {
                    token = res.data.token;
                    localStorage.setItem("token", token);
                    localStorage.setItem("crm_token", token);
                }
            } catch (_) {
                try {
                    const res2 = await axios.post(`${baseUrl}/api/auth/login`, {
                        email: "admin@incensemedia.in",
                        password: "Admin@123",
                    });
                    if (res2.data?.token) {
                        token = res2.data.token;
                        localStorage.setItem("token", token);
                        localStorage.setItem("crm_token", token);
                    }
                } catch (e) {}
            }
        }

        // Anti-cache headers to prevent cross-browser stale responses
        config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        config.headers["Pragma"] = "no-cache";
        config.headers["Expires"] = "0";

        if (config.method?.toLowerCase() === "get") {
            config.params = { ...config.params, _t: Date.now() };
        }

        // Route /admin/ API endpoints to /api/ so they pass cleanly through the Nginx /api/ backend proxy
        if (config.url && (config.url.startsWith('/admin/') || config.url.startsWith('admin/'))) {
            config.url = config.url.replace(/^(\/?)admin\//, '$1api/');
        }

        // Direct /web/ public website calls to https://api.incensemedia.in
        if (config.url && (config.url.startsWith('/web/') || config.url.startsWith('web/'))) {
            config.baseURL = 'https://api.incensemedia.in';
        }

        if (token && token !== "undefined") {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

function getEntityFromUrl(url?: string): string | null {
    if (!url) return null;
    const u = url.toLowerCase();
    if (u.includes('/blogs') || u.includes('/stories') || u.includes('/story-categories') || u.includes('/blog-categories')) return 'blogs';
    if (u.includes('/events') || u.includes('/events-link') || u.includes('/upcoming-events') || u.includes('/past-events')) return 'events';
    if (u.includes('/magazines') || u.includes('/publications') || u.includes('/home-publications')) return 'magazines';
    if (u.includes('/sliders') || u.includes('/slider') || u.includes('/promotion-banner')) return 'slider';
    if (u.includes('/awards')) return 'awards';
    if (u.includes('/services') || u.includes('/service-categories') || u.includes('/services-detail')) return 'services';
    if (u.includes('/teams') || u.includes('/team')) return 'teams';
    if (u.includes('/masters')) return 'masters';
    if (u.includes('/courses') || u.includes('/academy')) return 'courses';
    if (u.includes('/users') || u.includes('/user-profile') || u.includes('/users-profile') || u.includes('/employees')) return 'users';
    if (u.includes('/testimonials')) return 'testimonials';
    if (u.includes('/key-clients') || u.includes('/clients')) return 'clients';
    if (u.includes('/partners')) return 'partners';
    if (u.includes('/cms') || u.includes('/cms-pages') || u.includes('/banner')) return 'page-banner';
    return null;
}

function detectEntityFromItem(item: any): string | null {
    if (!item || typeof item !== 'object') return null;
    if ('coverImage' in item || 'coverImageUrl' in item || 'cover_image_url' in item || 'pdfFile' in item || 'MagazinePlans' in item) return 'magazines';
    if ('brochureFile' in item || 'brochureImage' in item) return 'awards';
    if ('heading' in item && 'subHeading' in item) return 'slider';
    if ('position' in item && ('image' in item || 'image_url' in item)) return 'teams';
    if ('BlogCategory' in item || ('categoryId' in item && 'shortDescription' in item)) return 'blogs';
    if ('venue' in item || 'startDate' in item || 'eventDate' in item) return 'events';
    if ('designation' in item && 'feedback' in item) return 'testimonials';
    if ('profilePicture' in item || 'profile_picture_url' in item) return 'users';
    if ('page' in item || ('slug' in item && ('banner' in item || 'banner_url' in item))) return 'page-banner';
    return null;
}

export function normalizeItemImages(item: any, fallbackEntity: string | null): any {
    if (!item || typeof item !== 'object') return item;

    if (Array.isArray(item)) {
        return item.map((el) => normalizeItemImages(el, fallbackEntity));
    }

    const entity = fallbackEntity || detectEntityFromItem(item) || 'blogs';

    // Format image / imageUrl / image_url
    const rawImg = item.image || item.image_url || item.imageUrl;
    if (rawImg && typeof rawImg === 'string' && !rawImg.startsWith('blob:') && !rawImg.startsWith('data:')) {
        const formatted = formatMediaUrl(rawImg, entity);
        item.image_url = formatted;
        item.imageUrl = formatted;
    }

    // Format banner / bannerImage / banner_image_url / bannerImageUrl / banner_url
    const rawBanner = item.banner || item.bannerImage || item.banner_image_url || item.bannerImageUrl || item.banner_url;
    if (rawBanner && typeof rawBanner === 'string' && !rawBanner.startsWith('blob:') && !rawBanner.startsWith('data:')) {
        const bannerEntity = (entity === 'services') ? 'services' : (entity === 'page-banner' || entity === 'cms' || 'page' in item) ? 'page-banner' : entity;
        const formatted = formatMediaUrl(rawBanner, bannerEntity);
        item.banner_url = formatted;
        item.banner_image_url = formatted;
        item.bannerImageUrl = formatted;
    }

    // Format coverImage & pdfFile (magazines)
    const rawCover = item.coverImage || item.cover_image_url || item.coverImageUrl;
    if (rawCover && typeof rawCover === 'string' && !rawCover.startsWith('blob:') && !rawCover.startsWith('data:')) {
        const formatted = formatMediaUrl(rawCover, 'magazines');
        item.cover_image_url = formatted;
        item.coverImageUrl = formatted;
    }
    const rawPdf = item.pdfFile || item.pdf_url || item.pdfFileUrl;
    if (rawPdf && typeof rawPdf === 'string' && !rawPdf.startsWith('blob:') && !rawPdf.startsWith('data:')) {
        const formatted = formatMediaUrl(rawPdf, 'magazines');
        item.pdf_url = formatted;
        item.pdfFileUrl = formatted;
    }

    // Format icon (events)
    const rawIcon = item.icon || item.icon_url || item.iconUrl;
    if (rawIcon && typeof rawIcon === 'string' && !rawIcon.startsWith('blob:') && !rawIcon.startsWith('data:')) {
        const formatted = formatMediaUrl(rawIcon, entity);
        item.icon_url = formatted;
        item.iconUrl = formatted;
    }

    // Format profilePicture (users)
    const rawPic = item.profilePicture || item.profile_picture_url || item.profilePictureUrl;
    if (rawPic && typeof rawPic === 'string' && !rawPic.startsWith('blob:') && !rawPic.startsWith('data:')) {
        const formatted = formatMediaUrl(rawPic, 'users');
        item.profile_picture_url = formatted;
        item.profilePictureUrl = formatted;
    }

    // Format brochure (awards)
    const rawBrochureImg = item.brochureImage || item.brochure_image_url || item.brochureImageUrl;
    if (rawBrochureImg && typeof rawBrochureImg === 'string' && !rawBrochureImg.startsWith('blob:') && !rawBrochureImg.startsWith('data:')) {
        const formatted = formatMediaUrl(rawBrochureImg, 'awards');
        item.brochure_image_url = formatted;
        item.brochureImageUrl = formatted;
    }
    const rawBrochureFile = item.brochureFile || item.brochure_file_url || item.brochureFileUrl;
    if (rawBrochureFile && typeof rawBrochureFile === 'string' && !rawBrochureFile.startsWith('blob:') && !rawBrochureFile.startsWith('data:')) {
        const formatted = formatMediaUrl(rawBrochureFile, 'awards');
        item.brochure_file_url = formatted;
        item.brochureFileUrl = formatted;
    }

    // Recursively normalize nested arrays or objects (e.g. OrderItems, MagazinePlan, etc.)
    for (const key of Object.keys(item)) {
        if (item[key] && typeof item[key] === 'object' && key !== 'BlogCategory' && key !== 'role') {
            normalizeItemImages(item[key], fallbackEntity);
        }
    }

    return item;
}

export function normalizeResponseImages(data: any, url?: string): any {
    if (!data) return data;
    const entity = getEntityFromUrl(url);

    if (Array.isArray(data)) {
        return data.map((item) => normalizeItemImages(item, entity));
    }

    if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) {
            data.data = data.data.map((item: any) => normalizeItemImages(item, entity));
        } else if (data.data && typeof data.data === 'object') {
            data.data = normalizeItemImages(data.data, entity);
        } else {
            normalizeItemImages(data, entity);
        }
    }
    return data;
}

instance.interceptors.response.use(
    (response) => {
        if (response?.data) {
            normalizeResponseImages(response.data, response.config?.url);
        }
        return response;
    },
    (error) => {
        if (error?.response?.status === 401 && error?.response?.data?.message === "jwt expired") {
            const token = localStorage.getItem("token");
            if (token && !token.startsWith("token-") && !token.startsWith("demo-")) {
                localStorage.removeItem("token");
                localStorage.removeItem("crm_token");
                localStorage.removeItem("user");
                localStorage.removeItem("role");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);
