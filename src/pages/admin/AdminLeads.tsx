import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "../../components/ui/sonner";
import LeadDetailModal from "../../components/admin/LeadDetailModal";
import LeadImportModal from "../../components/admin/LeadImportModal";
import LeadFormModal from "../../components/admin/LeadFormModal";
import { Lead } from "../../lib/types/leads";
import crmApi from "../../api/crmApi";
import { Plus, Upload, Trash2, UserPlus, CalendarClock, Edit, FileDown, Search, Building2, UserCheck, Shield, Zap, Share2, Layers, Hash, Sliders, Globe, Shuffle, MessageSquare, History, Scale } from "lucide-react";
import BulkLeadDistributionSection, { EmployeeInfo } from "../../components/admin/BulkLeadDistributionSection";
import SerialLeadAssignerPanel from "../../components/admin/SerialLeadAssignerPanel";
import RoundRobinWorkloadModal from "../../components/admin/RoundRobinWorkloadModal";
import EqualLeadDistributionModal from "../../components/admin/EqualLeadDistributionModal";
import LeadRemarkTimelineModal from "../../components/admin/LeadRemarkTimelineModal";
import AddCategoryModal, { LeadCategoryItem } from "../../components/common/AddCategoryModal";
import { useMemo } from "react";
import { getEmployees } from "../../lib/roleAuthStore";
import { useDataSync, notifyDataChanged } from "../../lib/useDataSync";
import { openWhatsAppChat } from "../../lib/whatsapp";

export const isUnassignedLead = (l: any) => {
  if (!l) return true;
  const owner = l.assigned_to;
  return !owner || owner === 'unassigned' || owner === 'Unassigned' || owner === 'none' || owner === '';
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  roleName?: string;
}

const mapToFrontendLead = (dbLead: any): Lead => ({
  id: dbLead?.id || '',
  full_name: dbLead?.fullName || 'Unnamed Lead',
  phone: dbLead?.phone || '',
  email: dbLead?.email || '',
  company_name: dbLead?.companyName || '',
  website: dbLead?.website || '',
  city: dbLead?.city || '',
  industry: dbLead?.industry || '',
  source: dbLead?.source || 'manual',
  campaign: dbLead?.campaign || '',
  status: dbLead?.status || 'new',
  priority: dbLead?.priority || 'medium',
  interested_services: dbLead?.interestedService || '',
  category: dbLead?.category || 'general',
  budget: dbLead?.budget || '',
  lead_score: dbLead?.leadScore || 0,
  deal_value: dbLead?.dealValue || 0,
  assigned_to: dbLead?.ownerId || null,
  assigned_to_name: dbLead?.owner ? `${dbLead.owner.firstName || ''} ${dbLead.owner.lastName || ''}`.trim() : null,
  unit_name: dbLead?.unit?.name || null,
  next_follow_up_date: dbLead?.nextFollowUpDate || null,
  last_contact_date: dbLead?.lastContactDate || null,
  notes: dbLead?.notes || '',
  is_duplicate: Boolean(dbLead?.isDuplicate ?? dbLead?.is_duplicate ?? false),
  isDuplicate: Boolean(dbLead?.isDuplicate ?? dbLead?.is_duplicate ?? false),
  created_at: dbLead?.createdAt || new Date().toISOString(),
  updated_at: dbLead?.updatedAt || new Date().toISOString(),
});

const safeDateIso = (dateStr: any) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const mapToDbUpdates = (frontUpdates: any) => {
  const dbUpdates: any = {};
  if (frontUpdates.full_name !== undefined || frontUpdates.fullName !== undefined) {
    const val = frontUpdates.full_name ?? frontUpdates.fullName;
    if (val && String(val).trim()) dbUpdates.fullName = String(val).trim();
  }
  if (frontUpdates.phone !== undefined) {
    if (frontUpdates.phone && String(frontUpdates.phone).trim()) dbUpdates.phone = String(frontUpdates.phone).trim();
  }
  if (frontUpdates.email !== undefined) {
    dbUpdates.email = frontUpdates.email && String(frontUpdates.email).trim() ? String(frontUpdates.email).trim() : null;
  }
  if (frontUpdates.company_name !== undefined || frontUpdates.companyName !== undefined) {
    dbUpdates.companyName = frontUpdates.company_name ?? frontUpdates.companyName ?? null;
  }
  if (frontUpdates.website !== undefined) dbUpdates.website = frontUpdates.website || null;
  if (frontUpdates.city !== undefined) dbUpdates.city = frontUpdates.city || null;
  if (frontUpdates.industry !== undefined) dbUpdates.industry = frontUpdates.industry || null;
  if (frontUpdates.source !== undefined) dbUpdates.source = frontUpdates.source;
  if (frontUpdates.campaign !== undefined) dbUpdates.campaign = frontUpdates.campaign || null;
  if (frontUpdates.status !== undefined) dbUpdates.status = frontUpdates.status;
  if (frontUpdates.priority !== undefined) dbUpdates.priority = frontUpdates.priority;
  if (frontUpdates.category !== undefined) dbUpdates.category = frontUpdates.category;
  if (frontUpdates.domain !== undefined) dbUpdates.domain = frontUpdates.domain;
  if (frontUpdates.interested_services !== undefined || frontUpdates.interestedService !== undefined) {
    dbUpdates.interestedService = frontUpdates.interested_services ?? frontUpdates.interestedService ?? null;
  }
  if (frontUpdates.budget !== undefined) dbUpdates.budget = frontUpdates.budget || null;
  if (frontUpdates.deal_value !== undefined || frontUpdates.dealValue !== undefined) {
    const dv = frontUpdates.deal_value ?? frontUpdates.dealValue;
    dbUpdates.dealValue = dv && !isNaN(parseFloat(dv)) ? parseFloat(dv) : null;
  }
  if (frontUpdates.assigned_to !== undefined || frontUpdates.ownerId !== undefined) {
    const oId = frontUpdates.assigned_to ?? frontUpdates.ownerId;
    dbUpdates.ownerId = oId && oId !== 'unassigned' && oId !== 'None' ? oId : null;
  }
  if (frontUpdates.next_follow_up_date !== undefined || frontUpdates.nextFollowUpDate !== undefined) {
    dbUpdates.nextFollowUpDate = safeDateIso(frontUpdates.next_follow_up_date ?? frontUpdates.nextFollowUpDate);
  }
  if (frontUpdates.notes !== undefined) dbUpdates.notes = frontUpdates.notes;
  if (frontUpdates.allowDuplicate !== undefined) dbUpdates.allowDuplicate = Boolean(frontUpdates.allowDuplicate);
  return dbUpdates;
};

const mapToDbLead = (frontLead: any) => ({
  fullName: frontLead.full_name || frontLead.fullName || '',
  phone: frontLead.phone || '',
  email: frontLead.email || null,
  companyName: frontLead.company_name || frontLead.companyName || null,
  website: frontLead.website || null,
  city: frontLead.city || null,
  industry: frontLead.industry || null,
  source: frontLead.source || 'manual',
  campaign: frontLead.campaign || null,
  status: frontLead.status || 'new',
  priority: frontLead.priority || 'medium',
  category: frontLead.category || 'subscription',
  domain: frontLead.domain || 'Agarbatti & Perfume Expo',
  interestedService: frontLead.interested_services || frontLead.interestedService || null,
  budget: frontLead.budget || null,
  dealValue: frontLead.deal_value && !isNaN(parseFloat(frontLead.deal_value)) ? parseFloat(frontLead.deal_value) : null,
  nextFollowUpDate: safeDateIso(frontLead.next_follow_up_date || frontLead.nextFollowUpDate),
  notes: frontLead.notes || null,
  allowDuplicate: Boolean(frontLead.allowDuplicate),
});

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // View mode: 'table' | 'distribute' | 'serial_assign'
  const [activeTab, setActiveTab] = useState<'table' | 'distribute' | 'serial_assign'>('table');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");

  const handleQuickDomainChange = async (id: string, newDomain: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, domain: newDomain } : lead));
    try {
      await crmApi.put(`/leads/${id}`, { domain: newDomain });
      notifyDataChanged('leads', 'domain_change', { id, newDomain });
      toast.success(`Domain updated to "${newDomain}"`);
    } catch (error: any) {
      toast.error('Failed to update domain');
      fetchLeads();
    }
  };
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleAutoCleanDuplicates = async () => {
    try {
      setIsCleaningDuplicates(true);
      const res = await crmApi.post('/leads/auto-deduplicate');
      toast.success(res.data?.message || 'All duplicate leads have been automatically merged and cleaned!');
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to clean duplicates');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modals state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [targetBulkEmpId, setTargetBulkEmpId] = useState("");
  const [isRoundRobinModalOpen, setIsRoundRobinModalOpen] = useState(false);
  const [isEqualDistModalOpen, setIsEqualDistModalOpen] = useState(false);
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  // Set Lead Reminder Modal State
  const [reminderLead, setReminderLead] = useState<any>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const [currentLead, setCurrentLead] = useState<Lead | null>(null);

  const DEFAULT_CATEGORIES: LeadCategoryItem[] = [
    { id: 'cat-pub', name: 'publication', label: 'Publication', icon: '📚', color: 'purple' },
    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
    { id: 'cat-expo', name: 'exhibition', label: 'Exhibition / Expo', icon: '🏛️', color: 'amber' },
    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
    { id: 'cat-gen', name: 'general', label: 'General', icon: '💼', color: 'gray' },
  ];

  const [categories, setCategories] = useState<LeadCategoryItem[]>(DEFAULT_CATEGORIES);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'add' | 'manage'>('add');
  const [pendingLeadIdForCategory, setPendingLeadIdForCategory] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await crmApi.get('/leads/categories');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.warn('Admin categories fetch error:', err);
    }
  };

  const handleCategoryAdded = (newCat: LeadCategoryItem) => {
    setCategories(prev => {
      if (prev.some(c => c.name.toLowerCase() === newCat.name.toLowerCase())) return prev;
      return [...prev, newCat];
    });
    if (pendingLeadIdForCategory) {
      handleQuickCategoryChange(pendingLeadIdForCategory, newCat.name, {} as any);
      setPendingLeadIdForCategory(null);
    }
  };

  const handleCategoryUpdated = (updatedCat: LeadCategoryItem) => {
    setCategories(prev =>
      prev.map(c => ((c.id && c.id === updatedCat.id) || c.name === updatedCat.name ? updatedCat : c))
    );
    fetchLeads();
  };

  const handleCategoryDeleted = (deletedCatName: string) => {
    setCategories(prev => prev.filter(c => c.name !== deletedCatName));
    fetchLeads();
  };
  const [syncingWebsite, setSyncingWebsite] = useState(false);

  const handleSyncWebsiteLeads = async () => {
    setSyncingWebsite(true);
    try {
      const res = await crmApi.post('/leads/sync-website');
      toast.success(res.data?.message || 'Website leads synced to CRM successfully!');
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to sync website leads');
    } finally {
      setSyncingWebsite(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // 1. Fetch from local store
      const localEmps = getEmployees();

      // 2. Fetch from backend endpoints
      let backendEmps: any[] = [];
      try {
        const empRes = await crmApi.get('/units/employees/available');
        if (Array.isArray(empRes.data) && empRes.data.length > 0) {
          backendEmps = empRes.data;
        }
      } catch (e) {
        console.warn('Available employees fetch warning:', e);
      }

      // If available was empty, fallback to /leads/workload
      if (backendEmps.length === 0) {
        try {
          const workloadRes = await crmApi.get('/leads/workload');
          if (Array.isArray(workloadRes.data) && workloadRes.data.length > 0) {
            backendEmps = workloadRes.data.map((w: any) => ({
              id: w.id,
              firstName: (w.name || 'Employee').split(' ')[0],
              lastName: (w.name || '').split(' ').slice(1).join(' ') || '',
              email: w.email,
              phone: w.phone,
              role: { name: w.role || 'Sales Staff' },
            }));
          }
        } catch (we) {
          console.warn('Workload employees fallback warning:', we);
        }
      }

      // 3. Merge backend and local employees so that NO employee is ever missing!
      const empMap = new Map<string, Employee>();
      backendEmps.forEach((b: any) => {
        empMap.set(b.id, {
          id: b.id,
          firstName: b.firstName || (b.name ? b.name.split(' ')[0] : 'Employee'),
          lastName: b.lastName || (b.name ? b.name.split(' ').slice(1).join(' ') : ''),
          email: b.email,
          phone: b.phone,
          roleName: b.role?.name || b.role || 'Sales Staff',
        });
      });

      localEmps.forEach((l: any) => {
        const exists = Array.from(empMap.values()).some(
          (x) =>
            (l.email && x.email?.toLowerCase() === l.email.toLowerCase()) ||
            (l.phone && x.phone && x.phone === l.phone) ||
            `${x.firstName} ${x.lastName}`.trim().toLowerCase() === (l.name || '').trim().toLowerCase()
        );
        if (!exists) {
          const names = (l.name || 'Employee').split(' ');
          empMap.set(l.id, {
            id: l.id,
            firstName: names[0],
            lastName: names.slice(1).join(' ') || '',
            email: l.email,
            phone: l.phone,
            roleName: l.designation || 'Sales Staff',
          });
        }
      });

      const finalEmps = Array.from(empMap.values());
      if (finalEmps.length > 0) {
        setEmployees(finalEmps);
      }
    } catch (err) {
      console.warn('Error fetching employees list:', err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // 1. Fetch leads from backend
      let loadedLeads: Lead[] = [];
      try {
        const res = await crmApi.get('/leads');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          loadedLeads = res.data.map(mapToFrontendLead);
          setLeads(loadedLeads);
        } else if (res.data && Array.isArray(res.data) && res.data.length === 0) {
          // If 0 leads in table, attempt auto-sync from website inquiries table
          try {
            await crmApi.post('/leads/sync-website');
            const retryRes = await crmApi.get('/leads');
            if (retryRes.data && Array.isArray(retryRes.data) && retryRes.data.length > 0) {
              loadedLeads = retryRes.data.map(mapToFrontendLead);
              setLeads(loadedLeads);
            }
          } catch (_) { }
        }
      } catch (leadErr) {
        console.warn('Backend leads API warning:', leadErr);
      }

      // If still 0 leads loaded, fallback to direct inquiries endpoint so website leads are never missing
      if (loadedLeads.length === 0) {
        try {
          const inqRes = await crmApi.get('/inquiries');
          const inqData = inqRes.data?.data || (Array.isArray(inqRes.data) ? inqRes.data : []);
          if (Array.isArray(inqData) && inqData.length > 0) {
            const mappedInqs = inqData.map((inq: any) => ({
              id: `website_${inq.id}`,
              full_name: inq.name || inq.contactFor || (inq.email ? inq.email.split('@')[0] : 'Website Lead'),
              phone: inq.phone || 'Email Only',
              email: inq.email || '',
              company_name: inq.contactFor || null,
              website: null,
              city: null,
              industry: null,
              source: 'website',
              campaign: inq.type === 'exhibitor-inquiry' ? 'Website Exhibitor Query' : (inq.type === 'contactUs' ? 'Website Contact Form' : 'Website General Query'),
              status: 'new',
              priority: inq.type === 'exhibitor-inquiry' ? 'high' : 'medium',
              interested_services: inq.contactFor || inq.type,
              budget: null,
              lead_score: 50,
              deal_value: null,
              assigned_to: null,
              assigned_to_name: null,
              unit_name: null,
              next_follow_up_date: null,
              last_contact_date: null,
              notes: inq.message || '',
              created_at: inq.createdAt || new Date().toISOString(),
              updated_at: inq.updatedAt || new Date().toISOString(),
            }));
            setLeads(mappedInqs);
          }
        } catch (_) { }
      }

      // 2. Load employees independently
      await fetchEmployees();
    } catch (error) {
      console.error('fetchLeads error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchCategories();
  }, []);

  // Real-time synchronization across Chrome, Firefox, and other browser instances
  useDataSync('leads', fetchLeads);
  useDataSync('lead_categories', fetchCategories);

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const dbUpdates = mapToDbUpdates(updates);
      const res = await crmApi.put(`/leads/${id}`, dbUpdates);
      setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, ...mapToFrontendLead(res.data) } : lead));
      notifyDataChanged('leads', 'update', { id, updates });
      toast.success("Lead updated");
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to update lead';
      toast.error(msg);
      throw error;
    }
  };

  const handleQuickCategoryChange = async (id: string, newCategory: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, category: newCategory } : lead));
    try {
      await crmApi.put(`/leads/${id}`, { category: newCategory });
      notifyDataChanged('leads', 'category_change', { id, newCategory });
      toast.success(`Category updated to "${newCategory}"`);
    } catch (error: any) {
      toast.error('Failed to update category');
      fetchLeads();
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    // Optimistic update
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, status: newStatus as any } : lead));
    try {
      const res = await crmApi.put(`/leads/${id}`, { status: newStatus });
      setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, ...mapToFrontendLead(res.data) } : lead));
      notifyDataChanged('leads', 'status_change', { id, newStatus });
      toast.success(`Status updated to "${newStatus.replace('_', ' ')}"`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
      fetchLeads();
    }
  };

  const handleReassign = async (leadId: string, employeeId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    try {
      await crmApi.post('/leads/assign/reassign', {
        leadId,
        newEmployeeId: employeeId,
        reason: 'Reassigned via Lead Table',
      });
      notifyDataChanged('leads', 'reassign', { leadId, employeeId });
      toast.success('Lead owner reassigned');
      fetchLeads();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reassign lead');
    }
  };

  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBulkEmpId || selectedLeadIds.length === 0) return;

    try {
      await crmApi.post('/leads/assign/bulk', {
        leadIds: selectedLeadIds,
        employeeId: targetBulkEmpId,
      });
      notifyDataChanged('leads', 'bulk_assign', { leadIds: selectedLeadIds, targetBulkEmpId });
      toast.success(`Assigned ${selectedLeadIds.length} lead(s) successfully`);
      setIsBulkAssignModalOpen(false);
      setSelectedLeadIds([]);
      fetchLeads();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to bulk assign leads');
    }
  };

  const handleSaveNewLead = async (leadData: Partial<Lead>) => {
    if (currentLead) {
      await handleUpdateLead(currentLead.id, leadData);
    } else {
      try {
        const dbData = mapToDbLead(leadData);
        const res = await crmApi.post('/leads', dbData);
        setLeads([mapToFrontendLead(res.data), ...leads]);
        notifyDataChanged('leads', 'create', res.data);
        toast.success("Lead created successfully");
      } catch (error: any) {
        const msg = error?.response?.data?.message || 'Failed to create lead';
        toast.error(msg);
        throw error;
      }
    }
  };

  const navigate = useNavigate();

  const handleViewLead = (lead: Lead) => {
    navigate(`/admin/leads/${lead.id}`);
  };

  const handleEditLead = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentLead(lead);
    setIsFormModalOpen(true);
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleExportCSV = () => {
    const leadsToExport = selectedLeadIds.length > 0
      ? leads.filter(l => selectedLeadIds.includes(l.id))
      : filteredLeads;

    if (leadsToExport.length === 0) {
      toast.error('No leads to export');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Priority', 'Assigned To', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => [
        `"${lead.id}"`,
        `"${lead.full_name}"`,
        `"${lead.email || ''}"`,
        `"${lead.phone}"`,
        `"${lead.company_name || ''}"`,
        `"${lead.status}"`,
        `"${lead.source}"`,
        `"${lead.priority}"`,
        `"${(lead as any).assigned_to_name || 'Unassigned'}"`,
        `"${new Date(lead.created_at).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} leads?`)) {
      setLoading(true);
      try {
        await Promise.all(selectedLeadIds.map(id => crmApi.delete(`/leads/${id}`)));
        setLeads(leads.filter(l => !selectedLeadIds.includes(l.id)));
        setSelectedLeadIds([]);
        toast.success("Leads deleted successfully");
      } catch (error) {
        toast.error("Failed to delete some leads");
      } finally {
        setLoading(false);
      }
    }
  };

  const duplicatePhoneSet = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(leads)) {
      leads.forEach(l => {
        const clean = (l.phone || '').replace(/[^0-9]/g, '');
        const tenDigit = clean.length >= 10 ? clean.slice(-10) : clean;
        if (tenDigit.length >= 6) {
          counts[tenDigit] = (counts[tenDigit] || 0) + 1;
        }
      });
    }
    const dups = new Set<string>();
    Object.entries(counts).forEach(([phone, count]) => {
      if (count > 1) dups.add(phone);
    });
    return dups;
  }, [leads]);

  const isDuplicateLead = (lead: Lead) => {
    if (lead.is_duplicate || (lead as any).isDuplicate) return true;
    const clean = (lead.phone || '').replace(/[^0-9]/g, '');
    const tenDigit = clean.length >= 10 ? clean.slice(-10) : clean;
    return tenDigit.length >= 6 && duplicatePhoneSet.has(tenDigit);
  };

  const duplicateCount = useMemo(() => {
    if (!Array.isArray(leads)) return 0;
    return leads.filter(l => isDuplicateLead(l)).length;
  }, [leads, duplicatePhoneSet]);

  const filteredLeads = (Array.isArray(leads) ? leads : []).filter((lead) => {
    if (!lead) return false;
    const matchesSearch =
      (lead.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone || '').includes(searchQuery) ||
      ((lead.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const leadSrc = (lead.source || 'manual').trim().toLowerCase();
    const filterSrc = sourceFilter.trim().toLowerCase();
    const matchesSource = sourceFilter === "all" || leadSrc === filterSrc;
    const leadCat = (lead.category || 'general').trim().toLowerCase();
    const filterCat = categoryFilter.trim().toLowerCase();
    const matchesCategory = categoryFilter === "all" || leadCat === filterCat;

    const matchesDuplicates = !showOnlyDuplicates || isDuplicateLead(lead);
    return matchesSearch && matchesStatus && matchesSource && matchesCategory && matchesDuplicates;
  });

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(categories)) {
      categories.forEach(c => {
        if (c && c.name) counts[c.name.toLowerCase()] = 0;
      });
    }
    if (Array.isArray(leads)) {
      leads.forEach(l => {
        if (!l) return;
        const cat = (l.category || 'general').trim().toLowerCase();
        counts[cat] = (counts[cat] || 0) + 1;
      });
    }
    return counts;
  }, [leads, categories]);

  const sourceStats = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(leads)) {
      leads.forEach(l => {
        if (!l) return;
        const src = (l.source || 'manual').trim().toLowerCase();
        map.set(src, (map.get(src) || 0) + 1);
      });
    }
    const standard = ['website', 'meta', 'manual', 'import', 'whatsapp', 'expo'];
    standard.forEach(s => {
      if (!map.has(s)) map.set(s, 0);
    });
    return Array.from(map.entries()).map(([key, count]) => ({
      key,
      count,
      label: key === 'website' ? '🌐 Website Inquiries' :
        key === 'meta' ? '📱 Meta Ads' :
          key === 'manual' ? '✍️ Manual' :
            key === 'import' ? '📂 Imported' :
              key === 'whatsapp' ? '💬 WhatsApp' :
                key === 'expo' ? '🏛️ Expo' :
                  `${key.charAt(0).toUpperCase() + key.slice(1)}`
    }));
  }, [leads]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contacted': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'follow_up': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'interested': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'converted': return 'bg-green-100 text-green-800 border-green-200';
      case 'lost': case 'not_interested': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (dateString?: string | null) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() < new Date().getTime();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 font-sans">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage, assign and track all your leads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsEqualDistModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-zinc-950 shadow-amber-200 border border-amber-400"
            title="Distribute leads equally across all employees and manage automatic workflow"
          >
            <Scale className="w-4 h-4" />
            <span>Equal Distribution & Workflow</span>
          </button>
          <button
            onClick={() => setIsRoundRobinModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-indigo-200"
            title="Auto-Assign all unassigned leads across all employees using Round Robin & Workload Balance"
          >
            <Shuffle className="w-4 h-4 text-cyan-200" />
            <span>⚡ Round Robin Auto-Assign</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
              {leads.filter(isUnassignedLead).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'serial_assign' ? 'table' : 'serial_assign')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${activeTab === 'serial_assign'
                ? 'bg-amber-500 text-white shadow-amber-200'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
              }`}
          >
            <Hash className="w-4 h-4 text-white" /> {activeTab === 'serial_assign' ? '📋 View Table' : '🔢 10-100 Serial Assigner'}
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'distribute' ? 'table' : 'distribute')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${activeTab === 'distribute'
                ? 'bg-indigo-600 text-white shadow-indigo-200'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700'
              }`}
          >
            <Zap className="w-4 h-4 text-amber-300" /> {activeTab === 'distribute' ? '📋 View Table' : '⚡ Bulk Distribute Hub'}
          </button>
          <Link
            to="/admin/units"
            className="px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-4 h-4" /> Units & Rules
          </Link>
          <button
            onClick={handleSyncWebsiteLeads}
            disabled={syncingWebsite}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Sync latest inquiries from incensemedia.in to CRM Leads"
          >
            <Globe className={`w-4 h-4 text-emerald-200 ${syncingWebsite ? 'animate-spin' : ''}`} />
            {syncingWebsite ? 'Syncing...' : 'Sync Website Leads'}
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => { setCurrentLead(null); setIsFormModalOpen(true); }}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-gray-200 pb-2 font-sans">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'table'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Layers className="w-4 h-4" /> All Leads Directory ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('serial_assign')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'serial_assign'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Hash className="w-4 h-4 text-amber-500" /> 🔢 10-100 Serial Assigner & Workloads
        </button>
        <button
          onClick={() => setActiveTab('distribute')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'distribute'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Zap className="w-4 h-4 text-amber-400" /> ⚡ Bulk Lead Distribution Hub
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-1 ${activeTab === 'distribute' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
            {leads.filter(isUnassignedLead).length} Unassigned
          </span>
        </button>
      </div>

      {/* Conditional View Rendering */}
      {activeTab === 'distribute' ? (
        <div className="mb-6 animate-in fade-in">
          <BulkLeadDistributionSection
            leads={leads}
            employees={employees as any}
            preSelectedLeadIds={selectedLeadIds}
            onRefresh={fetchLeads}
            onClose={() => setActiveTab('table')}
          />
        </div>
      ) : activeTab === 'serial_assign' ? (
        <div className="mb-6 animate-in fade-in">
          <SerialLeadAssignerPanel
            leads={leads}
            employees={employees as any}
            onRefresh={fetchLeads}
            onClose={() => setActiveTab('table')}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 font-sans">
          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
            <div className="relative w-full md:w-96 flex-shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search leads by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-indigo-600 focus:border-indigo-600 font-medium"
              />
            </div>

            <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-indigo-600 focus:border-indigo-600 font-medium bg-white"
              >
                <option value="all">All Sources ({leads.length})</option>
                {sourceStats.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.count})
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-indigo-600 focus:border-indigo-600 font-medium bg-white"
              >
                <option value="all">All Categories ({leads.length})</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name.toLowerCase()}>
                    {c.icon || '🏷️'} {c.label} ({categoryStats[c.name.toLowerCase()] || 0})
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-indigo-600 focus:border-indigo-600 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up">Follow Up</option>
                <option value="converted">Converted</option>
              </select>
              {duplicateCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowOnlyDuplicates(prev => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${showOnlyDuplicates
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      }`}
                    title="Filter to view duplicate lead entries"
                  >
                    <span>⚠️ Duplicates ({duplicateCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoCleanDuplicates}
                    disabled={isCleaningDuplicates}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition"
                    title="Auto-merge all duplicate leads into master records"
                  >
                    <span>{isCleaningDuplicates ? 'Cleaning...' : 'Clean Duplicates'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Source Filter Quick Pills */}
          <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-500" /> Filter by Source:
            </span>
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${sourceFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
            >
              All ({leads.length})
            </button>
            {sourceStats.map(src => (
              <button
                key={src.key}
                onClick={() => setSourceFilter(src.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${sourceFilter.toLowerCase() === src.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                <span>{src.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${sourceFilter.toLowerCase() === src.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                  {src.count}
                </span>
              </button>
            ))}
          </div>

          {/* Business Category Filter Quick Pills */}
          <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-purple-900 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" /> Category:
            </span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${categoryFilter === 'all'
                  ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
            >
              All Categories ({leads.length})
            </button>
            {categories.map(c => (
              <button
                key={c.name}
                onClick={() => setCategoryFilter(c.name.toLowerCase())}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${categoryFilter.toLowerCase() === c.name.toLowerCase()
                    ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                <span>{c.icon || '🏷️'} {c.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${categoryFilter.toLowerCase() === c.name.toLowerCase() ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                  {categoryStats[c.name.toLowerCase()] || 0}
                </span>
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => {
                  setPendingLeadIdForCategory(null);
                  setCategoryModalMode('add');
                  setIsAddCategoryModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border border-dashed border-purple-400 text-purple-700 bg-purple-100/70 hover:bg-purple-200 flex items-center gap-1 shadow-2xs"
                title="Add a new customer category"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Category</span>
              </button>
              <button
                onClick={() => {
                  setPendingLeadIdForCategory(null);
                  setCategoryModalMode('manage');
                  setIsAddCategoryModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border border-purple-300 text-purple-800 bg-white hover:bg-purple-50 flex items-center gap-1 shadow-2xs"
                title="Edit name, color, or delete customer categories"
              >
                <Edit className="w-3 h-3 text-purple-600" />
                <span>✏️ Edit Categories</span>
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedLeadIds.length > 0 && (
            <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center animate-in fade-in">
              <span className="text-xs font-bold text-indigo-900">
                {selectedLeadIds.length} lead(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkAssignModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Bulk Assign To
                </button>
                <button
                  onClick={() => setActiveTab('distribute')}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-800 hover:to-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" /> Distribute Across Team
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto w-full im-scrollbar pb-2">
            {loading ? (
              <div className="text-center py-12">
                <div className="mx-auto w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-gray-500 font-medium">Loading leads...</p>
              </div>
            ) : filteredLeads.length > 0 ? (
              <table className="min-w-[1200px] w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={toggleAllSelection}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lead Info</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredLeads.map((lead) => {
                    const assignedName = (lead as any).assigned_to_name;
                    const unitName = (lead as any).unit_name;

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => handleViewLead(lead)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-bold text-gray-900">{lead.full_name}</div>
                          <div className="text-[11px] text-gray-500 capitalize mt-0.5 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            {lead.source} {lead.company_name && `• ${lead.company_name}`}
                          </div>
                        </td>
                        {/* Assigned Owner Column */}
                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${assignedName ? 'bg-slate-900' : 'bg-slate-400'}`}>
                              {assignedName ? assignedName[0] : '?'}
                            </div>
                            <div className="flex flex-col">
                              <select
                                value={lead.assigned_to || ''}
                                onChange={(e) => handleReassign(lead.id, e.target.value, e)}
                                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 focus:outline-none focus:border-indigo-600"
                              >
                                <option value="">Unassigned</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} {emp.roleName ? `• ${emp.roleName}` : ''}
                                  </option>
                                ))}
                              </select>
                              {unitName && <span className="text-[10px] text-indigo-600 font-semibold">{unitName}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsAppChat(lead.phone, `Hello ${lead.full_name || ''}, greetings from Incense Media!`, e);
                              }}
                              className="text-xs font-semibold text-gray-900 hover:text-[#25D366] hover:underline cursor-pointer transition-colors text-left"
                              title={`Click to chat with ${lead.full_name || 'lead'} on WhatsApp (${lead.phone})`}
                            >
                              {lead.phone}
                            </button>
                            {isDuplicateLead(lead) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="Duplicate phone number">
                                ⚠️ Duplicate
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{lead.email || '-'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <select
                            value={(lead.category || 'general').toLowerCase()}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                setPendingLeadIdForCategory(lead.id);
                                setCategoryModalMode('add');
                                setIsAddCategoryModalOpen(true);
                              } else if (e.target.value === '__MANAGE_CATEGORIES__') {
                                setPendingLeadIdForCategory(lead.id);
                                setCategoryModalMode('manage');
                                setIsAddCategoryModalOpen(true);
                              } else {
                                handleQuickCategoryChange(lead.id, e.target.value, e);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-200 bg-white text-purple-900 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all hover:border-purple-400"
                            title="Click to categorize lead"
                          >
                            {categories.map(c => (
                              <option key={c.name} value={c.name.toLowerCase()}>
                                {c.icon || '🏷️'} {c.label}
                              </option>
                            ))}
                            <option value="__ADD_NEW__" className="font-bold text-purple-700 bg-purple-50">
                              ➕ + Add New Category...
                            </option>
                            <option value="__MANAGE_CATEGORIES__" className="font-bold text-purple-700 bg-purple-50">
                              ✏️ Edit & Manage Categories...
                            </option>
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleQuickStatusChange(lead.id, e.target.value, e)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize transition-all ${getStatusBadgeColor(lead.status)}`}
                            title="Click to quickly change lead status"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="interested">Interested</option>
                            <option value="not_interested">Not Interested</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-medium" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {lead.phone && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsAppChat(lead.phone, `Hello ${lead.full_name || ''}, greetings from Incense Media!`, e);
                                }}
                                className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow cursor-pointer"
                                title={`Chat with ${lead.full_name} on WhatsApp (re-uses running window)`}
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                <span>WhatsApp</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReminderLead({
                                  id: lead.id,
                                  fullName: lead.full_name,
                                  phone: lead.phone,
                                  email: lead.email,
                                  companyName: lead.company_name,
                                  nextFollowUpDate: (lead as any).next_follow_up_date || (lead as any).nextFollowUpDate,
                                  priority: lead.priority,
                                  status: lead.status,
                                });
                                setIsReminderOpen(true);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow"
                              title="Set follow-up reminder for this lead"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              <span>Reminder</span>
                            </button>
                            <button
                              onClick={() => {
                                setTimelineLead(lead);
                                setIsTimelineOpen(true);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow"
                              title="Add remarks & view complete activity timeline"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Remarks</span>
                            </button>
                            <button
                              onClick={(e) => handleEditLead(lead, e)}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No Leads Found</h3>
                <p className="text-xs text-gray-500">Try adjusting your filters, search query, or add a new lead.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Bulk Assign {selectedLeadIds.length} Lead(s)</h3>

            <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Employee *</label>
                <select
                  required
                  value={targetBulkEmpId}
                  onChange={(e) => setTargetBulkEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.roleName ? `• ${emp.roleName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  Confirm Bulk Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <LeadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        lead={currentLead}
        onUpdate={handleUpdateLead}
        employees={employees}
      />

      <LeadImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => { setIsImportModalOpen(false); fetchLeads(); }}
      />

      <LeadFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        lead={currentLead}
        onSave={handleSaveNewLead}
      />

      <RoundRobinWorkloadModal
        isOpen={isRoundRobinModalOpen}
        onClose={() => setIsRoundRobinModalOpen(false)}
        onSuccess={() => { fetchLeads(); }}
        unassignedCount={leads.filter(isUnassignedLead).length}
      />

      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        initialMode={categoryModalMode}
        onClose={() => {
          setIsAddCategoryModalOpen(false);
          setPendingLeadIdForCategory(null);
        }}
        onCategoryAdded={handleCategoryAdded}
        onCategoryUpdated={handleCategoryUpdated}
        onCategoryDeleted={handleCategoryDeleted}
      />

      <LeadRemarkTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        lead={timelineLead}
        onLeadUpdated={(leadId, updates) => {
          setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
        }}
      />
    </>
  );
};

export default AdminLeads;

