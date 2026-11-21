const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'employee', 'EmployeeLeads.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Domain Dropdown in Filter Controls right next to Category filter
const oldCatDropdown = `            <select

              value={categoryFilter}

              onChange={(e) => setCategoryFilter(e.target.value)}

              className="text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-purple-600 font-medium"

            >

              <option value="all">All Categories ({leads.length})</option>

              {categories.map(c => (

                <option key={c.name} value={c.name.toLowerCase()}>

                  {c.icon || '🏷️'} {c.label} ({categoryStats[c.name.toLowerCase()] || 0})

                </option>

              ))}

            </select>`;

const newCatAndDomainDropdown = `            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-white border border-purple-200 rounded-xl px-3 py-2 text-purple-900 focus:outline-none focus:border-purple-600 font-semibold"
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
              className="text-xs bg-white border border-blue-200 rounded-xl px-3 py-2 text-blue-900 focus:outline-none focus:border-blue-600 font-semibold"
            >
              <option value="all">All Domains ({leads.length})</option>
              {STANDARD_DOMAINS.map(d => (
                <option key={d} value={d}>
                  {d} ({domainStats[d] || 0})
                </option>
              ))}
            </select>`;

content = content.replace(oldCatDropdown.replace(/\r?\n/g, '\r\n'), newCatAndDomainDropdown.replace(/\r?\n/g, '\r\n'));

// 2. Add Domain Filter Quick Pills bar right after Category Filter Quick Pills
const oldCategoryPillsEnd = `            <button
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

const newCategoryPillsAndDomainPills = `            <button
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
        <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap im-scrollbar">
          <span className="text-[11px] font-bold text-blue-900 mr-1 flex items-center gap-1 shrink-0">
            <Globe className="w-3.5 h-3.5 text-blue-600" /> Domain:
          </span>
          <button
            onClick={() => setDomainFilter('all')}
            className={\`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border \${
              domainFilter === 'all'
                ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            }\`}
          >
            All ({leads.length})
          </button>
          {STANDARD_DOMAINS.map(dom => (
            <button
              key={dom}
              onClick={() => setDomainFilter(dom)}
              className={\`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 \${
                domainFilter === dom
                  ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }\`}
            >
              <span>{dom}</span>
              <span className={\`px-1.5 py-0.2 rounded-full text-[10px] font-bold \${
                domainFilter === dom ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }\`}>
                {domainStats[dom] || 0}
              </span>
            </button>
          ))}
        </div>`;

content = content.replace(oldCategoryPillsEnd.replace(/\r?\n/g, '\r\n'), newCategoryPillsAndDomainPills.replace(/\r?\n/g, '\r\n'));

// 3. Table Headers: add Domain header
const oldTableHeaders = `                <tr className="border-b border-gray-200 text-gray-700 uppercase text-[10px] tracking-wider font-extrabold bg-gray-50/95">
                  <th className="py-3.5 px-4 min-w-[220px]">Lead Name & Company</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Contact Details</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Category</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Status & Source</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Latest Remarks / Notes</th>
                  <th className="py-3.5 px-4 text-center min-w-[420px] whitespace-nowrap">Actions & Remarks</th>
                </tr>`;

const newTableHeaders = `                <tr className="border-b border-gray-200 text-gray-700 uppercase text-[10px] tracking-wider font-extrabold bg-gray-50/95">
                  <th className="py-3.5 px-4 min-w-[220px]">Lead Name & Company</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Contact Details</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Category</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Domain</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Status & Source</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Latest Remarks / Notes</th>
                  <th className="py-3.5 px-4 text-center min-w-[420px] whitespace-nowrap">Actions & Remarks</th>
                </tr>`;

content = content.replace(oldTableHeaders.replace(/\r?\n/g, '\r\n'), newTableHeaders.replace(/\r?\n/g, '\r\n'));

// 4. Contact Details cell: Phone with WhatsApp click or No Phone + Add button
const oldContactCell = `                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>

                        <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWhatsApp(lead, e);
                            }}
                            className="inline-flex items-center gap-1.5 text-gray-800 font-semibold hover:text-[#25D366] hover:underline transition-colors group cursor-pointer text-left"
                            title={\`Click to chat with \${lead.fullName} on WhatsApp (\${lead.phone})\`}
                          >
                            <Phone className="w-3.5 h-3.5 text-teal-600 group-hover:text-[#25D366] transition-colors" />
                            <span>{lead.phone}</span>
                          </button>

                          {isDuplicateRow && (

                            <span

                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"

                              title={\`Duplicate Phone: \${lead.phone} appears multiple times in database\`}

                            >

                              ⚠️ Duplicate

                            </span>

                          )}

                        </div>

                        {lead.email && (

                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">

                            <Mail className="w-3 h-3 text-gray-400" />

                            <span>{lead.email}</span>

                          </div>

                        )}

                      </td>`;

const newContactCell = `                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">
                          {hasValidPhone(lead.phone) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWhatsApp(lead, e);
                              }}
                              className="inline-flex items-center gap-1.5 text-gray-800 font-semibold hover:text-[#25D366] hover:underline transition-colors group cursor-pointer text-left"
                              title={\`Click to chat with \${lead.fullName} on WhatsApp (\${lead.phone})\`}
                            >
                              <Phone className="w-3.5 h-3.5 text-teal-600 group-hover:text-[#25D366] transition-colors" />
                              <span>{lead.phone}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <PhoneOff className="w-3 h-3 text-rose-500" />
                                No Phone
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(lead);
                                }}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer transition-colors"
                                title="Add phone number"
                              >
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            </div>
                          )}

                          {isDuplicateRow && (
                            <span
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                              title={\`Duplicate Phone: \${lead.phone} appears multiple times in database\`}
                            >
                              ⚠️ Duplicate
                            </span>
                          )}
                        </div>

                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                      </td>`;

content = content.replace(oldContactCell.replace(/\r?\n/g, '\r\n'), newContactCell.replace(/\r?\n/g, '\r\n'));

// 5. Category cell & Add Domain Cell
const oldCategoryCell = `                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={(lead.category || 'general').toLowerCase()}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CATEGORY__') {
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
                          title="Click to categorize lead or edit categories"
                        >
                          {categories.map(c => (
                            <option key={c.name} value={c.name.toLowerCase()}>
                              {c.icon || '🏷️'} {c.label}
                            </option>
                          ))}
                          <option value="__ADD_CATEGORY__" className="font-bold text-purple-700 bg-purple-50">
                            ➕ + Add New Category...
                          </option>
                          <option value="__MANAGE_CATEGORIES__" className="font-bold text-purple-700 bg-purple-50">
                            ✏️ Edit & Manage Categories...
                          </option>
                        </select>
                      </td>`;

const newCategoryAndDomainCells = `                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
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
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
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

content = content.replace(oldCategoryCell.replace(/\r?\n/g, '\r\n'), newCategoryAndDomainCells.replace(/\r?\n/g, '\r\n'));

// 6. Source display in Status & Source cell
const oldSourceDisplay = `                        <div className="text-[10px] text-gray-500 capitalize mt-1">
                          Source: <span className="text-gray-700 font-semibold">{STANDARD_SOURCES.find(s => s.key === normalizeLeadSource(lead.source))?.label || '✍️ Manual'}</span>
                        </div>`;

const newSourceDisplay = `                        <div className="mt-1">
                          {(() => {
                            const norm = normalizeLeadSource(lead.source);
                            const srcDef = STANDARD_SOURCES.find(s => s.key === norm) || { label: lead.source || 'Manual', bg: 'bg-gray-50 text-gray-700 border-gray-200' };
                            return (
                              <span className={\`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border \${srcDef.bg || 'bg-gray-50 text-gray-700 border-gray-200'}\`}>
                                {srcDef.label}
                              </span>
                            );
                          })()}
                        </div>`;

content = content.replace(oldSourceDisplay.replace(/\r?\n/g, '\r\n'), newSourceDisplay.replace(/\r?\n/g, '\r\n'));

// 7. WhatsApp action button: disable if no valid phone
const oldWhatsAppButton = `                          {hasPermission('leads', 'whatsapp') && lead.phone ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                handleOpenWhatsApp(lead, e);
                              }}
                              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow shrink-0 cursor-pointer"
                              title={\`Chat with \${lead.fullName} on WhatsApp (\${lead.phone})\`}
                            >`;

const newWhatsAppButton = `                          {hasPermission('leads', 'whatsapp') && (
                            <button
                              type="button"
                              disabled={!hasValidPhone(lead.phone)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWhatsApp(lead, e);
                              }}
                              className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs shrink-0 \${
                                hasValidPhone(lead.phone)
                                  ? 'bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white cursor-pointer hover:shadow'
                                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                              }\`}
                              title={hasValidPhone(lead.phone) ? \`Chat with \${lead.fullName} on WhatsApp (\${lead.phone})\` : 'Phone number not available'}
                            >`;

content = content.replace(oldWhatsAppButton.replace(/\r?\n/g, '\r\n'), newWhatsAppButton.replace(/\r?\n/g, '\r\n'));

// 8. Add Lead Modal: add Domain field
const oldAddModalCategoryField = `              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Business Category</label>

                <select

                  value={newCategory}

                  onChange={(e) => setNewCategory(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"

                >

                  {categories.map((c) => (

                    <option key={c.name} value={c.name.toLowerCase()}>

                      {c.icon || '🏷️'} {c.label}

                    </option>

                  ))}

                  <option value="__NEW__" className="font-bold text-purple-700">

                    + Add New Category...

                  </option>

                </select>

                <div className="flex flex-wrap gap-1.5 mt-1.5">

                  {categories.slice(0, 8).map((c) => (

                    <button

                      key={c.name}

                      type="button"

                      onClick={() => setNewCategory(c.name.toLowerCase())}

                      className={\`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors \${

                        newCategory.toLowerCase() === c.name.toLowerCase() ? 'bg-purple-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                      }\`}

                    >

                      {c.icon || '🏷️'} {c.label}

                    </button>

                  ))}

                </div>

              </div>`;

const newAddModalCategoryAndDomainField = `              {/* Business Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Business Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl text-purple-900 focus:outline-none focus:border-purple-600 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.name} value={c.name.toLowerCase()}>
                      {c.icon || '🏷️'} {c.label}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setNewCategory(c.name.toLowerCase())}
                      className={\`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors \${
                        newCategory.toLowerCase() === c.name.toLowerCase() ? 'bg-purple-700 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                      }\`}
                    >
                      {c.icon || '🏷️'} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domain / Vertical */}
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">Domain / Exhibition Vertical *</label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-xl text-blue-900 focus:outline-none focus:border-blue-600 font-bold"
                >
                  {STANDARD_DOMAINS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {STANDARD_DOMAINS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDomain(d)}
                      className={\`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors \${
                        newDomain === d ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                      }\`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>`;

content = content.replace(oldAddModalCategoryField.replace(/\r?\n/g, '\r\n'), newAddModalCategoryAndDomainField.replace(/\r?\n/g, '\r\n'));

// 9. Edit Lead Modal: add Domain field in grid
const oldEditModalCategoryBlock = `                {/* Category */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Business Category</label>

                  <select

                    value={editCategory}

                    onChange={(e) => setEditCategory(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-purple-600 font-bold"

                  >

                    {categories.map((c) => (

                      <option key={c.name} value={c.name.toLowerCase()}>

                        {c.icon || '🏷️'} {c.label}

                      </option>

                    ))}

                  </select>

                </div>`;

const newEditModalCategoryBlock = `                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">Business Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl text-purple-900 focus:outline-none focus:border-purple-600 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name.toLowerCase()}>
                        {c.icon || '🏷️'} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Domain */}
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">Domain / Vertical</label>
                  <select
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-xl text-blue-900 focus:outline-none focus:border-blue-600 font-bold"
                  >
                    {STANDARD_DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>`;

content = content.replace(oldEditModalCategoryBlock.replace(/\r?\n/g, '\r\n'), newEditModalCategoryBlock.replace(/\r?\n/g, '\r\n'));

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched EmployeeLeads.tsx (Part 2: UI elements, table, pills, modals)');
