import React, { useState, useEffect } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from 'sonner';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import PaymentReminderModal from '@/components/common/PaymentReminderModal';
import { InvoicePdfModal } from '@/components/admin/accounting/InvoicePdfModal';
import { openWhatsAppChat } from '@/lib/whatsapp';
import {
  BellRing,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  FileText,
  DollarSign,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

interface PaymentReminderItem {
  id: string;
  invoiceId: string;
  partyId?: string;
  employeeId?: string;
  employeeName?: string;
  reminderDate: string;
  timeLimit?: string;
  expectedAmount?: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reminderType: 'call' | 'whatsapp' | 'email' | 'visit';
  status: 'pending' | 'completed' | 'rescheduled' | 'dismissed';
  notes?: string;
  actionTaken?: string;
  completedAt?: string;
  createdAt: string;
  isOverdue?: boolean;
  isDueToday?: boolean;
  hoursDiff?: number;
  party?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    city?: string;
    gstin?: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    grandTotal: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    party?: any;
  };
}

export const EmployeePaymentReminders: React.FC = () => {
  const currentUser = getCurrentUser();
  const [reminders, setReminders] = useState<PaymentReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Stats
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    overdue: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
  });

  // Modals
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminderItem | null>(null);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any>(null);

  // PDF Preview Modal
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<any>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const [remRes, countRes] = await Promise.all([
        crmApi.get('/accounting/reminders', {
          params: {
            timeframe: activeTab !== 'all' ? activeTab : undefined,
            priority: priorityFilter !== 'all' ? priorityFilter : undefined,
            search: search.trim() || undefined,
          },
        }),
        crmApi.get('/accounting/reminders/counts'),
      ]);

      if (remRes.data?.success && Array.isArray(remRes.data.data)) {
        setReminders(remRes.data.data);
      }
      if (countRes.data?.success && countRes.data.counts) {
        setCounts(countRes.data.counts);
      }
    } catch (err: any) {
      toast.error('Failed to load payment reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [activeTab, priorityFilter]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReminders();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenCreateModal = () => {
    setEditingReminder(null);
    setSelectedInvoiceForModal(null);
    setIsReminderModalOpen(true);
  };

  const handleOpenEditModal = (rem: PaymentReminderItem) => {
    setEditingReminder(rem);
    setSelectedInvoiceForModal(rem.invoice || null);
    setIsReminderModalOpen(true);
  };

  const handleMarkCompleted = async (rem: PaymentReminderItem) => {
    try {
      const res = await crmApi.put(`/accounting/reminders/${rem.id}/status`, {
        status: 'completed',
        actionTaken: 'Payment followed up and resolved',
      });
      if (res.data?.success) {
        toast.success(`Reminder for ${rem.party?.name || 'Customer'} marked as completed!`);
        fetchReminders();
      }
    } catch (err: any) {
      toast.error('Failed to update reminder status');
    }
  };

  const handleDeleteReminder = async (rem: PaymentReminderItem) => {
    if (!window.confirm(`Are you sure you want to delete this reminder for Invoice ${rem.invoice?.invoiceNumber || ''}?`)) {
      return;
    }
    try {
      const res = await crmApi.delete(`/accounting/reminders/${rem.id}`);
      if (res.data?.success) {
        toast.success('Reminder removed');
        fetchReminders();
      }
    } catch (err: any) {
      toast.error('Failed to delete reminder');
    }
  };

  const handleWhatsAppReminder = (rem: PaymentReminderItem) => {
    const partyName = rem.party?.name || 'Sir/Madam';
    const invNumber = rem.invoice?.invoiceNumber || 'Tax Invoice';
    const bal = (rem.invoice?.balanceAmount ?? rem.expectedAmount ?? 0).toFixed(2);
    const total = (rem.invoice?.grandTotal ?? 0).toFixed(2);
    const dateStr = new Date(rem.reminderDate).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const text = `Namaste ${partyName},\n\nThis is a gentle payment reminder from INCENSE MEDIA regarding Invoice #${invNumber}.\nTotal Amount: ₹${total}\nOutstanding Balance: ₹${bal}\nPayment Due / Time Limit: ${dateStr}\n\nKindly process the payment transfer and share the confirmation receipt with us.\n\nThank you,\n${rem.employeeName || currentUser?.name || 'Incense Media Team'}`;

    openWhatsAppChat(rem.party?.phone || '', text);
  };

  const handleOpenPdf = (inv: any) => {
    if (!inv) return;
    setSelectedInvoiceForPdf(inv);
    setIsPdfModalOpen(true);
  };

  // Helper formatting for relative time limit
  const formatTimeLimitLabel = (rem: PaymentReminderItem) => {
    const dt = new Date(rem.reminderDate);
    const dateFormatted = dt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (rem.status === 'completed') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
        </span>
      );
    }

    if (rem.isOverdue) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 animate-pulse flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Overdue Time Limit
          </span>
          <span className="text-xs font-bold text-rose-900 font-mono">{dateFormatted}</span>
        </div>
      );
    }

    if (rem.isDueToday) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" /> Due Today
          </span>
          <span className="text-xs font-bold text-amber-900 font-mono">{dateFormatted}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          Upcoming
        </span>
        <span className="text-xs font-bold text-gray-800 font-mono">{dateFormatted}</span>
      </div>
    );
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white">🚨 Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Normal</span>;
    }
  };

  const totalOutstandingAtRisk = reminders
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + (r.invoice?.balanceAmount ?? r.expectedAmount ?? 0), 0);

  if (!hasPermission('paymentReminders', 'view')) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-gray-600">
          Aapke account ko Invoice Payment Reminders view karne ki permission nahi di gayi hai. Agar aapko access chahiye to apne administrator se contact karein.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-slate-900 to-zinc-950 p-6 rounded-3xl text-white shadow-xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" /> PAYMENT REMINDERS & TIME LIMITS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
            Invoice Payment Reminders
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl">
            Set strict payment time limits for customer invoices, track collection promises, and send 1-click WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchReminders}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Set New Payment Reminder</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Overdue */}
        <div
          onClick={() => setActiveTab('overdue')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'bg-rose-500 text-white border-rose-600 shadow-md scale-102'
              : 'bg-white text-gray-900 border-rose-200 hover:border-rose-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'overdue' ? 'text-rose-100' : 'text-rose-600'}`}>
              🚨 Overdue Limit
            </span>
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'overdue' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2 font-mono">{counts.overdue}</div>
          <p className={`text-[10px] mt-0.5 ${activeTab === 'overdue' ? 'text-rose-100' : 'text-gray-400'}`}>
            Time limit passed
          </p>
        </div>

        {/* Due Today */}
        <div
          onClick={() => setActiveTab('today')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-102'
              : 'bg-white text-gray-900 border-amber-200 hover:border-amber-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'today' ? 'text-amber-100' : 'text-amber-600'}`}>
              ⏰ Due Today
            </span>
            <Clock className={`w-4 h-4 ${activeTab === 'today' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2 font-mono">{counts.today}</div>
          <p className={`text-[10px] mt-0.5 ${activeTab === 'today' ? 'text-amber-100' : 'text-gray-400'}`}>
            Action needed today
          </p>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setActiveTab('upcoming')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-102'
              : 'bg-white text-gray-900 border-blue-200 hover:border-blue-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'upcoming' ? 'text-blue-100' : 'text-blue-600'}`}>
              📅 Upcoming
            </span>
            <Calendar className={`w-4 h-4 ${activeTab === 'upcoming' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2 font-mono">{counts.upcoming}</div>
          <p className={`text-[10px] mt-0.5 ${activeTab === 'upcoming' ? 'text-blue-100' : 'text-gray-400'}`}>
            Future reminders
          </p>
        </div>

        {/* Completed */}
        <div
          onClick={() => setActiveTab('completed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-102'
              : 'bg-white text-gray-900 border-emerald-200 hover:border-emerald-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'completed' ? 'text-emerald-100' : 'text-emerald-600'}`}>
              ✅ Completed
            </span>
            <CheckCircle2 className={`w-4 h-4 ${activeTab === 'completed' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2 font-mono">{counts.completed}</div>
          <p className={`text-[10px] mt-0.5 ${activeTab === 'completed' ? 'text-emerald-100' : 'text-gray-400'}`}>
            Follow-ups finished
          </p>
        </div>

        {/* Total Outstanding at Risk */}
        <div className="bg-gradient-to-br from-zinc-900 to-black p-4 rounded-2xl border border-zinc-800 text-white shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              💰 At Risk Balances
            </span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-amber-400">
            ₹{totalOutstandingAtRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] mt-0.5 text-zinc-400">Active pending collection</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3.5 justify-between items-center">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Reminders', count: counts.total },
            { id: 'overdue', label: '🚨 Overdue', count: counts.overdue },
            { id: 'today', label: '⏰ Due Today', count: counts.today },
            { id: 'upcoming', label: '📅 Upcoming', count: counts.upcoming },
            { id: 'completed', label: '✅ Completed', count: counts.completed },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                activeTab === tab.id ? 'bg-zinc-800 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Priority */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone, invoice..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none transition-all"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none shrink-0"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Normal</option>
          </select>
        </div>
      </div>

      {/* Reminders List / Table */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm">
          <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500 font-bold">Loading payment reminders & time limits...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <BellRing className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-gray-900">No Payment Reminders Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
            {activeTab === 'all'
              ? 'You have not scheduled any payment time limits or reminders yet. Set your first reminder on an invoice now!'
              : `No reminders in the "${activeTab}" filter. Try selecting another tab or clear filters.`}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black rounded-xl text-xs shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Set Payment Reminder Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/80 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                  <th className="p-4">Customer / Party</th>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4 text-right">Balance Due</th>
                  <th className="p-4">Time Limit / Due Deadline</th>
                  <th className="p-4 text-center">Priority</th>
                  <th className="p-4">Remarks / Promise</th>
                  <th className="p-4 text-right">1-Click Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reminders.map((rem) => {
                  const inv = rem.invoice;
                  const party = rem.party || inv?.party;
                  const bal = (inv?.balanceAmount ?? rem.expectedAmount ?? 0);

                  return (
                    <tr
                      key={rem.id}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        rem.isOverdue && rem.status === 'pending' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Customer / Party */}
                      <td className="p-4">
                        <div className="font-black text-gray-900 text-sm flex items-center gap-1.5">
                          <span>{party?.name || 'Customer'}</span>
                          {party?.city && (
                            <span className="text-[10px] font-normal text-gray-400">({party.city})</span>
                          )}
                        </div>
                        {party?.phone ? (
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${party.phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {party.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">No phone</span>
                        )}
                      </td>

                      {/* Invoice Details */}
                      <td className="p-4">
                        {inv ? (
                          <div>
                            {hasPermission('paymentReminders', 'viewInvoice') ? (
                              <button
                                onClick={() => handleOpenPdf(inv)}
                                className="font-mono font-black text-blue-800 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md hover:underline inline-flex items-center gap-1"
                                title="Click to view tax invoice"
                              >
                                <span>{inv.invoiceNumber}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="font-mono font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                                {inv.invoiceNumber}
                              </span>
                            )}
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Inv Date: {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono text-[11px]">{rem.invoiceId}</span>
                        )}
                      </td>

                      {/* Balance Due */}
                      <td className="p-4 text-right">
                        <div className="font-mono font-black text-base text-amber-600">
                          ₹{bal.toFixed(2)}
                        </div>
                        {inv && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Total: ₹{inv.grandTotal?.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Time Limit Deadline */}
                      <td className="p-4">
                        {formatTimeLimitLabel(rem)}
                      </td>

                      {/* Priority */}
                      <td className="p-4 text-center">
                        {getPriorityBadge(rem.priority)}
                      </td>

                      {/* Remarks */}
                      <td className="p-4 max-w-xs">
                        <p className="text-gray-700 text-xs italic line-clamp-2">
                          {rem.notes || '—'}
                        </p>
                        {rem.employeeName && (
                          <span className="text-[10px] text-gray-400 block mt-0.5 font-medium">
                            Set by: {rem.employeeName}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Reminder Button */}
                          {hasPermission('paymentReminders', 'whatsapp') && (
                            <button
                              onClick={() => handleWhatsAppReminder(rem)}
                              title="Send 1-Click WhatsApp Reminder"
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-xs flex items-center gap-1 transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}

                          {/* Reschedule Button */}
                          <button
                            onClick={() => handleOpenEditModal(rem)}
                            title="Reschedule / Change Time Limit"
                            className="p-1.5 hover:bg-amber-100 text-amber-800 rounded-xl transition-colors border border-amber-200"
                          >
                            <Clock className="w-4 h-4" />
                          </button>

                          {/* Complete Button */}
                          {rem.status === 'pending' && (
                            <button
                              onClick={() => handleMarkCompleted(rem)}
                              title="Mark as Done / Payment Received"
                              className="p-1.5 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors border border-emerald-200"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {hasPermission('paymentReminders', 'delete') && (
                            <button
                              onClick={() => handleDeleteReminder(rem)}
                              title="Delete Reminder"
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={fetchReminders}
        invoice={selectedInvoiceForModal}
        initialReminder={editingReminder}
      />

      {/* Invoice PDF Modal */}
      <InvoicePdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        data={selectedInvoiceForPdf}
        type="INVOICE"
      />
    </div>
  );
};

export default EmployeePaymentReminders;

