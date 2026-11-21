import React from 'react';
import { ROLE_THEMES, RoleType } from '../theme/tokens';
import { LucideIcon } from 'lucide-react';

interface SharedStatCardProps {
  role?: RoleType;
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  subtitle?: string;
}

export const SharedStatCard: React.FC<SharedStatCardProps> = ({
  role = 'Admin',
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  subtitle,
}) => {
  const theme = ROLE_THEMES[role] || ROLE_THEMES['Admin'];

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-lg ${theme.badgeBgClass} ${theme.badgeTextClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {change && (
            <span
              className={`text-xs font-bold ${
                isPositive ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded'
              }`}
            >
              {isPositive ? `+${change}` : change}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};

export default SharedStatCard;
