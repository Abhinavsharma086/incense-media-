import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import crmApi from '@/api/crmApi';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  BarChart3,
  UserCheck,
  Menu,
  BellRing,
  CalendarClock,
} from 'lucide-react';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { ROLE_THEMES } from '@/shared/theme/tokens';

interface EmployeeSidebarProps {
  isCollapsed: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({ isCollapsed, onToggle, onClose }) => {
  const location = useLocation();
  const user = getCurrentUser();
  const theme = ROLE_THEMES['Employee'];

  const [reminderCount, setReminderCount] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [leadReminderTodayCount, setLeadReminderTodayCount] = useState<number>(0);
  const [leadReminderOverdueCount, setLeadReminderOverdueCount] = useState<number>(0);

  React.useEffect(() => {
    crmApi.get('/accounting/reminders/counts')
      .then((res) => {
        if (res.data?.counts) {
          setReminderCount(res.data.counts.pending || 0);
          setOverdueCount(res.data.counts.overdue || 0);
        }
      })
      .catch(() => {});

    crmApi.get('/leads/reminders/counts')
      .then((res) => {
        if (res.data?.counts) {
          setLeadReminderTodayCount(res.data.counts.today || 0);
          setLeadReminderOverdueCount(res.data.counts.overdue || 0);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  const allItems = [
    {
      label: 'Dashboard',
      path: '/employee/dashboard',
      icon: LayoutDashboard,
      allowed: hasPermission('dashboard', 'view'),
    },
    {
      label: 'My Assigned Leads',
      path: '/employee/leads',
      icon: UserCheck,
      allowed: hasPermission('leads', 'view'),
    },
    {
      label: 'Lead Reminders',
      path: '/employee/lead-reminders',
      icon: CalendarClock,
      allowed: hasPermission('leadReminders', 'view'),
      badge: leadReminderOverdueCount > 0 
        ? `${leadReminderOverdueCount} Overdue` 
        : (leadReminderTodayCount > 0 ? `${leadReminderTodayCount} Today` : null),
      badgeColor: leadReminderOverdueCount > 0 
        ? 'bg-rose-500 text-white animate-pulse' 
        : 'bg-amber-500 text-white font-black',
    },
    {
      label: 'Payment Reminders',
      path: '/employee/reminders',
      icon: BellRing,
      allowed: hasPermission('paymentReminders', 'view'),
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : (reminderCount > 0 ? `${reminderCount}` : null),
      badgeColor: overdueCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-400 text-zinc-950 font-black',
    },
    {
      label: 'Billing & Invoices',
      path: '/employee/invoices',
      icon: FileText,
      allowed: hasPermission('invoices', 'view'),
    },
    {
      label: 'Payments',
      path: '/employee/payments',
      icon: DollarSign,
      allowed: hasPermission('payments', 'view'),
    },
    {
      label: 'Reports',
      path: '/employee/reports',
      icon: BarChart3,
      allowed: hasPermission('reports', 'view'),
    },
  ];

  const visibleItems = allItems.filter((item) => item.allowed);

  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  };

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
      <div className="p-4 flex-shrink-0 flex items-center justify-between border-b border-zinc-800 bg-black">
        <div className="flex items-center gap-3">
          <div className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Employee Portal
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-xl text-white hover:bg-zinc-800 transition-colors"
          title="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-4">
        <nav>
          <ul className="space-y-1.5" style={{ listStyleType: 'none', paddingLeft: 0, marginLeft: 0 }}>
            {visibleItems.length === 0 ? (
              <li className="text-xs text-slate-400 p-4 text-center">No modules assigned yet.</li>
            ) : (
              visibleItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`flex items-center px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-200 min-h-[40px] ${
                        isActive
                          ? 'bg-zinc-800 text-white font-bold shadow-xs border-l-4 border-white'
                          : 'text-slate-300 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 mr-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor || 'bg-amber-400 text-zinc-950'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 text-[12px] text-slate-400 text-center bg-slate-900 truncate">
        {user?.companyName || 'Company Portal'}
      </div>
    </aside>
  );
};

export default EmployeeSidebar;

