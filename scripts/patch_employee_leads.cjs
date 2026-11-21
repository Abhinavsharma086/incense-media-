const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'employee', 'EmployeeLeads.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add PhoneOff to lucide-react imports if not present
if (!content.includes('PhoneOff,')) {
  content = content.replace('Phone,', 'Phone,\n  PhoneOff,');
}

// 2. Add domain to Lead interface
if (!content.includes('domain?: string;')) {
  content = content.replace(
    'category?: string;',
    'category?: string;\n  domain?: string;'
  );
}

// 3. Update normalizeLeadSource & STANDARD_SOURCES & STANDARD_DOMAINS & hasValidPhone
const oldNormalizeAndSources = `export const normalizeLeadSource = (rawSource?: string): string => {
  if (!rawSource) return 'manual';
  const s = rawSource.toLowerCase().trim();
  if (s.includes('web') || s.includes('site') || s.includes('online') || s.includes('inquir')) return 'website';
  if (s.includes('meta') || s.includes('fb') || s.includes('facebook') || s.includes('insta') || s.includes('ad')) return 'meta';
  if (s.includes('excel') || s.includes('import') || s.includes('csv') || s.includes('upload') || s.includes('bulk')) return 'import';
  if (s.includes('whats') || s.includes('wa')) return 'whatsapp';
  if (s.includes('expo') || s.includes('exhibit') || s.includes('event')) return 'expo';
  return 'manual';
};

export const STANDARD_SOURCES = [
  { key: 'website', label: '🌐 Website Inquiries' },
  { key: 'meta', label: '📱 Meta Ads' },
  { key: 'manual', label: '✍️ Manual' },
  { key: 'import', label: '📂 Imported' },
  { key: 'whatsapp', label: '💬 WhatsApp' },
  { key: 'expo', label: '🏛️ Exhibition / Expo' },
];`;

const newNormalizeAndSources = `export const normalizeLeadSource = (rawSource?: string): string => {
  if (!rawSource) return 'manual';
  const s = rawSource.toLowerCase().trim();
  if (s.includes('facebook') || s === 'fb') return 'facebook';
  if (s.includes('instagram') || s === 'ig') return 'instagram';
  if (s.includes('meta')) return 'facebook';
  if (s.includes('web') || s.includes('site') || s.includes('online') || s.includes('inquir')) return 'website';
  if (s.includes('excel') || s.includes('import') || s.includes('csv') || s.includes('upload') || s.includes('bulk')) return 'import';
  if (s.includes('whats') || s.includes('wa')) return 'whatsapp';
  if (s.includes('expo') || s.includes('exhibit') || s.includes('event')) return 'expo';
  if (s.includes('google')) return 'google';
  if (s.includes('referral') || s.includes('ref')) return 'referral';
  return 'manual';
};

export const STANDARD_SOURCES = [
  { key: 'facebook', label: '📘 Facebook', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'instagram', label: '📸 Instagram', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'website', label: '🌐 Website Enquiries', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'manual', label: '✍️ Manual Entry', bg: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'import', label: '📂 Bulk Import', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'whatsapp', label: '💬 WhatsApp', bg: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'expo', label: '🏛️ Exhibition / Expo', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'google', label: '🔍 Google', bg: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'referral', label: '🤝 Referral', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
];

export const STANDARD_DOMAINS = [
  'Agarbatti & Perfume Expo',
  'Soap & Detergent Expo',
  'India Stone & Tech Expo',
  'India FMCG Show'
];

export const hasValidPhone = (phone?: string | null): boolean => {
  if (!phone) return false;
  const p = phone.trim().toLowerCase();
  if (p === 'email only' || p === 'not provided' || p === 'n/a' || p === 'none' || p === 'null' || p === 'undefined') return false;
  const digits = p.replace(/[^0-9]/g, '');
  return digits.length >= 6;
};`;

content = content.replace(oldNormalizeAndSources.replace(/\r?\n/g, '\r\n'), newNormalizeAndSources.replace(/\r?\n/g, '\r\n'));

// 4. Update DEFAULT_CATEGORIES
const oldDefaultCategories = `  const DEFAULT_CATEGORIES: LeadCategoryItem[] = [

    { id: 'cat-pub', name: 'publication', label: 'Publication', icon: '📚', color: 'purple' },

    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },

    { id: 'cat-expo', name: 'exhibition', label: 'Exhibition', icon: '🏛️', color: 'amber' },

    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },

    { id: 'cat-gen', name: 'general', label: 'General', icon: '💼', color: 'gray' },

  ];`;

const newDefaultCategories = `  const DEFAULT_CATEGORIES: LeadCategoryItem[] = [
    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
    { id: 'cat-expo-stall', name: 'expo-stall', label: 'Expo Stall', icon: '🏛️', color: 'amber' },
    { id: 'cat-smp', name: 'social-media-promotion', label: 'Social Media Promotion', icon: '📱', color: 'purple' },
  ];`;

content = content.replace(oldDefaultCategories.replace(/\r?\n/g, '\r\n'), newDefaultCategories.replace(/\r?\n/g, '\r\n'));

// 5. Add domainFilter state & quick domain change handler
const oldCategoryFilterState = `  const [categoryFilter, setCategoryFilter] = useState('all');`;
const newDomainFilterState = `  const [categoryFilter, setCategoryFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');

  const handleQuickDomainChange = async (leadId: string, domain: string, e?: any) => {
    if (e) {
      try { e.stopPropagation(); } catch (_) {}
    }
    try {
      await crmApi.put(\`/leads/\${leadId}\`, { domain });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, domain } : l));
      toast.success(\`Domain updated to "\${domain}"\`);
      notifyDataChanged('leads', 'update', { id: leadId, domain });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update domain');
    }
  };`;

content = content.replace(oldCategoryFilterState.replace(/\r?\n/g, '\r\n'), newDomainFilterState.replace(/\r?\n/g, '\r\n'));

// 6. Update newCategory default and add newDomain state
const oldNewCategory = `  const [newCategory, setNewCategory] = useState('publication');`;
const newNewCategory = `  const [newCategory, setNewCategory] = useState('subscription');
  const [newDomain, setNewDomain] = useState('Agarbatti & Perfume Expo');`;

content = content.replace(oldNewCategory.replace(/\r?\n/g, '\r\n'), newNewCategory.replace(/\r?\n/g, '\r\n'));

// 7. Update editCategory default and add editDomain state
const oldEditCategory = `  const [editCategory, setEditCategory] = useState('publication');`;
const newEditCategory = `  const [editCategory, setEditCategory] = useState('subscription');
  const [editDomain, setEditDomain] = useState('Agarbatti & Perfume Expo');`;

content = content.replace(oldEditCategory.replace(/\r?\n/g, '\r\n'), newEditCategory.replace(/\r?\n/g, '\r\n'));

// 8. In openEditModal: populate editDomain
const oldOpenEditModalSet = `    setEditCategory(lead.category || 'publication');`;
const newOpenEditModalSet = `    setEditCategory(lead.category || 'subscription');
    setEditDomain(lead.domain || 'Agarbatti & Perfume Expo');`;

content = content.replace(oldOpenEditModalSet.replace(/\r?\n/g, '\r\n'), newOpenEditModalSet.replace(/\r?\n/g, '\r\n'));

// 9. In handleUpdateLead: include domain in payload
const oldUpdatePayload = `        category: editCategory,

        status: editStatus,`;

const newUpdatePayload = `        category: editCategory,
        domain: editDomain || 'Agarbatti & Perfume Expo',
        status: editStatus,`;

content = content.replace(oldUpdatePayload.replace(/\r?\n/g, '\r\n'), newUpdatePayload.replace(/\r?\n/g, '\r\n'));

// 10. In handleCreateLead: include domain in payload
const oldCreatePayload = `        category: newCategory,

        status: 'new',`;

const newCreatePayload = `        category: newCategory || 'subscription',
        domain: newDomain || 'Agarbatti & Perfume Expo',
        status: 'new',`;

content = content.replace(oldCreatePayload.replace(/\r?\n/g, '\r\n'), newCreatePayload.replace(/\r?\n/g, '\r\n'));

// 11. In filteredLeads: match domain
const oldFilteredReturn = `    const leadCat = (lead.category || 'general').trim().toLowerCase();

    const filterCat = categoryFilter.trim().toLowerCase();

    const matchesCategory = categoryFilter === 'all' || leadCat === filterCat;

    return matchesSearch && matchesStatus && matchesSource && matchesCategory;`;

const newFilteredReturn = `    const leadCat = (lead.category || 'subscription').trim().toLowerCase();
    const filterCat = categoryFilter.trim().toLowerCase();
    const matchesCategory = categoryFilter === 'all' || leadCat === filterCat;

    const leadDom = (lead.domain || 'Agarbatti & Perfume Expo').trim();
    const filterDom = domainFilter.trim();
    const matchesDomain = domainFilter === 'all' || leadDom === filterDom;

    return matchesSearch && matchesStatus && matchesSource && matchesCategory && matchesDomain;`;

content = content.replace(oldFilteredReturn.replace(/\r?\n/g, '\r\n'), newFilteredReturn.replace(/\r?\n/g, '\r\n'));

// 12. Add domainStats
const oldCategoryStatsBlock = `    return counts;

  }, [leads, categories]);`;

const newDomainStatsBlock = `    return counts;

  }, [leads, categories]);

  const domainStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    STANDARD_DOMAINS.forEach(d => { counts[d] = 0; });
    (Array.isArray(leads) ? leads : []).forEach(l => {
      const dom = (l.domain || 'Agarbatti & Perfume Expo').trim();
      counts[dom] = (counts[dom] || 0) + 1;
    });
    return counts;
  }, [leads]);`;

content = content.replace(oldCategoryStatsBlock.replace(/\r?\n/g, '\r\n'), newDomainStatsBlock.replace(/\r?\n/g, '\r\n'));

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched EmployeeLeads.tsx (Part 1: logic & states)');
