import React, { useState, useMemo } from 'react';
import { Lead } from '@/lib/types/leads';
import crmApi from '@/api/crmApi';
import { toast } from '@/components/ui/sonner';
import {
  Users,
  UserCheck,
  Shuffle,
  Activity,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

export interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  roleName?: string;
  activeLeadsCount?: number;
}

interface BulkLeadDistributionSectionProps {
  leads: Lead[];
  employees: EmployeeInfo[];
  onRefresh: () => void;
  preSelectedLeadIds?: string[];
  onClose?: () => void;
}

const BulkLeadDistributionSection: React.FC<BulkLeadDistributionSectionProps> = ({
  leads,
  employees,
  onRefresh,
  preSelectedLeadIds = [],
  onClose,
}) => {
  // Filter & Search states
  const [leadFilterType, setLeadFilterType] = useState<'unassigned' | 'new' | 'all' | 'custom'>(
    preSelectedLeadIds.length > 0 ? 'custom' : 'unassigned'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

const isUnassignedLead = (l: Lead) => {
  return (
    !l.assigned_to ||
    l.assigned_to === 'unassigned' ||
    l.assigned_to === 'Unassigned' ||
    l.assigned_to === 'none' ||
    l.assigned_to === ''
  );
};

  // Selected leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(
    preSelectedLeadIds.length > 0
      ? preSelectedLeadIds
      : leads.filter(isUnassignedLead).map((l) => l.id)
  );

  // Selected employees (all selected by default)
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(
    employees.map((e) => e.id)
  );

  // Strategy: 'single_employee' (ek employee ko multipels lead) | 'round_robin' | 'workload'
  const [strategy, setStrategy] = useState<'single_employee' | 'round_robin' | 'workload'>('single_employee');
  const [targetSingleEmpId, setTargetSingleEmpId] = useState<string>(employees[0]?.id || '');
  const [isDistributing, setIsDistributing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Keep selectedEmpIds and targetSingleEmpId in sync when employees prop loads
  React.useEffect(() => {
    if (employees.length > 0) {
      if (selectedEmpIds.length === 0) {
        setSelectedEmpIds(employees.map((e) => e.id));
      }
      if (!targetSingleEmpId || !employees.some((e) => e.id === targetSingleEmpId)) {
        setTargetSingleEmpId(employees[0].id);
      }
    }
  }, [employees]);

  // Compute workload count for each employee from leads
  const employeeWorkloads = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach((emp) => {
      map[emp.id] = 0;
    });

    leads.forEach((l) => {
      if (l.assigned_to && map[l.assigned_to] !== undefined) {
        if (!['converted', 'won', 'lost', 'not_interested'].includes(l.status)) {
          map[l.assigned_to] += 1;
        }
      }
    });
    return map;
  }, [leads, employees]);

  // Filter leads based on current filter type & search
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Type filter
      if (leadFilterType === 'unassigned' && !isUnassignedLead(l)) return false;
      if (leadFilterType === 'new' && l.status !== 'new') return false;

      // Source filter
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (l.full_name && l.full_name.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.company_name && l.company_name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [leads, leadFilterType, sourceFilter, searchQuery]);

  // Quick preset selections
  const handlePresetChange = (type: 'unassigned' | 'new' | 'all') => {
    setLeadFilterType(type);
    let matched: string[] = [];
    if (type === 'unassigned') {
      matched = leads.filter(isUnassignedLead).map((l) => l.id);
    } else if (type === 'new') {
      matched = leads.filter((l) => l.status === 'new').map((l) => l.id);
    } else {
      matched = leads.map((l) => l.id);
    }
    setSelectedLeadIds(matched);
  };

  // Toggle single lead
  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle all filtered leads
  const toggleAllFilteredLeads = () => {
    const filteredIds = filteredLeads.map((l) => l.id);
    const allSelected = filteredIds.every((id) => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Toggle employee
  const toggleEmployee = (empId: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const toggleAllEmployees = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map((e) => e.id));
    }
  };

  // Live simulation of how many leads each employee will receive
  const distributionSimulation = useMemo(() => {
    const totalLeads = selectedLeadIds.length;
    if (totalLeads === 0) return [];

    if (strategy === 'single_employee') {
      const emp = employees.find((e) => e.id === targetSingleEmpId) || employees[0];
      if (!emp) return [];
      return [
        {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          count: totalLeads,
          newTotal: (employeeWorkloads[emp.id] || 0) + totalLeads,
        },
      ];
    }

    const numEmps = selectedEmpIds.length;
    if (numEmps === 0) return [];

    if (strategy === 'workload') {
      // Simulation of workload-based assignment
      const workloads = selectedEmpIds.map((id) => ({
        id,
        current: employeeWorkloads[id] || 0,
        assigned: 0,
      }));

      for (let i = 0; i < totalLeads; i++) {
        workloads.sort((a, b) => a.current + a.assigned - (b.current + b.assigned));
        workloads[0].assigned += 1;
      }

      return workloads.map((w) => {
        const emp = employees.find((e) => e.id === w.id);
        return {
          id: w.id,
          name: emp ? `${emp.firstName} ${emp.lastName}`.trim() : 'Employee',
          count: w.assigned,
          newTotal: w.current + w.assigned,
        };
      });
    } else {
      // Equal split
      const base = Math.floor(totalLeads / numEmps);
      const remainder = totalLeads % numEmps;

      return selectedEmpIds.map((id, index) => {
        const count = base + (index < remainder ? 1 : 0);
        const emp = employees.find((e) => e.id === id);
        return {
          id,
          name: emp ? `${emp.firstName} ${emp.lastName}`.trim() : 'Employee',
          count,
          newTotal: (employeeWorkloads[id] || 0) + count,
        };
      });
    }
  }, [selectedLeadIds.length, selectedEmpIds, strategy, targetSingleEmpId, employeeWorkloads, employees]);

  // Execute Distribution / Single Assign
  const handleExecuteDistribution = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error('Please select at least one lead to assign');
      return;
    }

    if (strategy === 'single_employee') {
      const emp = employees.find((e) => e.id === targetSingleEmpId) || employees[0];
      if (!emp) {
        toast.error('Please select an employee to receive the leads');
        return;
      }

      setIsDistributing(true);
      setLastResult(null);

      try {
        const res = await crmApi.post('/leads/assign/bulk', {
          leadIds: selectedLeadIds,
          employeeId: emp.id,
        });

        const empName = `${emp.firstName} ${emp.lastName}`.trim();
        setLastResult({
          totalAssigned: selectedLeadIds.length,
          breakdown: [
            {
              employeeId: emp.id,
              employeeName: empName,
              assignedCount: selectedLeadIds.length,
            },
          ],
        });
        toast.success(`Successfully assigned ${selectedLeadIds.length} lead(s) to ${empName}!`);
        setSelectedLeadIds([]);
        onRefresh();
      } catch (error: any) {
        console.error('Assign error:', error);
        toast.error(error?.response?.data?.message || 'Failed to assign leads to employee');
      } finally {
        setIsDistributing(false);
      }
      return;
    }

    if (selectedEmpIds.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setIsDistributing(true);
    setLastResult(null);

    try {
      const res = await crmApi.post('/leads/assign/distribute', {
        leadIds: selectedLeadIds,
        employeeIds: selectedEmpIds,
        strategy,
      });

      setLastResult(res.data);
      toast.success(
        `Successfully distributed ${res.data.totalAssigned || selectedLeadIds.length} lead(s) among ${selectedEmpIds.length} employee(s)!`
      );
      setSelectedLeadIds([]);
      onRefresh();
    } catch (error: any) {
      console.error('Distribution error:', error);
      toast.error(error?.response?.data?.message || 'Failed to distribute leads');
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ⚡ LEAD DISTRIBUTION HUB
            </span>
            <span className="text-xs text-gray-400">• Assign leads to team members in bulk</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight mt-1.5 flex items-center gap-2">
            Bulk Lead Assignment & Equal Distribution
          </h2>
          <p className="text-gray-300 text-xs mt-1 max-w-2xl">
            Select unassigned or active leads and divide them equally across all your sales team members or balance by current workload.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            Back to Leads Table
          </button>
        )}
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-200 bg-gray-50/70 text-xs">
        <div className="p-4">
          <div className="text-gray-500 font-semibold uppercase text-[10px]">Total Leads</div>
          <div className="text-lg font-bold text-gray-900 mt-0.5">{leads.length}</div>
        </div>
        <div className="p-4">
          <div className="text-gray-500 font-semibold uppercase text-[10px]">Unassigned Leads</div>
          <div className="text-lg font-bold text-amber-600 mt-0.5">
            {leads.filter(isUnassignedLead).length}
          </div>
        </div>
        <div className="p-4">
          <div className="text-gray-500 font-semibold uppercase text-[10px]">Available Employees</div>
          <div className="text-lg font-bold text-indigo-600 mt-0.5">{employees.length}</div>
        </div>
        <div className="p-4 bg-indigo-50/50">
          <div className="text-indigo-700 font-semibold uppercase text-[10px]">Selected for Assignment</div>
          <div className="text-lg font-bold text-indigo-950 mt-0.5">
            {selectedLeadIds.length} <span className="text-xs font-normal text-indigo-600">Leads</span>
          </div>
        </div>
      </div>

      {/* Success Notification if just completed */}
      {lastResult && (
        <div className="p-4 m-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-emerald-800">
              Distribution Complete! {lastResult.totalAssigned} lead(s) successfully assigned.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastResult.breakdown?.map((item: any) => (
                <span
                  key={item.employeeId}
                  className="px-2.5 py-1 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-semibold text-[11px] shadow-xs"
                >
                  {item.employeeName}: <strong className="text-emerald-600">+{item.assignedCount} leads</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* LEFT COLUMN: Lead Selection (7 cols) */}
        <div className="lg:col-span-7 p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h3 className="font-bold text-gray-900 text-sm">Select Leads to Distribute</h3>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {selectedLeadIds.length} Selected
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePresetChange('unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                leadFilterType === 'unassigned'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned Leads ({leads.filter(isUnassignedLead).length})
            </button>
            <button
              onClick={() => handlePresetChange('new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                leadFilterType === 'new'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New Leads ({leads.filter((l) => l.status === 'new').length})
            </button>
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                leadFilterType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Leads ({leads.length})
            </button>
          </div>

          {/* Search & Source Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads by name, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium"
            >
              <option value="all">All Sources</option>
              <option value="meta">Meta Ads</option>
              <option value="website">Website</option>
              <option value="manual">Manual</option>
              <option value="import">Imported</option>
            </select>
          </div>

          {/* Select All Checkbox Row */}
          <div className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded-lg border border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={
                  filteredLeads.length > 0 &&
                  filteredLeads.every((l) => selectedLeadIds.includes(l.id))
                }
                onChange={toggleAllFilteredLeads}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              Select All Filtered ({filteredLeads.length})
            </label>
            <span className="text-gray-400 text-[11px]">Click lead row to toggle</span>
          </div>

          {/* Scrollable Leads List */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-gray-100">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                No leads found matching current criteria.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggleLead(lead.id)}
                    className={`p-3 flex items-center justify-between hover:bg-indigo-50/40 cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-indigo-50/60' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent onClick
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <div>
                        <div className="font-bold text-gray-900">{lead.full_name}</div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-2 mt-0.5">
                          <span>{lead.phone}</span>
                          {lead.city && <span>• {lead.city}</span>}
                          <span className="capitalize px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 text-[10px]">
                            {lead.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {lead.assigned_to_name ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {lead.assigned_to_name}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Unassigned
                        </span>
                      )}
                      <div className="text-[10px] text-gray-400 capitalize mt-0.5">{lead.status}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Target Employees & Strategy (5 cols) */}
        <div className="lg:col-span-5 p-5 flex flex-col space-y-4 bg-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <h3 className="font-bold text-gray-900 text-sm">Select Target Employees</h3>
            </div>
            <button
              onClick={toggleAllEmployees}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              {selectedEmpIds.length === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Employees List */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-gray-100 bg-white shadow-xs">
            {employees.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">No employees found.</div>
            ) : (
              employees.map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.id);
                const workload = employeeWorkloads[emp.id] || 0;

                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`p-3 flex items-center justify-between hover:bg-indigo-50/40 cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-indigo-50/40' : 'bg-white opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {emp.firstName?.[0] || 'E'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {emp.roleName || 'Employee'} {emp.phone && `• ${emp.phone}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                        {workload} active leads
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Assignment & Distribution Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStrategy('single_employee')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  strategy === 'single_employee'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Ek Employee Ko
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Assign all selected leads to 1 chosen employee.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('round_robin')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  strategy === 'round_robin'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                  <Shuffle className="w-3.5 h-3.5 text-indigo-600" /> Equal Split
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Divide leads equally (Round Robin) among selected members.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('workload')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  strategy === 'workload'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" /> Workload Balanced
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Assign more leads to members with fewer active leads.
                </p>
              </button>
            </div>

            {/* Target Employee selector for single_employee mode */}
            {strategy === 'single_employee' && (
              <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl animate-in fade-in">
                <label className="block text-xs font-bold text-indigo-900 mb-1.5">
                  Target Employee (All {selectedLeadIds.length} leads will be assigned to selected member):
                </label>
                <select
                  value={targetSingleEmpId}
                  onChange={(e) => setTargetSingleEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:border-indigo-600 font-semibold shadow-xs"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.roleName ? `• ${emp.roleName}` : ''} ({employeeWorkloads[emp.id] || 0} active leads)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-gray-100">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Distribution Preview
              </span>
              <span className="text-[11px] text-gray-500">
                {selectedLeadIds.length} Leads ➔ {selectedEmpIds.length} Employees
              </span>
            </div>

            {distributionSimulation.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">
                Select leads and at least one employee to preview allocation.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {distributionSimulation.map((sim) => (
                  <div
                    key={sim.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-gray-50 text-gray-800"
                  >
                    <span className="font-medium truncate max-w-[140px]">{sim.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded text-[11px]">
                        +{sim.count} leads
                      </span>
                      <span className="text-[10px] text-gray-400">(Total: {sim.newTotal})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={isDistributing || selectedLeadIds.length === 0 || selectedEmpIds.length === 0}
            onClick={handleExecuteDistribution}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
              isDistributing || selectedLeadIds.length === 0 || selectedEmpIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-200'
            }`}
          >
            {isDistributing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing Assignment...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                {strategy === 'single_employee'
                  ? `Confirm & Assign ${selectedLeadIds.length} Lead(s) to Selected Employee`
                  : `Confirm & Distribute ${selectedLeadIds.length} Lead(s) Now`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkLeadDistributionSection;
