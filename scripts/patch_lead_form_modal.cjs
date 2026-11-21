const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'admin', 'LeadFormModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Categories and domains constants
const oldDef = `const DEFAULT_CATEGORIES = [
  "general",
  "publication",
  "subscription",
  "exhibition/expo",
  "advertisement",
  "machinery & equipment",
  "manufacturer"
];`;

const newDef = `const DEFAULT_CATEGORIES = [
  "subscription",
  "advertisement",
  "expo-stall",
  "social-media-promotion"
];

const STANDARD_DOMAINS = [
  "Agarbatti & Perfume Expo",
  "Soap & Detergent Expo",
  "India Stone & Tech Expo",
  "India FMCG Show"
];`;

content = content.replace(oldDef.replace(/\r?\n/g, '\r\n'), newDef.replace(/\r?\n/g, '\r\n'));

// 2. formData domain field
const oldFormState = `    category: "general",
    budget: "",`;

const newFormState = `    category: "subscription",
    domain: "Agarbatti & Perfume Expo",
    budget: "",`;

content = content.replace(oldFormState.replace(/\r?\n/g, '\r\n'), newFormState.replace(/\r?\n/g, '\r\n'));

// 3. populate lead.domain
const oldPopulate = `        category: lead.category || "general",
        budget: lead.budget || "",`;

const newPopulate = `        category: lead.category || "subscription",
        domain: lead.domain || "Agarbatti & Perfume Expo",
        budget: lead.budget || "",`;

content = content.replace(oldPopulate.replace(/\r?\n/g, '\r\n'), newPopulate.replace(/\r?\n/g, '\r\n'));

// 4. reset domain
const oldReset = `        category: "general",
        budget: "",`;

const newReset = `        category: "subscription",
        domain: "Agarbatti & Perfume Expo",
        budget: "",`;

content = content.replace(oldReset.replace(/\r?\n/g, '\r\n'), newReset.replace(/\r?\n/g, '\r\n'));

// 5. Category, Domain and Source in JSX
const oldCategorySourceJSX = `          {/* Category & Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm capitalize"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Source</label>
              <select 
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              >
                <option value="manual">Manual Entry</option>
                <option value="website">Website Form</option>
                <option value="meta">Meta Ads</option>
                <option value="google">Google</option>
                <option value="expo">Exhibition / Expo</option>
                <option value="referral">Referral</option>
                <option value="import">Bulk Import</option>
              </select>
            </div>
          </div>`;

const newCategorySourceJSX = `          {/* Category, Domain & Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              >
                <option value="subscription">📦 Subscription</option>
                <option value="advertisement">📢 Advertisement</option>
                <option value="expo-stall">🏛️ Expo Stall</option>
                <option value="social-media-promotion">📱 Social Media Promotion</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-800 uppercase tracking-wider">Domain / Vertical</label>
              <select 
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-purple-200 bg-purple-50/50 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-600 text-sm font-semibold"
              >
                {STANDARD_DOMAINS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Source</label>
              <select 
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm font-medium"
              >
                <option value="facebook">📘 Facebook</option>
                <option value="instagram">📸 Instagram</option>
                <option value="website">🌐 Website Enquiries</option>
                <option value="manual">✍️ Manual Entry</option>
                <option value="import">📂 Bulk Import</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="expo">🏛️ Exhibition / Expo</option>
                <option value="google">🔍 Google</option>
                <option value="referral">👥 Referral</option>
              </select>
            </div>
          </div>`;

content = content.replace(oldCategorySourceJSX.replace(/\r?\n/g, '\r\n'), newCategorySourceJSX.replace(/\r?\n/g, '\r\n'));

// 6. onSave payload
const oldPayload = `        category: formData.category,`;
const newPayload = `        category: formData.category,
        domain: formData.domain,`;
content = content.replace(oldPayload.replace(/\r?\n/g, '\r\n'), newPayload.replace(/\r?\n/g, '\r\n'));

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched LeadFormModal.tsx!');
