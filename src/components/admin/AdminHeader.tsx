import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  UserPlus,
  Package,
  ChevronDown,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import SharedHeader from '@/shared/components/SharedHeader';

interface AdminHeaderProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ isCollapsed = false, onToggle }) => {
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const notifications = [
    { id: 1, title: 'New Lead Assigned', desc: 'John Doe submitted an inquiry.', time: '5m ago', unread: true },
    { id: 2, title: 'Invoice Paid', desc: 'Invoice #INV-2026-004 settled.', time: '1h ago', unread: true },
    { id: 3, title: 'Meeting Reminder', desc: 'Sales sync scheduled at 4:00 PM.', time: '3h ago', unread: false },
  ];

  const rightActionContent = (
    <div className="flex items-center space-x-2 sm:space-x-3">
      {/* Quick Actions Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setIsQuickOpen(!isQuickOpen);
            setIsNotifOpen(false);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center gap-2 border border-indigo-400/30"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Create</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {isQuickOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50 text-white">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">
              Quick Actions
            </div>
            <Link
              to="/admin/leads"
              onClick={() => setIsQuickOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-indigo-400 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Add New Lead</span>
            </Link>
            <Link
              to="/admin/settings?tab=items"
              onClick={() => setIsQuickOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-indigo-400 transition-colors"
            >
              <Package className="w-4 h-4 text-indigo-400" />
              <span>Add Master Product</span>
            </Link>
          </div>
        )}
      </div>

      {/* Notifications Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setIsNotifOpen(!isNotifOpen);
            setIsQuickOpen(false);
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900"></span>
        </button>

        {isNotifOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50 text-white">
            <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold text-white">Notifications</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                3 New
              </span>
            </div>
            <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-200">{n.title}</span>
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{n.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Toggle theme mode"
      >
        {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <SharedHeader
      role="Admin"
      title="Admin Control Panel"
      onToggleSidebar={onToggle || (() => {})}
      rightAction={rightActionContent}
    />
  );
};

export default AdminHeader;