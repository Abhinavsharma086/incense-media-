const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'controllers', 'meta.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. New parseMetaFields & helpers
const oldParseBlock = `const parseMetaFields = (fieldData: MetaLeadField[] = []) => {
  let fullName = 'Meta Lead User';
  let email = '';
  let phone = '';
  let companyName = '';
  let city = '';
  const rawFields: Record<string, string> = {};

  fieldData.forEach((field) => {
    const val = field.values ? field.values.join(', ') : '';
    rawFields[field.name] = val;

    const lowerName = field.name.toLowerCase();
    if (lowerName.includes('full_name') || lowerName.includes('name')) {
      fullName = val || fullName;
    } else if (lowerName.includes('email')) {
      email = val;
    } else if (lowerName.includes('phone') || lowerName.includes('mobile')) {
      phone = val;
    } else if (lowerName.includes('company') || lowerName.includes('organization')) {
      companyName = val;
    } else if (lowerName.includes('city') || lowerName.includes('location')) {
      city = val;
    }
  });

  return { fullName, email, phone, companyName, city, rawFields };
};`;

const newParseBlock = `const parseMetaFields = (fieldData: MetaLeadField[] = []) => {
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

  const combined = \`\${item.campaign_name || ''} \${item.ad_name || ''} \${item.adset_name || ''} \${pageName || ''}\`.toLowerCase();
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
};`;

content = content.replace(oldParseBlock.replace(/\r?\n/g, '\r\n'), newParseBlock.replace(/\r?\n/g, '\r\n'));

// 2. Update syncLeadsNow lead creation
const oldCreateInSync = `              const createdLead = await prisma.lead.create({
                data: {
                  leadgenId: item.id,
                  fullName,
                  email: email || null,
                  phone: phone || 'N/A',
                  companyName: companyName || null,
                  city: city || null,
                  source: 'meta',
                  campaign: item.campaign_name || item.campaign_id || 'Meta Lead Ad',
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
                  changedByName: 'Meta Lead Ads Sync',
                },
              });`;

const newCreateInSync = `              const source = detectMetaSource(item, page.pageName);
              const domain = detectDomainFromText(\`\${item.campaign_name || ''} \${item.ad_name || ''} \${form.formName || ''}\`);
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
              });`;

content = content.replace(oldCreateInSync.replace(/\r?\n/g, '\r\n'), newCreateInSync.replace(/\r?\n/g, '\r\n'));

// 3. Update webhook handler upsert
const oldWebhookUpsert = `              await prisma.lead.upsert({
                where: { leadgenId: leadgen_id },
                update: {
                  fullName,
                  email: email || null,
                  phone: phone || 'N/A',
                  metaData: JSON.stringify(rawFields),
                },
                create: {
                  leadgenId: leadgen_id,
                  fullName,
                  email: email || null,
                  phone: phone || 'N/A',
                  companyName: companyName || null,
                  city: city || null,
                  source: 'meta',
                  campaign: item.campaign_name || item.campaign_id || 'Meta Realtime Ad',
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
              });`;

const newWebhookUpsert = `              const source = detectMetaSource(item, pageRecord.pageName);
              const domain = detectDomainFromText(\`\${item.campaign_name || ''} \${item.ad_name || ''}\`);
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
              });`;

content = content.replace(oldWebhookUpsert.replace(/\r?\n/g, '\r\n'), newWebhookUpsert.replace(/\r?\n/g, '\r\n'));

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched backend/src/controllers/meta.controller.ts!');
