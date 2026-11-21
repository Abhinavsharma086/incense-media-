import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import { InvoicePdfModal } from '@/components/admin/accounting/InvoicePdfModal';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const AdminProformaInvoices: React.FC = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // PDF Modal
  const [selectedPi, setSelectedPi] = useState<any>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const fetchProformas = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/accounting/proformas', {
        params: { search, status: statusFilter },
      });
      setProformas(res.data);
    } catch (err) {
      toast.error('Failed to load Proforma Invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProformas();
  }, [search, statusFilter]);

  const handleConvert = async (id: string, piNumber: string) => {
    if (!window.confirm(`Convert Proforma Invoice ${piNumber} into an official Tax Invoice?`)) return;
    try {
      const res = await crmApi.post(`/accounting/proformas/${id}/convert`);
      toast.success(res.data.message || 'Converted to Tax Invoice successfully!');
      fetchProformas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert PI');
    }
  };

  const handleOpenPdf = (pi: any) => {
    setSelectedPi(pi);
    setIsPdfModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-purple-600" /> Proforma Invoices (PI)
          </h2>
          <p className="text-sm text-gray-500 mt-1">Create quotations, track customer approvals, and convert to Tax Invoice in 1-Click.</p>
        </div>
        <button
          onClick={() => navigate('/admin/accounting/proformas/new')}
          className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Proforma Invoice
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PI # or Party Name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-purple-600 outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-purple-600 outline-none"
          >
            <option value="">All PI Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="APPROVED">Approved</option>
            <option value="CONVERTED">Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={fetchProformas}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PI Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">Fetching Proforma Invoices...</p>
        </div>
      ) : proformas.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No Proforma Invoices Found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">Create your first Proforma Invoice to send quotes to customers.</p>
          <button
            onClick={() => navigate('/admin/accounting/proformas/new')}
            className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create PI Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">PI #</th>
                  <th className="p-3.5">Party / Customer</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Taxable (₹)</th>
                  <th className="p-3.5 text-right">Grand Total (₹)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">1-Click Convert</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proformas.map((pi) => (
                  <tr key={pi.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-purple-900">{pi.proformaNumber}</td>
                    <td className="p-3.5 font-bold text-gray-900">{pi.party?.name}</td>
                    <td className="p-3.5 text-gray-500 font-medium">
                      {new Date(pi.proformaDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium">₹{pi.taxableAmount?.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-gray-900">₹{pi.grandTotal?.toFixed(2)}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          pi.status === 'CONVERTED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : pi.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {pi.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {pi.status === 'CONVERTED' ? (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Converted to Invoice
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConvert(pi.id, pi.proformaNumber)}
                          className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[10px] font-extrabold transition-all shadow-sm inline-flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 fill-white" /> Convert to Invoice
                        </button>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenPdf(pi)}
                        title="Print / View PI PDF"
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-purple-600 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      <InvoicePdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        data={selectedPi}
        type="PROFORMA"
      />
    </div>
  );
};

export default AdminProformaInvoices;
