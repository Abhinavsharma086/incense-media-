import React, { useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import {
  getInvoices,
  saveInvoice,
  deleteInvoice,
  getCustomers,
  getProducts,
  InvoiceItem,
} from '@/lib/roleAuthStore';
import { useDataSync, notifyDataChanged } from '@/lib/useDataSync';
import { FileSpreadsheet, Plus, Search, Trash2, Eye, Printer, X, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const AdminInvoices: React.FC = () => {
  const currentUser = getCurrentUser();
  const adminId = currentUser?.adminId || currentUser?.id || 'admin-1';

  const customers = getCustomers(adminId);
  const products = getProducts(adminId);
  const [invoices, setInvoices] = useState<InvoiceItem[]>(getInvoices(adminId));
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null);

  const [form, setForm] = useState({
    customerId: customers[0]?.id || '',
    amount: 1500,
    tax: 270,
    discount: 0,
    status: 'pending' as 'paid' | 'pending' | 'overdue' | 'draft',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });

  const refresh = () => setInvoices(getInvoices(adminId));

  // Multi-browser and cross-tab synchronization for Invoices
  useDataSync('invoices', refresh);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === form.customerId);

    const newInvoicePayload = {
      adminId,
      customerId: form.customerId,
      customerName: cust?.name || 'Customer',
      amount: Number(form.amount),
      tax: Number(form.tax),
      discount: Number(form.discount),
      total: Number(form.amount) + Number(form.tax) - Number(form.discount),
      status: form.status,
      dueDate: form.dueDate,
      createdBy: `${currentUser?.name || 'User'} (${currentUser?.role || 'Admin'})`,
      items: [{ description: 'Custom Billing Service', quantity: 1, unitPrice: Number(form.amount), total: Number(form.amount) }],
    };

    saveInvoice(newInvoicePayload);
    notifyDataChanged('invoices', 'create', newInvoicePayload);

    toast.success('Invoice created successfully');
    setIsOpen(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete invoice?')) {
      deleteInvoice(id);
      notifyDataChanged('invoices', 'delete', { id });
      toast.success('Invoice deleted');
      refresh();
    }
  };

  const filtered = invoices.filter(
    (i) =>
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Invoices</h1>
          <p className="text-sm text-gray-500">Generate client invoices, process payments, and export PDF statements.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search invoice number, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{inv.customerName}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{inv.dueDate}</td>
                    <td className="px-6 py-4 font-extrabold text-gray-900">${inv.total}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Generate New Invoice</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Customer *</label>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Subtotal ($) *</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Tax ($)</label>
                  <input
                    type="number"
                    value={form.tax}
                    onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e: any) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm font-medium"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice PDF Printable Preview Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-8 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewInvoice.invoiceNumber}</h2>
                <p className="text-xs text-gray-500">Created by: {viewInvoice.createdBy}</p>
              </div>
              <button onClick={() => setViewInvoice(null)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 text-sm">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400">Billed To:</p>
                <p className="font-bold text-gray-900 mt-1">{viewInvoice.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase font-bold text-gray-400">Status:</p>
                <p className="font-bold text-emerald-600 uppercase mt-1">{viewInvoice.status}</p>
                <p className="text-xs text-gray-500 mt-1">Due: {viewInvoice.dueDate}</p>
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-gray-50 text-sm">
              <div className="flex justify-between border-b pb-2 font-bold text-gray-700">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between py-2 text-gray-800">
                <span>Billing items & services</span>
                <span>${viewInvoice.amount}</span>
              </div>
              <div className="flex justify-between py-1 text-xs text-gray-500">
                <span>GST Tax</span>
                <span>+${viewInvoice.tax}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-extrabold text-base text-gray-900">
                <span>Total Amount Due</span>
                <span>${viewInvoice.total}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvoices;
