import React, { useState, useEffect, useMemo } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from 'sonner';
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  MessageCircle,
  Building2,
  Sparkles,
  ChevronRight,
  UserCheck,
  Tag,
  ArrowUpRight,
  TrendingUp,
  XCircle,
  LayoutGrid,
  List,
  Flame,
  Check,
  Send,
  X,
} from 'lucide-react';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { useDataSync } from '@/lib/useDataSync';
import { openWhatsAppChat } from '@/lib/whatsapp';

interface LeadReminderItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  companyName?: string | null;
  city?: string | null;
  category?: string | null;
  status: string;
  priority: string;
  dealValue?: number | null;
  budget?: string | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  lastContactDate?: string | null;
  reminderStatus: 'overdue' | 'today' | 'upcoming';
  daysDiff: number;
  isOverdue: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
}

interface ReminderCounts {
  today: number;
  overdue: number;
  upcoming: number;
  completed?: number;
  total: number;
}

const DEFAULT_CATEGORIES = [
  'publication',
  'subscription',
  'exhibition/expo',
  'advertisement',
  'general',
  'machinery & equipment',
  'manufacturer',
];

const EmployeeLeadReminders: React.FC = () => {
  const currentUser = getCurrentUser();
  const [reminders, setReminders] = useState<LeadReminderItem[]>([]);
  const [counts, setCounts] = useState<ReminderCounts>({ today: 0, overdue: 0, upcoming: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'all' | 'completed'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal State for Action / Follow-up Update
  const [selectedLead, setSelectedLead] = useState<LeadReminderItem | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'reschedule' | 'contacted' | 'interested' | 'converted' | 'lost' | 'clear_reminder'>('contacted');
  const [actionRemark, setActionRemark] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Fetch reminders from backend
  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get('/leads/reminders', {
        params: {
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          tab: activeTab === 'completed' ? 'completed' : undefined,
        },
      });

      if (res.data) {
        setReminders(res.data.reminders || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
          // If no today's reminders but upcoming reminders exist, automatically switch to upcoming tab
          if (res.data.counts.today === 0 && res.data.counts.upcoming > 0 && activeTab === 'today') {
            setActiveTab('upcoming');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load lead reminders:', error);
      toast.error('Failed to fetch lead reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [activeTab, categoryFilter, priorityFilter]);

  // Real-time synchronization across tabs and modals
  useDataSync('leads', fetchReminders);

  // WhatsApp click handler
  const getWhatsAppMessage = (lead: LeadReminderItem) => {
    const leadName = lead.fullName || 'Sir/Madam';
    const compName = lead.companyName ? ` (${lead.companyName})` : '';
    return `Hello ${leadName}${compName}, greetings from Incense Media! Following up regarding our previous conversation. Please let us know a suitable time to connect.`;
  };

  const handleOpenWhatsApp = (lead: LeadReminderItem, e?: React.MouseEvent) => {
    openWhatsAppChat(lead.phone, getWhatsAppMessage(lead), e);
  };

  // Filtered Reminders based on Tab, Search, and Category
  const filteredReminders = useMemo(() => {
    return reminders.filter((item) => {
      // Tab filter
      const isClosed = ['converted', 'lost', 'won'].includes((item.status || '').toLowerCase());
      if (activeTab === 'today' && (!item.isToday || isClosed)) return false;
      if (activeTab === 'overdue' && (!item.isOverdue || isClosed)) return false;
      if (activeTab === 'upcoming' && (!item.isUpcoming || isClosed)) return false;
      if (activeTab === 'all' && isClosed) return false;
      if (activeTab === 'completed' && !isClosed) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (item.fullName || '').toLowerCase().includes(q);
        const matchesCompany = (item.companyName || '').toLowerCase().includes(q);
        const matchesPhone = (item.phone || '').includes(q);
        const matchesNotes = (item.notes || '').toLowerCase().includes(q);
        const matchesCity = (item.city || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesPhone && !matchesNotes && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [reminders, activeTab, searchQuery]);

  // Open Action Modal
  const openActionModal = (lead: LeadReminderItem, defaultAction: 'reschedule' | 'contacted' | 'converted' = 'contacted') => {
    setSelectedLead(lead);
    setActionType(defaultAction);
    setActionRemark('');
    // Default tomorrow if rescheduling
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNextFollowUpDate(lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : tomorrow.toISOString().slice(0, 10));
    setIsActionModalOpen(true);
  };

  // Submit Action Handler
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if (!actionRemark.trim() && actionType === 'reschedule') {
      toast.error('Please enter a note / remark for the follow-up');
      return;
    }

    try {
      setIsSubmittingAction(true);
      let newStatus = selectedLead.status;
      if (actionType === 'contacted') newStatus = 'contacted';
      if (actionType === 'interested') newStatus = 'interested';
      if (actionType === 'converted') newStatus = 'converted';
      if (actionType === 'lost') newStatus = 'lost';

      await crmApi.post('/leads/reminders/action', {
        leadId: selectedLead.id,
        action: actionType,
        newStatus,
        remark: actionRemark.trim(),
        nextFollowUpDate: actionType === 'clear_reminder' || actionType === 'converted' ? null : nextFollowUpDate,
      });

      toast.success('Lead follow-up updated successfully!');
      setIsActionModalOpen(false);
      setSelectedLead(null);
      fetchReminders();
    } catch (error) {
      console.error('Failed to submit reminder action:', error);
      toast.error('Failed to update lead follow-up');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Quick One-Click Status Update (e.g. Mark Converted or Contacted)
  const handleQuickStatusChange = async (leadId: string, status: string, remark: string) => {
    try {
      await crmApi.post('/leads/reminders/action', {
        leadId,
        action: status,
        newStatus: status,
        remark,
        nextFollowUpDate: status === 'converted' ? null : undefined,
      });
      toast.success(`Marked as ${status.toUpperCase()}`);
      fetchReminders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || 'medium').toLowerCase();
    switch (p) {
      case 'high':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"><Flame className="w-3 h-3 text-rose-600" /> High</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Medium</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'new').toLowerCase();
    switch (s) {
      case 'converted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Converted</span>;
      case 'interested':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">Interested</span>;
      case 'follow_up':
      case 'follow up':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Follow Up</span>;
      case 'contacted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Contacted</span>;
      case 'lost':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300">Lost</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 uppercase">{s}</span>;
    }
  };

  const getRelativeDatePill = (item: LeadReminderItem) => {
    const isClosed = ['converted', 'lost', 'won'].includes((item.status || '').toLowerCase());
    if (isClosed) {
      if ((item.status || '').toLowerCase() === 'lost') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500 text-white shadow-xs">
            <XCircle className="w-3.5 h-3.5" /> Closed / Lost
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> Converted / Won
        </span>
      );
    }

    if (item.isToday) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
          <Clock className="w-3.5 h-3.5" /> Due Today
        </span>
      );
    }
    if (item.isOverdue) {
      const overdueDays = Math.abs(item.daysDiff);
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5" /> Overdue by {overdueDays} day{overdueDays > 1 ? 's' : ''}
        </span>
      );
    }
    const daysAway = item.daysDiff;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <Calendar className="w-3.5 h-3.5 text-blue-600" />
        {daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`}
      </span>
    );
  };

  if (!hasPermission('leadReminders', 'view')) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-gray-600">
          Aapke account ko Lead Follow-Up Reminders view karne ki permission nahi di gayi hai. Agar aapko access chahiye to apne administrator se contact karein.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-2xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-sm">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    Lead Follow-Up Reminders
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">
                      Employee Hub
                    </span>
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Never miss a prospect. Call, message on WhatsApp, and update follow-up notes on time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <button
                onClick={fetchReminders}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                title="Refresh Reminders"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                <span>Refresh</span>
              </button>

              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today */}
          <div
            onClick={() => setActiveTab('today')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'today'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                : 'bg-white border-amber-200 hover:border-amber-400 text-gray-900 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'today' ? 'text-amber-100' : 'text-amber-700'}`}>
                Due Today
              </span>
              <Clock className={`w-5 h-5 ${activeTab === 'today' ? 'text-white' : 'text-amber-600'}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">{counts.today}</span>
              <span className={`text-xs ${activeTab === 'today' ? 'text-amber-100' : 'text-gray-500'}`}>
                calls scheduled
              </span>
            </div>
          </div>

          {/* Card 2: Overdue */}
          <div
            onClick={() => setActiveTab('overdue')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                : 'bg-white border-rose-200 hover:border-rose-400 text-gray-900 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'overdue' ? 'text-rose-100' : 'text-rose-700'}`}>
                Overdue
              </span>
              <AlertTriangle className={`w-5 h-5 ${activeTab === 'overdue' ? 'text-white' : 'text-rose-600'}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">{counts.overdue}</span>
              <span className={`text-xs ${activeTab === 'overdue' ? 'text-rose-100' : 'text-gray-500'}`}>
                action required
              </span>
            </div>
          </div>

          {/* Card 3: Upcoming */}
          <div
            onClick={() => setActiveTab('upcoming')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400'
                : 'bg-white border-blue-200 hover:border-blue-400 text-gray-900 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'upcoming' ? 'text-blue-100' : 'text-blue-700'}`}>
                Upcoming
              </span>
              <Calendar className={`w-5 h-5 ${activeTab === 'upcoming' ? 'text-white' : 'text-blue-600'}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">{counts.upcoming}</span>
              <span className={`text-xs ${activeTab === 'upcoming' ? 'text-blue-100' : 'text-gray-500'}`}>
                future pipeline
              </span>
            </div>
          </div>

          {/* Card 4: Total Pipeline */}
          <div
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white border-slate-950 shadow-md ring-2 ring-slate-400'
                : 'bg-white border-gray-200 hover:border-gray-400 text-gray-900 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'all' ? 'text-slate-300' : 'text-gray-500'}`}>
                Total Pipeline
              </span>
              <TrendingUp className={`w-5 h-5 ${activeTab === 'all' ? 'text-white' : 'text-indigo-600'}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">{counts.total}</span>
              <span className={`text-xs ${activeTab === 'all' ? 'text-slate-300' : 'text-gray-500'}`}>
                scheduled leads
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'today'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Today's Follow-Ups ({counts.today})</span>
              </button>

              <button
                onClick={() => setActiveTab('overdue')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overdue ({counts.overdue})</span>
              </button>

              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'upcoming'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Upcoming ({counts.upcoming})</span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>All Reminders ({counts.total})</span>
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Closed / Won ({counts.completed ?? 0})</span>
              </button>
            </div>

            <span className="text-xs text-gray-500 font-medium">
              Showing <strong>{filteredReminders.length}</strong> lead{filteredReminders.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Search and Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by prospect name, company, phone, remark..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-white capitalize"
              >
                <option value="all">All Categories</option>
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-white"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reminders List / Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl p-16 border border-gray-200 text-center shadow-2xs">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-900">Loading Lead Reminders...</h3>
            <p className="text-xs text-gray-500 mt-1">Fetching your scheduled follow-ups and notes.</p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-gray-200 text-center shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">All Caught Up!</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              {activeTab === 'today'
                ? "You don't have any follow-ups due today. Check 'Upcoming' or schedule new follow-ups from My Assigned Leads."
                : activeTab === 'overdue'
                ? 'Great job! You have zero overdue lead follow-ups.'
                : 'No reminders found matching your filter criteria.'}
            </p>
            {counts.upcoming > 0 && activeTab === 'today' && (
              <button
                onClick={() => setActiveTab('upcoming')}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>View Upcoming Follow-Ups ({counts.upcoming})</span>
              </button>
            )}
            {counts.total > 0 && activeTab !== 'all' && (
              <button
                onClick={() => setActiveTab('all')}
                className="mt-4 ml-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-2"
              >
                <span>View All Reminders ({counts.total})</span>
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReminders.map((lead) => {
              const formattedDate = lead.nextFollowUpDate
                ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-';

              const latestRemark = lead.notes
                ? lead.notes.split('\n')[0].replace(/^\[.*?\]:\s*/, '')
                : 'No previous remarks recorded';

              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-400 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative group"
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>{getRelativeDatePill(lead)}</div>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(lead.priority)}
                        {getStatusBadge(lead.status)}
                      </div>
                    </div>

                    {/* Lead Title & Company */}
                    <div className="mb-3">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition">
                        {lead.fullName}
                      </h3>
                      {lead.companyName && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{lead.companyName}</span>
                          {lead.city && <span>• {lead.city}</span>}
                        </p>
                      )}
                    </div>

                    {/* Contact Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 transition"
                        >
                          <Phone className="w-3 h-3 text-slate-600" />
                          <span>{lead.phone}</span>
                        </a>
                      )}
                      {lead.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 capitalize">
                          <Tag className="w-3 h-3" />
                          {lead.category}
                        </span>
                      )}
                    </div>

                    {/* Latest Remark snippet box */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Latest Remark</span>
                        <span>{formattedDate}</span>
                      </div>
                      <p className="line-clamp-2 italic text-gray-800 font-medium">"{latestRemark}"</p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Button */}
                      {hasPermission('leadReminders', 'whatsapp') && lead.phone ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsApp(lead, e);
                          }}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                          title="Open WhatsApp Chat (re-uses running window)"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      ) : null}
                      {/* Call Button */}
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-colors shadow-2xs"
                          title="Call Lead"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Follow Up & Update Remark Button */}
                    {hasPermission('leadReminders', 'takeAction') && (
                      ['converted', 'lost', 'won'].includes((lead.status || '').toLowerCase()) ? (
                        <button
                          onClick={() => openActionModal(lead, 'contacted')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs hover:shadow"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Update Notes</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openActionModal(lead, 'contacted')}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs hover:shadow"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Take Action</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto w-full im-scrollbar pb-2">
              <table className="min-w-[1150px] w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Scheduled Due</th>
                    <th className="py-3 px-4">Prospect / Company</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status & Priority</th>
                    <th className="py-3 px-4">Latest Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReminders.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getRelativeDatePill(lead)}
                        <div className="text-[11px] text-gray-500 mt-1">
                          {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN') : '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-xs">{lead.fullName}</div>
                        <div className="text-[11px] text-gray-500">{lead.companyName || 'No Company'}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWhatsApp(lead, e);
                            }}
                            className="font-medium text-gray-800 hover:text-emerald-600 hover:underline transition cursor-pointer text-left"
                            title={`Click to chat with ${lead.fullName} on WhatsApp (${lead.phone})`}
                          >
                            {lead.phone}
                          </button>
                          {hasPermission('leadReminders', 'whatsapp') && lead.phone ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWhatsApp(lead, e);
                              }}
                              className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                              title="WhatsApp (re-uses running window)"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap capitalize">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {lead.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(lead.status)}
                          {getPriorityBadge(lead.priority)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="text-gray-700 italic">
                          {lead.notes ? lead.notes.split('\n')[0].replace(/^\[.*?\]:\s*/, '') : '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {hasPermission('leadReminders', 'takeAction') && (
                          <button
                            onClick={() => openActionModal(lead, 'contacted')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition"
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Action / Follow-Up Modal */}
      {isActionModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Lead Follow-Up & Action</h3>
                  <p className="text-xs text-gray-500">
                    Prospect: <strong>{selectedLead.fullName}</strong> ({selectedLead.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAction} className="p-6 space-y-4">
              {/* Action / Outcome Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Follow-Up Outcome / Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'contacted', label: '📞 Contacted', desc: 'Spoke with lead' },
                    { id: 'reschedule', label: '📅 Reschedule', desc: 'Call again later' },
                    { id: 'interested', label: '⭐ Interested', desc: 'Hot prospect' },
                    { id: 'converted', label: '🎉 Converted', desc: 'Deal closed' },
                    { id: 'lost', label: '❌ Not Interested', desc: 'Lead rejected' },
                    { id: 'clear_reminder', label: '✅ Done / Dismiss', desc: 'Clear reminder' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setActionType(act.id as any)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex flex-col justify-between ${
                        actionType === act.id
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-2xs'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{act.label}</span>
                      <span className="text-[10px] font-normal text-gray-500 mt-0.5">{act.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Follow-Up Date (if not converted / clear) */}
              {actionType !== 'clear_reminder' && actionType !== 'converted' && actionType !== 'lost' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Next Follow-Up Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                    required
                  />
                </div>
              )}

              {/* Call Remark / Discussion Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Call Notes / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionRemark}
                  onChange={(e) => setActionRemark(e.target.value)}
                  rows={3}
                  placeholder="e.g. Discussed magazine ad rates. Client asked to call back next Tuesday after partner review."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Previous History */}
              {selectedLead.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Previous Notes History</span>
                  <p className="text-xs text-gray-700 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[11px]">
                    {selectedLead.notes}
                  </p>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Follow-Up</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeadReminders;

