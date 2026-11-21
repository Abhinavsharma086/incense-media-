import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  X,
  Edit,
} from 'lucide-react';

export const AdminParties: React.FC = () => {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditDays, setCreditDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/accounting/parties');
      setParties(res.data);
    } catch (err) {
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleOpenAddModal = (p?: any) => {
    if (p) {
      setEditingId(p.id);
      setName(p.name);
      setGstin(p.gstin || '');
      setState(p.state || 'Maharashtra');
      setAddress(p.address || '');
      setCity(p.city || '');
      setPincode(p.pincode || '');
      setPhone(p.phone || '');
      setEmail(p.email || '');
      setCreditDays(p.creditDays || 30);
    } else {
      setEditingId(null);
      setName('');
      setGstin('');
      setState('Maharashtra');
      setAddress('');
      setCity('');
      setPincode('');
      setPhone('');
      setEmail('');
      setCreditDays(30);
    }
    setIsModalOpen(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Party Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        name,
        gstin,
        state,
        address,
        city,
        pincode,
        phone,
        email,
        creditDays: Number(creditDays),
      };

      const res = await crmApi.post('/accounting/parties', payload);
      toast.success(res.data.message || 'Party saved and synced to BUSY!');
      setIsModalOpen(false);
      fetchParties();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save party');
    } finally {
      setSaving(false);
    }
  };

  const filteredParties = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Customer / Party Masters
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage customer profiles, GSTIN details, and sync masters with BUSY.</p>
        </div>
        <button
          onClick={() => handleOpenAddModal()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Customer / Party
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Party Name or GSTIN..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-blue-600 outline-none"
          />
        </div>
        <button
          onClick={fetchParties}
          className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Parties Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">Loading Parties...</p>
        </div>
      ) : filteredParties.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No Customers Found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">Add customer profiles to start creating invoices and proforma quotes.</p>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Party Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">GSTIN</th>
                  <th className="p-3.5">State & City</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5 text-center">Credit Days</th>
                  <th className="p-3.5 text-center">BUSY Sync</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParties.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-gray-900">{p.name}</td>
                    <td className="p-3.5 font-mono text-gray-700">{p.gstin || 'URP'}</td>
                    <td className="p-3.5 text-gray-600">{p.city ? `${p.city}, ${p.state}` : p.state}</td>
                    <td className="p-3.5 text-gray-500">
                      <div>{p.phone}</div>
                      <div className="text-[10px] text-gray-400">{p.email}</div>
                    </td>
                    <td className="p-3.5 text-center font-bold">{p.creditDays} days</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> {p.busyCode || 'SYNCED'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenAddModal(p)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PARTY MASTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-white" /> {editingId ? 'Edit Party Master' : 'Add New Customer / Party'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Party Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Apex Traders Pvt Ltd"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">State *</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Billing Street Address"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Saving & Syncing to BUSY...' : 'Save Party Master'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParties;
