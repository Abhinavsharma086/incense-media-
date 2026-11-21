import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout as authLogout } from '@/lib/auth';
import { ROLE_THEMES, RoleType } from '../theme/tokens';
import { Menu, LogOut, Shield, User, Building2 } from 'lucide-react';

interface SharedHeaderProps {
  role: RoleType;
  title: string;
  onToggleSidebar: () => void;
  isCollapsed?: boolean;
  rightAction?: React.ReactNode;
}

export const SharedHeader: React.FC<SharedHeaderProps> = ({
  role,
  title,
  onToggleSidebar,
  isCollapsed = false,
  rightAction,
}) => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const theme = ROLE_THEMES[role] || ROLE_THEMES['Admin'];

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  const getRoleIcon = () => {
    if (role === 'Super Admin') return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
    if (role === 'Admin') return <Building2 className="w-3.5 h-3.5 text-indigo-400" />;
    return <User className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <header className="bg-zinc-800 border-b-2 border-white shadow-md px-3.5 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-30 font-sans text-white">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Sidebar Toggle & Panel Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-zinc-700 text-white transition-colors shrink-0"
            title="Toggle sidebar"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <h1 className="text-sm sm:text-lg lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">{title}</span>
            </h1>

            {/* Single Role Distinction Badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm font-black tracking-wide uppercase bg-zinc-900 text-indigo-300 border border-white/40 shadow-xs shrink-0">
              {getRoleIcon()}
              <span>{theme.badgeLabel}</span>
            </span>
          </div>
        </div>

        {/* Right Side: Optional Actions, Profile & Sign Out */}
        <div className="flex items-center space-x-2 sm:space-x-3.5 shrink-0">
          {rightAction}

          {/* Profile Badge & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l-2 border-white/40">
            <div className="flex items-center space-x-2 px-2.5 sm:px-3.5 py-1.5 bg-zinc-900 rounded-xl border border-white/30 shadow-xs">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                {(user?.name || role).charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:inline text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[140px]">
                {user?.name || role}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 text-zinc-200 hover:text-white hover:bg-zinc-700 rounded-xl transition-all text-xs sm:text-sm font-bold border border-white/20 shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SharedHeader;
