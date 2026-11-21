import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SharedHeader from '@/shared/components/SharedHeader';
import { Plus, Building2, History, Briefcase, ChevronDown, Settings, ShieldCheck } from 'lucide-react';

interface SuperAdminHeaderProps {
  onToggleSidebar: () => void;
  isCollapsed?: boolean;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ onToggleSidebar, isCollapsed = false }) => {
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  const rightAction = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsQuickOpen(!isQuickOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 border border-purple-400/40"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Executive Action</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {isQuickOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 py-2 z-50 text-xs text-slate-200">
          <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Super Admin Controls
          </div>
          <Link
            to="/super-admin/admins"
            onClick={() => setIsQuickOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-800 hover:text-purple-400 transition-colors font-medium"
          >
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Create & Manage Admins</span>
          </Link>
          <Link
            to="/super-admin/permissions"
            onClick={() => setIsQuickOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-800 hover:text-purple-400 transition-colors font-medium"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Roles & Permissions (RBAC)</span>
          </Link>
          <Link
            to="/super-admin/activity-logs"
            onClick={() => setIsQuickOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-800 hover:text-purple-400 transition-colors font-medium"
          >
            <History className="w-4 h-4 text-purple-400" />
            <span>System Audit Logs</span>
          </Link>
          <Link
            to="/super-admin/settings"
            onClick={() => setIsQuickOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-800 hover:text-purple-400 transition-colors font-medium"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>Global System Settings</span>
          </Link>
          <div className="my-1 border-t border-slate-800" />
          <Link
            to="/admin/dashboard"
            onClick={() => setIsQuickOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-800 hover:text-emerald-400 transition-colors font-medium text-slate-300"
          >
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Switch to CRM View</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <SharedHeader
      role="Super Admin"
      title="Super Admin Panel"
      onToggleSidebar={onToggleSidebar}
      isCollapsed={isCollapsed}
      rightAction={rightAction}
    />
  );
};

export default SuperAdminHeader;
