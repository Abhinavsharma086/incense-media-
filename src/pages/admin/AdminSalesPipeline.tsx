import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, DollarSign, Calendar, Target, AlertCircle, CheckCircle2, 
  Search, Info, MoreHorizontal, X, Building, User, Phone, 
  RefreshCw, Layers, Users, Briefcase, Zap, ExternalLink
} from 'lucide-react';
import crmApi from '../../api/crmApi';
import { toast } from 'sonner';
import { Deal, Lead } from '../../lib/types/crm';
import DealFormModal from '../../components/admin/DealFormModal';
import { useNavigate } from 'react-router-dom';
import { useDataSync, notifyDataChanged } from '../../lib/useDataSync';

const LEAD_STAGES = [
  { id: 'new', title: 'New Leads', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { id: 'contacted', title: 'Contacted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { id: 'follow_up', title: 'Follow Up', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { id: 'interested', title: 'Interested', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'converted', title: 'Converted / Won', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-600' },
  { id: 'lost', title: 'Lost / Closed', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
];

const DEAL_STAGES = [
  { id: 'new', title: 'Lead', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  { id: 'qualified', title: 'Qualified', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { id: 'meeting', title: 'Meeting', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { id: 'proposal', title: 'Proposal', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { id: 'won', title: 'Won', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' },
  { id: 'lost', title: 'Lost', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
];

const AdminSalesPipeline: React.FC = () => {
  const navigate = useNavigate();
  const [pipelineMode, setPipelineMode] = useState<'leads' | 'deals'>('leads');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddData, setQuickAddData] = useState({ name: '', value: '', leadId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(null);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [dealsRes, leadsRes] = await Promise.all([
        crmApi.get('/deals').catch(() => ({ data: [] })),
        crmApi.get('/leads').catch(() => ({ data: [] }))
      ]);
      setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : []);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
    } catch (error) {
      toast.error('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Multi-browser and cross-tab synchronization for Deals & Leads pipeline
  useDataSync(['deals', 'leads'], () => fetchData(true));

  // Filtered lists
  const filteredDeals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deals;
    return deals.filter(d => 
      (d.name || '').toLowerCase().includes(q) || 
      (d.lead?.companyName || '').toLowerCase().includes(q) || 
      (d.lead?.fullName || '').toLowerCase().includes(q)
    );
  }, [deals, searchQuery]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter(l => 
      (l.fullName || l.full_name || '').toLowerCase().includes(q) || 
      (l.companyName || l.company_name || '').toLowerCase().includes(q) || 
      (l.phone || '').includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  // Drag and drop handler for both Leads and Deals
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    const oldStage = source.droppableId;

    if (pipelineMode === 'leads') {
      // Optimistic lead stage update
      setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, status: newStage } : l));
      const stageObj = LEAD_STAGES.find(s => s.id === newStage);
      toast.success(`Moved lead to "${stageObj?.title || newStage}"`);

      try {
        await crmApi.put(`/leads/${draggableId}`, { status: newStage });
        notifyDataChanged('leads', 'stage_change', { id: draggableId, stage: newStage });
      } catch (error) {
        toast.error('Failed to update lead status');
        fetchData();
      }
    } else {
      // Optimistic deal stage update
      setDeals(prev => prev.map(deal => deal.id === draggableId ? { ...deal, stage: newStage } : deal));
      try {
        await crmApi.patch(`/deals/${draggableId}/stage`, { stage: newStage });
        notifyDataChanged('deals', 'stage_change', { id: draggableId, stage: newStage });
        toast.success(`Deal moved to "${newStage}"`);
      } catch (error) {
        toast.error('Failed to move deal');
        fetchData();
      }
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddData.name || !quickAddData.value || !quickAddData.leadId) {
      toast.error("Please fill all 3 fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const newDeal = {
        name: quickAddData.name,
        value: parseFloat(quickAddData.value),
        leadId: quickAddData.leadId,
        stage: 'new',
        probability: 10
      };
      const res = await crmApi.post('/deals', newDeal);
      notifyDataChanged('deals', 'create', res.data);
      toast.success('Deal added successfully!');
      setQuickAddData({ name: '', value: '', leadId: '' });
      setShowQuickAdd(false);
      fetchData(true);
    } catch (error) {
      toast.error("Could not add deal. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 font-medium text-sm animate-pulse">Loading live pipeline...</p>
      </div>
    );
  }

  const activeStages = pipelineMode === 'leads' ? LEAD_STAGES : DEAL_STAGES;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] font-sans -m-4 sm:-m-6 lg:-m-8 bg-white animate-in fade-in duration-300">
      
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 shrink-0 border-b border-gray-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Interactive Pipeline
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {pipelineMode === 'leads' ? `${leads.length} Leads in Funnel` : `${deals.length} Deals Active`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Pipeline</h1>
          <p className="text-xs text-gray-500 mt-0.5">Drag and drop cards between stages to update status in real-time</p>
        </div>

        {/* View Mode Switcher + Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPipelineMode('leads')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                pipelineMode === 'leads'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Leads Pipeline ({leads.length})</span>
            </button>
            <button
              onClick={() => setPipelineMode('deals')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                pipelineMode === 'deals'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-600" />
              <span>Deals Pipeline ({deals.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-56 hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Search ${pipelineMode}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-xs transition-all"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Refresh pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Quick Add */}
          {pipelineMode === 'deals' ? (
            <button 
              onClick={() => setShowQuickAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Deal
            </button>
          ) : (
            <button 
              onClick={() => navigate('/admin/leads')}
              className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
            >
              <Users className="w-4 h-4" /> Lead Management
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Add Inline Form (Deals) */}
      {showQuickAdd && (
        <div className="px-6 py-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0 animate-in fade-in">
          <form onSubmit={handleQuickAdd} className="flex items-center gap-3 max-w-4xl">
            <input 
              autoFocus
              type="text" 
              placeholder="Deal Name (e.g. Website Exhibition Package)" 
              value={quickAddData.name}
              onChange={e => setQuickAddData({...quickAddData, name: e.target.value})}
              className="flex-1 px-4 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-xs"
              required
            />
            <div className="relative w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">₹</span>
              <input 
                type="number" 
                placeholder="Value" 
                value={quickAddData.value}
                onChange={e => setQuickAddData({...quickAddData, value: e.target.value})}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-xs"
                required
              />
            </div>
            <select
              value={quickAddData.leadId}
              onChange={e => setQuickAddData({...quickAddData, leadId: e.target.value})}
              className="w-56 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-xs bg-white"
              required
            >
              <option value="">Select Contact...</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>{lead.companyName || lead.fullName || lead.full_name}</option>
              ))}
            </select>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 shadow-xs">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowQuickAdd(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl">
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 3. Drag and Drop Kanban Board */}
      <div className="flex-1 overflow-x-auto bg-slate-50/60 p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full items-start min-w-max">
            {activeStages.map(stage => {
              // Group leads or deals into this stage
              const stageItems = pipelineMode === 'leads'
                ? filteredLeads.filter(l => {
                    const s = (l.status || '').toLowerCase();
                    if (stage.id === 'interested') return s === 'interested' || s === 'qualified';
                    if (stage.id === 'converted') return s === 'converted' || s === 'won';
                    if (stage.id === 'lost') return s === 'lost' || s === 'not_interested';
                    return s === stage.id;
                  })
                : filteredDeals.filter(d => d.stage === stage.id);

              return (
                <div key={stage.id} className="w-[310px] flex flex-col h-full shrink-0">
                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${stage.color}`}>
                        {stage.title}
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">({stageItems.length})</span>
                    </div>
                  </div>
                  
                  {/* Drop Zone */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto space-y-3 p-2 rounded-2xl transition-all duration-200 min-h-[350px] border border-slate-200/80 bg-white/50 backdrop-blur-xs ${
                          snapshot.isDraggingOver ? 'bg-indigo-50/70 ring-2 ring-indigo-300 ring-inset' : ''
                        }`}
                      >
                        {stageItems.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                            <span className="text-slate-300 mb-1">Empty Stage</span>
                            <span>Drag {pipelineMode === 'leads' ? 'a lead' : 'a deal'} here</span>
                          </div>
                        )}

                        {stageItems.map((item, index) => {
                          const isLead = pipelineMode === 'leads';
                          const itemId = item.id;
                          const title = isLead ? (item.fullName || item.full_name || 'Prospect') : item.name;
                          const subtitle = isLead ? (item.companyName || item.company_name || item.source || '') : (item.lead?.companyName || item.lead?.fullName);
                          const value = isLead ? item.dealValue || item.deal_value : item.value;
                          const phone = isLead ? item.phone : '';
                          const ownerName = isLead 
                            ? (item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : item.assigned_to) 
                            : (item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : '');

                          return (
                            <Draggable key={itemId} draggableId={itemId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => {
                                    if (isLead) {
                                      navigate(`/admin/leads/${itemId}`);
                                    } else {
                                      setCurrentDeal(item);
                                      setIsModalOpen(true);
                                    }
                                  }}
                                  className={`bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer group hover:border-indigo-400 hover:shadow-md ${
                                    snapshot.isDragging ? 'shadow-2xl border-indigo-600 rotate-1' : 'border-slate-200 shadow-2xs'
                                  }`}
                                >
                                  {/* Card Header */}
                                  <div className="flex justify-between items-start mb-1.5">
                                    <h4 className="font-bold text-slate-900 text-xs leading-tight pr-2 group-hover:text-indigo-600 transition-colors">
                                      {title}
                                    </h4>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase tracking-wider shrink-0">
                                      {isLead ? (item.source || 'Lead') : 'Deal'}
                                    </span>
                                  </div>
                                  
                                  {/* Subtitle / Company */}
                                  {subtitle && (
                                    <div className="text-[11px] text-slate-500 mb-2.5 flex items-center gap-1.5 truncate">
                                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{subtitle}</span>
                                    </div>
                                  )}

                                  {/* Contact Phone if Lead */}
                                  {phone && (
                                    <div className="text-[11px] font-medium text-slate-700 mb-2.5 flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{phone}</span>
                                    </div>
                                  )}
                                  
                                  {/* Footer: Value & Owner */}
                                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
                                    <span className="font-extrabold text-slate-900 font-mono">
                                      {value ? `₹${Number(value).toLocaleString('en-IN')}` : 'General Inquiry'}
                                    </span>
                                    {ownerName ? (
                                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                        {ownerName}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-slate-400">Unassigned</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <DealFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deal={currentDeal}
        onSave={() => { setIsModalOpen(false); fetchData(true); }}
      />
    </div>
  );
};

export default AdminSalesPipeline;
