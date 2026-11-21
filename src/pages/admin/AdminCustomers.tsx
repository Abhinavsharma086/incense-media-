import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getCustomers, saveCustomer, deleteCustomer, CustomerItem } from '@/lib/roleAuthStore';
import { useDataSync, notifyDataChanged } from '@/lib/useDataSync';
import crmApi from '@/api/crmApi';
import { Users, Plus, Search, Edit, Trash2, X, Building, Mail, Phone, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const mapPartyToCustomer = (p: any, adminId: string): CustomerItem => ({
  id: p.id,
  adminId: p.adminId || adminId,
  name: p.name || '',
  email: p.email || '',
  phone: p.phone || '',
  company: p.company || p.name || '',
  address: p.address || '',
  city: p.city || '',
  status: (p.status || 'active') as any,
  totalBilled: p.currentBalance || p.openingBalance || 0,
  createdAt: p.createdAt || new Date().toISOString(),
});

const AdminCustomers: React.FC = () => {
  const currentUser = getCurrentUser();
  const adminId = currentUser?.adminId || currentUser?.id || 'admin-1';

  const [customers, setCustomers] = useState<CustomerItem[]>(() => getCustomers(adminId));
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    status: 'active' as 'active' | 'lead' | 'inactive',
  });

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await crmApi.get('/accounting/parties');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((p: any) => mapPartyToCustomer(p, adminId));
        setCustomers(mapped);
        return;
      }
    } catch (err) {
      console.warn('Backend parties API warning, using local cache:', err);
    }
    // Fallback to local store if DB is empty or offline
    setCustomers(getCustomers(adminId));
  }, [adminId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Hook into multi-browser and cross-tab data synchronization
  useDataSync('customers', fetchCustomers);

  const refresh = () => fetchCustomers();

  const handleOpen = (cust?: CustomerItem) => {
    if (cust) {
      setForm({ ...cust });
    } else {
      setForm({ id: '', name: '', email: '', phone: '', company: '', address: '', city: '', status: 'active' });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerPayload = {
      id: form.id || undefined,
      adminId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      address: form.address,
      city: form.city,
      status: form.status,
    };

    // 1. Persist to authoritative backend database
    try {
      await crmApi.post('/accounting/parties', customerPayload);
    } catch (err) {
      console.warn('Backend party save warning, falling back to local store:', err);
    }

    // 2. Persist to local store
    saveCustomer(customerPayload);

    // 3. Notify all other browsers and tabs immediately
    notifyDataChanged('customers', form.id ? 'update' : 'create', customerPayload);

    toast.success(form.id ? 'Customer updated' : 'Customer created');
    setIsOpen(false);
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this customer record?')) {
      try {
        await crmApi.delete(`/accounting/parties/${id}`);
      } catch (err) {
        console.warn('Backend party delete warning:', err);
      }
      deleteCustomer(id);
      notifyDataChanged('customers', 'delete', { id });
      toast.success('Customer deleted');
      fetchCustomers();
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Directory</h1>
          <p className="text-sm text-gray-500">Manage client profiles, contact details, and billing stats.</p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search customer name, company, email..."
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
                <th className="px-6 py-4">Customer & Company</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">City / Location</th>
                <th className="px-6 py-4">Total Billed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No customer records found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-blue-600 font-medium">{c.company}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{c.email}</div>
                      <div className="text-gray-400">{c.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{c.city || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-xs">${c.totalBilled}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200 uppercase">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpen(c)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">{form.id ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
