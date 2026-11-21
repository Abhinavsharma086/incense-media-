import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  DollarSign,
  Plus,
  RefreshCw,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  X,
  CheckCircle2,
} from 'lucide-react';

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Record Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/accounting/payments');
      setPayments(res.data);
    } catch (err) {
      toast.error('Failed to load payment receipts');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await crmApi.get('/accounting/invoices');
      setInvoices(res.data.filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchUnpaidInvoices();
  }, []);

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    const selected = invoices.find((inv) => inv.id === invId);
    if (selected) {
      setAmount(String(selected.balanceAmount || selected.grandTotal));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !amount || Number(amount) <= 0) {
      toast.error('Please select an Invoice and enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const res = await crmApi.post('/accounting/payments', {
        invoiceId: selectedInvoiceId,
        amount: Number(amount),
        paymentMode,
        referenceNo,
        receiptDate,
        notes,
      });

      toast.success(res.data.message || 'Payment recorded successfully!');
      setIsModalOpen(false);
      setSelectedInvoiceId('');
      setAmount('');
      setReferenceNo('');
      fetchPayments();
      fetchUnpaidInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" /> Payment Receipts & Ledger
          </h2>
          <p className="text-sm text-gray-500 mt-1">Record collections against invoices and sync receipt vouchers to BUSY ERP.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Record Payment Received
        </button>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">Loading Payment Receipts...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No Payment Receipts Recorded</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">Record payments received from customers to update balances.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Receipt #</th>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Party / Customer</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5 text-center">BUSY Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-emerald-900">{p.receiptNumber}</td>
                    <td className="p-3.5 font-mono text-blue-900 font-bold">{p.invoice?.invoiceNumber}</td>
                    <td className="p-3.5 font-bold text-gray-900">{p.party?.name}</td>
                    <td className="p-3.5 text-gray-500">{new Date(p.receiptDate).toLocaleDateString('en-IN')}</td>
                    <td className="p-3.5 font-semibold text-gray-700">{p.paymentMode}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">₹{p.amount?.toFixed(2)}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.busySyncStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-white" /> Record Payment Received
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Select Unpaid Invoice *
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-600 outline-none"
                >
                  <option value="">-- Select Invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.party?.name} (Bal: ₹{inv.balanceAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Ref / UTR No.
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. UTR123456"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Receipt Date
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Recording Receipt...' : 'Save & Sync Receipt to BUSY'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
