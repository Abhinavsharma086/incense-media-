import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  FileSpreadsheet,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  Zap,
} from 'lucide-react';

interface LeadFormItem {
  id: string;
  formId: string;
  formName: string;
  status: string;
  leadsCount: number;
  lastSyncedAt?: string;
  createdTime?: string;
  metaPage: {
    pageName: string;
    pageId: string;
  };
}

export const AdminLeadForms: React.FC = () => {
  const [forms, setForms] = useState<LeadFormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/meta/forms');
      setForms(res.data);
    } catch (err: any) {
      toast.error('Failed to load lead forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleSyncFormsNow = async () => {
    setSyncing(true);
    try {
      const res = await crmApi.post('/meta/sync');
      toast.success(res.data.message || 'Forms & Leads synced!');
      fetchForms();
    } catch (err: any) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const filteredForms = forms.filter(
    (f) =>
      f.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.metaPage.pageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-primaryRed" /> Meta Lead Ads Forms
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            View all Facebook & Instagram lead gen forms linked to your connected Pages.
          </p>
        </div>
        <button
          onClick={handleSyncFormsNow}
          disabled={syncing}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Forms Now'}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search forms by name or page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Total Synced Forms: <span className="font-bold text-gray-900">{forms.length}</span>
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="mx-auto w-10 h-10 border-4 border-gray-200 border-t-primaryRed rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Loading Meta lead forms...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 mb-1">No Lead Forms Found</h3>
          <p className="text-xs text-gray-500">Connect a Meta account in Settings to sync your lead forms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-red-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" /> {form.status}
                  </span>
                  <div className="text-xs text-gray-400 font-mono">Form ID: {form.formId}</div>
                </div>

                <h3 className="text-base font-bold text-gray-900 tracking-tight leading-snug mb-2">
                  {form.formName}
                </h3>

                <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{form.metaPage.pageName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Total Generated Leads:</span>
                  <span className="font-bold text-gray-900 text-sm">{form.leadsCount}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span>Last Synced:</span>
                  <span>
                    {form.lastSyncedAt
                      ? new Date(form.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLeadForms;
