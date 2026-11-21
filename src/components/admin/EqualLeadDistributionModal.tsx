import React, { useState, useEffect } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from '@/components/ui/sonner';
import {
  Scale,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  X,
  RefreshCw,
  Sliders,
  Check,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

interface EqualLeadDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unassignedCount?: number;
}

interface EmployeeItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  activeCount: number;
}

export const EqualLeadDistributionModal: React.FC<EqualLeadDistributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  unassignedCount = 0,
}) => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [liveUnassigned, setLiveUnassigned] = useState<number>(unassignedCount);
  const [batchMode, setBatchMode] = useState<'all' | 'custom'>('all');
  const [customQuantity, setCustomQuantity] = useState<number>(500);

  // Auto-Workflow Setting
  const [workflowEnabled, setWorkflowEnabled] = useState<boolean>(true);
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Result summary
  const [resultData, setResultData] = useState<any | null>(null);

  const fetchEmployeesAndCounts = async () => {
    setLoading(true);
    try {
      const [empRes, countRes, wfRes] = await Promise.all([
        crmApi.get('/leads/staff-list'),
        crmApi.get('/leads/unassigned'),
        crmApi.get('/leads/assign/workflow-status').catch(() => ({ data: { isEnabled: true } })),
      ]);

      const staffList = Array.isArray(empRes.data)
        ? empRes.data
        : empRes.data?.data || [];

      // Filter out Super Admin from default selection to only distribute among sales staff
      const salesStaff = staffList.map((u: any) => ({
        id: u.id,
        firstName: u.firstName || u.name || '',
        lastName: u.lastName || '',
        email: u.email || '',
        roleName: u.role?.name || u.role || 'Sales Executive',
        activeCount: u.activeLeadsCount || 0,
      }));

      setEmployees(salesStaff);
      setSelectedEmpIds(
        salesStaff
          .filter((e: any) => e.roleName !== 'Super Admin')
          .map((e: any) => e.id)
      );

      if (Array.isArray(countRes.data)) {
        setLiveUnassigned(countRes.data.length);
      }
      if (wfRes.data?.isEnabled !== undefined) {
        setWorkflowEnabled(wfRes.data.isEnabled);
      }
    } catch (err) {
      console.warn('Failed to load distribution data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResultData(null);
      fetchEmployeesAndCounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCount = selectedEmpIds.length;
  const targetLeadCount =
    batchMode === 'all' ? liveUnassigned : Math.min(customQuantity, liveUnassigned);
  const quotaPerEmployee =
    selectedCount > 0 ? Math.floor(targetLeadCount / selectedCount) : 0;
  const remainder = selectedCount > 0 ? targetLeadCount % selectedCount : 0;

  const handleToggleSelectAll = () => {
    const nonSuperAdmin = employees
      .filter((e) => e.roleName !== 'Super Admin')
      .map((e) => e.id);
    if (selectedEmpIds.length === nonSuperAdmin.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(nonSuperAdmin);
    }
  };

  const handleToggleEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 1. Unassign All Leads
  const handleUnassignAll = async () => {
    if (
      !window.confirm(
        'Are you sure you want to unassign all leads? All leads will be returned to the unassigned pool so you can redistribute them equally.'
      )
    ) {
      return;
    }

    setIsUnassigning(true);
    try {
      const res = await crmApi.post('/leads/assign/unassign-all');
      if (res.data?.success) {
        toast.success(res.data.message || 'All leads unassigned successfully!');
        fetchEmployeesAndCounts();
        onSuccess();
      } else {
        toast.error(res.data?.message || 'Failed to unassign leads.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unassign request error');
    } finally {
      setIsUnassigning(false);
    }
  };

  // 2. Execute Fair Equal Distribution
  const handleEqualDistribute = async () => {
    if (selectedEmpIds.length === 0) {
      toast.error('Please select at least one employee.');
      return;
    }

    if (liveUnassigned === 0) {
      toast.error('No unassigned leads available for distribution!');
      return;
    }

    setIsDistributing(true);
    try {
      const payload: any = {
        employeeIds: selectedEmpIds,
      };
      if (batchMode === 'custom' && customQuantity > 0) {
        payload.maxTotalLeads = Number(customQuantity);
      }

      const res = await crmApi.post('/leads/assign/equal-distribute', payload);
      if (res.data?.success) {
        setResultData(res.data);
        toast.success(res.data.message || 'Leads distributed equally across all selected employees!');
        fetchEmployeesAndCounts();
        onSuccess();
      } else {
        toast.error(res.data?.message || 'Equal distribution failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Distribution error occurred');
    } finally {
      setIsDistributing(false);
    }
  };

  // 3. Toggle Auto-Assign Workflow
  const handleToggleWorkflow = async (enabled: boolean) => {
    setSavingWorkflow(true);
    try {
      const res = await crmApi.post('/leads/assign/workflow-status', { enabled });
      if (res.data?.success) {
        setWorkflowEnabled(res.data.isEnabled);
        toast.success(
          res.data.isEnabled
            ? 'Automatic Equal Assignment Workflow is now ACTIVE! New incoming leads will be auto-assigned.'
            : 'Automatic Assignment Workflow has been PAUSED.'
        );
      }
    } catch (err) {
      toast.error('Failed to update workflow status.');
    } finally {
      setSavingWorkflow(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-zinc-900 via-slate-900 to-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <span>Equal Lead Distribution & Auto-Workflow</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-zinc-950">
                  Fair Share
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Configure fair equal lead allocation and automated assignment workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Unassigned Leads */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Available Unassigned Leads
              </span>
              <div className="text-2xl font-black text-blue-900 mt-1 font-mono">
                {liveUnassigned.toLocaleString()}
              </div>
              <span className="text-[10px] text-blue-600 block mt-0.5">Leads ready to distribute</span>
            </div>

            {/* Selected Staff */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                Selected Employees
              </span>
              <div className="text-2xl font-black text-amber-900 mt-1 font-mono">
                {selectedCount} <span className="text-xs font-normal text-amber-700">/ {employees.length}</span>
              </div>
              <span className="text-[10px] text-amber-600 block mt-0.5">Participating in quota</span>
            </div>

            {/* Exact Share per Employee */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Equal Quota per Employee
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {selectedCount > 0 ? (
                  <>
                    ~{quotaPerEmployee}
                    {remainder > 0 ? (
                      <span className="text-xs font-bold text-emerald-700"> (+1 for {remainder} staff)</span>
                    ) : null}
                  </>
                ) : (
                  '0'
                )}
              </div>
              <span className="text-[10px] text-emerald-600 block mt-0.5">100% Equal Fair Distribution</span>
            </div>
          </div>

          {/* Workflow Toggle Banner */}
          <div className="p-4 rounded-2xl bg-zinc-900 text-white flex items-center justify-between border border-zinc-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                workflowEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>Automatic Equal Assignment Workflow</span>
                  <span className={`px-2 py-0.2 rounded-md text-[10px] font-black uppercase ${
                    workflowEnabled ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {workflowEnabled ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  When new leads arrive (via Meta, Website, or CSV Import), the system automatically routes them to the sales employee with lowest active workload.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggleWorkflow(!workflowEnabled)}
              disabled={savingWorkflow}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                workflowEnabled
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {savingWorkflow ? 'Updating...' : workflowEnabled ? 'Turn OFF' : 'Turn ON'}
            </button>
          </div>

          {/* Result Banner if already distributed */}
          {resultData && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{resultData.message}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200">
                {resultData.breakdown?.slice(0, 8).map((b: any) => (
                  <div key={b.employeeId} className="bg-white/80 p-2 rounded-lg border border-emerald-200 text-[11px]">
                    <span className="font-bold block truncate">{b.name}</span>
                    <span className="text-emerald-700 font-mono font-black">+{b.assignedCount} leads</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribution Mode */}
          <div className="space-y-2">
            <label className="block font-bold text-gray-700">Distribution Quantity:</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl border border-gray-200 font-semibold flex-1">
                <input
                  type="radio"
                  name="batchMode"
                  checked={batchMode === 'all'}
                  onChange={() => setBatchMode('all')}
                  className="accent-amber-600"
                />
                <span>Distribute All Unassigned Leads ({liveUnassigned.toLocaleString()} Leads)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl border border-gray-200 font-semibold flex-1">
                <input
                  type="radio"
                  name="batchMode"
                  checked={batchMode === 'custom'}
                  onChange={() => setBatchMode('custom')}
                  className="accent-amber-600"
                />
                <span>Custom Batch Size:</span>
                <input
                  type="number"
                  min={1}
                  max={liveUnassigned}
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(Number(e.target.value))}
                  disabled={batchMode !== 'custom'}
                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold font-mono focus:border-amber-500 outline-none"
                />
              </label>
            </div>
          </div>

          {/* Participating Employees List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-gray-700 flex items-center gap-2">
                <span>Participating Employees ({selectedCount} Selected)</span>
                <span className="text-[10px] text-gray-400 font-normal">(Super Admin by default excluded)</span>
              </label>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-blue-600 hover:underline font-bold text-[11px]"
              >
                {selectedCount === employees.filter((e) => e.roleName !== 'Super Admin').length
                  ? 'Deselect All'
                  : 'Select All Sales Staff'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 border border-gray-200 rounded-2xl bg-gray-50/50">
              {employees.map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleToggleEmp(emp.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-amber-600 shrink-0"
                      />
                      <div className="truncate">
                        <div className="truncate text-xs">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal truncate">
                          {emp.roleName}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded-md text-gray-600 shrink-0">
                      Has: {emp.activeCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Unassign All Button */}
          <button
            type="button"
            onClick={handleUnassignAll}
            disabled={isUnassigning || isDistributing}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            title="Unassign all leads from employees and return them to the unallocated pool"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isUnassigning ? 'animate-spin' : ''}`} />
            <span>{isUnassigning ? 'Unassigning...' : 'Undo / Unassign All Leads'}</span>
          </button>

          {/* Distribute Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEqualDistribute}
              disabled={isDistributing || liveUnassigned === 0 || selectedCount === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Scale className={`w-4 h-4 ${isDistributing ? 'animate-spin' : ''}`} />
              <span>
                {isDistributing
                  ? 'Distributing Leads Equally...'
                  : `Distribute ${targetLeadCount.toLocaleString()} Leads Equally Now (~${quotaPerEmployee}/emp)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EqualLeadDistributionModal;

