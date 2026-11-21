import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures all <img> tags in given HTML have crossorigin="anonymous"
 * @param html Input HTML string
 * @returns Modified HTML string
 */
export function addAnonymousToImages(html: string): string {
  if (!html) return html;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  tempDiv.querySelectorAll("img").forEach((img) => {
    if (!img.getAttribute("crossorigin")) {
      img.setAttribute("crossorigin", "anonymous");
    }
  });

  return tempDiv.innerHTML;
}

export const ENTITY_FOLDER_MAP: Record<string, string> = {
  magazines: "magazines",
  magazine: "magazines",
  publication: "magazines",
  publications: "magazines",
  blogs: "blogs",
  blog: "blogs",
  stories: "blogs",
  story: "blogs",
  events: "events",
  event: "events",
  sliders: "slider",
  slider: "slider",
  promotion: "slider",
  awards: "awards",
  award: "awards",
  services: "services",
  service: "services",
  teams: "teams",
  team: "teams",
  masters: "masters",
  master: "masters",
  courses: "courses",
  course: "courses",
  academy: "courses",
  users: "users",
  user: "users",
  testimonials: "testimonials",
  testimonial: "testimonials",
  clients: "clients",
  client: "clients",
  partners: "partners",
  partner: "partners",
  cms: "page-banner",
  "page-banner": "page-banner",
  banner: "page-banner",
  banners: "page-banner",
  "banner-images": "page-banner",
};

/**
 * Normalizes any image or file URL/filename to the live incensemedia uploads path with correct subfolder
 */
export function formatMediaUrl(filenameOrUrl?: string | null, entityType: string = "blogs"): string {
  if (!filenameOrUrl) return "";
  if (filenameOrUrl.startsWith("blob:") || filenameOrUrl.startsWith("data:")) return filenameOrUrl;

  const clean = filenameOrUrl.replace(/\\/g, "/");
  const folder = ENTITY_FOLDER_MAP[entityType.toLowerCase()] || entityType.toLowerCase();

  // If already properly pointing to /uploads/<folder>/
  if (clean.includes(`/uploads/${folder}/`)) {
    return clean.startsWith("http")
      ? clean
      : `https://api.incensemedia.in${clean.startsWith("/") ? clean : "/" + clean}`;
  }

  // If it's an external URL (e.g. ui-avatars, google, unsplash) not on incensemedia.in
  if ((clean.startsWith("http://") || clean.startsWith("https://")) && !clean.includes("incensemedia.in")) {
    return clean;
  }

  // Extract clean filename from flat /uploads/ or raw filename
  let filename = clean;
  if (clean.includes("/uploads/")) {
    const parts = clean.split("/uploads/");
    filename = parts[parts.length - 1];
  }
  const cleanFilename = filename.split("/").pop() || filename;
  if (!cleanFilename) return "";

  return `https://api.incensemedia.in/uploads/${folder}/${cleanFilename}`;
}

/**
 * Backward compatibility helper for magazines
 */
export function formatMagazineUrl(filenameOrUrl?: string | null): string {
  return formatMediaUrl(filenameOrUrl, "magazines");
}
