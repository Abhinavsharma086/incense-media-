import React, { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/lib/types/leads';
import { toast } from '@/components/ui/sonner';
import {
  Users,
  UserCheck,
  Hash,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  TrendingUp,
  BarChart3,
  Sliders,
  ShieldCheck,
  Clock,
  Zap,
  SplitSquareVertical,
  CheckSquare,
  Square,
  Flame,
  Check,
  Scale,
  RotateCcw,
} from 'lucide-react';
import crmApi from '@/api/crmApi';
import {
  assignLeadsBySerialOrQuantity,
  fetchEmployeeWorkloads,
  autoWaterfallAssignLeads,
} from '@/lib/leadAssignment';
import { getEmployees } from '@/lib/roleAuthStore';

export interface EmployeeWorkload {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  activeLeads: number;
  newLeads?: number;
  convertedLeads?: number;
  totalLeads: number;
}

interface SerialLeadAssignerPanelProps {
  leads: Lead[];
  employees: { id: string; firstName: string; lastName: string; email?: string; phone?: string; roleName?: string }[];
  onRefresh: () => void;
  onClose?: () => void;
}

const SerialLeadAssignerPanel: React.FC<SerialLeadAssignerPanelProps> = ({
  leads,
  employees,
  onRefresh,
  onClose,
}) => {
  // Live Workloads state
  const [workloads, setWorkloads] = useState<EmployeeWorkload[]>([]);
  const [loadingWorkloads, setLoadingWorkloads] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  // Primary mode switcher: Single Employee Assigner vs Multi-Employee Auto Waterfall
  const [panelMode, setPanelMode] = useState<'single' | 'auto_waterfall'>('single');

  // Single Employee Assigner state
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [assignMode, setAssignMode] = useState<'quantity' | 'range'>('quantity');
  const [quantity, setQuantity] = useState<number>(10);
  const [startSerial, setStartSerial] = useState<number>(1);
  const [endSerial, setEndSerial] = useState<number>(50);
  const [filterCriteria, setFilterCriteria] = useState<'unassigned' | 'new' | 'all'>('unassigned');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAssignedResult, setLastAssignedResult] = useState<any>(null);

  // Auto Waterfall & Workload Distribution state
  const [waterfallChunkSize, setWaterfallChunkSize] = useState<number>(100);
  const [waterfallStrategy, setWaterfallStrategy] = useState<'equal_share' | 'waterfall' | 'workload_balanced'>('equal_share');
  const [waterfallTargetCap, setWaterfallTargetCap] = useState<number>(100);
  const [selectedWaterfallEmpIds, setSelectedWaterfallEmpIds] = useState<string[]>([]);
  const [isWaterfallSubmitting, setIsWaterfallSubmitting] = useState(false);
  const [waterfallResult, setWaterfallResult] = useState<any>(null);
  const [workflowEnabled, setWorkflowEnabled] = useState(true);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [isTogglingWorkflow, setIsTogglingWorkflow] = useState(false);

  // Fetch live workloads from backend
  const loadWorkloads = async () => {
    setLoadingWorkloads(true);
    try {
      const data = await fetchEmployeeWorkloads();
      if (Array.isArray(data)) {
        setWorkloads(data);
      }
    } catch (err) {
      console.warn('Failed to fetch workloads, computing from props:', err);
    } finally {
      setLoadingWorkloads(false);
    }
  };

  useEffect(() => {
    loadWorkloads();
    const fetchWorkflow = async () => {
      try {
        const res = await crmApi.get('/leads/assign/workflow-status');
        setWorkflowEnabled(!!res.data?.isEnabled);
      } catch (e) {
        console.warn('Failed to load workflow status', e);
      }
    };
    fetchWorkflow();
  }, []);

  const handleUnassignAll = async () => {
    if (
      !window.confirm(
        'Are you sure you want to unassign all leads from all employees? All assigned leads will be returned to the unassigned pool for equal distribution.'
      )
    ) {
      return;
    }
    setIsUnassigning(true);
    try {
      const res = await crmApi.post('/leads/assign/unassign-all');
      toast.success(res.data?.message || 'All leads unassigned successfully!');
      await loadWorkloads();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to unassign leads');
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleToggleWorkflow = async () => {
    setIsTogglingWorkflow(true);
    try {
      const res = await crmApi.post('/leads/assign/workflow-status', { isEnabled: !workflowEnabled });
      setWorkflowEnabled(res.data.isEnabled);
      toast.success(`Automatic lead workflow ${res.data.isEnabled ? 'Active (ON)' : 'Disabled (OFF)'}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to toggle workflow');
    } finally {
      setIsTogglingWorkflow(false);
    }
  };

  // Helper to accurately identify unassigned leads (handles null, undefined, '', 'unassigned', 'none')
  const isUnassignedLead = (l: Lead) => {
    return (
      !l.assigned_to ||
      l.assigned_to === 'unassigned' ||
      l.assigned_to === 'Unassigned' ||
      l.assigned_to === 'none' ||
      l.assigned_to === ''
    );
  };

  // Merge backend workloads with props employees and local store fallback so no employee is ever missing
  const mergedEmployees = useMemo(() => {
    const list: EmployeeWorkload[] = [];
    const seen = new Set<string>();

    workloads.forEach((w) => {
      if (w.id && !seen.has(w.id)) {
        seen.add(w.id);
        list.push(w);
      }
    });

    employees.forEach((emp) => {
      if (emp.id && !seen.has(emp.id)) {
        const activeCount = leads.filter(
          (l) => l.assigned_to === emp.id && !['converted', 'won', 'lost'].includes(l.status)
        ).length;
        const totalCount = leads.filter((l) => l.assigned_to === emp.id).length;

        list.push({
          id: emp.id,
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
          email: emp.email,
          phone: emp.phone,
          role: emp.roleName || 'Sales Staff',
          activeLeads: activeCount,
          totalLeads: totalCount,
        });
        seen.add(emp.id);
      }
    });

    // Fallback: If still empty (e.g. backend network delay or offline), pull from local employee store!
    if (list.length === 0) {
      try {
        const localEmps = getEmployees();
        localEmps.forEach((emp) => {
          if (emp.id && !seen.has(emp.id)) {
            list.push({
              id: emp.id,
              name: emp.name || 'Sales Staff',
              email: emp.email,
              phone: emp.phone,
              role: emp.designation || 'Sales Staff',
              activeLeads: 0,
              totalLeads: 0,
            });
            seen.add(emp.id);
          }
        });
      } catch (err) {
        console.warn('Local employees store fallback warning:', err);
      }
    }

    return list;
  }, [workloads, employees, leads]);

  // Set default selected employee for single assigner
  useEffect(() => {
    if (mergedEmployees.length > 0) {
      const exists = mergedEmployees.some((e) => e.id === selectedEmpId);
      if (!selectedEmpId || !exists) {
        setSelectedEmpId(mergedEmployees[0].id);
      }
    }
  }, [mergedEmployees, selectedEmpId]);

  // Set default selected employees for waterfall mode
  useEffect(() => {
    if (mergedEmployees.length > 0) {
      if (selectedWaterfallEmpIds.length === 0) {
        setSelectedWaterfallEmpIds(mergedEmployees.map((e) => e.id));
      } else {
        const validIds = selectedWaterfallEmpIds.filter((id) =>
          mergedEmployees.some((e) => e.id === id)
        );
        if (validIds.length === 0) {
          setSelectedWaterfallEmpIds(mergedEmployees.map((e) => e.id));
        }
      }
    }
  }, [mergedEmployees]);

  // Available candidate leads ordered chronologically (serial order)
  const candidateLeads = useMemo(() => {
    const filtered = leads.filter((l) => {
      if (filterCriteria === 'unassigned') return isUnassignedLead(l);
      if (filterCriteria === 'new') return l.status === 'new';
      return true;
    });

    // Chronological order: oldest to newest (serial #1 to #N)
    return [...filtered].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });
  }, [leads, filterCriteria]);

  // Single Mode preview leads
  const previewLeads = useMemo(() => {
    if (candidateLeads.length === 0) return [];

    if (assignMode === 'range') {
      const start = Math.max(0, startSerial - 1);
      const end = Math.min(candidateLeads.length, endSerial);
      return candidateLeads.slice(start, end).map((l, idx) => ({
        ...l,
        serialNumber: start + idx + 1,
      }));
    } else {
      const start = Math.max(0, startSerial - 1);
      return candidateLeads.slice(start, start + quantity).map((l, idx) => ({
        ...l,
        serialNumber: start + idx + 1,
      }));
    }
  }, [candidateLeads, assignMode, startSerial, endSerial, quantity]);

  // Multi-Employee Waterfall Allocation Plan (Pre-calculation)
  const waterfallPlan = useMemo(() => {
    const selectedEmps = mergedEmployees.filter((e) => selectedWaterfallEmpIds.includes(e.id));
    if (selectedEmps.length === 0 || candidateLeads.length === 0) return [];

    if (waterfallStrategy === 'equal_share') {
      const total = candidateLeads.length;
      const count = selectedEmps.length;
      const base = Math.floor(total / count);
      const remainder = total % count;
      let currentPointer = 0;

      return selectedEmps.map((emp, idx) => {
        const empQuota = base + (idx < remainder ? 1 : 0);
        const start = empQuota > 0 ? currentPointer + 1 : 0;
        const end = empQuota > 0 ? currentPointer + empQuota : 0;
        currentPointer += empQuota;
        return {
          ...emp,
          allocatedCount: empQuota,
          startSerial: start,
          endSerial: end,
          status: empQuota > 0 ? `Equal Share (${empQuota} Leads)` : `Pool Empty (0 Leads)`,
        };
      });
    } else if (waterfallStrategy === 'workload_balanced') {
      const emps = selectedEmps.map((e) => ({
        ...e,
        simulatedActive: e.activeLeads,
        allocatedCount: 0,
      }));

      let leadIdx = 0;
      while (leadIdx < candidateLeads.length) {
        emps.sort((a, b) => a.simulatedActive - b.simulatedActive);
        const target = emps[0];
        if (waterfallTargetCap && target.simulatedActive >= waterfallTargetCap) {
          break;
        }
        target.simulatedActive += 1;
        target.allocatedCount += 1;
        leadIdx += 1;
      }
      return emps;
    } else {
      // Sequential Waterfall: chunkSize (e.g. 100) to Emp 1, then next 100 to Emp 2, etc.
      let currentPointer = 0;
      return selectedEmps.map((emp) => {
        if (currentPointer >= candidateLeads.length) {
          return {
            ...emp,
            allocatedCount: 0,
            startSerial: 0,
            endSerial: 0,
            status: 'Pool Empty',
          };
        }
        const count = Math.min(waterfallChunkSize, candidateLeads.length - currentPointer);
        const start = currentPointer + 1;
        const end = currentPointer + count;
        currentPointer += count;
        return {
          ...emp,
          allocatedCount: count,
          startSerial: start,
          endSerial: end,
          status: count === waterfallChunkSize ? `Full Batch (${waterfallChunkSize})` : `Partial (${count})`,
        };
      });
    }
  }, [
    mergedEmployees,
    selectedWaterfallEmpIds,
    candidateLeads,
    waterfallStrategy,
    waterfallChunkSize,
    waterfallTargetCap,
  ]);

  const totalWaterfallAllocated = useMemo(() => {
    return waterfallPlan.reduce((acc, curr) => acc + (curr.allocatedCount || 0), 0);
  }, [waterfallPlan]);

  const equalSharePerEmp = useMemo(() => {
    const total = candidateLeads.length;
    const count = Math.max(1, selectedWaterfallEmpIds.length);
    return Math.floor(total / count);
  }, [candidateLeads.length, selectedWaterfallEmpIds.length]);

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return mergedEmployees;
    const q = empSearch.toLowerCase();
    return mergedEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q)) ||
        e.role.toLowerCase().includes(q)
    );
  }, [mergedEmployees, empSearch]);

  const targetEmployee = useMemo(() => {
    return mergedEmployees.find((e) => e.id === selectedEmpId) || mergedEmployees[0];
  }, [mergedEmployees, selectedEmpId]);

  // Execute Single Employee Assignment
  const handleAssign = async () => {
    if (!selectedEmpId) {
      toast.error('Please select an employee first');
      return;
    }
    if (candidateLeads.length === 0) {
      toast.error('No candidate leads available to assign');
      return;
    }
    if (previewLeads.length === 0) {
      toast.error('No leads selected in this serial range/quantity');
      return;
    }

    setIsSubmitting(true);
    setLastAssignedResult(null);

    try {
      const res = await assignLeadsBySerialOrQuantity({
        employeeId: selectedEmpId,
        quantity: assignMode === 'quantity' ? quantity : undefined,
        startSerial,
        endSerial: assignMode === 'range' ? endSerial : undefined,
        filterCriteria,
      });

      setLastAssignedResult(res);
      toast.success(
        `Successfully assigned ${res.assignedCount} lead(s) (Serial #${res.startSerial} to #${res.endSerial}) to ${res.targetEmployee}!`
      );

      loadWorkloads();
      onRefresh();
    } catch (err: any) {
      console.error('Serial assign error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to assign leads');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Auto Waterfall & Workload Assignment
  const handleAutoWaterfallAssign = async () => {
    if (selectedWaterfallEmpIds.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    if (candidateLeads.length === 0) {
      toast.error('No unassigned leads available to distribute');
      return;
    }
    if (totalWaterfallAllocated === 0) {
      toast.error('Zero leads calculated for this distribution criteria');
      return;
    }

    setIsWaterfallSubmitting(true);
    setWaterfallResult(null);

    try {
      const res = await autoWaterfallAssignLeads({
        employeeIds: selectedWaterfallEmpIds,
        chunkSize: waterfallChunkSize,
        filterCriteria,
        mode: waterfallStrategy,
        targetCap: waterfallTargetCap,
      });

      setWaterfallResult(res);
      toast.success(
        `⚡ Auto Assignment Complete! ${res.totalAssigned} unique leads successfully distributed across ${res.breakdown?.length || 0} employees!`
      );
      loadWorkloads();
      onRefresh();
    } catch (err: any) {
      console.error('Auto waterfall error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to auto distribute leads');
    } finally {
      setIsWaterfallSubmitting(false);
    }
  };

  const toggleSelectAllWaterfall = () => {
    if (selectedWaterfallEmpIds.length === mergedEmployees.length) {
      setSelectedWaterfallEmpIds([]);
    } else {
      setSelectedWaterfallEmpIds(mergedEmployees.map((e) => e.id));
    }
  };

  const toggleEmpWaterfall = (empId: string) => {
    setSelectedWaterfallEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SECTION 1: Employee Workload Tracker ("Kis ke paas kitni lead hain") */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LIVE TEAM WORKLOAD TRACKER
              </span>
              <span className="text-xs text-gray-400">• Real-time employee active workload tracker</span>
            </div>
            <h3 className="text-lg lg:text-xl font-extrabold tracking-tight mt-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Employee Lead Inventory & Capacity Check
            </h3>
            <p className="text-gray-300 text-xs mt-0.5">
              Check each team member's active leads and capacity before assigning new leads.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setPanelMode('auto_waterfall');
                const el = document.getElementById('assigner-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white text-white" />
              ⚡ Auto Equal Share / Waterfall Distribute
            </button>
            <button
              onClick={loadWorkloads}
              disabled={loadingWorkloads}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
              title="Refresh counts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingWorkloads ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white text-gray-900 text-xs font-bold hover:bg-gray-100 transition-colors shadow-xs"
              >
                Close View
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee by name, role, phone..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 bg-white font-medium"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 0 Leads (Free / Khali)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 1 - 25 Leads (Active)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 26+ Leads (Busy)
            </span>
          </div>
        </div>

        {/* Employee Cards Grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
          {filteredEmployees.map((emp) => {
            const isSelected = selectedEmpId === emp.id;
            const count = emp.activeLeads || 0;
            const total = emp.totalLeads || 0;

            let statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let statusText = 'Available (Khali)';
            if (count > 25) {
              statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
              statusText = 'High Workload';
            } else if (count > 0) {
              statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
              statusText = 'Active Working';
            }

            return (
              <div
                key={emp.id}
                onClick={() => {
                  setSelectedEmpId(emp.id);
                  setPanelMode('single');
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected && panelMode === 'single'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-600/20'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                      {emp.name?.[0] || 'E'}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}
                    >
                      {statusText}
                    </span>
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm mt-3 group-hover:text-indigo-600 transition-colors">
                    {emp.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {emp.role} {emp.phone && `• ${emp.phone}`}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Active Leads
                    </span>
                    <span className="text-2xl font-black text-gray-900">{count}</span>
                    <span className="text-[10px] text-gray-400 ml-1">/ {total} Total</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmpId(emp.id);
                      setPanelMode('single');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                      isSelected && panelMode === 'single'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-indigo-600 hover:text-white'
                    }`}
                  >
                    Select <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Master Assigner (Single Employee vs Multi-Employee Auto Waterfall) */}
      <div id="assigner-section" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs between Single and Multi Waterfall Mode */}
        <div className="p-4 bg-slate-950 border-b border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white text-xs font-bold uppercase tracking-wider">Choose Assignment Engine</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-gray-800">
            <button
              type="button"
              onClick={() => setPanelMode('single')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                panelMode === 'single'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              1. Single Employee (10-100 Leads)
            </button>

            <button
              type="button"
              onClick={() => setPanelMode('auto_waterfall')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                panelMode === 'auto_waterfall'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5 fill-current" />
              2. ⚖️ Auto Equal Share & Waterfall Assigner
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-VIEW 1: AUTO MULTI-EMPLOYEE WATERFALL & WORKLOAD MODE */}
        {/* ========================================================================= */}
        {panelMode === 'auto_waterfall' ? (
          <div className="space-y-6">
            {/* Header description banner */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    SMART EQUAL DISTRIBUTION & WATERFALL
                  </span>
                  <span className="text-xs text-indigo-300 font-semibold">• Zero 0-Lead Guarantee</span>
                </div>
                <h3 className="text-xl font-black tracking-tight mt-1 flex items-center gap-2">
                  <Scale className="w-6 h-6 text-emerald-400" /> Equal Share & Waterfall Multi-Employee Assigner
                </h3>
                <p className="text-gray-300 text-xs mt-1 max-w-2xl">
                  Distribute leads equally across selected team members to prevent zero-lead allocation, or execute structured sequential waterfall batches.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Workflow Toggle */}
                <button
                  type="button"
                  disabled={isTogglingWorkflow}
                  onClick={handleToggleWorkflow}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                    workflowEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                  }`}
                  title="Enable or disable automatic equal distribution for new incoming leads (Meta / Website / Import)"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Auto-Workflow: {workflowEnabled ? 'ON' : 'OFF'}
                </button>

                {/* Reset / Unassign All Leads Button */}
                <button
                  type="button"
                  disabled={isUnassigning}
                  onClick={handleUnassignAll}
                  className="px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-rose-500/40"
                  title="Unassign all leads from employees to reset the pool for fresh equal distribution"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isUnassigning ? 'animate-spin' : ''}`} />
                  {isUnassigning ? 'Unassigning...' : 'Unassign All Leads (Reset)'}
                </button>

                {/* Pool Status Box */}
                <div className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-right min-w-[130px]">
                  <span className="text-amber-300 text-[10px] block font-bold uppercase">Candidate Pool</span>
                  <span className="font-black text-white text-base">{candidateLeads.length} Leads</span>
                  <span className="text-[10px] text-gray-400 block">Unassigned Pool</span>
                </div>
              </div>
            </div>

            {/* Success Banner if just completed */}
            {waterfallResult && (
              <div className="mx-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-extrabold text-sm text-emerald-800">
                    ⚡ Auto Waterfall Assignment Successfully Completed!
                  </div>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Successfully assigned <strong>{waterfallResult.totalAssigned} unique leads</strong> across{' '}
                    <strong>{waterfallResult.breakdown?.length || 0} employees</strong> with verified zero cross-employee duplication.
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {waterfallResult.breakdown?.map((b: any) => (
                      <div
                        key={b.employeeId}
                        className="p-2 rounded-lg bg-white border border-emerald-200 text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{b.employeeName}</div>
                          <div className="text-[11px] text-gray-500">
                            {b.startSerial ? `Serial #${b.startSerial} - #${b.endSerial}` : `Assigned: ${b.assignedCount}`}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-800 text-[11px]">
                          +{b.assignedCount} Leads
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Configuration Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Waterfall Distribution Strategy */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    1. Auto Distribution Strategy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Strategy A: Equal Share (Recommended) */}
                    <button
                      type="button"
                      onClick={() => setWaterfallStrategy('equal_share')}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        waterfallStrategy === 'equal_share'
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider shadow-xs">
                        Recommended
                      </span>
                      <div className="font-black text-xs text-gray-900 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        Equal Share
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Equal leads to all selected members. No 0-lead exhaustion.
                      </p>
                    </button>

                    {/* Strategy B: Sequential Waterfall */}
                    <button
                      type="button"
                      onClick={() => setWaterfallStrategy('waterfall')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        waterfallStrategy === 'waterfall'
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="font-black text-xs text-gray-900 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Sequential Batches
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        100 to Emp 1, then next 100 to Emp 2...
                      </p>
                    </button>

                    {/* Strategy C: Workload Equalizer */}
                    <button
                      type="button"
                      onClick={() => setWaterfallStrategy('workload_balanced')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        waterfallStrategy === 'workload_balanced'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="font-black text-xs text-gray-900 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        Workload Equalizer
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Prioritize members with fewer leads to balance workload.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Quota per Employee */}
                {waterfallStrategy === 'equal_share' ? (
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Fair Equal Share Formula
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                        ~{equalSharePerEmp} Leads per Employee
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      The pool of <strong>{candidateLeads.length} leads</strong> is divided equally across <strong>{selectedWaterfallEmpIds.length} selected employees</strong> (~<strong>{equalSharePerEmp} leads each</strong>).
                    </p>
                    <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 pt-1.5 border-t border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Zero Exclusion: Every selected employee receives an equal share with zero duplication!</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-900">
                        {waterfallStrategy === 'waterfall' ? 'Batch Size per Employee:' : 'Max Active Workload Target:'}
                      </label>
                      <span className="text-lg font-black text-amber-600">
                        {waterfallStrategy === 'waterfall' ? `${waterfallChunkSize} Leads` : `${waterfallTargetCap} Leads`}
                      </span>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setWaterfallChunkSize(equalSharePerEmp || 10);
                          setWaterfallTargetCap(equalSharePerEmp || 10);
                        }}
                        className={`py-2 px-1 rounded-xl text-[11px] font-extrabold border transition-all text-center ${
                          waterfallChunkSize === equalSharePerEmp
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        }`}
                        title="Calculate exact equal share so no employee gets 0"
                      >
                        ⚖️ Equal ({equalSharePerEmp})
                      </button>
                      {[10, 25, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setWaterfallChunkSize(num);
                            setWaterfallTargetCap(num);
                          }}
                          className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                            (waterfallStrategy === 'waterfall' ? waterfallChunkSize === num : waterfallTargetCap === num)
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                        >
                          {num} Leads
                        </button>
                      ))}
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={waterfallStrategy === 'waterfall' ? waterfallChunkSize : waterfallTargetCap}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setWaterfallChunkSize(val);
                        setWaterfallTargetCap(val);
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                      <span>10 Leads</span>
                      <span>100 Leads (Recommended)</span>
                      <span>200 Leads</span>
                    </div>
                  </div>
                )}

                {/* 3. Candidate Filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Lead Source Pool
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterCriteria('unassigned')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        filterCriteria === 'unassigned'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs ring-1 ring-amber-500'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Unassigned ({leads.filter(isUnassignedLead).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCriteria('new')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        filterCriteria === 'new'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs ring-1 ring-amber-500'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      New ({leads.filter((l) => l.status === 'new').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCriteria('all')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        filterCriteria === 'all'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs ring-1 ring-amber-500'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Available ({leads.length})
                    </button>
                  </div>
                </div>

                {/* 4. Select Eligible Employees */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Target Employees ({selectedWaterfallEmpIds.length} / {mergedEmployees.length})
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAllWaterfall}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      {selectedWaterfallEmpIds.length === mergedEmployees.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white p-1">
                    {mergedEmployees.map((emp) => {
                      const isChecked = selectedWaterfallEmpIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmpWaterfall(emp.id)}
                          className={`p-2 flex items-center justify-between rounded-lg cursor-pointer transition-colors text-xs ${
                            isChecked ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent onClick
                              className="accent-amber-500 w-3.5 h-3.5 rounded"
                            />
                            <div>
                              <span className="font-bold text-gray-900">{emp.name}</span>
                              <span className="text-[11px] text-gray-500 ml-1.5">({emp.role})</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {emp.activeLeads} active leads
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="button"
                  disabled={isWaterfallSubmitting || totalWaterfallAllocated === 0}
                  onClick={handleAutoWaterfallAssign}
                  className={`w-full py-4 px-4 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isWaterfallSubmitting || totalWaterfallAllocated === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : waterfallStrategy === 'equal_share'
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-200 hover:scale-[1.01]'
                      : 'bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-200 hover:scale-[1.01]'
                  }`}
                >
                  {isWaterfallSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Executing {waterfallStrategy === 'equal_share' ? 'Equal Share' : 'Waterfall'} Assignment...
                    </>
                  ) : waterfallStrategy === 'equal_share' ? (
                    <>
                      <Scale className="w-4 h-4 fill-white text-white" />
                      ⚖️ Run Equal Share Distribution ({totalWaterfallAllocated} Leads to {selectedWaterfallEmpIds.length} Employees)
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white text-white" />
                      ⚡ Run Auto Waterfall Assignment ({totalWaterfallAllocated} Leads Now)
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT COLUMN: Live Waterfall Plan Table (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-xs">Live Waterfall Execution Plan</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      🛡️ Zero Duplication Guaranteed
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-300">
                    Live breakdown of serial leads allocated to each employee and resulting workload:
                  </p>

                  <div className="border border-gray-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto bg-slate-950 divide-y divide-gray-800/80">
                    {waterfallPlan.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 text-xs">
                        Select at least one employee and ensure unassigned leads exist in the pool.
                      </div>
                    ) : (
                      waterfallPlan.map((item: any, idx: number) => {
                        const willReceive = item.allocatedCount || 0;
                        const postCount = item.activeLeads + willReceive;

                        return (
                          <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-gray-800 text-amber-400 font-black flex items-center justify-center text-[11px]">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                  {item.name}
                                  <span className="text-[10px] text-gray-400 font-normal">({item.role})</span>
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {waterfallStrategy === 'equal_share' ? (
                                    item.startSerial ? (
                                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                        <Scale className="w-3 h-3 text-emerald-400" />
                                        Serial #{item.startSerial} to #{item.endSerial} (Equal Share)
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">0 Leads</span>
                                    )
                                  ) : waterfallStrategy === 'waterfall' ? (
                                    item.startSerial ? (
                                      <span className="text-amber-300 font-semibold">
                                        Serial #{item.startSerial} to #{item.endSerial}
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 font-semibold">Pool Exhausted (0 Leads)</span>
                                    )
                                  ) : (
                                    <span className="text-indigo-300 font-semibold">
                                      Dynamic Balanced Fill (+{willReceive})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={`text-xs font-black ${waterfallStrategy === 'equal_share' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                +{willReceive} Leads
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {item.activeLeads} ➔ <strong className="text-white">{postCount} active</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary Bar */}
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 text-[11px] block">Total to be Assigned:</span>
                      <span className={`${waterfallStrategy === 'equal_share' ? 'text-emerald-400' : 'text-amber-400'} font-black text-base`}>
                        {totalWaterfallAllocated} Leads
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-[11px] block">Remaining in Pool:</span>
                      <span className="text-gray-200 font-bold">
                        {Math.max(0, candidateLeads.length - totalWaterfallAllocated)} Leads
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <strong className="block font-bold">Safe Sequential Batching:</strong>
                    Slices are non-overlapping and unique. Each lead ID is verified at the database level to ensure strict zero cross-employee duplication.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* SUB-VIEW 2: SINGLE EMPLOYEE SERIAL & NUMBER ASSIGNER */
          /* ========================================================================= */
          <div>
            <div className="p-5 border-b border-gray-200 bg-indigo-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-indigo-950 font-black">
                    SERIAL & NUMBER ASSIGNER
                  </span>
                  <span className="text-xs text-indigo-200">• Assign leads by quantity (10-100) or serial range</span>
                </div>
                <h3 className="text-lg lg:text-xl font-black tracking-tight mt-1 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-amber-400" /> Quantity & Serial Range Lead Assigner
                </h3>
                <p className="text-indigo-200 text-xs mt-0.5">
                  Assign 10, 25, 50, 100 leads or custom serial ranges (#1 to #50) directly to an employee in 1 click.
                </p>
              </div>

              {targetEmployee && (
                <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-right">
                  <span className="text-indigo-200 text-[10px] block font-semibold uppercase">Target Employee</span>
                  <span className="font-extrabold text-white text-sm">{targetEmployee.name}</span>
                  <span className="text-[11px] text-amber-300 block font-semibold">
                    Current: {targetEmployee.activeLeads} active leads
                  </span>
                </div>
              )}
            </div>

            {/* Success banner if just assigned */}
            {lastAssignedResult && (
              <div className="m-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm text-emerald-800">
                    Assignment Successful! {lastAssignedResult.assignedCount} leads assigned to {lastAssignedResult.targetEmployee}.
                  </div>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Serial range: <strong>#{lastAssignedResult.startSerial}</strong> to <strong>#{lastAssignedResult.endSerial}</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Controls (6 cols) */}
              <div className="lg:col-span-6 space-y-5">
                {/* 1. Target Employee */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    1. Target Employee
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                  >
                    {mergedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role}) — {emp.activeLeads} Active Leads
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Candidate Pool Filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    2. Leads Pool (Filter)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterCriteria('unassigned')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        filterCriteria === 'unassigned'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-600'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Unassigned ({leads.filter(isUnassignedLead).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCriteria('new')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        filterCriteria === 'new'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-600'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      New ({leads.filter((l) => l.status === 'new').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCriteria('all')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        filterCriteria === 'all'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-600'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All ({leads.length})
                    </button>
                  </div>
                </div>

                {/* 3. Assignment Mode Tabs */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    3. Assignment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAssignMode('quantity')}
                      className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all ${
                        assignMode === 'quantity'
                          ? 'bg-white text-indigo-900 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      By Quantity (10 se 100 Leads)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignMode('range')}
                      className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all ${
                        assignMode === 'range'
                          ? 'bg-white text-indigo-900 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      By Serial Range (#From - #To)
                    </button>
                  </div>
                </div>

                {/* Mode 1: Quantity Controls */}
                {assignMode === 'quantity' ? (
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">Choose Quantity:</span>
                      <span className="text-xl font-black text-indigo-600">{quantity} Leads</span>
                    </div>

                    {/* Quick Presets: 10, 25, 50, 100 */}
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuantity(num)}
                          className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                            quantity === num
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                          }`}
                        >
                          {num} Leads
                        </button>
                      ))}
                    </div>

                    {/* Slider */}
                    <div>
                      <input
                        type="range"
                        min="1"
                        max={Math.min(100, Math.max(10, candidateLeads.length))}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1">
                        <span>1 Lead</span>
                        <span>50 Leads</span>
                        <span>100 Leads</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-semibold">Start from Serial #:</span>
                      <input
                        type="number"
                        min="1"
                        value={startSerial}
                        onChange={(e) => setStartSerial(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-center font-bold bg-white"
                      />
                      <span className="text-[11px] text-gray-400">(Default: #1)</span>
                    </div>
                  </div>
                ) : (
                  /* Mode 2: Range Controls */
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-4">
                    <span className="text-xs font-bold text-indigo-900 block">Enter Serial Range:</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                          From Serial No.
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={startSerial}
                          onChange={(e) => setStartSerial(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                          To Serial No.
                        </label>
                        <input
                          type="number"
                          min={startSerial}
                          value={endSerial}
                          onChange={(e) => setEndSerial(Math.max(startSerial, Number(e.target.value)))}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-indigo-900 font-bold bg-white p-2.5 rounded-lg border border-indigo-100">
                      Total leads in this range: <strong>{Math.max(0, endSerial - startSerial + 1)} leads</strong>
                    </div>
                  </div>
                )}

                {/* Action Submit Button */}
                <button
                  type="button"
                  disabled={isSubmitting || previewLeads.length === 0 || !selectedEmpId}
                  onClick={handleAssign}
                  className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSubmitting || previewLeads.length === 0 || !selectedEmpId
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white shadow-indigo-200'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Assigning Leads...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Confirm & Assign {previewLeads.length} Lead(s) to {targetEmployee?.name || 'Employee'}
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT COLUMN: Live Serialized Leads Preview (6 cols) */}
              <div className="lg:col-span-6 flex flex-col space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Live Serial Preview ({previewLeads.length} Leads)
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    Pool: {candidateLeads.length} Total Leads
                  </span>
                </div>

                {previewLeads.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    No leads matched this criteria or range.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-gray-100 bg-white">
                    {previewLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-2.5 flex items-center justify-between hover:bg-indigo-50/30 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px] flex-shrink-0">
                            #{lead.serialNumber}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900">{lead.full_name}</div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.2">
                              <span>{lead.phone}</span>
                              {lead.city && <span>• {lead.city}</span>}
                              <span className="capitalize px-1 rounded bg-gray-100 text-gray-600 text-[10px]">
                                {lead.source}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Unassigned
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Workload Impact Card */}
                {targetEmployee && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-gray-500 text-[11px] block">Post-Assignment Workload:</span>
                      <span className="font-bold text-gray-900">
                        {targetEmployee.name}: {targetEmployee.activeLeads} ➔{' '}
                        <strong className="text-indigo-600">
                          {targetEmployee.activeLeads + previewLeads.length} leads
                        </strong>
                      </span>
                    </div>
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SerialLeadAssignerPanel;
