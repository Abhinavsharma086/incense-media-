import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Grid,
  History,
  Settings,
  ShieldAlert,
  ArrowRight,
  Briefcase,
  Menu,
  Lock,
} from 'lucide-react';
import { ROLE_THEMES } from '@/shared/theme/tokens';

interface MenuItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: string;
}

interface SuperAdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ isCollapsed = false, onToggle, onClose }) => {
  const location = useLocation();
  const theme = ROLE_THEMES['Super Admin'];

  const coreNavItems: MenuItem[] = [
    { label: 'Executive Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
    { label: 'Admin Accounts', path: '/super-admin/admins', icon: Building2 },
    { label: 'Employee Accounts', path: '/super-admin/employees', icon: Users, badge: 'Staff' },
    { label: 'Roles & Permissions', path: '/super-admin/permissions', icon: ShieldCheck, badge: 'RBAC' },
    { label: 'Module Override', path: '/super-admin/modules', icon: Grid },
    { label: 'Activity & Audit Logs', path: '/super-admin/activity-logs', icon: History },
    { label: 'Global Settings', path: '/super-admin/settings', icon: Settings },
    { label: 'Security & 2FA', path: '/super-admin/security', icon: Lock },
  ];

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
      {/* Brand Header */}
      <div className="p-4 flex-shrink-0 flex items-center justify-between border-b border-zinc-800 bg-black">
        <div className="flex items-center gap-3">
          <div className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Super Admin Panel
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-xl text-white hover:bg-zinc-800 transition-colors"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            A-to-Z Control Panel
          </div>
          <nav className="space-y-1">
            {coreNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    onClose?.();
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-zinc-800 text-white font-bold shadow-xs border-l-4 border-white'
                      : 'text-slate-300 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Switch Workspace Card */}
        <div className="mt-8 pt-4 border-t border-slate-800">
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace Switcher
          </div>
          <Link
            to="/admin/dashboard"
            onClick={() => onClose?.()}
            className="group block p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-purple-500/40 hover:bg-zinc-800 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-slate-200 group-hover:text-purple-400 transition-colors truncate">
                    Company CRM View
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">Switch to Admin Workspace</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
            SA
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-[11px]">Super Admin</div>
            <div className="text-[10px] text-slate-400">Root System Access</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
