const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'admin', 'AdminLeads.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. In mapToFrontendLead, include domain
const oldMapToFront = `  category: dbLead?.category || 'general',
  budget: dbLead?.budget || '',`;

const newMapToFront = `  category: dbLead?.category || 'subscription',
  domain: dbLead?.domain || 'Agarbatti & Perfume Expo',
  budget: dbLead?.budget || '',`;

content = content.replace(oldMapToFront.replace(/\r?\n/g, '\r\n'), newMapToFront.replace(/\r?\n/g, '\r\n'));

// 2. In mapToDbUpdates, include domain
const oldMapToDb = `  if (frontUpdates.category !== undefined) dbUpdates.category = frontUpdates.category;`;
const newMapToDb = `  if (frontUpdates.category !== undefined) dbUpdates.category = frontUpdates.category;
  if (frontUpdates.domain !== undefined) dbUpdates.domain = frontUpdates.domain;`;

content = content.replace(oldMapToDb.replace(/\r?\n/g, '\r\n'), newMapToDb.replace(/\r?\n/g, '\r\n'));

// 3. In mapToBackendPayload, include domain
const oldMapToBack = `  category: frontLead.category || 'publication',`;
const newMapToBack = `  category: frontLead.category || 'subscription',
  domain: frontLead.domain || 'Agarbatti & Perfume Expo',`;

content = content.replace(oldMapToBack.replace(/\r?\n/g, '\r\n'), newMapToBack.replace(/\r?\n/g, '\r\n'));

// 4. Update DEFAULT_CATEGORIES & add STANDARD_DOMAINS & domainFilter
const oldAdminDefaults = `  const DEFAULT_CATEGORIES: LeadCategoryItem[] = [
    { id: 'cat-pub', name: 'publication', label: 'Publication', icon: '📚', color: 'purple' },
    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
    { id: 'cat-expo', name: 'exhibition', label: 'Exhibition / Expo', icon: '🏛️', color: 'amber' },
    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
    { id: 'cat-gen', name: 'general', label: 'General', icon: '💼', color: 'gray' },
  ];`;

const newAdminDefaults = `  const DEFAULT_CATEGORIES: LeadCategoryItem[] = [
    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
    { id: 'cat-expo-stall', name: 'expo-stall', label: 'Expo Stall', icon: '🏛️', color: 'amber' },
    { id: 'cat-smp', name: 'social-media-promotion', label: 'Social Media Promotion', icon: '📱', color: 'purple' },
  ];

  const STANDARD_DOMAINS = [
    'Agarbatti & Perfume Expo',
    'Soap & Detergent Expo',
    'India Stone & Tech Expo',
    'India FMCG Show'
  ];`;

content = content.replace(oldAdminDefaults.replace(/\r?\n/g, '\r\n'), newAdminDefaults.replace(/\r?\n/g, '\r\n'));

// 5. Add domainFilter state & handleQuickDomainChange
const oldAdminFilterState = `  const [categoryFilter, setCategoryFilter] = useState("all");`;
const newAdminFilterState = `  const [categoryFilter, setCategoryFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");

  const handleQuickDomainChange = async (id: string, newDomain: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, domain: newDomain } : lead));
    try {
      await crmApi.put(\`/leads/\${id}\`, { domain: newDomain });
      notifyDataChanged('leads', 'domain_change', { id, newDomain });
      toast.success(\`Domain updated to "\${newDomain}"\`);
    } catch (error: any) {
      toast.error('Failed to update domain');
      fetchLeads();
    }
  };`;

content = content.replace(oldAdminFilterState.replace(/\r?\n/g, '\r\n'), newAdminFilterState.replace(/\r?\n/g, '\r\n'));

// 6. In filteredLeads, match domain
const oldAdminFilteredReturn = `    const matchesDuplicates = !showOnlyDuplicates || isDuplicateLead(lead);
    return matchesSearch && matchesStatus && matchesSource && matchesCategory && matchesDuplicates;`;

const newAdminFilteredReturn = `    const matchesDuplicates = !showOnlyDuplicates || isDuplicateLead(lead);
    const leadDom = (lead.domain || 'Agarbatti & Perfume Expo').trim();
    const filterDom = domainFilter.trim();
    const matchesDomain = domainFilter === "all" || leadDom === filterDom;

    return matchesSearch && matchesStatus && matchesSource && matchesCategory && matchesDomain && matchesDuplicates;`;

content = content.replace(oldAdminFilteredReturn.replace(/\r?\n/g, '\r\n'), newAdminFilteredReturn.replace(/\r?\n/g, '\r\n'));

// 7. Add domainStats
const oldAdminCatStatsEnd = `    return counts;
  }, [leads, categories]);`;

const newAdminDomainStats = `    return counts;
  }, [leads, categories]);

  const domainStats = useMemo(() => {
    const counts: Record<string, number> = {};
    STANDARD_DOMAINS.forEach(d => { counts[d] = 0; });
    if (Array.isArray(leads)) {
      leads.forEach(l => {
        if (!l) return;
        const dom = (l.domain || 'Agarbatti & Perfume Expo').trim();
        counts[dom] = (counts[dom] || 0) + 1;
      });
    }
    return counts;
  }, [leads]);`;

content = content.replace(oldAdminCatStatsEnd.replace(/\r?\n/g, '\r\n'), newAdminDomainStats.replace(/\r?\n/g, '\r\n'));

// 8. Filter Bar: add Domain dropdown
const oldAdminCatSelect = `              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-indigo-600 focus:border-indigo-600 font-medium bg-white"
              >
                <option value="all">All Categories ({leads.length})</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name.toLowerCase()}>
                    {c.icon || '🏷️'} {c.label} ({categoryStats[c.name.toLowerCase()] || 0})
                  </option>
                ))}
              </select>`;

const newAdminCatAndDomainSelect = `              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-purple-200 rounded-xl text-xs focus:ring-purple-600 focus:border-purple-600 font-semibold bg-white text-purple-900"
              >
                <option value="all">All Categories ({leads.length})</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name.toLowerCase()}>
                    {c.icon || '🏷️'} {c.label} ({categoryStats[c.name.toLowerCase()] || 0})
                  </option>
                ))}
              </select>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-xl text-xs focus:ring-blue-600 focus:border-blue-600 font-semibold bg-white text-blue-900"
              >
                <option value="all">All Domains ({leads.length})</option>
                {STANDARD_DOMAINS.map(d => (
                  <option key={d} value={d}>
                    {d} ({domainStats[d] || 0})
                  </option>
                ))}
              </select>`;

content = content.replace(oldAdminCatSelect.replace(/\r?\n/g, '\r\n'), newAdminCatAndDomainSelect.replace(/\r?\n/g, '\r\n'));

// 9. Add Domain Filter Quick Pills right after Category Filter Quick Pills
const oldAdminCatPillsEnd = `              <button
                onClick={() => {
                  setPendingLeadIdForCategory(null);
                  setCategoryModalMode('manage');
                  setIsAddCategoryModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border border-purple-300 text-purple-800 bg-white hover:bg-purple-50 flex items-center gap-1 shadow-2xs"
                title="Edit name, color, or delete customer categories"
              >
                <Edit className="w-3 h-3 text-purple-600" />
                <span>✏️ Edit Categories</span>
              </button>
            </div>
          </div>`;

const newAdminCatAndDomainPills = `              <button
                onClick={() => {
                  setPendingLeadIdForCategory(null);
                  setCategoryModalMode('manage');
                  setIsAddCategoryModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border border-purple-300 text-purple-800 bg-white hover:bg-purple-50 flex items-center gap-1 shadow-2xs"
                title="Edit name, color, or delete customer categories"
              >
                <Edit className="w-3 h-3 text-purple-600" />
                <span>✏️ Edit Categories</span>
              </button>
            </div>
          </div>

          {/* Domain Filter Quick Pills - Dedicated Domain Section */}
          <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-blue-900 mr-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-600" /> Domain / Vertical:
            </span>
            <button
              onClick={() => setDomainFilter('all')}
              className={\`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border \${domainFilter === 'all'
                  ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }\`}
            >
              All Domains ({leads.length})
            </button>
            {STANDARD_DOMAINS.map(dom => (
              <button
                key={dom}
                onClick={() => setDomainFilter(dom)}
                className={\`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 \${domainFilter === dom
                    ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }\`}
              >
                <span>{dom}</span>
                <span className={\`px-1.5 py-0.2 rounded-full text-[10px] font-bold \${domainFilter === dom ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                  }\`}>
                  {domainStats[dom] || 0}
                </span>
              </button>
            ))}
          </div>`;

content = content.replace(oldAdminCatPillsEnd.replace(/\r?\n/g, '\r\n'), newAdminCatAndDomainPills.replace(/\r?\n/g, '\r\n'));

// 10. Table Headers: add Domain header
const oldAdminTableTh = `                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>`;

const newAdminTableTh = `                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>`;

content = content.replace(oldAdminTableTh.replace(/\r?\n/g, '\r\n'), newAdminTableTh.replace(/\r?\n/g, '\r\n'));

// 11. Table Row: Domain cell right after Category cell
const oldAdminCategoryCell = `                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <select
                            value={(lead.category || 'general').toLowerCase()}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                setPendingLeadIdForCategory(lead.id);
                                setCategoryModalMode('add');
                                setIsAddCategoryModalOpen(true);
                              } else if (e.target.value === '__MANAGE_CATEGORIES__') {
                                setPendingLeadIdForCategory(lead.id);
                                setCategoryModalMode('manage');
                                setIsAddCategoryModalOpen(true);
                              } else {
                                handleQuickCategoryChange(lead.id, e.target.value, e);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-200 bg-white text-purple-900 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all hover:border-purple-400"
                            title="Click to categorize lead"
                          >
                            {categories.map(c => (
                              <option key={c.name} value={c.name.toLowerCase()}>
                                {c.icon || '🏷️'} {c.label}
                              </option>
                            ))}
                            <option value="__ADD_NEW__" className="font-bold text-purple-700 bg-purple-50">
                              ➕ + Add New Category...
                            </option>
                            <option value="__MANAGE_CATEGORIES__" className="font-bold text-purple-700 bg-purple-50">
                              ✏️ Edit & Manage Categories...
                            </option>
                          </select>
                        </td>`;

const newAdminCategoryAndDomainCells = `                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <select
                            value={(lead.category || 'subscription').toLowerCase()}
                            onChange={(e) => {
                              if (e.target.value === '__MANAGE_CATEGORIES__') {
                                setCategoryModalMode('manage');
                                setIsAddCategoryModalOpen(true);
                              } else {
                                handleQuickCategoryChange(lead.id, e.target.value, e);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-200 bg-white text-purple-900 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all hover:border-purple-400"
                            title="Click to categorize lead"
                          >
                            {categories.map(c => (
                              <option key={c.name} value={c.name.toLowerCase()}>
                                {c.icon || '🏷️'} {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Domain Cell */}
                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <select
                            value={lead.domain || 'Agarbatti & Perfume Expo'}
                            onChange={(e) => handleQuickDomainChange(lead.id, e.target.value, e)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-200 bg-white text-blue-900 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all hover:border-blue-400"
                            title="Click to change domain"
                          >
                            {STANDARD_DOMAINS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </td>`;

content = content.replace(oldAdminCategoryCell.replace(/\r?\n/g, '\r\n'), newAdminCategoryAndDomainCells.replace(/\r?\n/g, '\r\n'));

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched AdminLeads.tsx');
