import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  Search,
  Plus,
  Building2,
  User,
  ChevronDown,
  X,
  Sparkles,
  MapPin,
  Phone,
  Check,
} from 'lucide-react';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const GST_STATE_CODE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export interface PartyPickerProps {
  value?: string;
  onSelectParty: (party: any) => void;
  parties?: any[];
  onPartyCreated?: (party: any) => void;
  placeholder?: string;
  required?: boolean;
}

export const PartyPicker: React.FC<PartyPickerProps> = ({
  value,
  onSelectParty,
  parties: externalParties,
  onPartyCreated,
  placeholder = '-- Choose Customer / Party --',
  required = false,
}) => {
  const [internalParties, setInternalParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GST' | 'CONSUMER'>('ALL');

  // Quick Add Party Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickGstin, setQuickGstin] = useState('');
  const [quickState, setQuickState] = useState('Maharashtra');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickCity, setQuickCity] = useState('');
  const [quickPincode, setQuickPincode] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickCreditDays, setQuickCreditDays] = useState('30');
  const [savingQuick, setSavingQuick] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPartiesList = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/accounting/parties');
      setInternalParties(res.data || []);
    } catch (err) {
      console.error('Failed to load parties for picker', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartiesList();
  }, []);

  const partiesList = externalParties && externalParties.length > 0 ? externalParties : internalParties;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPartyObj = partiesList.find((p) => p.id === value);

  // Filter parties based on search and GST filter pill
  const filteredParties = partiesList.filter((p) => {
    const isGstRegistered = Boolean(p.gstin && p.gstin.trim().length >= 10);
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'GST' && isGstRegistered) ||
      (activeFilter === 'CONSUMER' && !isGstRegistered);

    const s = search.trim().toLowerCase();
    const matchesSearch =
      !s ||
      (p.name && p.name.toLowerCase().includes(s)) ||
      (p.gstin && p.gstin.toLowerCase().includes(s)) ||
      (p.state && p.state.toLowerCase().includes(s)) ||
      (p.city && p.city.toLowerCase().includes(s)) ||
      (p.phone && p.phone.toLowerCase().includes(s));

    return matchesFilter && matchesSearch;
  });

  const handleSelect = (party: any) => {
    onSelectParty(party);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectParty(null);
  };

  const handleOpenQuickAdd = () => {
    setQuickName(search || '');
    setQuickGstin('');
    setQuickState('Maharashtra');
    setQuickAddress('');
    setQuickCity('');
    setQuickPincode('');
    setQuickPhone('');
    setQuickEmail('');
    setQuickCreditDays('30');
    setIsQuickAddOpen(true);
    setIsOpen(false);
  };

  const handleGstinChange = (val: string) => {
    const cleanGst = val.toUpperCase().trim();
    setQuickGstin(cleanGst);

    // Auto detect Indian state from first 2 digits of GSTIN
    if (cleanGst.length >= 2) {
      const stateCode = cleanGst.substring(0, 2);
      if (GST_STATE_CODE_MAP[stateCode]) {
        setQuickState(GST_STATE_CODE_MAP[stateCode]);
      }
    }
  };

  const handleSaveQuickParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error('Customer / Party name is required');
      return;
    }

    setSavingQuick(true);
    try {
      const payload = {
        name: quickName.trim(),
        gstin: quickGstin.trim().toUpperCase(),
        state: quickState,
        address: quickAddress,
        city: quickCity,
        pincode: quickPincode,
        phone: quickPhone,
        email: quickEmail,
        creditDays: Number(quickCreditDays) || 30,
      };

      const res = await crmApi.post('/accounting/parties', payload);
      const newParty = res.data?.party || res.data;
      toast.success('Customer created and selected!');

      // Update internal state
      setInternalParties((prev) => [newParty, ...prev]);
      if (onPartyCreated) {
        onPartyCreated(newParty);
      }

      onSelectParty(newParty);
      setIsQuickAddOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create party');
    } finally {
      setSavingQuick(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button Matching ItemPicker Style */}
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) setSearch('');
        }}
        className={`w-full p-2.5 bg-slate-50 hover:bg-white border ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200 bg-white' : 'border-slate-200'
        } rounded-lg text-sm font-semibold text-slate-700 text-left focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-300 outline-none flex items-center justify-between gap-2 shadow-2xs transition-all`}
      >
        {selectedPartyObj ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 shrink-0">
              {selectedPartyObj.gstin ? (
                <Building2 className="w-4 h-4 text-blue-700" />
              ) : (
                <User className="w-4 h-4 text-emerald-700" />
              )}
            </div>
            <div className="min-w-0 flex-1 truncate">
              <span className="font-bold text-slate-900 text-sm truncate mr-2">
                {selectedPartyObj.name}
              </span>
              <span className="text-xs text-slate-500 font-mono font-medium">
                ({selectedPartyObj.gstin || 'URP'} • {selectedPartyObj.state})
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 font-medium text-sm truncate">{placeholder}</span>
        )}

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {selectedPartyObj && (
            <span
              onClick={handleClear}
              title="Clear selection"
              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Hidden input for HTML5 form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu Popup (Matching ItemPicker in Reference Image 2) */}
      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-1 min-w-[340px] w-full bg-white border border-blue-200 rounded-xl shadow-2xl overflow-hidden p-2.5 animate-in fade-in duration-100">
          {/* Blue-outlined Search Box */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name, GSTIN, city, phone..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 bg-white border-2 border-blue-400 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none text-slate-900 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills (Matching ALL, PRODUCT, SERVICE format) */}
          <div className="flex items-center gap-1.5 mb-2.5">
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'GST', label: 'GST REGISTERED' },
              { id: 'CONSUMER', label: 'CONSUMER / UNREG' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Party Cards List (Matching Image 2 Item list layout) */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 text-sm">
            {loading ? (
              <div className="p-4 text-center text-gray-400 italic text-sm">Loading customers...</div>
            ) : filteredParties.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-gray-500 font-medium text-sm">No customers found</p>
                <button
                  type="button"
                  onClick={handleOpenQuickAdd}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Quick Create "{search || 'Customer'}"
                </button>
              </div>
            ) : (
              filteredParties.map((party) => {
                const isSelected = value === party.id;
                return (
                  <div
                    key={party.id}
                    onClick={() => handleSelect(party)}
                    className={`p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors rounded-lg ${
                      isSelected ? 'bg-blue-50/90 font-bold border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="space-y-1 max-w-[72%]">
                      <div className="flex items-center gap-2">
                        {party.gstin ? (
                          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <User className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-bold text-gray-900 text-sm truncate">{party.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                      </div>

                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 font-mono">
                        <span>GST: <span className="text-gray-700 font-semibold">{party.gstin || 'None (URP)'}</span></span>
                        {party.city && <span>City: {party.city}</span>}
                        {party.phone && <span>Ph: {party.phone}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-gray-900 text-sm">
                        {party.state}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          party.gstin ? 'text-blue-600' : 'text-emerald-600'
                        }`}
                      >
                        {party.gstin ? '18% GST' : 'Consumer'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Quick Create Footer (Matching Image 2) */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-1 rounded-b-lg">
            <span className="text-xs text-gray-500 font-medium">Or add customer directly:</span>
            <button
              type="button"
              onClick={handleOpenQuickAdd}
              className="px-3 py-1.5 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> + Quick Create Customer
            </button>
          </div>
        </div>
      )}

      {/* Quick Create Party Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in duration-200">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Quick Add Customer / Party Master
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="hover:opacity-75"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickParty} className="p-5 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Customer / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Apex Traders Pvt Ltd"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={quickGstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="e.g. 27AABCA1234F1Z1"
                    maxLength={15}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase focus:bg-white focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Auto-fills state if valid</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={quickState}
                    onChange={(e) => setQuickState(e.target.value)}
                    required
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={quickCity}
                    onChange={(e) => setQuickCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Pincode</label>
                  <input
                    type="text"
                    value={quickPincode}
                    onChange={(e) => setQuickPincode(e.target.value)}
                    placeholder="e.g. 400001"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="billing@customer.com"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Address</label>
                <textarea
                  rows={2}
                  value={quickAddress}
                  onChange={(e) => setQuickAddress(e.target.value)}
                  placeholder="Street / Office billing address"
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3.5 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuick}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {savingQuick ? 'Creating...' : 'Create & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyPicker;
