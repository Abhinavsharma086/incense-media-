import React, { useState, useEffect } from 'react';
import { X, Tag, Check, Sparkles, Edit2, ArrowLeft, RefreshCw, Layers, Plus, Trash2, Lock } from 'lucide-react';
import crmApi from '../../api/crmApi';
import { toast } from '../ui/sonner';
import { notifyDataChanged } from '../../lib/useDataSync';

export interface LeadCategoryItem {
  id: string;
  name: string;
  label: string;
  icon?: string;
  color?: string;
  createdBy?: string | null;
}

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded?: (category: LeadCategoryItem) => void;
  onCategoryUpdated?: (category: LeadCategoryItem) => void;
  onCategoryDeleted?: (categoryName: string) => void;
  initialMode?: 'add' | 'manage';
}

export const FOUR_STANDARD_CATEGORIES: LeadCategoryItem[] = [
  { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
  { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
  { id: 'cat-expo-stall', name: 'expo-stall', label: 'Expo Stall', icon: '🏛️', color: 'amber' },
  { id: 'cat-smp', name: 'social-media-promotion', label: 'Social Media Promotion', icon: '📱', color: 'purple' },
];

const PRESET_ICONS = ['📦', '📢', '🏛️', '📱', '🏷️', '📚', '🧪', '🏭', '💼', '🛒', '🔬', '🛢️', '⚡', '🎁', '🚚', '🔥'];

const PRESET_COLORS = [
  { id: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
  onCategoryUpdated,
  onCategoryDeleted,
  initialMode = 'add',
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [categories, setCategories] = useState<LeadCategoryItem[]>(FOUR_STANDARD_CATEGORIES);
  const [loadingList, setLoadingList] = useState(false);

  // Form states for Add / Edit
  const [editingCategory, setEditingCategory] = useState<LeadCategoryItem | null>(null);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState('purple');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch categories when modal opens
  const fetchAllCategories = async () => {
    try {
      setLoadingList(true);
      const res = await crmApi.get('/leads/categories');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setCategories(res.data.data);
      } else {
        setCategories(FOUR_STANDARD_CATEGORIES);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories(FOUR_STANDARD_CATEGORIES);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllCategories();
      setActiveTab(initialMode || 'add');
      setEditingCategory(null);
      resetForm();
    }
  }, [isOpen, initialMode]);

  const resetForm = () => {
    setLabel('');
    setIcon('🏷️');
    setColor('purple');
    setEditingCategory(null);
  };

  if (!isOpen) return null;

  const currentColorObj = PRESET_COLORS.find((c) => c.id === color) || PRESET_COLORS[0];

  const getColorClasses = (colId?: string) => {
    const found = PRESET_COLORS.find((c) => c.id === colId);
    return found ? `${found.bg} ${found.text} ${found.border}` : 'bg-purple-100 text-purple-700 border-purple-300';
  };

  // Start editing an existing category
  const handleStartEdit = (cat: LeadCategoryItem) => {
    setEditingCategory(cat);
    setLabel(cat.label);
    setIcon(cat.icon || '🏷️');
    setColor(cat.color || 'purple');
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    resetForm();
    setActiveTab('manage');
  };

  // Submit Handler for Add & Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      setSaving(true);
      const trimmedLabel = label.trim();
      const slug = trimmedLabel.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '');

      if (editingCategory) {
        // UPDATE Existing Category
        const targetId = editingCategory.id || editingCategory.name;
        let res;
        try {
          res = await crmApi.put(`/leads/categories/${targetId}`, {
            label: trimmedLabel,
            icon,
            color,
          });
        } catch {
          res = await crmApi.post(`/leads/categories/${targetId}/update`, {
            label: trimmedLabel,
            icon,
            color,
          });
        }

        const updatedCat: LeadCategoryItem = res.data?.data || {
          ...editingCategory,
          label: trimmedLabel,
          icon,
          color,
        };

        toast.success(`Category "${updatedCat.label}" updated successfully!`);
        notifyDataChanged('lead_categories', 'update', updatedCat);
        onCategoryUpdated?.(updatedCat);

        setCategories((prev) =>
          prev.map((c) => ((c.id && c.id === updatedCat.id) || c.name === updatedCat.name ? updatedCat : c))
        );

        resetForm();
        setActiveTab('manage');
      } else {
        // CREATE New Category
        const res = await crmApi.post('/leads/categories', {
          label: trimmedLabel,
          name: slug,
          icon,
          color,
        });

        const newCat: LeadCategoryItem = res.data?.data || {
          id: `cat-${Date.now()}`,
          name: slug,
          label: trimmedLabel,
          icon,
          color,
        };

        toast.success(`Category "${newCat.label}" created successfully!`);
        notifyDataChanged('lead_categories', 'create', newCat);
        onCategoryAdded?.(newCat);

        setCategories((prev) => {
          const exists = prev.some((c) => c.name === newCat.name || c.id === newCat.id);
          return exists ? prev : [...prev, newCat];
        });

        resetForm();
        setActiveTab('manage');
      }
    } catch (err: any) {
      console.error('Failed to save category:', err);
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: LeadCategoryItem) => {
    const isCore = FOUR_STANDARD_CATEGORIES.some(c => c.name === cat.name);
    if (isCore) {
      toast.error(`"${cat.label}" is a core business vertical and cannot be deleted.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${cat.label}"?`)) {
      return;
    }

    try {
      setDeletingId(cat.id || cat.name);
      await crmApi.delete(`/leads/categories/${cat.id || cat.name}`).catch(async () => {
        await crmApi.post(`/leads/categories/${cat.id || cat.name}/delete`);
      });

      toast.success(`Category "${cat.label}" deleted successfully.`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id && c.name !== cat.name));
      notifyDataChanged('lead_categories', 'delete', cat);
      onCategoryDeleted?.(cat.name);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {editingCategory
                  ? `Edit Category: ${editingCategory.label}`
                  : activeTab === 'add'
                  ? 'Add Customer Category'
                  : `Customer Categories (${categories.length})`}
              </h3>
              <p className="text-xs text-purple-200">
                {editingCategory
                  ? 'Update category name, emoji icon, or theme color'
                  : activeTab === 'add'
                  ? 'New business vertical or classification'
                  : 'Create, edit, and manage lead business verticals'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="p-3 bg-purple-50/70 border-b border-purple-100 flex gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('add');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
              activeTab === 'add' && !editingCategory
                ? 'bg-purple-700 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Category</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (editingCategory) resetForm();
              setActiveTab('manage');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Edit & Manage ({categories.length})</span>
          </button>

          {editingCategory && (
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className="py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-amber-500 text-white shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editing</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        {activeTab === 'add' ? (
          /* Add / Edit Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {editingCategory && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
                <span>
                  Editing: <strong>{editingCategory.label}</strong> (slug: <code>{editingCategory.name}</code>)
                </span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-amber-800 underline hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to list
                </button>
              </div>
            )}

            {/* Category Name Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Category Name / Vertical <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Machinery, Raw Material, Fragrance..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
                required
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Used for filtering leads, round-robin assignments, and sales reports.
              </p>
            </div>

            {/* Emoji / Icon Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Choose Icon / Emoji
              </label>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                {PRESET_ICONS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                      icon === emoji
                        ? 'bg-white shadow-md border-2 border-purple-600 scale-110'
                        : 'hover:bg-white/60 text-gray-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Tag Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Theme Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      color === c.id
                        ? `${c.bg} ${c.text} ${c.border} ring-2 ring-purple-500 ring-offset-1`
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{c.label}</span>
                    {color === c.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Preview Badge:
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${currentColorObj.bg} ${currentColorObj.text} ${currentColorObj.border} shadow-xs`}
              >
                <span className="mr-1">{icon}</span> {label.trim() || 'Your Category'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={editingCategory ? handleCancelEdit : onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !label.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all cursor-pointer"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Manage Categories List */
          <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Existing Lead Categories ({categories.length})
              </span>
              <button
                type="button"
                onClick={fetchAllCategories}
                disabled={loadingList}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => {
                const isCore = FOUR_STANDARD_CATEGORIES.some(c => c.name === cat.name);
                return (
                  <div
                    key={cat.id || cat.name}
                    className="p-3 bg-gray-50 hover:bg-purple-50/40 border border-gray-200 hover:border-purple-200 rounded-xl flex items-center justify-between transition group"
                  >
                    {/* Left: Category Badge & Details */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black border ${getColorClasses(
                          cat.color
                        )} shadow-2xs shrink-0`}
                      >
                        <span className="mr-1">{cat.icon || '🏷️'}</span>
                        <span>{cat.label}</span>
                      </span>
                      <div className="text-[11px] text-gray-400 font-mono truncate hidden sm:inline">
                        slug: {cat.name}
                      </div>
                    </div>

                    {/* Right: Edit and Delete / Fixed */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        title={`Edit "${cat.label}" name, icon, or color`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {isCore ? (
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-not-allowed"
                          title="Core business vertical: cannot be deleted"
                          disabled
                        >
                          <Lock className="w-3 h-3" />
                          <span className="hidden sm:inline">Fixed</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={deletingId === (cat.id || cat.name)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title={`Delete "${cat.label}"`}
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
              <span className="font-medium">
                Click <strong>+ Add New Category</strong> above to add more business verticals.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-purple-700 text-white font-bold rounded-lg text-xs hover:bg-purple-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddCategoryModal;
