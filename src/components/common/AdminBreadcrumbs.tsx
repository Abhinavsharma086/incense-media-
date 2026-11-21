import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ADMIN_MENU_CONFIG } from '@/config/adminMenuConfig';

export const AdminBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  // Find category and item details for current path
  let currentCategory = '';
  let parentItemName = '';
  let currentPageName = '';

  for (const group of ADMIN_MENU_CONFIG) {
    for (const item of group.items) {
      if (item.path === path) {
        currentCategory = group.category;
        currentPageName = item.label;
        break;
      }
      if (item.items) {
        for (const sub of item.items) {
          if (sub.path === path) {
            currentCategory = group.category;
            parentItemName = item.label;
            currentPageName = sub.label;
            break;
          }
        }
      }
    }
    if (currentPageName) break;
  }

  if (!currentPageName) {
    // Fallback path title formatter
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'Dashboard';
    currentPageName = lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <nav className="flex items-center text-xs font-medium text-[hsl(var(--admin-text-secondary))] space-x-1.5 overflow-x-auto py-1">
      <Link
        to="/admin/dashboard"
        className="flex items-center gap-1 hover:text-primaryRed transition-colors"
        title="Dashboard Root"
      >
        <Home className="w-3.5 h-3.5 text-gray-400" />
        <span className="hidden sm:inline">Admin</span>
      </Link>

      {currentCategory && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate max-w-[120px] text-gray-500">{currentCategory}</span>
        </>
      )}

      {parentItemName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate max-w-[120px] text-gray-600">{parentItemName}</span>
        </>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="font-semibold text-[hsl(var(--admin-text-primary))] truncate max-w-[160px]">
        {currentPageName}
      </span>
    </nav>
  );
};

export default AdminBreadcrumbs;
