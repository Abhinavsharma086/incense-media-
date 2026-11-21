import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Image,
  Mail,
  ShoppingCart,
  UserCheck,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronRight,
  Globe,
  Award,
  GraduationCap,
  Building2,
  BarChart3,
  Layers,
  Newspaper,
  Home,
  Upload,
  Image as ImageIcon,
  Star,
  Megaphone,
  Target,
  Activity,
  FileSpreadsheet,
  Package,
  Receipt,
  Shield,
  UserCog,
  ShieldAlert,
  Sparkles,
  Search,
  Pin,
  PinOff,
} from 'lucide-react';

export interface AdminSubMenuItem {
  id: string;
  label: string;
  path: string;
  roles?: string[];
  badgeKey?: string;
}

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
  roles?: string[];
  badgeKey?: string;
  items?: AdminSubMenuItem[];
}

export interface AdminCategoryGroup {
  category: string;
  items: AdminMenuItem[];
}

export const ADMIN_MENU_CONFIG: AdminCategoryGroup[] = [
  {
    category: 'Overview & Performance',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        icon: LayoutDashboard,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Executive', 'Account Manager'],
      },
      {
        id: 'reports',
        label: 'Reports & Analytics',
        path: '/admin/reports',
        icon: BarChart3,
        roles: ['Super Admin', 'Admin', 'Sales Manager'],
      },
    ],
  },
  {
    category: 'Enterprise & HR',
    items: [
      {
        id: 'employees',
        label: 'Employee & Permissions',
        path: '/admin/employees',
        icon: UserCog,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'team',
        label: 'Users & Teams',
        path: '/admin/team',
        icon: Users,
        roles: ['Super Admin', 'Admin', 'Sales Manager'],
      },
      {
        id: 'users-directory',
        label: 'Users Directory',
        path: '/admin/users',
        icon: UserCheck,
        roles: ['Super Admin', 'Admin', 'Sales Manager'],
      },
    ],
  },
  {
    category: 'Sales & CRM Pipeline',
    items: [
      {
        id: 'lead-management',
        label: 'Lead Management',
        icon: Target,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Executive'],
        badgeKey: 'leads',
        items: [
          { id: 'leads-pipeline', label: 'Leads Pipeline', path: '/admin/pipeline' },
          { id: 'leads-dashboard', label: 'Leads Overview & Stats', path: '/admin/leads/dashboard' },
          { id: 'all-leads', label: 'All Leads', path: '/admin/leads', badgeKey: 'leads' },
          { id: 'website-inquiries', label: 'Website Inquiries & Leads', path: '/admin/inquiries', badgeKey: 'inquiries' },
          { id: 'kanban-board', label: 'Kanban Board', path: '/admin/pipeline' },
          { id: 'lead-duplicates', label: 'Duplicate Lead Merge', path: '/admin/leads/duplicates' },
          { id: 'lead-analytics', label: 'Lead Analytics', path: '/admin/leads/analytics' },
          { id: 'meta-lead-forms', label: 'Meta Lead Forms', path: '/admin/lead-forms' },
        ],
      },
      {
        id: 'sales-pipeline',
        label: 'Sales Pipeline',
        path: '/admin/pipeline',
        icon: Layers,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Executive'],
      },
      {
        id: 'follow-ups',
        label: 'Follow-ups & Tasks',
        path: '/admin/follow-ups',
        icon: Activity,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Executive'],
        badgeKey: 'followups',
      },
      {
        id: 'lead-scoring',
        label: 'Lead Scoring',
        path: '/admin/scoring',
        icon: Target,
        roles: ['Super Admin', 'Admin', 'Sales Manager'],
      },
      {
        id: 'media-campaigns',
        label: 'Media Campaigns',
        icon: Megaphone,
        roles: ['Super Admin', 'Admin', 'Sales Manager'],
        items: [
          { id: 'campaign-dashboard', label: 'Campaign Dashboard', path: '/admin/campaigns/dashboard' },
          { id: 'all-campaigns', label: 'All Campaigns', path: '/admin/campaigns' },
        ],
      },
      {
        id: 'customers',
        label: 'Customers Directory',
        path: '/admin/customers',
        icon: UserCheck,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Account Manager'],
      },
      {
        id: 'clients',
        label: 'Clients Directory',
        path: '/admin/clients',
        icon: UserCheck,
        roles: ['Super Admin', 'Admin', 'Account Manager'],
      },
    ],
  },
  {
    category: 'Accounting & BUSY ERP',
    items: [
      {
        id: 'accounting-module',
        label: 'Accounting & BUSY',
        icon: Receipt,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Account Manager'],
        items: [
          { id: 'acc-dashboard', label: 'Overview Dashboard', path: '/admin/accounting/dashboard' },
          { id: 'acc-invoices', label: 'Tax Invoices', path: '/admin/accounting/invoices' },
          { id: 'acc-proformas', label: 'Proforma Invoices (PI)', path: '/admin/accounting/proformas' },
          { id: 'acc-payments', label: 'Payments & Receipts', path: '/admin/accounting/payments' },
          { id: 'acc-parties', label: 'Customer Masters', path: '/admin/accounting/parties' },
          { id: 'acc-items', label: 'Item Masters', path: '/admin/accounting/items' },
          { id: 'acc-reports', label: 'Reports & GSTR-1', path: '/admin/accounting/reports' },
          { id: 'acc-synclogs', label: 'BUSY Sync Logs', path: '/admin/accounting/sync-logs' },
          { id: 'acc-settings', label: 'Accounting Settings', path: '/admin/accounting/settings' },
        ],
      },
    ],
  },
  {
    category: 'Catalog & Finances',
    items: [
      {
        id: 'products',
        label: 'Products Catalog',
        path: '/admin/products',
        icon: Package,
        roles: ['Super Admin', 'Admin', 'Sales Manager'],
      },
      {
        id: 'services-group',
        label: 'Services Management',
        icon: Building2,
        roles: ['Super Admin', 'Admin'],
        items: [
          { id: 'services-list', label: 'All Services', path: '/admin/services' },
          { id: 'service-cats', label: 'Service Categories', path: '/admin/service-categories' },
        ],
      },
      {
        id: 'invoices',
        label: 'Billing & Invoices',
        path: '/admin/invoices',
        icon: FileSpreadsheet,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Account Manager'],
      },
      {
        id: 'expenses',
        label: 'Expenses Tracking',
        path: '/admin/expenses',
        icon: Receipt,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'orders',
        label: 'Customer Orders',
        path: '/admin/orders',
        icon: ShoppingCart,
        roles: ['Super Admin', 'Admin'],
        badgeKey: 'orders',
      },
    ],
  },
  {
    category: 'Content & Media CMS',
    items: [
      {
        id: 'stories-group',
        label: 'Stories & News',
        icon: FileText,
        roles: ['Super Admin', 'Admin'],
        items: [
          { id: 'all-stories', label: 'Published Stories', path: '/admin/stories' },
          { id: 'story-categories', label: 'Story Categories', path: '/admin/story-categories' },
        ],
      },
      {
        id: 'publications',
        label: 'Publications & Magazines',
        path: '/admin/publications',
        icon: BookOpen,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'breaking-news',
        label: 'Breaking News Ticker',
        path: '/admin/breaking-news',
        icon: Newspaper,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'awards-group',
        label: 'Awards & Honours',
        icon: Award,
        roles: ['Super Admin', 'Admin'],
        items: [
          { id: 'awards-list', label: 'Awards Listing', path: '/admin/awards' },
          { id: 'create-award', label: 'Create New Award', path: '/admin/awards/create' },
        ],
      },
      {
        id: 'academy',
        label: 'Academy & Courses',
        path: '/admin/academy',
        icon: GraduationCap,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'sliders',
        label: 'Hero Sliders',
        path: '/admin/sliders',
        icon: Image,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'promotion-banner',
        label: 'Promotion Banner',
        path: '/admin/promotion-banner',
        icon: Image,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'banner-images',
        label: 'Banner Images',
        path: '/admin/banner-images',
        icon: Upload,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'main-images',
        label: 'Main Images Gallery',
        path: '/admin/main-images',
        icon: ImageIcon,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'testimonials',
        label: 'Client Testimonials',
        path: '/admin/testimonials',
        icon: Star,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'home-content',
        label: 'Homepage Content',
        path: '/admin/home-content',
        icon: Home,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'about-us',
        label: 'About Us Page',
        path: '/admin/about-us',
        icon: Globe,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'team-cms',
        label: 'Team Members (CMS)',
        path: '/admin/teams',
        icon: Users,
        roles: ['Super Admin', 'Admin'],
      },
    ],
  },
  {
    category: 'Communication & Support',
    items: [
      {
        id: 'events',
        label: 'Events & Expos',
        path: '/admin/events',
        icon: Calendar,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'inquiries',
        label: 'Customer Inquiries',
        path: '/admin/inquiries',
        icon: Mail,
        roles: ['Super Admin', 'Admin'],
        badgeKey: 'inquiries',
      },
      {
        id: 'contact-info',
        label: 'Contact Information',
        path: '/admin/contact',
        icon: Mail,
        roles: ['Super Admin', 'Admin'],
      },
    ],
  },
  {
    category: 'System & Preferences',
    items: [
      {
        id: 'meta-settings',
        label: 'Meta Lead Ads Settings',
        path: '/admin/meta-settings',
        icon: Globe,
        roles: ['Super Admin', 'Admin'],
      },
      {
        id: 'profile-control',
        label: 'Profile Control',
        path: '/admin/settings?tab=profile',
        icon: UserCheck,
        roles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Executive', 'Account Manager'],
      },
      {
        id: 'settings',
        label: 'Admin Settings',
        path: '/admin/settings',
        icon: Settings,
        roles: ['Super Admin', 'Admin'],
      },
    ],
  },
];
