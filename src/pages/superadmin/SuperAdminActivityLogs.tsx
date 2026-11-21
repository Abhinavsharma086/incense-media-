import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Loader2,
  Clock,
  Globe,
  UserCheck,
  Eye,
  ArrowRight,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchActivityLogsApi, ActivityLogItem } from '@/api/superAdminApi';
import { toast } from 'sonner';

export const SuperAdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchActivityLogsApi({
        search,
        module: moduleFilter,
        action: actionFilter,
        page,
        limit: 25,
      });
      setLogs(res.logs || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      toast.error('Failed to load activity audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, moduleFilter, actionFilter, page]);

  // Export CSV helper
  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('No logs available to export');
      return;
    }

    const headers = ['Timestamp', 'Admin Email', 'Action', 'Module', 'Target ID', 'IP Address', 'User Agent'];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.user?.email || 'System',
      log.action,
      log.module,
      log.targetId || '-',
      log.ipAddress || '127.0.0.1',
      `"${(log.userAgent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `superadmin_activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Activity logs exported to CSV!');
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-purple-600" />
            Monitoring & System Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of every Admin action (who, what, when, IP address, device, and old value to new value diffs).
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, user email, module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Modules</option>
            <option value="admins">Admins</option>
            <option value="permissions">Permissions</option>
            <option value="settings">Global Settings</option>
            <option value="users">Users</option>
            <option value="leads">Leads</option>
            <option value="deals">Deals</option>
            <option value="accounting">Accounting</option>
            <option value="security">Security</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Actions</option>
            <option value="ADMIN_CREATED">Admin Created</option>
            <option value="ADMIN_UPDATED">Admin Updated</option>
            <option value="ADMIN_SUSPENDED">Admin Suspended</option>
            <option value="ADMIN_RESTORED">Admin Restored</option>
            <option value="PASSWORD_RESET">Password Reset</option>
            <option value="FORCE_LOGOUT">Force Logout</option>
            <option value="PERMISSIONS_UPDATED">Permissions Updated</option>
            <option value="GLOBAL_SETTINGS_UPDATED">Settings Updated</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Admin User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">IP & Device Log</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading activity logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No activity logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      <div className="font-semibold text-slate-800">{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System / Root'}
                      </div>
                      <div className="text-[10px] text-slate-400">{log.user?.email || 'superadmin@incensemedia.in'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700 text-[11px] capitalize">
                      {log.module}
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="font-mono text-slate-800 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" /> {log.ipAddress || '127.0.0.1'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{log.userAgent || 'Desktop Browser'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {(log.oldValue || log.newValue) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Diff
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} Total Logs)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="text-xs px-3 py-1 h-8"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="text-xs px-3 py-1 h-8"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* VALUE DIFF MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Log Inspection & Data Diff</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-[11px]">
                <div>
                  <span className="text-slate-400 font-sans block">Action & Module:</span>
                  <span className="text-purple-300 font-bold">{selectedLog.action}</span> ({selectedLog.module})
                </div>
                <div>
                  <span className="text-slate-400 font-sans block">Admin User:</span>
                  <span className="text-slate-200">{selectedLog.user?.email || 'System'}</span>
                </div>
              </div>

              {selectedLog.oldValue && (
                <div>
                  <label className="block text-[11px] font-sans font-bold text-red-400 mb-1">Old State Value (Before)</label>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-red-500/20 text-red-300 text-[11px] overflow-x-auto">
                    {selectedLog.oldValue}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <label className="block text-[11px] font-sans font-bold text-emerald-400 mb-1">New State Value (After)</label>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-emerald-500/20 text-emerald-300 text-[11px] overflow-x-auto">
                    {selectedLog.newValue}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button onClick={() => setSelectedLog(null)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4">
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminActivityLogs;
