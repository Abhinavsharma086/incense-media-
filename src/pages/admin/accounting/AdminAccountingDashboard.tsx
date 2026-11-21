import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Plus,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const AdminAccountingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/accounting/dashboard');
      setMetrics(res.data);
    } catch (err) {
      toast.error('Failed to load accounting metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" /> Accounting & BUSY ERP Overview
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Realtime GST Invoicing, Proforma Management, Payments, and BUSY Software Sync.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/accounting/invoices/new')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
          <button
            onClick={() => navigate('/admin/accounting/proformas/new')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Proforma
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">Loading metrics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 mt-3">₹{metrics?.totalSales?.toLocaleString('en-IN') || 0}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{metrics?.totalInvoices || 0} Total Invoices Generated</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Collected</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-3">₹{metrics?.totalCollected?.toLocaleString('en-IN') || 0}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">Receipts Verified</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Outstanding</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 mt-3">₹{metrics?.totalOutstanding?.toLocaleString('en-IN') || 0}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{metrics?.unpaidInvoices || 0} Unpaid / Partial Bills</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Proformas</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700 mt-3">{metrics?.pendingProformas || 0}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">Awaiting Client Approval</div>
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => navigate('/admin/accounting/invoices')}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-md cursor-pointer hover:shadow-lg transition-all group"
        >
          <div className="flex justify-between items-center">
            <FileText className="w-8 h-8 text-blue-200" />
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-lg font-bold mt-4">Manage Tax Invoices</h3>
          <p className="text-xs text-blue-100 mt-1">Create, print, download, and push sales vouchers directly into BUSY ERP.</p>
        </div>

        <div
          onClick={() => navigate('/admin/accounting/proformas')}
          className="bg-gradient-to-br from-purple-700 to-indigo-800 p-6 rounded-2xl text-white shadow-md cursor-pointer hover:shadow-lg transition-all group"
        >
          <div className="flex justify-between items-center">
            <FileSpreadsheet className="w-8 h-8 text-purple-200" />
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-lg font-bold mt-4">Proforma Invoices (PI)</h3>
          <p className="text-xs text-purple-100 mt-1">Generate quotations, track validity, and convert to Invoice with 1-Click.</p>
        </div>

        <div
          onClick={() => navigate('/admin/accounting/payments')}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-md cursor-pointer hover:shadow-lg transition-all group"
        >
          <div className="flex justify-between items-center">
            <DollarSign className="w-8 h-8 text-emerald-200" />
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-lg font-bold mt-4">Payments & Ledger</h3>
          <p className="text-xs text-emerald-100 mt-1">Record collections, view customer ledgers, and track overdue bills.</p>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 bg-gray-50/60 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Recent Tax Invoices</h3>
          <button
            onClick={() => navigate('/admin/accounting/invoices')}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px]">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Party / Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">BUSY Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics?.recentInvoices?.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-3.5 font-bold font-mono text-blue-900">{inv.invoiceNumber}</td>
                  <td className="p-3.5 font-semibold text-gray-800">{inv.party?.name}</td>
                  <td className="p-3.5 text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                  <td className="p-3.5 text-right font-bold font-mono">₹{inv.grandTotal?.toFixed(2)}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : inv.status === 'PARTIAL'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 w-fit ${
                        inv.busySyncStatus === 'SYNCED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {inv.busySyncStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAccountingDashboard;
