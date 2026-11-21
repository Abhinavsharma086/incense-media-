import axios from 'axios';
import crypto from 'crypto';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data?: MetaLeadField[];
}

/**
 * Exchange a short-lived user access token for a 60-day long-lived user token
 */
export const exchangeForLongLivedToken = async (shortLivedToken: string) => {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('META_APP_ID or META_APP_SECRET missing in env. Using access token directly.');
    return {
      accessToken: shortLivedToken,
      expiresIn: 60 * 24 * 60 * 60, // ~60 days fallback
    };
  }

  try {
    const response = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      accessToken: response.data.access_token as string,
      expiresIn: (response.data.expires_in as number) || 60 * 24 * 60 * 60,
    };
  } catch (err: any) {
    console.warn('Long-lived token exchange failed or token is already long-lived. Using original token.', err.response?.data || err.message);
    return {
      accessToken: shortLivedToken,
      expiresIn: 60 * 24 * 60 * 60,
    };
  }
};

/**
 * Fetch Facebook User Profile
 */
export const fetchUserProfile = async (userAccessToken: string) => {
  try {
    const response = await axios.get(`${GRAPH_BASE_URL}/me`, {
      params: {
        fields: 'id,name,email',
        access_token: userAccessToken,
      },
    });
    return response.data;
  } catch (err: any) {
    if (err.response?.data?.error?.code !== 190) {
      try {
        const fallback = await axios.get(`${GRAPH_BASE_URL}/me`, {
          params: {
            fields: 'id,name',
            access_token: userAccessToken,
          },
        });
        return fallback.data;
      } catch {}
    }
    throw err;
  }
};

/**
 * Fetch all Pages managed by the User along with Page Access Tokens
 */
export const fetchUserPages = async (userAccessToken: string): Promise<MetaPageAccount[]> => {
  try {
    const response = await axios.get(`${GRAPH_BASE_URL}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,category',
        access_token: userAccessToken,
      },
    });
    const pages = response.data.data || [];
    if (pages.length > 0) {
      return pages;
    }
  } catch (err: any) {
    console.warn('Failed to fetch /me/accounts, checking if token is a direct Page token', err.response?.data || err.message);
  }

  // Fallback: If /me/accounts is empty or fails, check if the token itself belongs to a Page!
  try {
    const meRes = await axios.get(`${GRAPH_BASE_URL}/me`, {
      params: {
        fields: 'id,name,category',
        access_token: userAccessToken,
      },
    });
    if (meRes.data && meRes.data.id) {
      return [
        {
          id: meRes.data.id,
          name: meRes.data.name || 'Direct Meta Page',
          access_token: userAccessToken,
          category: meRes.data.category || 'Business Page',
        },
      ];
    }
  } catch (err: any) {
    console.error('Failed to resolve page details from token:', err.response?.data || err.message);
  }

  return [];
};

/**
 * Subscribe a Page to Leadgen Webhooks
 */
export const subscribePageToLeadgenWebhook = async (pageId: string, pageAccessToken: string) => {
  try {
    const response = await axios.post(`${GRAPH_BASE_URL}/${pageId}/subscribed_apps`, null, {
      params: {
        subscribed_fields: 'leadgen',
        access_token: pageAccessToken,
      },
    });
    return response.data.success === true;
  } catch (error: any) {
    console.error(`Failed to subscribe Page ${pageId} to leadgen webhook:`, error.response?.data || error.message);
    return false;
  }
};

/**
 * Fetch Leadgen Forms of a Page
 */
export const fetchPageLeadForms = async (pageId: string, pageAccessToken: string) => {
  const response = await axios.get(`${GRAPH_BASE_URL}/${pageId}/leadgen_forms`, {
    params: {
      fields: 'id,name,status,leads_count,created_time',
      access_token: pageAccessToken,
    },
  });
  return response.data.data || [];
};

/**
 * Fetch Leads of a specific Lead Form with cursor-based pagination & optional date filtering
 */
export const fetchFormLeads = async (
  formId: string,
  pageAccessToken: string,
  options?: { after?: string; limit?: number; since?: number; until?: number }
) => {
  const params: any = {
    fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id',
    access_token: pageAccessToken,
    limit: options?.limit || 50,
  };

  if (options?.after) params.after = options.after;
  if (options?.since) params.since = options.since;
  if (options?.until) params.until = options.until;

  const response = await axios.get(`${GRAPH_BASE_URL}/${formId}/leads`, { params });

  return {
    data: (response.data.data || []) as MetaLeadData[],
    paging: response.data.paging,
  };
};

/**
 * Fetch full details of a single lead by leadgen_id
 */
export const fetchSingleLeadDetails = async (leadgenId: string, pageAccessToken: string): Promise<MetaLeadData> => {
  const response = await axios.get(`${GRAPH_BASE_URL}/${leadgenId}`, {
    params: {
      fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id',
      access_token: pageAccessToken,
    },
  });
  return response.data;
};

/**
 * Verify Meta Webhook X-Hub-Signature-256 HMAC
 */
export const verifyWebhookSignature = (payloadBuffer: Buffer, signatureHeader: string | undefined): boolean => {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payloadBuffer).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureHeader));
};
