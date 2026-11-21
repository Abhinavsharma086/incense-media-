import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Check,
  X,
  Save,
  Loader2,
  Lock,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Plus,
  Zap,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchAdminsApi,
  fetchAdminPermissionKeysApi,
  updateAdminPermissionKeysApi,
  copyAdminPermissionsApi,
  fetchPermissionTemplatesApi,
  createPermissionTemplateApi,
  applyPermissionTemplateApi,
  AdminUser,
} from '@/api/superAdminApi';
import { toast } from 'sonner';

interface ModuleConfig {
  key: string;
  name: string;
  desc: string;
  functions: { action: string; key: string; label: string; desc: string }[];
}

const MODULE_DEFINITIONS: ModuleConfig[] = [
  {
    key: 'users',
    name: 'Users & Internal Staff',
    desc: 'Manage company employees, team assignments, and user profiles',
    functions: [
      { action: 'view', key: 'users.view', label: 'View Staff & Users', desc: 'Can view user directory and profiles' },
      { action: 'create', key: 'users.create', label: 'Create Users', desc: 'Can add new staff accounts' },
      { action: 'edit', key: 'users.edit', label: 'Edit Users', desc: 'Can edit user details and roles' },
      { action: 'delete', key: 'users.delete', label: 'Delete Users', desc: 'Can delete user accounts' },
      { action: 'export', key: 'users.export', label: 'Export User Data', desc: 'Can export user lists to CSV' },
      { action: 'approve', key: 'users.approve', label: 'Approve User Requests', desc: 'Can approve staff role upgrades' },
    ],
  },
  {
    key: 'admins',
    name: 'Admin Accounts',
    desc: 'Manage admin user accounts and account statuses',
    functions: [
      { action: 'view', key: 'admins.view', label: 'View Admin Accounts', desc: 'Can view admin list' },
      { action: 'create', key: 'admins.create', label: 'Create Admins', desc: 'Can create new admin accounts' },
      { action: 'edit', key: 'admins.edit', label: 'Edit Admins', desc: 'Can modify admin details' },
      { action: 'delete', key: 'admins.delete', label: 'Delete Admins', desc: 'Can delete admin accounts' },
      { action: 'export', key: 'admins.export', label: 'Export Admin List', desc: 'Can export admin details' },
      { action: 'approve', key: 'admins.approve', label: 'Approve Admins', desc: 'Can approve admin requests' },
    ],
  },
  {
    key: 'leads',
    name: 'CRM Leads & Pipeline',
    desc: 'Lead management, stages, assignment, and profile notes',
    functions: [
      { action: 'view', key: 'leads.view', label: 'View Leads', desc: 'Can view lead lists and profiles' },
      { action: 'create', key: 'leads.create', label: 'Create Leads', desc: 'Can add new leads' },
      { action: 'edit', key: 'leads.edit', label: 'Edit Leads', desc: 'Can edit lead status and details' },
      { action: 'delete', key: 'leads.delete', label: 'Delete Leads', desc: 'Can delete leads' },
      { action: 'export', key: 'leads.export', label: 'Export Leads', desc: 'Can export leads to Excel/CSV' },
      { action: 'approve', key: 'leads.approve', label: 'Approve Lead Reassignment', desc: 'Can approve lead transfers' },
    ],
  },
  {
    key: 'deals',
    name: 'CRM Deals & Sales',
    desc: 'Sales pipeline, deal stages, and revenue forecasts',
    functions: [
      { action: 'view', key: 'deals.view', label: 'View Deals', desc: 'Can view sales pipeline deals' },
      { action: 'create', key: 'deals.create', label: 'Create Deals', desc: 'Can create new sales deals' },
      { action: 'edit', key: 'deals.edit', label: 'Edit Deals', desc: 'Can update deal values and stages' },
      { action: 'delete', key: 'deals.delete', label: 'Delete Deals', desc: 'Can delete deals' },
      { action: 'export', key: 'deals.export', label: 'Export Deals', desc: 'Can export deal reports' },
      { action: 'approve', key: 'deals.approve', label: 'Approve Discount / Value Override', desc: 'Can approve special deal terms' },
    ],
  },
  {
    key: 'orders',
    name: 'Sales Orders',
    desc: 'Customer orders and fulfillment status',
    functions: [
      { action: 'view', key: 'orders.view', label: 'View Orders', desc: 'Can view customer sales orders' },
      { action: 'create', key: 'orders.create', label: 'Create Orders', desc: 'Can create new orders' },
      { action: 'edit', key: 'orders.edit', label: 'Edit Orders', desc: 'Can update order items and status' },
      { action: 'delete', key: 'orders.delete', label: 'Cancel / Delete Orders', desc: 'Can cancel or delete orders' },
      { action: 'export', key: 'orders.export', label: 'Export Orders', desc: 'Can export order records' },
      { action: 'approve', key: 'orders.approve', label: 'Approve Fulfillment', desc: 'Can approve order shipping' },
    ],
  },
  {
    key: 'payments',
    name: 'Payments & Receipts',
    desc: 'Payment receipts, bank transfers, and client ledgers',
    functions: [
      { action: 'view', key: 'payments.view', label: 'View Payments', desc: 'Can view payment receipts' },
      { action: 'create', key: 'payments.create', label: 'Create Payment Voucher', desc: 'Can record payment receipts' },
      { action: 'edit', key: 'payments.edit', label: 'Edit Payment', desc: 'Can modify payment entries' },
      { action: 'delete', key: 'payments.delete', label: 'Delete Payment Entry', desc: 'Can delete payment receipts' },
      { action: 'export', key: 'payments.export', label: 'Export Payment Ledger', desc: 'Can export payment reports' },
      { action: 'approve', key: 'payments.approve', label: 'Approve Settlement', desc: 'Can approve payment settlements' },
    ],
  },
  {
    key: 'accounting',
    name: 'BUSY ERP & Invoices',
    desc: 'GST Invoices, Proformas, Parties, SKUs, and BUSY ERP Sync',
    functions: [
      { action: 'view', key: 'accounting.view', label: 'View Invoices & ERP', desc: 'Can view GST invoices and BUSY sync' },
      { action: 'create', key: 'accounting.create', label: 'Create GST Invoice / PI', desc: 'Can generate new invoices' },
      { action: 'edit', key: 'accounting.edit', label: 'Edit Invoice', desc: 'Can edit invoice items' },
      { action: 'delete', key: 'accounting.delete', label: 'Cancel / Delete Invoice', desc: 'Can cancel or delete invoices' },
      { action: 'export', key: 'accounting.export', label: 'Export Financial Reports', desc: 'Can export tax reports' },
      { action: 'approve', key: 'accounting.approve', label: 'Approve BUSY Sync Pushes', desc: 'Can approve ERP voucher pushes' },
    ],
  },
  {
    key: 'products',
    name: 'Products & SKUs',
    desc: 'Product catalog, prices, HSN codes, and inventory levels',
    functions: [
      { action: 'view', key: 'products.view', label: 'View Product Catalog', desc: 'Can view product listing' },
      { action: 'create', key: 'products.create', label: 'Add Product SKU', desc: 'Can create new products' },
      { action: 'edit', key: 'products.edit', label: 'Edit Product Details', desc: 'Can edit SKU rates and GST' },
      { action: 'delete', key: 'products.delete', label: 'Delete Product SKU', desc: 'Can delete product items' },
      { action: 'export', key: 'products.export', label: 'Export Catalog', desc: 'Can export product lists' },
      { action: 'approve', key: 'products.approve', label: 'Approve Stock Adjustments', desc: 'Can approve inventory updates' },
    ],
  },
  {
    key: 'reports',
    name: 'Executive Reports',
    desc: 'System-wide analytics, revenue reports, and team performance',
    functions: [
      { action: 'view', key: 'reports.view', label: 'View Reports', desc: 'Can view system reports' },
      { action: 'create', key: 'reports.create', label: 'Generate Custom Reports', desc: 'Can build custom reports' },
      { action: 'edit', key: 'reports.edit', label: 'Edit Report Parameters', desc: 'Can edit report filters' },
      { action: 'delete', key: 'reports.delete', label: 'Delete Report Drafts', desc: 'Can delete custom reports' },
      { action: 'export', key: 'reports.export', label: 'Export PDF / Excel Reports', desc: 'Can download report files' },
      { action: 'approve', key: 'reports.approve', label: 'Approve Executive Summaries', desc: 'Can publish official reports' },
    ],
  },
  {
    key: 'settings',
    name: 'Global Settings',
    desc: 'Company settings, invoice prefixes, terms, and site config',
    functions: [
      { action: 'view', key: 'settings.view', label: 'View Settings', desc: 'Can view configuration settings' },
      { action: 'create', key: 'settings.create', label: 'Add Config Keys', desc: 'Can add new setting keys' },
      { action: 'edit', key: 'settings.edit', label: 'Modify Settings', desc: 'Can edit site configuration' },
      { action: 'delete', key: 'settings.delete', label: 'Delete Config Keys', desc: 'Can delete setting keys' },
      { action: 'export', key: 'settings.export', label: 'Export System Config', desc: 'Can export setting logs' },
      { action: 'approve', key: 'settings.approve', label: 'Approve Setting Changes', desc: 'Can approve system setting changes' },
    ],
  },
];

export const SuperAdminPermissions: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copyFromId, setCopyFromId] = useState('');
  const [isTemplateSaveOpen, setIsTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  // Expand all by default
  useEffect(() => {
    const map: Record<string, boolean> = {};
    MODULE_DEFINITIONS.forEach((m) => (map[m.key] = true));
    setExpandedModules(map);
  }, []);

  // Load Admin list & Templates
  useEffect(() => {
    const init = async () => {
      try {
        const [admRes, tempRes] = await Promise.all([
          fetchAdminsApi({ limit: 50 }),
          fetchPermissionTemplatesApi(),
        ]);
        const list = admRes.data || [];
        setAdmins(list);
        setTemplates(tempRes || []);
        if (list.length > 0) {
          setSelectedAdminId(list[0].id);
        }
      } catch (err) {
        toast.error('Failed to initialize permission manager');
      }
    };
    init();
  }, []);

  // Load permission keys for selected Admin
  useEffect(() => {
    if (!selectedAdminId) return;

    const loadKeys = async () => {
      try {
        setLoading(true);
        const res = await fetchAdminPermissionKeysApi(selectedAdminId);
        const rawMap: Record<string, boolean> = res.permissions || {};

        // Ensure all module.action keys are represented in state
        const fullMap: Record<string, boolean> = {};
        for (const mod of MODULE_DEFINITIONS) {
          for (const fn of mod.functions) {
            fullMap[fn.key] = rawMap[fn.key] ?? false; // DEFAULT DENIED IF NOT FOUND
          }
        }
        setPermissions(fullMap);
      } catch (err) {
        toast.error('Failed to load permission keys for selected admin');
      } finally {
        setLoading(false);
      }
    };

    loadKeys();
  }, [selectedAdminId]);

  // Toggle single function key
  const handleToggleKey = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle Module (Select All / Deselect All per module)
  const handleToggleModuleAll = (moduleKey: string, enableAll: boolean) => {
    const mod = MODULE_DEFINITIONS.find((m) => m.key === moduleKey);
    if (!mod) return;

    setPermissions((prev) => {
      const next = { ...prev };
      for (const fn of mod.functions) {
        next[fn.key] = enableAll;
      }
      return next;
    });
  };

  // Toggle Module Expand/Collapse
  const toggleExpand = (modKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  // Save Permissions
  const handleSave = async () => {
    if (!selectedAdminId) return;
    try {
      setSaving(true);
      await updateAdminPermissionKeysApi(selectedAdminId, permissions);
      toast.success('Permissions updated instantly across all Admin client sessions!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update permission keys');
    } finally {
      setSaving(false);
    }
  };

  // Copy Permissions Submit
  const handleCopySubmit = async () => {
    if (!copyFromId || !selectedAdminId) return;
    try {
      await copyAdminPermissionsApi(copyFromId, selectedAdminId);
      toast.success('Permissions copied successfully!');
      setIsCopyOpen(false);
      // reload keys
      const res = await fetchAdminPermissionKeysApi(selectedAdminId);
      setPermissions(res.permissions || {});
    } catch (err) {
      toast.error('Failed to copy permissions');
    }
  };

  // Save as Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName) return;

    const allowedKeys = Object.entries(permissions)
      .filter(([_, allowed]) => allowed)
      .map(([k]) => k);

    try {
      await createPermissionTemplateApi({
        name: templateName,
        description: templateDesc,
        permissions: allowedKeys,
      });
      toast.success(`Template '${templateName}' saved successfully!`);
      setIsTemplateSaveOpen(false);
      setTemplateName('');
      setTemplateDesc('');
      const res = await fetchPermissionTemplatesApi();
      setTemplates(res || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save template');
    }
  };

  // Apply Template
  const handleApplyTemplate = async (templateId: string) => {
    if (!templateId || !selectedAdminId) return;
    try {
      setLoading(true);
      await applyPermissionTemplateApi(selectedAdminId, templateId);
      toast.success('Permission template applied successfully!');
      const res = await fetchAdminPermissionKeysApi(selectedAdminId);
      setPermissions(res.permissions || {});
    } catch (err) {
      toast.error('Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Granular Function Permission Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Allow or deny every function key (<code className="bg-slate-100 text-purple-700 px-1 rounded-sm">module.action</code>) per Admin ID. Denied functions and modules are completely invisible to that Admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsCopyOpen(true)}
            variant="outline"
            className="text-xs font-semibold px-3 py-2 h-9 flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-purple-600" /> Copy From Admin
          </Button>

          <Button
            onClick={() => setIsTemplateSaveOpen(true)}
            variant="outline"
            className="text-xs font-semibold px-3 py-2 h-9 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" /> Save as Template
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5 py-2 h-9 shadow-md flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Applying...' : 'Save Permissions'}
          </Button>
        </div>
      </div>

      {/* Select Admin & Template Selector Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">Select Admin Account to Configure</label>
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
            >
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.firstName} {admin.lastName} ({admin.email}) — Role: {admin.role?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Apply Template Selector */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Apply Template:</span>
          <select
            onChange={(e) => {
              if (e.target.value) handleApplyTemplate(e.target.value);
            }}
            defaultValue=""
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500"
          >
            <option value="" disabled>
              Select reusable template...
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Accordion Module List */}
      <div className="space-y-4">
        {MODULE_DEFINITIONS.map((mod) => {
          const isExpanded = expandedModules[mod.key] ?? true;
          const allowedCount = mod.functions.filter((f) => permissions[f.key]).length;
          const totalCount = mod.functions.length;
          const isAllAllowed = allowedCount === totalCount;
          const isNoneAllowed = allowedCount === 0;

          return (
            <div key={mod.key} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Module Header */}
              <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(mod.key)}>
                  <button className="text-slate-500 hover:text-slate-900">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {mod.name}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isNoneAllowed
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isAllAllowed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {allowedCount} of {totalCount} Functions Allowed
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{mod.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleModuleAll(mod.key, true)}
                    className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Allow All
                  </button>
                  <button
                    onClick={() => handleToggleModuleAll(mod.key, false)}
                    className="text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5" /> Deny All
                  </button>
                </div>
              </div>

              {/* Function Keys Grid */}
              {isExpanded && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white">
                  {mod.functions.map((fn) => {
                    const isAllowed = Boolean(permissions[fn.key]);
                    return (
                      <div
                        key={fn.key}
                        onClick={() => handleToggleKey(fn.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between select-none ${
                          isAllowed
                            ? 'bg-purple-50/50 border-purple-300 shadow-2xs'
                            : 'bg-slate-50/50 border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-sm font-semibold">
                              {fn.key}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 mt-1.5">{fn.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-normal">{fn.desc}</div>
                        </div>

                        {/* Toggle Switch */}
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${isAllowed ? 'bg-purple-600' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAllowed ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Bar */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xl">
        <div className="text-xs text-slate-300">
          Super Admin override applies instantly without redeploy or user re-login.
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs px-6 py-2 rounded-xl shadow-md"
        >
          {saving ? 'Applying...' : 'Save & Apply Permissions Instantly'}
        </Button>
      </div>

      {/* COPY PERMISSIONS MODAL */}
      {isCopyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Copy Permissions from Another Admin</h3>
            <p className="text-xs text-slate-500">
              Copy all function permission toggles from a source Admin into <strong>{selectedAdmin?.email}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Admin Account</label>
              <select
                value={copyFromId}
                onChange={(e) => setCopyFromId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="" disabled>
                  Select source admin...
                </option>
                {admins
                  .filter((a) => a.id !== selectedAdminId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName} ({a.email})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsCopyOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleCopySubmit} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-5">
                Copy Permissions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE TEMPLATE MODAL */}
      {isTemplateSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Save Reusable Permission Template</h3>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Manager Template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description of this template"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsTemplateSaveOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5">
                  Save Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPermissions;
