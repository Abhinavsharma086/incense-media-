import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  Package,
  Wrench,
  FolderTree,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Copy,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  X,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Boxes,
  Tag,
} from 'lucide-react';

export const AdminItems: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'categories'>('products');
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [itemName, setItemName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [unit, setUnit] = useState('Units');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [salesRate, setSalesRate] = useState('0');
  const [gstPercentage, setGstPercentage] = useState(18);
  const [openingStock, setOpeningStock] = useState('0');
  const [currentStock, setCurrentStock] = useState('0');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catType, setCatType] = useState<'BOTH' | 'PRODUCT' | 'SERVICE'>('BOTH');
  const [savingCat, setSavingCat] = useState(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'item' | 'category' } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        crmApi.get('/accounting/items'),
        crmApi.get('/accounting/categories'),
      ]);
      setItems(itemsRes.data);
      setCategories(catRes.data);
    } catch (err) {
      toast.error('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto generate SKU/Code
  const handleAutoGenerateSku = (type: 'PRODUCT' | 'SERVICE') => {
    const prefix = type === 'SERVICE' ? 'SRV' : 'PRD';
    const num = Math.floor(1000 + Math.random() * 9000);
    setSku(`${prefix}-${num}`);
  };

  // Open Add/Edit Item Modal
  const handleOpenItemModal = (item?: any, defaultType: 'PRODUCT' | 'SERVICE' = 'PRODUCT') => {
    if (item) {
      setEditingItemId(item.id);
      setItemType(item.type || 'PRODUCT');
      setItemName(item.name || '');
      setSku(item.sku || '');
      setCategoryId(item.categoryId || '');
      setHsnSac(item.hsnSac || '');
      setUnit(item.unit || (item.type === 'SERVICE' ? 'Hours' : 'Units'));
      setPurchasePrice(String(item.purchasePrice || 0));
      setSalesRate(String(item.salesRate || 0));
      setGstPercentage(item.gstPercentage !== undefined ? item.gstPercentage : 18);
      setOpeningStock(String(item.openingStock || 0));
      setCurrentStock(String(item.currentStock || 0));
      setDescription(item.description || '');
      setIsActive(item.isActive !== undefined ? item.isActive : true);
    } else {
      setEditingItemId(null);
      setItemType(defaultType);
      setItemName('');
      handleAutoGenerateSku(defaultType);
      setCategoryId('');
      setHsnSac(defaultType === 'SERVICE' ? '998363' : '33074100');
      setUnit(defaultType === 'SERVICE' ? 'Hours' : 'Units');
      setPurchasePrice('0');
      setSalesRate('0');
      setGstPercentage(defaultType === 'SERVICE' ? 5 : 18);
      setOpeningStock('0');
      setCurrentStock('0');
      setDescription('');
      setIsActive(true);
    }
    setIsItemModalOpen(true);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error('Item Name is required');
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        id: editingItemId,
        name: itemName,
        type: itemType,
        sku,
        categoryId: categoryId || null,
        hsnSac,
        unit,
        purchasePrice: Number(purchasePrice) || 0,
        salesRate: Number(salesRate) || 0,
        gstPercentage: Number(gstPercentage),
        openingStock: Number(openingStock) || 0,
        currentStock: Number(currentStock) || 0,
        description,
        isActive,
      };

      const res = await crmApi.post('/accounting/items', payload);
      toast.success(res.data.message || 'Item saved successfully!');
      setIsItemModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save item');
    } finally {
      setSavingItem(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (item: any) => {
    try {
      const res = await crmApi.put(`/accounting/items/${item.id}/status`);
      toast.success(res.data.message);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  // Duplicate Item
  const handleDuplicateItem = async (item: any) => {
    try {
      const res = await crmApi.post(`/accounting/items/${item.id}/duplicate`);
      toast.success(res.data.message || 'Item cloned successfully');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to duplicate item');
    }
  };

  // Confirm Delete Item/Category
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'item') {
        await crmApi.delete(`/accounting/items/${deleteTarget.id}`);
        toast.success('Item deleted successfully');
      } else {
        await crmApi.delete(`/accounting/categories/${deleteTarget.id}`);
        toast.success('Category deleted successfully');
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('Category Name is required');
      return;
    }
    setSavingCat(true);
    try {
      const payload = { id: editingCatId, name: catName, description: catDesc, type: catType };
      const res = await crmApi.post('/accounting/categories', payload);
      toast.success(res.data.message || 'Category saved successfully!');
      setIsCatModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSavingCat(false);
    }
  };

  // Handle CSV File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid header format');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const parsedData: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        if (!values[0]) continue;
        const row: any = {};
        headers.forEach((h, index) => {
          row[h] = values[index] || '';
        });
        parsedData.push({
          name: row['Item Name'] || row['Name'] || row['name'] || values[0],
          type: (row['Type'] || row['type'] || 'PRODUCT').toUpperCase(),
          sku: row['SKU'] || row['sku'] || '',
          hsnSac: row['HSN/SAC'] || row['hsnSac'] || '',
          unit: row['Unit'] || row['unit'] || 'Units',
          salesRate: Number(row['Rate'] || row['Price'] || row['salesRate']) || 0,
          purchasePrice: Number(row['Purchase Price'] || row['purchasePrice']) || 0,
          gstPercentage: Number(row['GST %'] || row['gstPercentage']) || 18,
          openingStock: Number(row['Stock'] || row['openingStock']) || 0,
          description: row['Description'] || row['description'] || '',
        });
      }
      setImportJson(parsedData);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importJson.length) return;
    setImporting(true);
    try {
      const res = await crmApi.post('/accounting/items/import', { items: importJson });
      toast.success(res.data.message || 'Items imported successfully');
      setIsImportModalOpen(false);
      setImportJson([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Item Name,Type,SKU,HSN/SAC,Unit,Rate,Purchase Price,GST %,Stock,Description\n' +
      '"Sample Fragrance Incense Stick","PRODUCT","PRD-1001","33074100","Pcs",250,150,18,100,"Premium Sandalwood Sticks"\n' +
      '"Full Page Magazine Ad","SERVICE","SRV-1001","998363","Units",60000,0,5,0,"Annual Publication Banner"';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Item_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsv = () => {
    if (!items.length) {
      toast.error('No items available to export');
      return;
    }
    let csv = 'Item Name,Type,SKU,Category,HSN/SAC,Unit,Sales Rate,Purchase Price,GST %,Current Stock,Status,Description\n';
    items.forEach((it) => {
      csv += `"${it.name}","${it.type}","${it.sku || ''}","${it.category?.name || ''}","${it.hsnSac || ''}","${it.unit}",${it.salesRate},${it.purchasePrice},${it.gstPercentage},${it.currentStock},"${it.isActive ? 'Active' : 'Inactive'}","${(it.description || '').replace(/"/g, '""')}"\n`;
    });
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Items_Catalog_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered List Logic
  const filteredItems = items.filter((it) => {
    const matchesTab = activeTab === 'products' ? it.type === 'PRODUCT' : it.type === 'SERVICE';
    const matchesSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.sku && it.sku.toLowerCase().includes(search.toLowerCase())) ||
      (it.hsnSac && it.hsnSac.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = !selectedCategory || it.categoryId === selectedCategory;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && it.isActive) ||
      (selectedStatus === 'inactive' && !it.isActive);

    return matchesTab && matchesSearch && matchesCat && matchesStatus;
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans pb-10 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-7 h-7 text-indigo-600" /> Items & Catalog Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage Products, Services, stock levels, GST rates, and Category masters for seamless invoicing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            title="Download CSV Template"
            className="px-3 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" /> Template
          </button>

          <label className="px-3 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-gray-500" /> Import CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
          </button>

          {activeTab === 'categories' ? (
            <button
              onClick={() => {
                setEditingCatId(null);
                setCatName('');
                setCatDesc('');
                setCatType('BOTH');
                setIsCatModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          ) : (
            <button
              onClick={() => handleOpenItemModal(undefined, activeTab === 'services' ? 'SERVICE' : 'PRODUCT')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add {activeTab === 'services' ? 'Service' : 'Product'}
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" /> Products ({items.filter((i) => i.type === 'PRODUCT').length})
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'services'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-4 h-4" /> Services ({items.filter((i) => i.type === 'SERVICE').length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FolderTree className="w-4 h-4" /> Categories ({categories.length})
          </button>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600 outline-none font-medium"
          />
        </div>

        {activeTab !== 'categories' && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">Loading catalog masters...</p>
        </div>
      ) : activeTab === 'categories' ? (
        /* Categories Table */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3.5">Category Name</th>
                <th className="p-3.5">Scope / Type</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-center">Linked Items</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No item categories found. Click "Add Category" to create your first master category.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-gray-900">{c.name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[10px]">
                        {c.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-500">{c.description || '-'}</td>
                    <td className="p-3.5 text-center font-bold text-gray-900">
                      {c._count?.items || 0}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingCatId(c.id);
                          setCatName(c.name);
                          setCatDesc(c.description || '');
                          setCatType(c.type || 'BOTH');
                          setIsCatModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: c.id, name: c.name, type: 'category' })}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Products / Services Table */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Item Code / SKU</th>
                  <th className="p-3.5">Item Name & Description</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">HSN/SAC</th>
                  {activeTab === 'products' && <th className="p-3.5 text-center">Stock</th>}
                  <th className="p-3.5 text-right">Sale Price (₹)</th>
                  <th className="p-3.5 text-right">GST %</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No {activeTab} found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3.5 font-mono text-gray-600 font-semibold">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px]">
                          {it.sku || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 text-sm">{it.name}</div>
                        {it.description && (
                          <div className="text-[11px] text-gray-400 line-clamp-1 italic">
                            {it.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {it.category ? (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold">
                            {it.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-gray-600">{it.hsnSac || '-'}</td>
                      {activeTab === 'products' && (
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              it.currentStock <= 5
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {it.currentStock} {it.unit}
                          </span>
                        </td>
                      )}
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                        ₹{Number(it.salesRate).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-gray-700">
                        {it.gstPercentage}%
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(it)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider transition-all ${
                            it.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {it.isActive ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-gray-400" />}
                          {it.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleDuplicateItem(it)}
                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg"
                          title="Duplicate Item"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenItemModal(it, it.type)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                          title="Edit Item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: it.id, name: it.name, type: 'item' })}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Add/Edit Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in duration-200">
            <div className="p-6 bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingItemId ? 'Edit Master Item' : `Add New ${itemType === 'SERVICE' ? 'Service' : 'Product'}`}
                </h3>
                <p className="text-xs text-gray-300">Set rates, HSN/SAC, GST%, and category details.</p>
              </div>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs font-medium">
              {/* Type Switcher */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setItemType('PRODUCT');
                    if (!editingItemId) handleAutoGenerateSku('PRODUCT');
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    itemType === 'PRODUCT' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  Product Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemType('SERVICE');
                    if (!editingItemId) handleAutoGenerateSku('SERVICE');
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    itemType === 'SERVICE' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  Service Item
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Incense Stick Raw Material or Magazine Banner Ad"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-700 font-bold">SKU / Item Code</label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateSku(itemType)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. PRD-1001"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={hsnSac}
                    onChange={(e) => setHsnSac(e.target.value)}
                    placeholder="e.g. 33074100 or 998363"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. Pcs, Kg, Units, Hours"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Sales Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salesRate}
                    onChange={(e) => setSalesRate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">GST Tax Rate (%)</label>
                  <select
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (Reduced GST)</option>
                    <option value={12}>12% (Standard GST)</option>
                    <option value={18}>18% (Standard GST)</option>
                    <option value={28}>28% (Luxury GST)</option>
                  </select>
                </div>

                {itemType === 'PRODUCT' && (
                  <>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Purchase Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Opening / Current Stock</label>
                      <input
                        type="number"
                        value={currentStock}
                        onChange={(e) => setCurrentStock(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs focus:bg-white outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">Description / Subtext</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Default description or invoice line notes..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Active Master Item
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingItem}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {savingItem ? 'Saving Master...' : 'Save Item'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-5 bg-gray-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingCatId ? 'Edit Category' : 'Add Item Category'}</h3>
              <button onClick={() => setIsCatModalOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Raw Materials, Publishing, Consulting"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Category Scope</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="BOTH">Both Products & Services</option>
                  <option value="PRODUCT">Products Only</option>
                  <option value="SERVICE">Services Only</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category purpose..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
                >
                  {savingCat ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Preview Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-5 bg-indigo-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Preview CSV Import ({importJson.length} items found)</h3>
              <button onClick={() => setIsImportModalOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs font-medium max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold text-[10px] uppercase">
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">HSN/SAC</th>
                    <th className="p-2 text-right">Rate (₹)</th>
                    <th className="p-2 text-right">GST %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importJson.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 font-bold">{row.name}</td>
                      <td className="p-2">{row.type}</td>
                      <td className="p-2 font-mono">{row.sku || '-'}</td>
                      <td className="p-2 font-mono">{row.hsnSac || '-'}</td>
                      <td className="p-2 text-right font-bold">₹{row.salesRate}</td>
                      <td className="p-2 text-right">{row.gstPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md"
              >
                {importing ? 'Importing...' : 'Execute Import Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Confirm Delete</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-gray-900">"{deleteTarget.name}"</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminItems;
