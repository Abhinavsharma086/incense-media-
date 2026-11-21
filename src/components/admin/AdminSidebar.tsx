import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Menu,
  Search,
  PinOff,
  X,
  Sparkles,
  Boxes,
} from 'lucide-react';
import { getRole } from '@/lib/auth';
import {
  ADMIN_MENU_CONFIG,
  AdminMenuItem,
  AdminSubMenuItem,
} from '@/config/adminMenuConfig';
import { ROLE_THEMES } from '@/shared/theme/tokens';

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const BADGE_COUNTS: Record<string, number> = {
  leads: 12,
  followups: 4,
  orders: 8,
  inquiries: 3,
};

import { usePermission } from '@/context/PermissionContext';

const ITEM_PERMISSION_MAP: Record<string, string> = {
  dashboard: '',
  reports: 'reports.view',
  employees: 'users.view',
  team: 'users.view',
  users: 'users.view',
  leads: 'leads.view',
  kanban: 'leads.view',
  duplicates: 'leads.view',
  analytics: 'leads.view',
  pipeline: 'deals.view',
  deals: 'deals.view',
  followups: 'leads.view',
  scoring: 'leads.view',
  campaigns: 'campaigns.view',
  units: 'units.view',
  meta: 'meta.view',
  leadforms: 'meta.view',
  products: 'products.view',
  orders: 'orders.view',
  invoices: 'accounting.view',
  proformas: 'accounting.view',
  payments: 'payments.view',
  parties: 'accounting.view',
  accounting: 'accounting.view',
  synclogs: 'accounting.view',
  settings: 'settings.view',
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed = false, onToggle, onClose }) => {
  const location = useLocation();
  const userRole = getRole() || 'Admin';
  const theme = ROLE_THEMES['Admin'];
  const { can } = usePermission();

  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedItemIds, setPinnedItemIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_pinned_menu_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((id: string) => id !== 'invoices' && id !== 'acc-invoices' && id !== 'billing');
      }
      return ['dashboard', 'leads'];
    } catch {
      return ['dashboard', 'leads'];
    }
  });

  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  };

  const togglePin = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedItemIds((prev) => {
      const updated = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem('crm_pinned_menu_ids', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategoryGroup = (category: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ADMIN_MENU_CONFIG.map((group) => {
      const allowedItems = group.items.filter((item) => {
        const isRoleAllowed =
          !item.roles || item.roles.map((r) => r.toLowerCase()).includes(userRole.toLowerCase());

        if (!isRoleAllowed) return false;

        // Check permission toggle key
        const permKey = ITEM_PERMISSION_MAP[item.id];
        if (permKey && !can(permKey)) {
          return false; // COMPLETELY INVISIBLE WHEN DENIED
        }

        if (!query) return true;

        const matchesTitle = item.label.toLowerCase().includes(query);
        const matchesSub = item.items?.some((sub) => sub.label.toLowerCase().includes(query));

        return matchesTitle || matchesSub;
      });

      return {
        ...group,
        items: allowedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [userRole, searchQuery, can]);

  const allFlattenedItems = useMemo(() => {
    const list: AdminMenuItem[] = [];
    ADMIN_MENU_CONFIG.forEach((g) => {
      g.items.forEach((item) => {
        list.push(item);
      });
    });
    return list;
  }, []);

  const pinnedItems = useMemo(() => {
    return allFlattenedItems.filter((item) => pinnedItemIds.includes(item.id));
  }, [allFlattenedItems, pinnedItemIds]);

  const isSubActive = (items?: AdminSubMenuItem[]) =>
    items?.some((sub) => location.pathname === sub.path);

  return (
    <aside
      className={`bg-black text-slate-100 h-screen border-r border-zinc-800 font-sans flex flex-col transition-transform lg:transition-all duration-300 ease-in-out select-none overflow-hidden
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:static lg:z-40
        ${
          isCollapsed
            ? '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:pointer-events-none'
            : 'translate-x-0 lg:w-72 opacity-100 shadow-2xl lg:shadow-none'
        }
      `}
    >
      {/* Sidebar Top Header */}
      <div className="p-4 flex-shrink-0 flex items-center justify-between border-b border-zinc-800 bg-black">
        <div className="flex items-center gap-3">
          <div className="text-lg sm:text-xl font-extrabold text-white tracking-tight">Admin Dashboard</div>
        </div>

        <button
          onClick={onToggle}
          className="p-2 rounded-xl text-white hover:bg-zinc-800 transition-colors"
          title="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Search Bar */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search navigation menu..."
            className="w-full pl-9 pr-8 py-2 text-[13px] bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-medium"
          >
          </input>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Menu Container */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Pinned Links Section */}
        {pinnedItems.length > 0 && !searchQuery && (
          <div className="space-y-1.5">
            <div className="px-2.5 mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Pinned Quick Links
              </span>
              <span>({pinnedItems.length})</span>
            </div>
            <div className="space-y-1">
              {pinnedItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path ? location.pathname === item.path : false;
                const badgeCount = item.badgeKey ? BADGE_COUNTS[item.badgeKey] : undefined;

                return (
                  <Link
                    key={`pinned-${item.id}`}
                    to={item.path || '#'}
                    title={item.label}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all group min-h-[40px] ${
                      isActive
                        ? `${theme.activeNavBgClass} ${theme.activeNavTextClass} border-l-4 ${theme.accentBorderClass}`
                        : 'text-slate-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <span className="flex-1 truncate">{item.label}</span>

                    {badgeCount !== undefined && (
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300">
                        {badgeCount}
                      </span>
                    )}

                    <button
                      onClick={(e) => togglePin(item.id, e)}
                      title="Unpin menu link"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity p-1 ml-1"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Categorized Menu Groups */}
        {filteredCategories.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-medium">
            No matching functions found for "{searchQuery}"
          </div>
        ) : (
          filteredCategories.map((group) => {
            const isGroupCollapsed = !!collapsedGroups[group.category];

            return (
              <div key={group.category} className="space-y-1">
                {/* Collapsible Group Label */}
                <button
                  onClick={() => toggleCategoryGroup(group.category)}
                  className="w-full px-2.5 py-1 mb-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                >
                  <span className="truncate">{group.category}</span>
                  {isGroupCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>

                {!isGroupCollapsed && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const hasSub = !!item.items && item.items.length > 0;
                      const isItemActive = item.path ? location.pathname === item.path : false;
                      const isSubItemActive = isSubActive(item.items);
                      const isOpen = openDropdowns[item.id] || isSubItemActive;
                      const badgeCount = item.badgeKey ? BADGE_COUNTS[item.badgeKey] : undefined;

                      if (hasSub) {
                        return (
                          <div key={item.id} className="space-y-1">
                            <button
                              onClick={() => toggleDropdown(item.id)}
                              title={item.label}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all group min-h-[40px] ${
                                isSubItemActive
                                  ? 'bg-slate-800 text-indigo-400 font-bold'
                                  : 'text-slate-300 hover:bg-zinc-800 hover:text-indigo-400'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className={`w-4.5 h-4.5 shrink-0 ${isSubItemActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5 ml-2">
                                {badgeCount !== undefined && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300">
                                    {badgeCount}
                                  </span>
                                )}
                                {isOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                              </div>
                            </button>

                            {/* Sub-menu Items Container */}
                            {isOpen && (
                              <div className="pl-5 ml-3 border-l border-slate-700 my-1 space-y-1">
                                {item.items?.map((sub) => {
                                  const isSubActivePath = location.pathname === sub.path;
                                  return (
                                    <Link
                                      key={sub.id}
                                      to={sub.path}
                                      title={sub.label}
                                      onClick={handleLinkClick}
                                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all ${
                                        isSubActivePath
                                          ? `${theme.activeNavBgClass} ${theme.activeNavTextClass} border-l-2 ${theme.accentBorderClass}`
                                          : 'text-slate-400 hover:bg-zinc-800 hover:text-slate-200'
                                      }`}
                                    >
                                      <span className="truncate">{sub.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.id}
                          to={item.path || '#'}
                          title={item.label}
                          onClick={handleLinkClick}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all group min-h-[40px] ${
                            isItemActive
                              ? 'bg-zinc-800 text-white font-bold shadow-xs border-l-4 border-white'
                              : 'text-slate-300 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={`w-4.5 h-4.5 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {badgeCount !== undefined && (
                            <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                              isItemActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {badgeCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            A
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-slate-200 truncate">Agency CRM v2.4</div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Online System
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;

