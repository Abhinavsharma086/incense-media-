import os
import sys

# 1. Update EmployeeLeads.tsx
leads_file = r'c:\xampp\htdocs\incenseMediaAdminCode\src\pages\employee\EmployeeLeads.tsx'
with open(leads_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix fetchMyLeads: do not pass employeeId mock param to get('/leads')
old_fetch = """  const fetchMyLeads = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get('/leads', {
        params: {
          myLeads: 'true',
          employeeId: employeeId || undefined,
          limit: 1000
        }
      });
      const data = res.data?.leads || res.data || [];
      let leadList = Array.isArray(data) ? data : [];

      if (employeeId && leadList.length > 0) {
        const hasOtherOwners = leadList.some((l: any) => l.ownerId && l.ownerId !== employeeId);
        if (hasOtherOwners) {
          leadList = leadList.filter((l: any) => {
            return (
              l.ownerId === employeeId ||
              l.assigned_to === employeeId ||
              l.assignedTo === employeeId ||
              (l.owner && (l.owner.id === employeeId || (currentUser?.email && l.owner.email === currentUser.email)))
            );
          });
        }
      }

      setLeads(leadList);
      localStorage.setItem('sys_cached_leads', JSON.stringify(leadList));
    } catch (err) {
      console.warn('Failed to fetch leads:', err);
      const cached = JSON.parse(localStorage.getItem('sys_cached_leads') || '[]');
      if (cached.length > 0) setLeads(cached);
    } finally {
      setLoading(false);
    }
  };"""

new_fetch = """  const fetchMyLeads = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get('/leads', {
        params: {
          myLeads: 'true',
          limit: 1000
        }
      });
      const data = res.data?.leads || res.data || [];
      let leadList = Array.isArray(data) ? data : [];

      if (leadList.length > 0) {
        const empEmail = (currentUser?.email || '').toLowerCase().trim();
        const hasOtherOwners = leadList.some((l: any) => {
          const lOwnerId = l.ownerId || l.owner?.id;
          const lOwnerEmail = (l.owner?.email || '').toLowerCase().trim();
          const matchesThisUser = (employeeId && lOwnerId === employeeId) || 
                                  (currentUser?.id && lOwnerId === currentUser.id) ||
                                  (empEmail && lOwnerEmail && lOwnerEmail === empEmail);
          return !matchesThisUser;
        });

        if (hasOtherOwners) {
          const filtered = leadList.filter((l: any) => {
            const lOwnerId = l.ownerId || l.owner?.id || l.assigned_to || l.assignedTo;
            const lOwnerEmail = (l.owner?.email || '').toLowerCase().trim();
            const matchesId = (employeeId && lOwnerId === employeeId) ||
                              (currentUser?.id && lOwnerId === currentUser.id);
            const matchesEmail = empEmail && lOwnerEmail && lOwnerEmail === empEmail;
            return matchesId || matchesEmail;
          });
          if (filtered.length > 0) {
            leadList = filtered;
          }
        }
      }

      setLeads(leadList);
      localStorage.setItem('sys_cached_leads', JSON.stringify(leadList));
    } catch (err) {
      console.warn('Failed to fetch leads:', err);
      const cached = JSON.parse(localStorage.getItem('sys_cached_leads') || '[]');
      if (cached.length > 0) setLeads(cached);
    } finally {
      setLoading(false);
    }
  };"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print("Replaced fetchMyLeads in EmployeeLeads.tsx")
else:
    print("Warning: old_fetch not found in EmployeeLeads.tsx (checking line-endings)")
    content = content.replace(old_fetch.replace('\r\n', '\n'), new_fetch)

# Fix matchesStatus in filteredLeads
old_status_match = """    const matchesStatus = statusFilter === 'all'

      ? true

      : statusFilter === 'duplicates_only'

      ? isDup

      : lead.status === statusFilter;"""

new_status_match = """    const lStatus = (lead.status || '').toLowerCase().trim();
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'duplicates_only'
      ? isDup
      : statusFilter === 'converted'
      ? ['converted', 'won'].includes(lStatus)
      : statusFilter === 'active_pipeline'
      ? !['converted', 'won', 'lost'].includes(lStatus)
      : lStatus === statusFilter.toLowerCase();"""

if old_status_match in content:
    content = content.replace(old_status_match, new_status_match)
    print("Replaced matchesStatus in EmployeeLeads.tsx")
else:
    print("Warning: old_status_match not found")

# Fix activeLeadsCount and convertedCount
old_counts = """  const totalAssigned = Array.isArray(leads) ? leads.length : 0;

  const activeLeadsCount = Array.isArray(leads) ? leads.filter((l) => l && !['converted', 'won', 'lost'].includes(l.status)).length : 0;

  const convertedCount = Array.isArray(leads) ? leads.filter((l) => l && ['converted', 'won'].includes(l.status)).length : 0;"""

new_counts = """  const totalAssigned = Array.isArray(leads) ? leads.length : 0;

  const activeLeadsCount = Array.isArray(leads)
    ? leads.filter((l) => {
        if (!l) return false;
        const s = (l.status || '').toLowerCase().trim();
        return !['converted', 'won', 'lost'].includes(s);
      }).length
    : 0;

  const convertedCount = Array.isArray(leads)
    ? leads.filter((l) => {
        if (!l) return false;
        const s = (l.status || '').toLowerCase().trim();
        return ['converted', 'won'].includes(s);
      }).length
    : 0;"""

if old_counts in content:
    content = content.replace(old_counts, new_counts)
    print("Replaced counts in EmployeeLeads.tsx")
else:
    print("Warning: old_counts not found")

# Fix Summary Cards
old_cards = """      {/* Stats Summary Cards - Admin Panel Theme */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">

          <div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Assigned</div>

            <div className="text-2xl font-bold text-gray-900 mt-0.5">{totalAssigned}</div>

          </div>

          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold border border-teal-100">

            <Target className="w-5 h-5" />

          </div>

        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">

          <div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Pipeline</div>

            <div className="text-2xl font-bold text-amber-600 mt-0.5">{activeLeadsCount}</div>

          </div>

          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">

            <Clock className="w-5 h-5" />

          </div>

        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">

          <div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Successfully Converted</div>

            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{convertedCount}</div>

          </div>

          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">

            <CheckCircle2 className="w-5 h-5" />

          </div>

        </div>

      </div>"""

new_cards = """      {/* Stats Summary Cards - Interactive Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs ${
            statusFilter === 'all'
              ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-md'
          }`}
          title="Click to view all assigned leads"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Assigned</span>
              {statusFilter === 'all' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">ALL</span>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{totalAssigned}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Click to view all leads</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform group-hover:scale-105 ${
            statusFilter === 'all'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-teal-50 text-teal-600 border-teal-100'
          }`}>
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(prev => prev === 'active_pipeline' ? 'all' : 'active_pipeline')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs ${
            statusFilter === 'active_pipeline'
              ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-md'
          }`}
          title="Click to view active pipeline leads only"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Pipeline</span>
              {statusFilter === 'active_pipeline' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">FILTERED</span>
              )}
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">{activeLeadsCount}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {statusFilter === 'active_pipeline' ? 'Click to show all leads' : 'Click to filter active leads'}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform group-hover:scale-105 ${
            statusFilter === 'active_pipeline'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(prev => prev === 'converted' ? 'all' : 'converted')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs ${
            statusFilter === 'converted'
              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
          }`}
          title="Click to view successfully converted leads"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Successfully Converted</span>
              {statusFilter === 'converted' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">FILTERED</span>
              )}
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{convertedCount}</div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {statusFilter === 'converted' ? 'Showing converted! Click to reset' : 'Click to view converted leads ↗'}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform group-hover:scale-105 ${
            statusFilter === 'converted'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>"""

if old_cards in content:
    content = content.replace(old_cards, new_cards)
    print("Replaced summary cards in EmployeeLeads.tsx")
else:
    print("Warning: old_cards not found")

# Fix Status select dropdown to include converted and active_pipeline
old_select = """              <option value=\"all\">All Statuses</option>

              <option value=\"duplicates_only\">⚠️ Duplicate Entries Only ({totalDuplicatesCount})</option>

              <option value=\"new\">New</option>

              <option value=\"contacted\">Contacted</option>

              <option value=\"follow_up\">Follow Up</option>

              <option value=\"in_progress\">In Progress</option>

              <option value=\"converted\">Converted</option>

              <option value=\"lost\">Lost</option>"""

new_select = """              <option value=\"all\">All Statuses ({totalAssigned})</option>
              <option value=\"active_pipeline\">⚡ Active Pipeline ({activeLeadsCount})</option>
              <option value=\"converted\">🎉 Successfully Converted ({convertedCount})</option>
              <option value=\"duplicates_only\">⚠️ Duplicate Entries Only ({totalDuplicatesCount})</option>
              <option value=\"new\">New</option>
              <option value=\"contacted\">Contacted</option>
              <option value=\"follow_up\">Follow Up</option>
              <option value=\"in_progress\">In Progress</option>
              <option value=\"lost\">Lost</option>"""

if old_select in content:
    content = content.replace(old_select, new_select)
    print("Replaced status options in EmployeeLeads.tsx")
else:
    print("Warning: old_select not found")

with open(leads_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("EmployeeLeads.tsx updated successfully!")
