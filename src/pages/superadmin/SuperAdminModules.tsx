import React from 'react';
import {
  Grid,
  Users,
  Building2,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  Facebook,
  Award,
  BookOpen,
  Settings,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MODULES = [
  {
    category: 'CRM & Sales Automation',
    items: [
      { name: 'Leads Command Center', path: '/admin/leads', icon: Users, count: 'System-wide', desc: 'Full control over all lead records, owners, and stage movements.' },
      { name: 'Leads Kanban Board', path: '/admin/leads/kanban', icon: Layers, count: 'Visual Pipeline', desc: 'Override drag-and-drop lead stage assignments.' },
      { name: 'Deals & Revenue Pipeline', path: '/admin/pipeline', icon: Briefcase, count: 'Forecasts', desc: 'View and edit deal values, probabilities, and closing dates.' },
      { name: 'Follow-Ups & Tasks', path: '/admin/follow-ups', icon: Zap, count: 'Pending Tasks', desc: 'Override employee follow-up assignments and reminders.' },
      { name: 'Lead Scoring Rules', path: '/admin/scoring', icon: Activity, count: 'Rule Engine', desc: 'Configure automatic lead scoring weights and triggers.' },
    ],
  },
  {
    category: 'Accounting & BUSY ERP Integration',
    items: [
      { name: 'GST Tax Invoices', path: '/admin/accounting/invoices', icon: FileText, count: 'BUSY Sync', desc: 'Override, edit, approve, or cancel GST tax invoices.' },
      { name: 'Proforma Invoices', path: '/admin/accounting/proformas', icon: FileText, count: 'Quotations', desc: 'Manage quotations and convert to official invoices.' },
      { name: 'Payment Receipts', path: '/admin/accounting/payments', icon: DollarSign, count: 'Receipt Logs', desc: 'Full control over payment settlements and party ledgers.' },
      { name: 'Party Masters & Customers', path: '/admin/accounting/parties', icon: Building2, count: 'B2B Parties', desc: 'Manage customer credit days, GSTINs, and current balances.' },
    ],
  },
  {
    category: 'Marketing & Integrations',
    items: [
      { name: 'Meta Ads Webhooks & Sync', path: '/admin/meta-settings', icon: Facebook, count: 'Auto Sync', desc: 'Configure Facebook long-lived tokens and page subscriptions.' },
      { name: 'Meta Lead Forms', path: '/admin/lead-forms', icon: FileText, count: 'Leadgen Forms', desc: 'Map Meta form fields to CRM Lead properties.' },
      { name: 'Media Campaigns', path: '/admin/campaigns', icon: Zap, count: 'Marketing', desc: 'Track ROI across WhatsApp, Print, and Event campaigns.' },
      { name: 'Unit Auto-Assignment', path: '/admin/units', icon: Users, count: 'Round Robin', desc: 'Configure employee capacities and round-robin assignment rules.' },
    ],
  },
  {
    category: 'CMS & Global Settings',
    items: [
      { name: 'Products & SKUs', path: '/admin/products', icon: Grid, count: 'Catalog', desc: 'Manage master items, HSN codes, GST rates, and stock levels.' },
      { name: 'Admin Settings', path: '/admin/settings', icon: Settings, count: 'Global Config', desc: 'Company branding, invoice prefixes, and default terms.' },
      { name: 'Events & Awards', path: '/admin/events', icon: Award, count: 'Expos', desc: 'Incense Media Expos, stall bookings, and awards.' },
      { name: 'Academy & Publications', path: '/admin/academy', icon: BookOpen, count: 'Magazines', desc: 'Magazines, articles, and training content.' },
    ],
  },
];

export const SuperAdminModules: React.FC = () => {
  return (
    <div className="space-y-8 font-sans animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Grid className="w-6 h-6 text-purple-400" />
            Full A-to-Z Module Override & Control
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            As Super Admin, you hold master override authority across every module and data structure in the application. Select any module to view, edit, or override records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Root Master Mode Unlocked
          </span>
        </div>
      </div>

      {/* Module Categories Grid */}
      <div className="space-y-8">
        {MODULES.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              {section.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item, iKey) => {
                const Icon = item.icon;
                return (
                  <div
                    key={iKey}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                          {item.count}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        to={item.path}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        Access & Override <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <Link
                        to={`/super-admin/activity-logs?module=${item.name.toLowerCase().split(' ')[0]}`}
                        className="text-[10px] font-medium text-slate-400 hover:text-slate-600 underline"
                      >
                        Audit Logs
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminModules;
