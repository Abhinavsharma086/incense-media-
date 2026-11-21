import os

# 1. Update backend/src/controllers/lead.controller.ts
backend_file = r'c:\xampp\htdocs\incenseMediaAdminCode\backend\src\controllers\lead.controller.ts'
with open(backend_file, 'r', encoding='utf-8') as f:
    bcontent = f.read()

old_backend_source = """            source: (() => {

                const s = source ? String(source).trim() : '';

                if (!s || s.toLowerCase() === 'manual') {

                    return fullName ? `Manually Added - ${String(fullName).trim()}` : 'Manually Added by Customer';

                }

                return s;

            })(),"""

new_backend_source = """            source: (() => {
                const s = source ? String(source).trim().toLowerCase() : 'manual';
                if (s.includes('web') || s.includes('site') || s.includes('online')) return 'website';
                if (s.includes('meta') || s.includes('fb') || s.includes('facebook') || s.includes('ad')) return 'meta';
                if (s.includes('excel') || s.includes('import') || s.includes('csv')) return 'import';
                if (s.includes('whats') || s.includes('wa')) return 'whatsapp';
                if (s.includes('expo') || s.includes('exhibit')) return 'expo';
                return 'manual';
            })(),"""

if old_backend_source in bcontent:
    bcontent = bcontent.replace(old_backend_source, new_backend_source)
    print("Replaced backend createLead source logic")
else:
    bcontent = bcontent.replace(old_backend_source.replace('\r\n', '\n'), new_backend_source)
    print("Replaced backend createLead source logic (normalized)")

with open(backend_file, 'w', encoding='utf-8') as f:
    f.write(bcontent)

# 2. Update src/pages/employee/EmployeeLeads.tsx
leads_file = r'c:\xampp\htdocs\incenseMediaAdminCode\src\pages\employee\EmployeeLeads.tsx'
with open(leads_file, 'r', encoding='utf-8') as f:
    lcontent = f.read()

# Add normalizeLeadSource and STANDARD_SOURCES before component
helper_code = """export const normalizeLeadSource = (rawSource?: string): string => {
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
];

"""

if "export const normalizeLeadSource" not in lcontent:
    lcontent = lcontent.replace("export const EmployeeLeads: React.FC = () => {", helper_code + "export const EmployeeLeads: React.FC = () => {")
    print("Added normalizeLeadSource & STANDARD_SOURCES")

# Replace sourceStats
old_source_stats = """  const sourceStats = React.useMemo(() => {

    const map = new Map<string, number>();

    leads.forEach(l => {

      const src = (l.source || 'manual').trim().toLowerCase();

      map.set(src, (map.get(src) || 0) + 1);

    });

    const standard = ['website', 'meta', 'manual', 'import', 'whatsapp', 'expo'];

    standard.forEach(s => {

      if (!map.has(s)) map.set(s, 0);

    });

    return Array.from(map.entries()).map(([key, count]) => ({

      key,

      count,

      label: key === 'website' ? '🌐 Website Inquiries' :

             key === 'meta' ? '📱 Meta Ads' :

             key === 'manual' ? '✍️ Manual' :

             key === 'import' ? '📂 Imported' :

             key === 'whatsapp' ? '💬 WhatsApp' :

             key === 'expo' ? '🏛️ Expo' :

             `${key.charAt(0).toUpperCase() + key.slice(1)}`

    }));

  }, [leads]);"""

new_source_stats = """  const sourceStats = React.useMemo(() => {
    const counts: Record<string, number> = {
      website: 0,
      meta: 0,
      manual: 0,
      import: 0,
      whatsapp: 0,
      expo: 0,
    };

    (Array.isArray(leads) ? leads : []).forEach((l) => {
      const norm = normalizeLeadSource(l.source);
      counts[norm] = (counts[norm] || 0) + 1;
    });

    return STANDARD_SOURCES.map((s) => ({
      key: s.key,
      label: s.label,
      count: counts[s.key] || 0,
    }));
  }, [leads]);"""

if old_source_stats in lcontent:
    lcontent = lcontent.replace(old_source_stats, new_source_stats)
    print("Replaced sourceStats in EmployeeLeads.tsx")
else:
    lcontent = lcontent.replace(old_source_stats.replace('\r\n', '\n'), new_source_stats)
    print("Replaced sourceStats (normalized)")

# Replace matchesSource in filteredLeads
old_match_src = """    const leadSrc = (lead.source || 'manual').trim().toLowerCase();

    const filterSrc = sourceFilter.trim().toLowerCase();

    const matchesSource = sourceFilter === 'all' || leadSrc === filterSrc;"""

new_match_src = """    const leadSrc = normalizeLeadSource(lead.source);
    const filterSrc = sourceFilter.trim().toLowerCase();
    const matchesSource = sourceFilter === 'all' || leadSrc === filterSrc;"""

if old_match_src in lcontent:
    lcontent = lcontent.replace(old_match_src, new_match_src)
    print("Replaced matchesSource in EmployeeLeads.tsx")
else:
    lcontent = lcontent.replace(old_match_src.replace('\r\n', '\n'), new_match_src)
    print("Replaced matchesSource (normalized)")

# Replace Add Lead modal source field
old_add_src = """              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source / Resource *</label>

                <input

                  type="text"

                  required

                  placeholder="e.g. Manually Added by Customer"

                  value={newSource === 'manual' ? (newFullName.trim() ? `Manually Added - ${newFullName.trim()}` : 'Manually Added by Customer') : newSource}

                  onChange={(e) => setNewSource(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"

                />

                <div className="flex flex-wrap gap-1.5 mt-1.5">

                  {[

                    newFullName.trim() ? `Manually Added - ${newFullName.trim()}` : 'Manually Added by Customer',

                    'Customer Direct Call',

                    'WhatsApp Inquiry',

                    'Exhibition / Expo',

                  ].map((s) => (

                    <button

                      key={s}

                      type="button"

                      onClick={() => setNewSource(s)}

                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-semibold transition-colors"

                    >

                      {s}

                    </button>

                  ))}

                </div>

              </div>"""

new_add_src = """              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source / Channel *</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"
                >
                  <option value="manual">✍️ Manual</option>
                  <option value="website">🌐 Website Inquiries</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="expo">🏛️ Exhibition / Expo</option>
                  <option value="meta">📱 Meta Ads</option>
                  <option value="import">📂 Imported</option>
                </select>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {STANDARD_SOURCES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setNewSource(s.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                        newSource === s.key ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>"""

if old_add_src in lcontent:
    lcontent = lcontent.replace(old_add_src, new_add_src)
    print("Replaced Add Lead modal source field")
else:
    lcontent = lcontent.replace(old_add_src.replace('\r\n', '\n'), new_add_src)
    print("Replaced Add Lead modal source field (normalized)")

# Replace Edit Lead modal source field
old_edit_src = """              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source</label>

                <input

                  type="text"

                  placeholder="e.g. Google, Manually Added..."

                  value={editSource}

                  onChange={(e) => setEditSource(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                />

              </div>"""

new_edit_src = """              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source</label>
                <select
                  value={normalizeLeadSource(editSource)}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="manual">✍️ Manual</option>
                  <option value="website">🌐 Website Inquiries</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="expo">🏛️ Exhibition / Expo</option>
                  <option value="meta">📱 Meta Ads</option>
                  <option value="import">📂 Imported</option>
                </select>
              </div>"""

if old_edit_src in lcontent:
    lcontent = lcontent.replace(old_edit_src, new_edit_src)
    print("Replaced Edit Lead modal source field")
else:
    lcontent = lcontent.replace(old_edit_src.replace('\r\n', '\n'), new_edit_src)
    print("Replaced Edit Lead modal source field (normalized)")

# Replace Table row source display
old_table_src = """                        <div className="text-[10px] text-gray-500 capitalize mt-1">

                          Source: <span className="text-gray-700 font-semibold">{lead.source}</span>

                        </div>"""

new_table_src = """                        <div className="text-[10px] text-gray-500 capitalize mt-1">
                          Source: <span className="text-gray-700 font-semibold">{STANDARD_SOURCES.find(s => s.key === normalizeLeadSource(lead.source))?.label || '✍️ Manual'}</span>
                        </div>"""

if old_table_src in lcontent:
    lcontent = lcontent.replace(old_table_src, new_table_src)
    print("Replaced table source display")
else:
    lcontent = lcontent.replace(old_table_src.replace('\r\n', '\n'), new_table_src)
    print("Replaced table source display (normalized)")

with open(leads_file, 'w', encoding='utf-8') as f:
    f.write(lcontent)

print("All source cleaning updates applied successfully!")
