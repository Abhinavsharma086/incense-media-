export const LIVE_API_URL = "https://api.incensemedia.in";

// Intelligently configure API baseUrl:
// 1. If VITE_API_BASE_URL is explicitly configured, use it (trimmed).
// 2. Otherwise, always default to LIVE_API_URL (https://api.incensemedia.in) for seamless live server connection.
const envApiUrl = import.meta.env?.VITE_API_BASE_URL;
export const baseUrl =
  (typeof envApiUrl === 'string' && envApiUrl.trim().length > 0)
    ? envApiUrl.trim()
    : (typeof window !== 'undefined' && window.location.hostname.includes('admin.incensemedia.in'))
      ? ''
      : LIVE_API_URL;


export const updateFaviconAndTitle = (url: string, title?: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${url}?v=${Date.now()}`;

    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, 32, 32);

        const link = document.createElement("link");
        link.rel = "icon";
        link.href = canvas.toDataURL("image/png");

        document.head.appendChild(link);
    };
    if (title) {
        document.title = title;
    }
};

export const addGoogleAnalytics = (trackingId: string) => {
    if (!trackingId) return;

    // Prevent duplicate injection
    if (document.getElementById("ga-script")) return;

    // --- Add main GA script in <head> ---
    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(script);

    // --- Add inline initialization ---
    const inlineScript = document.createElement("script");
    inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${trackingId}');
  `;
    document.head.appendChild(inlineScript);

    // --- Add the noscript iframe in <body> ---
    const noscript = document.createElement("noscript");
    noscript.id = "ga-noscript";
    noscript.innerHTML = `
    <iframe src="https://www.googletagmanager.com/ns.html?id=${trackingId}"
            height="0" width="0"
            style="display:none;visibility:hidden"></iframe>
  `;

    // Wait until body is available, then append
    if (document.body) {
        document.body.prepend(noscript);
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            document.body.prepend(noscript);
        });
    }
};


