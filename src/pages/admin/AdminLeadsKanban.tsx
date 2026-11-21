import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import { Lead, LeadPriority, LeadStatus } from '@/lib/types/leads';
import { openWhatsAppChat } from '@/lib/whatsapp';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Kanban,
  Phone,
  MessageCircle,
  Mail,
  User,
  Plus,
  ArrowRight,
  Flame,
  Search,
  Filter,
  RefreshCw,
  Building2,
  DollarSign,
  GripVertical,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Table,
  SlidersHorizontal,
  X,
  TrendingUp,
  Award,
  Clock,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LeadDetailDrawer from '@/components/admin/LeadDetailDrawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface KanbanStageConfig {
  id: LeadStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  columnBg: string;
  headerBorder: string;
  accentColor: string;
}

const KANBAN_STAGES: KanbanStageConfig[] = [
  {
    id: 'new',
    title: 'New Leads',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
    columnBg: 'bg-blue-50/40 border-blue-200/70',
    headerBorder: 'border-blue-400',
    accentColor: 'text-blue-600',
  },
  {
    id: 'contacted',
    title: 'Contacted',
    dotColor: 'bg-indigo-500',
    badgeBg: 'bg-indigo-600',
    badgeText: 'text-white',
    columnBg: 'bg-indigo-50/40 border-indigo-200/70',
    headerBorder: 'border-indigo-400',
    accentColor: 'text-indigo-600',
  },
  {
    id: 'interested' as LeadStatus,
    title: 'Interested',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    columnBg: 'bg-emerald-50/40 border-emerald-200/70',
    headerBorder: 'border-emerald-400',
    accentColor: 'text-emerald-600',
  },
  {
    id: 'follow_up',
    title: 'Follow Up',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
    columnBg: 'bg-amber-50/40 border-amber-200/70',
    headerBorder: 'border-amber-400',
    accentColor: 'text-amber-600',
  },
  {
    id: 'converted',
    title: 'Converted',
    dotColor: 'bg-green-600',
    badgeBg: 'bg-green-600',
    badgeText: 'text-white',
    columnBg: 'bg-green-50/40 border-green-200/70',
    headerBorder: 'border-green-500',
    accentColor: 'text-green-600',
  },
  {
    id: 'lost',
    title: 'Lost',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-500',
    badgeText: 'text-white',
    columnBg: 'bg-slate-100/60 border-slate-200/80',
    headerBorder: 'border-slate-300',
    accentColor: 'text-slate-600',
  },
];

const INITIAL_MOCK_LEADS: Lead[] = [];

export const AdminLeadsKanban: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');

  // Quick Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetAddStage, setTargetAddStage] = useState<LeadStatus>('new');
  const [newLeadForm, setNewLeadForm] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    source: 'meta',
    priority: 'medium' as LeadPriority,
    deal_value: '',
    assigned_to: 'Unassigned',
    notes: '',
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/leads');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((l: any) => ({
          id: l.id || `lead-${Math.random()}`,
          full_name: l.fullName || l.full_name || 'Unnamed Prospect',
          company_name: l.companyName || l.company_name || 'Independent Client',
          phone: l.phone || '+91 00000 00000',
          email: l.email || '',
          source: l.source || 'website',
          status: (l.status as LeadStatus) || 'new',
          priority: (l.priority as LeadPriority) || 'medium',
          lead_score: l.lead_score ?? l.leadScore ?? 70,
          deal_value: l.deal_value ?? l.dealValue ?? 10000,
          assigned_to: l.assigned_to || l.assignedTo || 'Unassigned',
          created_at: l.createdAt || l.created_at || new Date().toISOString(),
          updated_at: l.updatedAt || l.updated_at || new Date().toISOString(),
          notes: l.notes || '',
        }));
        setLeads(mapped);
        try {
          const empRes = await crmApi.get('/units/employees/available');
          if (Array.isArray(empRes.data)) setEmployees(empRes.data);
        } catch (_) { }
      } else {
        setLeads([]);
      }
    } catch (err: any) {
      console.warn('Backend leads API error:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Drag and Drop Handler
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as LeadStatus;
    const oldStage = source.droppableId as LeadStatus;

    // Optimistically update local state immediately
    setLeads((prev) =>
      prev.map((l) => (l.id === draggableId ? { ...l, status: newStage } : l))
    );

    const stageName = KANBAN_STAGES.find((s) => s.id === newStage)?.title || newStage;
    toast.success(`Moved lead to "${stageName}"`);

    try {
      await crmApi.put(`/leads/${draggableId}`, { status: newStage });
    } catch (err: any) {
      console.warn('Stage change sync failed, optimistic update retained in UI');
    }
  };

  const handleMoveStage = async (id: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    const stageName = KANBAN_STAGES.find((s) => s.id === newStatus)?.title || newStatus;
    toast.success(`Moved lead to "${stageName}"`);

    try {
      await crmApi.put(`/leads/${id}`, { status: newStatus });
    } catch (err: any) {
      // Retain optimistic state
    }
  };

  // Quick Add Lead submit
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.full_name || !newLeadForm.phone) {
      toast.error('Name and Phone number are required');
      return;
    }

    const createdLead: Lead = {
      id: `lead-custom-${Date.now()}`,
      full_name: newLeadForm.full_name,
      company_name: newLeadForm.company_name || 'Direct Business',
      phone: newLeadForm.phone,
      email: newLeadForm.email || '',
      source: newLeadForm.source,
      status: targetAddStage,
      priority: newLeadForm.priority,
      lead_score: 75,
      deal_value: parseFloat(newLeadForm.deal_value) || 12000,
      assigned_to: newLeadForm.assigned_to,
      notes: newLeadForm.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLeads((prev) => [createdLead, ...prev]);
    toast.success(`Added new lead to "${KANBAN_STAGES.find((s) => s.id === targetAddStage)?.title}"`);
    setIsAddModalOpen(false);
    setNewLeadForm({
      full_name: '',
      company_name: '',
      phone: '',
      email: '',
      source: 'meta',
      priority: 'medium',
      deal_value: '',
      assigned_to: 'Unassigned',
      notes: '',
    });

    // Fire non-blocking API call
    crmApi.post('/leads', createdLead).catch(() => { });
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lead.full_name?.toLowerCase().includes(q) ||
        lead.company_name?.toLowerCase().includes(q) ||
        lead.phone?.includes(q) ||
        lead.email?.toLowerCase().includes(q);

      // Source filter
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;

      // Agent filter
      const matchesAgent =
        agentFilter === 'all' ||
        (agentFilter === 'unassigned'
          ? !lead.assigned_to || lead.assigned_to.toLowerCase() === 'unassigned'
          : lead.assigned_to === agentFilter);

      return matchesSearch && matchesSource && matchesPriority && matchesAgent;
    });
  }, [leads, searchQuery, sourceFilter, priorityFilter, agentFilter]);

  // High-level pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const total = filteredLeads.length;
    const activeInPipeline = filteredLeads.filter(
      (l) => l.status !== 'converted' && l.status !== 'lost'
    ).length;
    const qualifiedCount = filteredLeads.filter((l) => l.status === 'qualified').length;
    const convertedCount = filteredLeads.filter((l) => l.status === 'converted').length;
    const totalPipelineValue = filteredLeads.reduce(
      (acc, l) => acc + (Number(l.deal_value) || 10000),
      0
    );
    const convertedValue = filteredLeads
      .filter((l) => l.status === 'converted')
      .reduce((acc, l) => acc + (Number(l.deal_value) || 10000), 0);

    const conversionRate = total ? Math.round((convertedCount / total) * 100) : 0;

    return {
      total,
      activeInPipeline,
      qualifiedCount,
      convertedCount,
      totalPipelineValue,
      convertedValue,
      conversionRate,
    };
  }, [filteredLeads]);

  // Unique telecallers list for filter dropdown
  const uniqueAgents = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.assigned_to && l.assigned_to !== 'Unassigned') {
        set.add(l.assigned_to);
      }
    });
    return Array.from(set);
  }, [leads]);

  const hasActiveFilters =
    searchQuery !== '' || sourceFilter !== 'all' || priorityFilter !== 'all' || agentFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setPriorityFilter('all');
    setAgentFilter('all');
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-in fade-in duration-300">
      {/* =========================================================================
          1. HEADER WITH SUMMARY METRICS & WORKSPACE CONTROLS
          ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-indigo-600/20 via-purple-600/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Kanban className="w-3.5 h-3.5 text-indigo-400" />
                Real-Time Drag & Drop Pipeline
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                6 Dynamic Funnel Stages
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>Leads Pipeline Kanban Board</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track prospects from first contact to deal closure. Drag cards across stages to automatically update assignments and CRM activity logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchLeads}
              disabled={loading}
              title="Refresh Pipeline Leads"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <Link
              to="/admin/leads"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            >
              <Table className="w-3.5 h-3.5 text-indigo-400" />
              <span>Table View</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setTargetAddStage('new');
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 border border-indigo-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Lead</span>
            </button>
          </div>
        </div>

        {/* High-Impact Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/70">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total In Funnel
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {pipelineMetrics.total} Leads
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">All active stages</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/70">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pipeline Value
            </div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
              ${pipelineMetrics.totalPipelineValue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Estimated potential</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/70">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Negotiations
            </div>
            <div className="text-xl font-extrabold text-indigo-300 mt-0.5">
              {pipelineMetrics.activeInPipeline} Leads
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Pre-close stages</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/70">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Deals Converted
            </div>
            <div className="text-xl font-extrabold text-green-400 mt-0.5">
              {pipelineMetrics.convertedCount} (${pipelineMetrics.convertedValue.toLocaleString()})
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Closed won</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/70 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Conversion Win Rate
            </div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">
              {pipelineMetrics.conversionRate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">From total leads</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SEARCH & FILTER TOOLBAR
          ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, company, phone or email..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Dropdowns & Density Toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Lead Sources</option>
              <option value="meta">Meta / Facebook Ads</option>
              <option value="website">Website Inquiries</option>
              <option value="google_ads">Google Ads</option>
              <option value="trade_show">Trade Shows & Expos</option>
              <option value="referral">Referrals</option>
              <option value="manual">Direct / Manual</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Telecaller Agent Filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Assigned Reps</option>
              {uniqueAgents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
              <option value="unassigned">Unassigned Only</option>
            </select>

            {/* Card Density Toggle */}
            <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
              <button
                type="button"
                onClick={() => setDensity('normal')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${density === 'normal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${density === 'compact'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Compact
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. DRAG AND DROP KANBAN BOARD COLUMNS
          ========================================================================= */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => {
              const s = (l.status || '').toLowerCase();
              if (stage.id === 'interested') return s === 'interested' || s === 'qualified';
              if (stage.id === 'converted') return s === 'converted' || s === 'won';
              if (stage.id === 'lost') return s === 'lost' || s === 'not_interested';
              return s === stage.id;
            });
            const stageValue = stageLeads.reduce(
              (acc, l) => acc + (Number(l.deal_value) || 10000),
              0
            );

            return (
              <div
                key={stage.id}
                className={`w-[325px] shrink-0 rounded-2xl border ${stage.columnBg} flex flex-col max-h-[820px] shadow-xs transition-all`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200/80 bg-white/70 backdrop-blur-xs rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor} shadow-xs`} />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {stage.title}
                    </h3>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stage.badgeBg} ${stage.badgeText} shadow-xs`}
                    >
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold text-slate-600">
                      ${stageValue >= 1000 ? `${(stageValue / 1000).toFixed(1)}k` : stageValue}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetAddStage(stage.id);
                        setIsAddModalOpen(true);
                      }}
                      title={`Add lead to ${stage.title}`}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 flex items-center justify-center transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Droppable Cards Container */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 space-y-3 min-h-[450px] transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-indigo-50/70 ring-2 ring-indigo-400/40 ring-inset' : ''
                        }`}
                    >
                      {stageLeads.length === 0 ? (
                        <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-4 bg-white/40">
                          <Kanban className="w-6 h-6 text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-500">No leads in this stage</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Drag a prospect card here</p>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetAddStage(stage.id);
                              setIsAddModalOpen(true);
                            }}
                            className="mt-2.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Lead</span>
                          </button>
                        </div>
                      ) : (
                        stageLeads.map((lead, index) => {
                          const whatsappMsg = `Hello ${lead.full_name}, thank you for your interest in Incense Media.`;

                          return (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setIsDrawerOpen(true);
                                  }}
                                  className={`bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all group ${density === 'compact' ? 'p-3 space-y-2' : 'p-3.5 space-y-3'
                                    } ${dragSnapshot.isDragging
                                      ? 'shadow-2xl ring-2 ring-indigo-500 rotate-1 scale-[1.02]'
                                      : ''
                                    }`}
                                >
                                  {/* Top Badges Row */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-0.5 rounded"
                                        title="Drag to reposition stage"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </div>

                                      <span
                                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide ${lead.priority === 'high'
                                            ? 'bg-rose-100 text-rose-700'
                                            : lead.priority === 'medium'
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}
                                      >
                                        {lead.priority || 'NORMAL'}
                                      </span>

                                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[85px]">
                                        {lead.source?.replace('_', ' ') || 'Direct'}
                                      </span>
                                    </div>

                                    {lead.lead_score && (
                                      <div
                                        className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 shrink-0"
                                        title={`Lead Score: ${lead.lead_score}`}
                                      >
                                        <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        <span>{lead.lead_score}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Client & Company Information */}
                                  <div>
                                    <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                      {lead.full_name}
                                    </div>
                                    {lead.company_name && (
                                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{lead.company_name}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Value & Direct Contact Shortcuts */}
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <div className="font-black text-slate-900 flex items-center gap-0.5">
                                      <span className="text-slate-400 font-semibold">$</span>
                                      <span>{(Number(lead.deal_value) || 12000).toLocaleString()}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {lead.phone && (
                                        <a
                                          href={`tel:${lead.phone}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-all"
                                          title={`Call ${lead.phone}`}
                                        >
                                          <Phone className="w-3 h-3" />
                                        </a>
                                      )}

                                      {lead.phone && (
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            openWhatsAppChat(lead.phone, whatsappMsg, e)
                                          }
                                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 transition-all cursor-pointer"
                                          title="Open WhatsApp chat (re-uses running window)"
                                        >
                                          <MessageCircle className="w-3 h-3" />
                                        </button>
                                      )}

                                      {lead.email && (
                                        <a
                                          href={`mailto:${lead.email}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-600 transition-all"
                                          title={`Email ${lead.email}`}
                                        >
                                          <Mail className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Assigned Agent & Quick Stage Dropdown */}
                                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[9px] flex items-center justify-center">
                                        {(lead.assigned_to || 'U').charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate max-w-[95px] text-slate-600 font-semibold">
                                        {lead.assigned_to || 'Unassigned'}
                                      </span>
                                    </div>

                                    <select
                                      value={lead.status}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) =>
                                        handleMoveStage(lead.id, e.target.value as LeadStatus)
                                      }
                                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-md px-1.5 py-0.5 focus:outline-hidden"
                                    >
                                      {KANBAN_STAGES.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* =========================================================================
          4. QUICK ADD LEAD MODAL DIALOG
          ========================================================================= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>
                Add Lead to "{KANBAN_STAGES.find((s) => s.id === targetAddStage)?.title}"
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.full_name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, full_name: e.target.value })}
                  placeholder="e.g. Sunil Agrawal"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Company Name</label>
                <input
                  type="text"
                  value={newLeadForm.company_name}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, company_name: e.target.value })
                  }
                  placeholder="e.g. Aroma Naturals Ltd"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  placeholder="+91 98201 44521"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Estimated Deal Value ($)</label>
                <input
                  type="number"
                  value={newLeadForm.deal_value}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, deal_value: e.target.value })
                  }
                  placeholder="15000"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Source</label>
                <select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="meta">Meta / Facebook Ads</option>
                  <option value="website">Website Inquiry</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="trade_show">Trade Show / Expo</option>
                  <option value="referral">Referral</option>
                  <option value="manual">Manual Direct</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Priority</label>
                <select
                  value={newLeadForm.priority}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, priority: e.target.value as LeadPriority })
                  }
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700">Assign to Telecaller</label>
                <select
                  value={newLeadForm.assigned_to}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, assigned_to: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="Unassigned">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`.trim()}>
                      {emp.firstName} {emp.lastName} ({emp.role?.name || emp.roleName || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700">Notes / Scope of Work</label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  placeholder="Key requirements, products of interest..."
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-colors"
              >
                Add Lead to Board
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          5. LEAD DETAIL DRAWER
          ========================================================================= */}
      <LeadDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lead={selectedLead}
        onUpdateStatus={(id, newStatus) => {
          handleMoveStage(id, newStatus as LeadStatus);
        }}
      />
    </div>
  );
};

export default AdminLeadsKanban;
