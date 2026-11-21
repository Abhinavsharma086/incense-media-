import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { encryptToken, decryptToken } from '../utils/crypto.utils';
import {
  exchangeForLongLivedToken,
  fetchUserProfile,
  fetchUserPages,
  subscribePageToLeadgenWebhook,
  fetchPageLeadForms,
  fetchFormLeads,
  fetchSingleLeadDetails,
  verifyWebhookSignature,
  MetaLeadField,
} from '../services/meta.service';

/**
 * Returns Facebook Login OAuth URL with required permissions
 */
export const getOAuthUrl = (req: Request, res: Response) => {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3000/admin/meta-settings';
  
  const isConfigured = !!(appId && appId !== '1234567890');
  const targetAppId = isConfigured ? appId : '1234567890';

  const scopes = [
    'leads_retrieval',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
  ].join(',');

  const fbUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${targetAppId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scopes}&response_type=code`;

  res.json({
    isConfigured,
    url: fbUrl,
    appId: isConfigured ? appId : '',
    redirectUri,
  });
};

/**
 * OAuth Callback & Access Token Handler: Exchange code/token, store long-lived tokens & pages encrypted
 */
export const handleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const { shortLivedToken, accessToken, code } = req.body;
  const tokenToUse = shortLivedToken || accessToken || code;

  if (!tokenToUse) {
    res.status(400).json({ message: 'Access token or OAuth code is required' });
    return;
  }

  try {
    // 1. Exchange for 60-day long-lived token
    const { accessToken: longLivedToken, expiresIn } = await exchangeForLongLivedToken(tokenToUse);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // 2. Fetch User Profile
    const profile = await fetchUserProfile(longLivedToken);

    // 3. Upsert MetaAccount with encrypted access token
    const metaAccount = await prisma.metaAccount.upsert({
      where: { facebookUserId: profile.id },
      update: {
        name: profile.name,
        email: profile.email || null,
        accessToken: encryptToken(longLivedToken),
        tokenExpiresAt,
      },
      create: {
        facebookUserId: profile.id,
        name: profile.name,
        email: profile.email || null,
        accessToken: encryptToken(longLivedToken),
        tokenExpiresAt,
      },
    });

    // 4. Fetch managed Facebook Pages & page access tokens
    const pages = await fetchUserPages(longLivedToken);

    for (const page of pages) {
      const isSubscribed = await subscribePageToLeadgenWebhook(page.id, page.access_token);

      const savedPage = await prisma.metaPage.upsert({
        where: { pageId: page.id },
        update: {
          metaAccountId: metaAccount.id,
          pageName: page.name,
          pageAccessToken: encryptToken(page.access_token),
          category: page.category || null,
          isSubscribed,
        },
        create: {
          metaAccountId: metaAccount.id,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: encryptToken(page.access_token),
          category: page.category || null,
          isSubscribed,
        },
      });

      // Sync page forms
      try {
        const forms = await fetchPageLeadForms(page.id, page.access_token);
        for (const f of forms) {
          await prisma.leadForm.upsert({
            where: { formId: f.id },
            update: {
              metaPageId: savedPage.id,
              formName: f.name,
              status: f.status || 'ACTIVE',
              leadsCount: f.leads_count || 0,
              createdTime: f.created_time ? new Date(f.created_time) : null,
            },
            create: {
              metaPageId: savedPage.id,
              formId: f.id,
              formName: f.name,
              status: f.status || 'ACTIVE',
              leadsCount: f.leads_count || 0,
              createdTime: f.created_time ? new Date(f.created_time) : null,
            },
          });
        }
      } catch (err) {
        console.error(`Error syncing forms for page ${page.name}:`, err);
      }
    }

    res.json({
      success: true,
      message: 'Facebook account connected successfully!',
      account: {
        id: metaAccount.id,
        name: metaAccount.name,
        email: metaAccount.email,
        pagesCount: pages.length,
        expiresAt: tokenExpiresAt,
      },
    });
  } catch (error: any) {
    console.error('Meta OAuth Callback error:', error.response?.data || error.message);
    const fbError = error.response?.data?.error?.message;
    const fbCode = error.response?.data?.error?.code;
    const fbSubcode = error.response?.data?.error?.error_subcode;

    let clientMessage = 'Failed to connect Meta account.';
    if (fbError) {
      if (fbCode === 190 || fbSubcode === 463) {
        clientMessage = `Meta Token Expired: ${fbError}. Please generate a fresh Access Token from Facebook Graph Explorer.`;
      } else {
        clientMessage = `Facebook Error: ${fbError}`;
      }
    } else if (error.message && !error.message.includes('status code')) {
      clientMessage = error.message;
    }

    res.status(400).json({
      success: false,
      message: clientMessage,
      facebookError: error.response?.data?.error || null,
    });
  }
};

/**
 * Get Connected Meta Accounts & Pages with Token Status Alert
 */
export const getConnectedAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.metaAccount.findMany({
      include: {
        pages: {
          include: {
            leadForms: true,
          },
        },
      },
    });

    const sanitized = accounts.map((acc) => {
      const now = new Date();
      const daysUntilExpiry = acc.tokenExpiresAt
        ? Math.ceil((acc.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24))
        : 60;
      const isExpiringSoon = daysUntilExpiry <= 7;

      return {
        id: acc.id,
        facebookUserId: acc.facebookUserId,
        name: acc.name,
        email: acc.email,
        tokenExpiresAt: acc.tokenExpiresAt,
        daysUntilExpiry,
        isExpiringSoon,
        pages: acc.pages.map((p) => ({
          id: p.id,
          pageId: p.pageId,
          pageName: p.pageName,
          category: p.category,
          isSubscribed: p.isSubscribed,
          formsCount: p.leadForms.length,
          forms: p.leadForms,
        })),
      };
    });

    res.json(sanitized);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch connected accounts' });
  }
};

/**
 * Disconnect / Revoke Meta Account
 */
export const disconnectAccount = async (req: Request, res: Response) => {
  const { id } = (req.params as any);
  try {
    await prisma.metaAccount.delete({ where: { id } });
    res.json({ success: true, message: 'Meta Account disconnected and tokens revoked.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to disconnect account' });
  }
};

/**
 * Parse lead field values from Meta's key-value structure
 */
const parseMetaFields = (fieldData: MetaLeadField[] = []) => {
  let fullName = '';
  let email = '';
  let phone = '';
  let companyName = '';
  let city = '';
  const rawFields: Record<string, string> = {};

  fieldData.forEach((field) => {
    const val = (field.values ? field.values.join(', ') : '').trim();
    if (!val) return;
    rawFields[field.name] = val;

    const lowerName = field.name.toLowerCase().trim();

    // 1. Phone number identification
    if (
      lowerName.includes('phone') ||
      lowerName.includes('mobile') ||
      lowerName.includes('contact_no') ||
      lowerName.includes('contact_number') ||
      lowerName.includes('whatsapp') ||
      lowerName.includes('tel') ||
      lowerName === 'contact'
    ) {
      phone = val;
    }
    // 2. Email identification
    else if (lowerName.includes('email') || lowerName.includes('e-mail')) {
      email = val;
    }
    // 3. Full name identification (prevent company name overwrite)
    else if (
      (lowerName.includes('full_name') || lowerName === 'name' || lowerName.includes('user_name')) &&
      !lowerName.includes('company') &&
      !lowerName.includes('organization') &&
      !lowerName.includes('business')
    ) {
      fullName = val;
    }
    // 4. Company identification
    else if (lowerName.includes('company') || lowerName.includes('organization') || lowerName.includes('business')) {
      companyName = val;
    }
    // 5. City / Location identification
    else if (lowerName.includes('city') || lowerName.includes('location') || lowerName.includes('address') || lowerName.includes('state')) {
      city = val;
    }

    // Fallback phone check if no phone found yet but value is 10-13 digits
    if (!phone) {
      const cleanDigits = val.replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 10 && cleanDigits.length <= 13 && !val.includes('@') && !lowerName.includes('company')) {
        phone = val;
      }
    }
  });

  if (!fullName) {
    fullName = companyName || (email ? email.split('@')[0] : 'Meta Lead User');
  }

  return { fullName, email, phone, companyName, city, rawFields };
};

const detectMetaSource = (item: any, pageName?: string): 'facebook' | 'instagram' => {
  const p = String(item.platform || '').toLowerCase();
  if (p === 'ig' || p.includes('insta')) return 'instagram';
  if (p === 'fb' || p.includes('face')) return 'facebook';

  const combined = `${item.campaign_name || ''} ${item.ad_name || ''} ${item.adset_name || ''} ${pageName || ''}`.toLowerCase();
  if (combined.includes('instagram') || combined.includes('insta') || combined.includes('ig_') || combined.includes('_ig')) {
    return 'instagram';
  }
  return 'facebook';
};

const detectDomainFromText = (text: string): string => {
  const s = text.toLowerCase();
  if (s.includes('soap') || s.includes('detergent')) return 'Soap & Detergent Expo';
  if (s.includes('stone') || s.includes('granite') || s.includes('marble')) return 'India Stone & Tech Expo';
  if (s.includes('fmcg') || s.includes('grocery')) return 'India FMCG Show';
  return 'Agarbatti & Perfume Expo';
};

/**
 * Manual & Scheduled Lead Sync (Deduplication using leadgenId)
 */
export const syncLeadsNow = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.metaPage.findMany({
      include: {
        leadForms: true,
      },
    });

    let newLeadsCount = 0;
    let totalSyncedCount = 0;

    for (const page of pages) {
      const pageToken = decryptToken(page.pageAccessToken);

      for (const form of page.leadForms) {
        try {
          const { data: leads } = await fetchFormLeads(form.formId, pageToken);

          for (const item of leads) {
            totalSyncedCount++;

            // 1. Check if leadgenId already exists (Deduplication)
            const existing = await prisma.lead.findUnique({
              where: { leadgenId: item.id },
            });

            if (!existing) {
              const { fullName, email, phone, companyName, city, rawFields } = parseMetaFields(item.field_data);

              // Check if duplicate phone or email exists
              const isDuplicate = !!(
                (phone && (await prisma.lead.findFirst({ where: { phone } }))) ||
                (email && (await prisma.lead.findFirst({ where: { email } })))
              );

              const source = detectMetaSource(item, page.pageName);
              const domain = detectDomainFromText(`${item.campaign_name || ''} ${item.ad_name || ''} ${form.formName || ''}`);
              const category = 'social-media-promotion';

              const createdLead = await prisma.lead.create({
                data: {
                  leadgenId: item.id,
                  fullName,
                  email: email || null,
                  phone: phone || 'Not Provided',
                  companyName: companyName || null,
                  city: city || null,
                  source,
                  domain,
                  category,
                  campaign: item.campaign_name || item.campaign_id || (source === 'instagram' ? 'Instagram Lead Ad' : 'Facebook Lead Ad'),
                  metaPageId: page.pageId,
                  metaFormId: form.formId,
                  adId: item.ad_id || null,
                  adName: item.ad_name || null,
                  adsetId: item.adset_id || null,
                  adsetName: item.adset_name || null,
                  campaignId: item.campaign_id || null,
                  metaData: JSON.stringify(rawFields),
                  isDuplicate,
                  duplicateFlaggedAt: isDuplicate ? new Date() : null,
                  status: 'new',
                },
              });

              // Add initial status history entry
              await prisma.leadStatusHistory.create({
                data: {
                  leadId: createdLead.id,
                  fromStatus: 'none',
                  toStatus: 'new',
                  changedByName: source === 'instagram' ? 'Instagram Lead Ads Sync' : 'Facebook Lead Ads Sync',
                },
              });

              newLeadsCount++;
            }
          }

          // Update form last synced time
          await prisma.leadForm.update({
            where: { id: form.id },
            data: { lastSyncedAt: new Date() },
          });
        } catch (formErr: any) {
          console.error(`Error syncing leads for form ${form.formName}:`, formErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Sync complete! ${newLeadsCount} new leads saved (${totalSyncedCount} checked).`,
      newLeadsCount,
      totalSyncedCount,
    });
  } catch (error: any) {
    console.error('Lead Sync error:', error);
    res.status(500).json({ message: error.message || 'Failed to sync leads' });
  }
};

/**
 * Get Synced Lead Forms
 */
export const getLeadForms = async (req: Request, res: Response) => {
  try {
    const forms = await prisma.leadForm.findMany({
      include: {
        metaPage: {
          select: { pageName: true, pageId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(forms);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch lead forms' });
  }
};

/**
 * Meta Webhook GET Verification Handler (hub.verify_token and hub.challenge)
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'incense_meta_webhook_verify_token_2026';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Meta Webhook verified successfully!');
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
};

/**
 * Real-time Meta Webhook POST Handler for leadgen events
 */
export const handleWebhookEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const { leadgen_id, page_id, form_id } = change.value;
            console.log(`Realtime Meta Lead Event received: leadgen_id=${leadgen_id}, page_id=${page_id}`);

            // Fetch page access token
            const pageRecord = await prisma.metaPage.findUnique({
              where: { pageId: page_id },
            });

            if (pageRecord) {
              const pageToken = decryptToken(pageRecord.pageAccessToken);
              const item = await fetchSingleLeadDetails(leadgen_id, pageToken);

              const { fullName, email, phone, companyName, city, rawFields } = parseMetaFields(item.field_data);

              const isDuplicate = !!(
                (phone && (await prisma.lead.findFirst({ where: { phone } }))) ||
                (email && (await prisma.lead.findFirst({ where: { email } })))
              );

              const source = detectMetaSource(item, pageRecord.pageName);
              const domain = detectDomainFromText(`${item.campaign_name || ''} ${item.ad_name || ''}`);
              const category = 'social-media-promotion';

              await prisma.lead.upsert({
                where: { leadgenId: leadgen_id },
                update: {
                  fullName: fullName && fullName !== 'Meta Lead User' ? fullName : undefined,
                  email: email || undefined,
                  // Never overwrite existing valid phone number with null/N/A
                  phone: phone && phone.replace(/[^0-9]/g, '').length >= 10 ? phone : undefined,
                  metaData: JSON.stringify(rawFields),
                },
                create: {
                  leadgenId: leadgen_id,
                  fullName,
                  email: email || null,
                  phone: phone || 'Not Provided',
                  companyName: companyName || null,
                  city: city || null,
                  source,
                  domain,
                  category,
                  campaign: item.campaign_name || item.campaign_id || (source === 'instagram' ? 'Instagram Realtime Ad' : 'Facebook Realtime Ad'),
                  metaPageId: page_id,
                  metaFormId: form_id,
                  adId: item.ad_id || null,
                  adName: item.ad_name || null,
                  adsetId: item.adset_id || null,
                  adsetName: item.adset_name || null,
                  campaignId: item.campaign_id || null,
                  metaData: JSON.stringify(rawFields),
                  isDuplicate,
                  duplicateFlaggedAt: isDuplicate ? new Date() : null,
                  status: 'new',
                },
              });
            }
          }
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Meta Webhook payload handling error:', error);
    res.status(500).send('Webhook processing error');
  }
};
