import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import { Search, Plus, Package, Wrench, ChevronDown, Check, X, Sparkles } from 'lucide-react';

interface ItemPickerProps {
  value?: string;
  onSelectItem: (item: any) => void;
  placeholder?: string;
}

export const ItemPicker: React.FC<ItemPickerProps> = ({
  value,
  onSelectItem,
  placeholder = '-- Select Product or Service --',
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  // Quick Add Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickType, setQuickType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [quickName, setQuickName] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [quickHsn, setQuickHsn] = useState('33074100');
  const [quickUnit, setQuickUnit] = useState('Units');
  const [quickRate, setQuickRate] = useState('0');
  const [quickGst, setQuickGst] = useState(18);
  const [quickCatId, setQuickCatId] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMasterItems = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        crmApi.get('/accounting/items?status=active'),
        crmApi.get('/accounting/categories'),
      ]);
      setItems(itemsRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load items for picker', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterItems();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItemObj = items.find((i) => i.id === value);

  const filteredItems = items.filter((it) => {
    const matchesFilter = activeFilter === 'ALL' || it.type === activeFilter;
    const matchesSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.sku && it.sku.toLowerCase().includes(search.toLowerCase())) ||
      (it.hsnSac && it.hsnSac.toLowerCase().includes(search.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const handleSelect = (item: any) => {
    onSelectItem(item);
    setIsOpen(false);
    setSearch('');
  };

  const handleOpenQuickAdd = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setQuickType('PRODUCT');
    setQuickName(search || '');
    setQuickSku(`PRD-${num}`);
    setQuickHsn('33074100');
    setQuickUnit('Units');
    setQuickRate('0');
    setQuickGst(18);
    setQuickCatId('');
    setQuickDesc('');
    setIsQuickAddOpen(true);
    setIsOpen(false);
  };

  const handleSaveQuickItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error('Item name is required');
      return;
    }

    setSavingQuick(true);
    try {
      const payload = {
        name: quickName,
        type: quickType,
        sku: quickSku,
        categoryId: quickCatId || null,
        hsnSac: quickHsn,
        unit: quickUnit,
        salesRate: Number(quickRate) || 0,
        gstPercentage: Number(quickGst),
        description: quickDesc,
        isActive: true,
      };

      const res = await crmApi.post('/accounting/items', payload);
      toast.success('New item created and added to line item!');
      const newItem = res.data.item;
      await fetchMasterItems();
      onSelectItem(newItem);
      setIsQuickAddOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create item');
    } finally {
      setSavingQuick(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Select or Type Below Trigger Button */}
      {/* Select or Type Below Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-700 text-left hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none flex items-center justify-between gap-1 shadow-2xs transition-all"
      >
        {selectedItemObj ? (
          <span className="font-bold text-slate-900 text-sm truncate">{selectedItemObj.name}</span>
        ) : (
          <span className="text-slate-500 text-sm">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-1 min-w-[320px] w-full bg-white border border-blue-200 rounded-lg shadow-xl overflow-hidden p-2.5 animate-in fade-in duration-100">
          {/* Blue-outlined Search Box */}
          <div className="mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type or search item..."
              autoFocus
              className="w-full p-2 bg-white border-2 border-blue-400 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 mb-2.5">
            {(['ALL', 'PRODUCT', 'SERVICE'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeFilter === filter
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 text-sm">
            {loading ? (
              <div className="p-4 text-center text-gray-400 italic text-sm">Loading catalog items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-gray-500 font-medium text-sm">No active master items found</p>
                <button
                  type="button"
                  onClick={handleOpenQuickAdd}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Quick Create "{search || 'Item'}"
                </button>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-3 hover:bg-indigo-50/70 cursor-pointer flex items-center justify-between transition-colors ${
                    value === item.id ? 'bg-indigo-50 font-bold' : ''
                  }`}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-2">
                      {item.type === 'SERVICE' ? (
                        <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                      <span className="font-bold text-gray-900 text-sm truncate">{item.name}</span>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-2 font-mono">
                      {item.sku && <span>SKU: {item.sku}</span>}
                      {item.hsnSac && <span>HSN: {item.hsnSac}</span>}
                      {item.unit && <span>Unit: {item.unit}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-gray-900 text-sm">₹{Number(item.salesRate).toFixed(2)}</div>
                    <div className="text-xs font-bold text-indigo-600">{item.gstPercentage}% GST</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Quick Create Footer */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Or add master item directly:</span>
            <button
              type="button"
              onClick={handleOpenQuickAdd}
              className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> + Quick Create Item
            </button>
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in duration-200">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Quick Add Item to Catalog
              </h3>
              <button type="button" onClick={() => setIsQuickAddOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickItem} className="p-5 space-y-3.5 text-xs font-medium">
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setQuickType('PRODUCT');
                    setQuickHsn('33074100');
                    setQuickGst(18);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${
                    quickType === 'PRODUCT' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickType('SERVICE');
                    setQuickHsn('998363');
                    setQuickGst(5);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${
                    quickType === 'SERVICE' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  Service
                </button>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Incense Stick or Magazine Ad"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={quickSku}
                    onChange={(e) => setQuickSku(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Category</label>
                  <select
                    value={quickCatId}
                    onChange={(e) => setQuickCatId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="">-- None --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">HSN / SAC</label>
                  <input
                    type="text"
                    value={quickHsn}
                    onChange={(e) => setQuickHsn(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Sales Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickRate}
                    onChange={(e) => setQuickRate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">GST %</label>
                  <select
                    value={quickGst}
                    onChange={(e) => setQuickGst(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Sub-description</label>
                <textarea
                  rows={2}
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  placeholder="Line item description notes..."
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3.5 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuick}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {savingQuick ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemPicker;
