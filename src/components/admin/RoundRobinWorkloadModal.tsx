import React, { useState, useEffect } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from '@/components/ui/sonner';
import {
  Shuffle,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Scale,
  Inbox,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface RoundRobinWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unassignedCount?: number;
}

export const RoundRobinWorkloadModal: React.FC<RoundRobinWorkloadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  unassignedCount = 0,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [batchMode, setBatchMode] = useState<'all' | 'custom'>('all');
  const [customQuantity, setCustomQuantity] = useState<number>(100);
  const [liveUnassigned, setLiveUnassigned] = useState<number>(unassignedCount);
  const [distributionResult, setDistributionResult] = useState<any | null>(null);

  // Load active employees & fresh unassigned count on open
  useEffect(() => {
    if (isOpen) {
      setDistributionResult(null);
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoadingEmployees(true);
    try {
      // 1. Fetch unassigned leads
      const unassignedRes = await crmApi.get('/leads/unassigned');
      if (Array.isArray(unassignedRes.data)) {
        setLiveUnassigned(unassignedRes.data.length);
      }

      // 2. Fetch employee workloads
      const workloadRes = await crmApi.get('/leads/workload');
      if (Array.isArray(workloadRes.data)) {
        setEmployees(workloadRes.data);
      }
    } catch (err: any) {
      console.warn('Failed to load initial assignment data:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  if (!isOpen) return null;

  const totalEmps = employees.length > 0 ? employees.length : 21;
  const targetLeadsCount = batchMode === 'all' ? liveUnassigned : Math.min(customQuantity, liveUnassigned);
  const avgPerEmp = totalEmps > 0 ? Math.floor(targetLeadsCount / totalEmps) : 0;

  const handleDistribute = async () => {
    if (liveUnassigned === 0) {
      toast.error('No unassigned leads available for distribution!');
      return;
    }

    setIsDistributing(true);
    try {
      const payload: any = {
        filterCriteria: 'unassigned',
      };
      if (batchMode === 'custom' && customQuantity > 0) {
        payload.maxTotalLeads = Number(customQuantity);
      }

      const res = await crmApi.post('/leads/assign/round-robin-workload', payload);

      if (res.data?.success) {
        setDistributionResult(res.data);
        toast.success(res.data.message || `Successfully distributed ${res.data.totalAssigned} leads!`);
        onSuccess();
      } else {
        toast.error(res.data?.message || 'Lead distribution fail ho gaya.');
      }
    } catch (err: any) {
      console.error('Lead distribution error:', err);
      toast.error(err.response?.data?.message || err.message || 'Server error occurred during lead distribution');
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Shuffle className="w-6 h-6 text-cyan-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                Round Robin & Workload Auto-Distribution
                <span className="text-[10px] bg-cyan-400/20 text-cyan-200 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  AI Balanced
                </span>
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Distribute leads fairly and equally across all active sales employees.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {distributionResult ? (
            /* Result Success View */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">
                    {distributionResult.message}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Successfully distributed a total of <b>{distributionResult.totalAssigned}</b> leads across <b>{distributionResult.employeesCount}</b> employees.
                  </p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Employee Name</th>
                      <th className="px-3 py-2">Mobile / Email</th>
                      <th className="px-3 py-2 text-center">Nayi Allotted Leads</th>
                      <th className="px-3 py-2 text-center">Total Active Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {distributionResult.breakdown?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {item.employeeName}
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">
                          {item.phone || item.email}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                            +{item.assignedCount}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-gray-800">
                          {item.totalActiveLeads}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                >
                  Done & Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Setup & Confirmation View */
            <>
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                    <Inbox className="w-4 h-4" /> Unassigned Leads
                  </div>
                  <div className="text-xl font-black text-blue-900">
                    {liveUnassigned.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-blue-600 mt-0.5">Available in database</p>
                </div>

                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl">
                  <div className="flex items-center gap-1.5 text-purple-700 text-xs font-semibold mb-1">
                    <Users className="w-4 h-4" /> Active Employees
                  </div>
                  <div className="text-xl font-black text-purple-900">
                    {totalEmps} Staff
                  </div>
                  <p className="text-[10px] text-purple-600 mt-0.5">Ready for assignment</p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                    <Scale className="w-4 h-4" /> Estimated Share
                  </div>
                  <div className="text-xl font-black text-emerald-900">
                    ~{avgPerEmp} Leads
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Per employee</p>
                </div>
              </div>

              {/* How it works info banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  How the Assignment Engine Works:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11.5px]">
                  <li>
                    <b>Workload Balance:</b> Team members with fewer leads are prioritized first to normalize workloads.
                  </li>
                  <li>
                    <b>Round Robin:</b> Once workloads are balanced, leads rotate circular one-by-one across all {totalEmps} members.
                  </li>
                  <li>
                    <b>Zero Duplication:</b> Strict database-level isolation guarantees zero lead duplication.
                  </li>
                </ul>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Allocation Quantity:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBatchMode('all')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchMode === 'all'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                      <span>All Unassigned Leads ({liveUnassigned})</span>
                      {batchMode === 'all' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Distribute entire pool across all {totalEmps} employees.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchMode('custom')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchMode === 'custom'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                      <span>Specific Batch Size</span>
                      {batchMode === 'custom' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Select a custom batch quantity (e.g. 50, 100, 200).
                    </p>
                  </button>
                </div>

                {batchMode === 'custom' && (
                  <div className="pt-2 flex items-center gap-3">
                    <label className="text-xs text-gray-600 font-medium">Quantity:</label>
                    <input
                      type="number"
                      min={totalEmps}
                      max={liveUnassigned}
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-gray-500">
                      (~{(customQuantity / totalEmps).toFixed(1)} leads / employee)
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loadingEmployees}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEmployees ? 'animate-spin' : ''}`} />
                  Refresh Counts
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isDistributing}
                    className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDistribute}
                    disabled={isDistributing || liveUnassigned === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isDistributing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Distributing Leads Now...</span>
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-4 h-4 text-cyan-200" />
                        <span>Auto-Assign {targetLeadsCount} Leads Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default RoundRobinWorkloadModal;

