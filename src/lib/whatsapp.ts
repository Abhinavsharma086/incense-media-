// src/lib/whatsapp.ts
// Direct Single-Window WhatsApp Web & App Controller for Incense Media CRM

import { toast } from '../components/ui/sonner';

export const WHATSAPP_TAB_NAME = 'whatsapp_tab';
export const WHATSAPP_WINDOW_NAME = 'whatsapp_tab';
export const WHATSAPP_HUB_WINDOW_NAME = 'whatsapp_tab';

export interface WALeadDetails {
  id?: string | number;
  fullName?: string;
  name?: string;
  companyName?: string;
  company?: string;
  domain?: string;
  category?: string;
  leadSource?: string;
  source?: string;
  email?: string;
  city?: string;
  state?: string;
  status?: string;
}

export type WhatsAppMode = 'web' | 'app';

/**
 * Format phone number: removes all non-digit characters and standardizes country code.
 * Standardizes 10-digit Indian numbers with '91' prefix.
 * Strips leading 0 if present (e.g. 09500159898 -> 919500159898).
 */
export const formatWhatsAppPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';

  // Remove leading 0 if 11 digits (e.g. 09876543210 -> 9876543210)
  if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(1);
  }

  // 10-digit standard Indian mobile -> prepend 91
  if (clean.length === 10) {
    return `91${clean}`;
  }

  return clean;
};

// Persistent window reference to guarantee 1 single tab across all leads
let whatsappWindowRef: Window | null = null;

/**
 * Direct WhatsApp opener with guaranteed single-window tab behavior.
 * Uses fixed window name 'whatsapp_tab' and existing tab reference so subsequent clicks reload the chat
 * in the exact same tab instead of opening new tabs.
 */
export function openWhatsApp(number: string | null | undefined, message: string = ""): Window | null {
  if (!number) {
    toast.error('Invalid contact number. Please provide a valid mobile number.');
    return null;
  }

  // 1. Phone number se sabhi non-digit characters hatao
  let clean = String(number).replace(/\D/g, "");
  if (!clean) {
    toast.error('Invalid contact number. Please provide a valid mobile number.');
    return null;
  }

  // 2. Agar 11 digits hai aur 0 se shuru ho raha hai to 0 hatao
  if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(1);
  }

  // Agar country code nahi hai (10 digits) to 91 add karo
  if (clean.length === 10) {
    clean = `91${clean}`;
  }

  if (clean.length < 10) {
    toast.error('Invalid contact number. Please provide a valid 10-digit mobile number.');
    return null;
  }

  // 3. Construct URL
  const url = `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`;

  // 4. Guaranteed Single-Tab check: reuse existing tab if still open
  try {
    if (whatsappWindowRef && !whatsappWindowRef.closed) {
      whatsappWindowRef.location.href = url;
      try {
        whatsappWindowRef.focus();
      } catch (_) {}
      return whatsappWindowRef;
    }
  } catch (_) {
    // Cross-origin restriction fallback
  }

  // 5. window.open with fixed target_name "whatsapp_tab"
  whatsappWindowRef = window.open(url, WHATSAPP_TAB_NAME);

  // Tab ko focus karo
  if (whatsappWindowRef) {
    try {
      whatsappWindowRef.focus();
    } catch (_) { }
  }

  return whatsappWindowRef;
}

// Expose on window object for direct onclick="openWhatsApp('91...')" calls
if (typeof window !== 'undefined') {
  (window as any).openWhatsApp = openWhatsApp;
}

/**
 * Generates the DIRECT WhatsApp Web chat URL.
 */
export const getWhatsAppChatUrl = (
  phone: string | null | undefined,
  message?: string
): string => {
  const clean = formatWhatsAppPhone(phone);
  if (!clean || clean.length < 10) return '';
  const encodedMsg = message ? encodeURIComponent(message) : '';
  return `https://web.whatsapp.com/send?phone=${clean}&text=${encodedMsg}`;
};

// Aliases for compatibility
export const getWhatsAppUrl = getWhatsAppChatUrl;
export const getWhatsAppDirectUrl = getWhatsAppChatUrl;
export const getWhatsAppBridgeUrl = getWhatsAppChatUrl;

/**
 * Sync lead cache helper
 */
export const syncAllLeadsToWhatsAppHub = (_leads: any[]) => {
  // Maintained for backward compatibility
};

/**
 * Retrieves preferred mode ('web' or 'app'). Defaults to 'web'
 */
export const getWhatsAppPreferredMode = (): WhatsAppMode => {
  try {
    const saved = localStorage.getItem('im_wa_preferred_mode_v2');
    if (saved === 'app' || saved === 'web') return saved;
    return 'web';
  } catch (_) {
    return 'web';
  }
};

/**
 * Sets preferred mode
 */
export const setWhatsAppPreferredMode = (mode: WhatsAppMode) => {
  try {
    localStorage.setItem('im_wa_preferred_mode_v2', mode);
    localStorage.setItem('im_wa_preferred_mode', mode);
  } catch (_) { }
};

/**
 * Main WhatsApp handler used by components.
 * Guarantees single-window behavior using openWhatsApp('whatsapp_tab').
 */
export const openWhatsAppChat = (
  phone: string | null | undefined,
  message?: string,
  e?: React.MouseEvent | React.SyntheticEvent,
  leadDetails?: WALeadDetails,
  forceMode?: string
): Window | null => {
  if (e) {
    try {
      e.stopPropagation();
      e.preventDefault();
    } catch (_) { }
  }

  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    toast.error('Invalid contact number. Please provide a valid 10-digit mobile number.');
    return null;
  }

  const leadName = leadDetails?.fullName || leadDetails?.name || 'Customer';
  const leadMsg = message || `Hello ${leadName}, I am connecting with you from Incense Media. How may we assist you?`;

  // Copy message to clipboard automatically as helper
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(leadMsg).catch(() => { });
    }
  } catch (_) { }

  const activeMode = forceMode || getWhatsAppPreferredMode();

  // If Desktop App mode selected
  if (activeMode === 'app') {
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(leadMsg)}`;
    toast.info(`Opening WhatsApp Desktop App for ${leadName}...`);
    window.location.href = appUrl;
    return null;
  }

  // Single Tab Web mode
  toast.info(`Opening WhatsApp chat for ${leadName} (single window)...`);
  return openWhatsApp(cleanPhone, leadMsg);
};
