import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, PhoneCall, TrendingUp, CheckCircle, ArrowUpRight, 
  Activity, Calendar, FileText, Receipt, Package, Sparkles, 
  RefreshCw, Zap, Clock, ShieldCheck, Layers
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Link } from "react-router-dom";
import crmApi from "@/api/crmApi";
import { toast } from "@/components/ui/sonner";

interface LeadItem {
  id: string;
  fullName?: string;
  full_name?: string;
  companyName?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  source?: string;
  status: string;
  priority?: string;
  dealValue?: number | null;
  deal_value?: number | null;
  nextFollowUpDate?: string | null;
  next_follow_up_date?: string | null;
  createdAt: string;
}

const SOLID_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#64748B'];

export const AdminLeadDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("all");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingWebsite, setSyncingWebsite] = useState(false);

  const fetchLeads = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await crmApi.get('/leads');
      if (Array.isArray(res.data)) {
        setLeads(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch leads for dashboard:', err);
      toast.error('Unable to fetch latest CRM leads data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSyncWebsite = async () => {
    setSyncingWebsite(true);
    try {
      const res = await crmApi.post('/leads/sync-website');
      toast.success(res.data?.message || 'Website leads synced to CRM!');
      fetchLeads(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to sync website leads');
    } finally {
      setSyncingWebsite(false);
    }
  };

  // Filter leads based on selected time range
  const filteredLeads = useMemo(() => {
    if (timeRange === "all") return leads;
    const now = Date.now();
    const days = timeRange === "7days" ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return leads.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
  }, [leads, timeRange]);

  // Key KPI metrics computed dynamically
  const totalLeads = filteredLeads.length;
  const newLeads = filteredLeads.filter(l => (l.status || '').toLowerCase() === 'new').length;
  const convertedLeads = filteredLeads.filter(l => {
    const s = (l.status || '').toLowerCase();
    return s === 'converted' || s === 'won';
  }).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const followUpsToday = leads.filter(l => {
    const fDate = l.nextFollowUpDate || l.next_follow_up_date;
    if (!fDate) return false;
    return fDate.startsWith(todayStr);
  }).length;

  const conversionRate = totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // Real Status Breakdown Pie Data
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const s = (l.status || 'new').toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    });

    const entries = Object.keys(counts).map(key => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: counts[key],
    }));

    return entries.length > 0 ? entries : [{ name: 'New', value: 0 }];
  }, [filteredLeads]);

  // Real Time Series data grouped by date & source
  const timeSeriesData = useMemo(() => {
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 14;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayLeads = leads.filter(l => {
        if (!l.createdAt) return false;
        return l.createdAt.startsWith(dateStr);
      });

      data.push({
        date: label,
        website: dayLeads.filter(l => (l.source || '').toLowerCase().includes('website')).length,
        meta: dayLeads.filter(l => (l.source || '').toLowerCase().includes('meta')).length,
        manual: dayLeads.filter(l => {
          const s = (l.source || '').toLowerCase();
          return !s.includes('website') && !s.includes('meta');
        }).length,
      });
    }

    return data;
  }, [leads, timeRange]);

  return (
    <div className="space-y-6 font-sans pb-10 w-full animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live CRM Engine
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Database Synced</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-indigo-600" /> 
            Live real-time pipeline overview, lead conversion metrics, and inquiry velocity
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Direct Link to Pipeline Kanban */}
          <Link
            to="/admin/pipeline"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
            title="Open Interactive Leads & Deals Pipeline"
          >
            <Layers className="w-3.5 h-3.5" />
            Open Leads Pipeline
          </Link>

          {/* Sync Website Leads Button */}
          <button
            onClick={handleSyncWebsite}
            disabled={syncingWebsite}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            title="Sync all website inquiries into CRM leads database"
          >
            <Zap className={`w-3.5 h-3.5 ${syncingWebsite ? 'animate-spin' : ''}`} />
            {syncingWebsite ? 'Syncing...' : 'Sync Website Leads'}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchLeads(true)}
            disabled={refreshing || loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Time range filters */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(["7days", "30days", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === range
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {range === "7days" ? "7 Days" : range === "30days" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-indigo-300 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
              {loading ? "..." : totalLeads.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> Live in database
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        {/* Card 2: New Inquiries / Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Inquiries</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
              {loading ? "..." : newLeads.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Ready for follow-up
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Card 3: Today's Follow-ups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-amber-300 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Follow-ups Today</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
              {loading ? "..." : followUpsToday}
            </div>
            <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" /> Scheduled action
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <PhoneCall className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-emerald-300 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversion Rate</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
              {loading ? "..." : `${conversionRate}%`}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3" /> {convertedLeads} won deals
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Quick Work Modules Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Quick Work Modules
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Direct shortcuts to sales pipeline, website leads, and accounting</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/leads"
            className="p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 rounded-xl transition-all group flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Leads Database</div>
              <div className="text-[10px] text-slate-500">Manage all {totalLeads} sales leads</div>
            </div>
          </Link>

          <Link
            to="/admin/inquiries"
            className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 rounded-xl transition-all group flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Website Inquiries</div>
              <div className="text-[10px] text-slate-500">Exhibitor & contact forms</div>
            </div>
          </Link>

          <Link
            to="/admin/leads/kanban"
            className="p-4 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 rounded-xl transition-all group flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Kanban Pipeline</div>
              <div className="text-[10px] text-slate-500">Visual drag & drop stages</div>
            </div>
          </Link>

          <Link
            to="/admin/accounting/invoices/new"
            className="p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 rounded-xl transition-all group flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Create Tax Invoice</div>
              <div className="text-[10px] text-slate-500">Auto-GST & BUSY sync</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Line / Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lead Acquisition Trajectory</h3>
              <p className="text-[11px] text-slate-500">Live breakdown by channels (Website, Meta, Direct)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="website" name="Website Leads" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="meta" name="Meta Ads" stackId="1" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} />
                <Area type="monotone" dataKey="manual" name="Direct / Manual" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Status Breakdown Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Status Distribution</h3>
            <p className="text-[11px] text-slate-500">Live pipeline distribution ({totalLeads} leads)</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {statusPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={SOLID_COLORS[index % SOLID_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium border-t border-slate-100 pt-3">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SOLID_COLORS[idx % SOLID_COLORS.length] }}></span>
                <span className="text-slate-600 text-[11px] truncate">{item.name}:</span>
                <span className="font-bold text-slate-900 text-[11px] font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLeadDashboard;
