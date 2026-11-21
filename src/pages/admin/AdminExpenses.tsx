import React, { useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getExpenses, saveExpense, ExpenseItem } from '@/lib/roleAuthStore';
import { useDataSync, notifyDataChanged } from '@/lib/useDataSync';
import { Receipt, Plus, Search, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const AdminExpenses: React.FC = () => {
  const currentUser = getCurrentUser();
  const adminId = currentUser?.adminId || currentUser?.id || 'admin-1';

  const [expenses, setExpenses] = useState<ExpenseItem[]>(getExpenses(adminId));
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    category: 'Software Subscription',
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const refresh = () => setExpenses(getExpenses(adminId));

  // Multi-browser and cross-tab synchronization for Expenses
  useDataSync('expenses', refresh);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense = {
      adminId,
      category: form.category,
      title: form.title,
      amount: Number(form.amount),
      date: form.date,
      loggedBy: currentUser?.name || 'Admin',
      notes: form.notes,
    };
    saveExpense(newExpense);
    notifyDataChanged('expenses', 'create', newExpense);

    toast.success('Expense recorded');
    setIsOpen(false);
    refresh();
  };

  const filtered = expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expense Management</h1>
          <p className="text-sm text-gray-500">Track company operational expenditures, receipts, and vendor payments.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Log Expense
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase">Total Operational Expenses</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">${totalExpense.toLocaleString()}</h2>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Receipt className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-gray-900 text-sm">Logged Expense Statements</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Title & Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Logged By</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No expense entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{e.title}</div>
                      <div className="text-xs text-gray-400">{e.notes || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-purple-700">{e.category}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{e.date}</td>
                    <td className="px-6 py-4 text-xs text-gray-700">{e.loggedBy}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">${e.amount}</td>
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
              <h2 className="text-lg font-bold">Record Expense Entry</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title / Vendor *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  placeholder="e.g. Office Stationery"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Expense Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                />
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpenses;
