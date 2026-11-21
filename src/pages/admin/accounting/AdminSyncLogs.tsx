import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Database,
  RotateCcw,
} from 'lucide-react';

export const AdminSyncLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/accounting/sync-logs', {
        params: { status: statusFilter },
      });
      setLogs(res.data);
    } catch (err) {
      toast.error('Failed to load sync logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleRetry = async (id: string) => {
    try {
      const res = await crmApi.post(`/accounting/sync-logs/${id}/retry`);
      toast.success(res.data.message || 'Retry initiated successfully!');
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Retry failed');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" /> BUSY ERP Sync Logs
          </h2>
          <p className="text-sm text-gray-500 mt-1">Audit log of all voucher pushes, master syncs, and 1-Click Retry for failed pushes.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-blue-600 outline-none"
          >
            <option value="">All Sync Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="PENDING">PENDING</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Logs Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">Loading Sync Audit Logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No Sync Logs Found</h3>
          <p className="text-xs text-gray-500 mt-1">Logs will automatically record every time a voucher or master is pushed to BUSY.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Entity Type</th>
                  <th className="p-3.5">Reference #</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Response / Error Message</th>
                  <th className="p-3.5 text-right">Retry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/60">
                    <td className="p-3.5 text-gray-500 font-mono text-[11px]">
                      {new Date(l.syncedAt).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 font-bold text-gray-800">{l.entityType}</td>
                    <td className="p-3.5 font-mono font-bold text-blue-900">{l.entityRefNo || '-'}</td>
                    <td className="p-3.5 text-gray-600">{l.action}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          l.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-600 max-w-xs truncate">
                      {l.errorMessage || l.busyResponse || '-'}
                    </td>
                    <td className="p-3.5 text-right">
                      {l.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(l.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition-all border border-blue-200 inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry Push
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSyncLogs;
