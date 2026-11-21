import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';

export const AdminAccountingReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'ageing'>('sales');
  const [salesReport, setSalesReport] = useState<any>(null);
  const [ageingReport, setAgeingReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await crmApi.get('/accounting/reports/sales-register');
        setSalesReport(res.data);
      } else {
        const res = await crmApi.get('/accounting/reports/ageing');
        setAgeingReport(res.data);
      }
    } catch (err) {
      toast.error('Failed to load accounting reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" /> Accounting Reports & GSTR-1 Summary
          </h2>
          <p className="text-sm text-gray-500 mt-1">Export Sales Registers, GSTR-1 summaries, and Customer Ageing Analysis.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1 border shadow-sm">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Sales Register & GSTR-1 Summary
        </button>
        <button
          onClick={() => setActiveTab('ageing')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ageing'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Outstanding Ageing Analysis
        </button>
      </div>

      {/* Tab 1: Sales Register */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {salesReport && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">Total Taxable</span>
                <div className="text-lg font-black text-gray-900 mt-1">₹{salesReport.totals?.taxable?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">CGST Total</span>
                <div className="text-lg font-black text-blue-700 mt-1">₹{salesReport.totals?.cgst?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">SGST Total</span>
                <div className="text-lg font-black text-blue-700 mt-1">₹{salesReport.totals?.sgst?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">IGST Total</span>
                <div className="text-lg font-black text-purple-700 mt-1">₹{salesReport.totals?.igst?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">Grand Total</span>
                <div className="text-lg font-black text-emerald-600 mt-1">₹{salesReport.totals?.grandTotal?.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Sales Register Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px]">
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">GSTIN</th>
                    <th className="p-3.5 text-right">Taxable (₹)</th>
                    <th className="p-3.5 text-right">CGST (₹)</th>
                    <th className="p-3.5 text-right">SGST (₹)</th>
                    <th className="p-3.5 text-right">IGST (₹)</th>
                    <th className="p-3.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {salesReport?.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50/60">
                      <td className="p-3.5 font-bold font-mono text-blue-900">{inv.invoiceNumber}</td>
                      <td className="p-3.5 text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-3.5 font-bold text-gray-900">{inv.party?.name}</td>
                      <td className="p-3.5 font-mono text-gray-600">{inv.party?.gstin || 'URP'}</td>
                      <td className="p-3.5 text-right font-mono">₹{inv.taxableAmount?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-blue-800">₹{inv.cgstAmount?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-blue-800">₹{inv.sgstAmount?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-purple-800">₹{inv.igstAmount?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">₹{inv.grandTotal?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Ageing Analysis */}
      {activeTab === 'ageing' && (
        <div className="space-y-6">
          {/* Summary */}
          {ageingReport && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">0 - 30 Days</span>
                <div className="text-lg font-black text-emerald-600 mt-1">₹{ageingReport.summary?.bucket0_30?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">31 - 60 Days</span>
                <div className="text-lg font-black text-blue-600 mt-1">₹{ageingReport.summary?.bucket31_60?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">61 - 90 Days</span>
                <div className="text-lg font-black text-amber-600 mt-1">₹{ageingReport.summary?.bucket61_90?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">90+ Days (Overdue)</span>
                <div className="text-lg font-black text-red-600 mt-1">₹{ageingReport.summary?.bucket90_plus?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-gray-400">Total Outstanding</span>
                <div className="text-lg font-black text-gray-900 mt-1">₹{ageingReport.summary?.totalOutstanding?.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Ageing Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px]">
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5 text-right">0 - 30 Days</th>
                    <th className="p-3.5 text-right">31 - 60 Days</th>
                    <th className="p-3.5 text-right">61 - 90 Days</th>
                    <th className="p-3.5 text-right">90+ Days</th>
                    <th className="p-3.5 text-right">Total Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ageingReport?.parties?.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/60 font-medium">
                      <td className="p-3.5 font-bold text-gray-900">{p.partyName}</td>
                      <td className="p-3.5 text-gray-500">{p.phone || '-'}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-600">₹{p.bucket0_30?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-blue-600">₹{p.bucket31_60?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-amber-600">₹{p.bucket61_90?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-red-600 font-bold">₹{p.bucket90_plus?.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">₹{p.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccountingReports;
