import React, { useState, useEffect } from 'react';

import crmApi from '../../api/crmApi';

import LeadRemarkTimelineModal from '../../components/admin/LeadRemarkTimelineModal';

import LeadImportExcelModal from '../../components/common/LeadImportExcelModal';

import AddCategoryModal, { LeadCategoryItem } from '../../components/common/AddCategoryModal';
import SetLeadReminderModal from '../../components/common/SetLeadReminderModal';

import { getCurrentUser, hasPermission } from '../../lib/auth';

import { toast } from '../../components/ui/sonner';

import { useDataSync, notifyDataChanged } from '../../lib/useDataSync';
import { openWhatsApp, openWhatsAppChat, syncAllLeadsToWhatsAppHub, getWhatsAppPreferredMode, WhatsAppMode } from '../../lib/whatsapp';
import WhatsAppModeModal from '../../components/common/WhatsAppModeModal';

import {

  UserCheck,

  Plus,

  Search,

  Phone,
  PhoneOff,

  Mail,

  Building2,

  Calendar,
  CalendarClock,

  Clock,

  CheckCircle2,

  Filter,

  X,

  Target,

  MessageSquare,

  History,

  Send,

  Upload,

  Globe,

  Tag,

  Edit,

  AlertTriangle,

  GitMerge,

  Copy,
  Settings,
} from 'lucide-react';

interface Lead {

  id: string;

  fullName: string;

  phone: string;

  email?: string;

  companyName?: string;

  city?: string;

  source: string;

  category?: string;
  domain?: string;

  status: string;

  priority: string;

  budget?: string;

  notes?: string;

  nextFollowUpDate?: string;

  createdAt: string;

  unit?: { name: string };

}

export const normalizeLeadSource = (rawSource?: string): string => {
  if (!rawSource) return 'manual';
  const s = rawSource.toLowerCase().trim();
  if (s.includes('web') || s.includes('site') || s.includes('online') || s.includes('inquir')) return 'website';
  if (s.includes('meta') || s.includes('fb') || s.includes('facebook') || s.includes('insta') || s.includes('ad')) return 'meta';
  if (s.includes('excel') || s.includes('import') || s.includes('csv') || s.includes('upload') || s.includes('bulk')) return 'import';
  if (s.includes('whats') || s.includes('wa')) return 'whatsapp';
  if (s.includes('expo') || s.includes('exhibit') || s.includes('event')) return 'expo';
  return 'manual';
};

export const STANDARD_SOURCES = [
  { key: 'website', label: '🌐 Website Inquiries' },
  { key: 'meta', label: '📱 Meta Ads' },
  { key: 'manual', label: '✍️ Manual' },
  { key: 'import', label: '📂 Imported' },
  { key: 'whatsapp', label: '💬 WhatsApp' },
  { key: 'expo', label: '🏛️ Exhibition / Expo' },
];

export const EmployeeLeads: React.FC = () => {

  const currentUser = getCurrentUser();

  const employeeId = currentUser?.id || currentUser?.userId;

  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');

  const [sourceFilter, setSourceFilter] = useState('all');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');

  const handleQuickDomainChange = async (leadId: string, domain: string, e?: any) => {
    if (e) {
      try { e.stopPropagation(); } catch (_) {}
    }
    try {
      await crmApi.put(`/leads/${leadId}`, { domain });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, domain } : l));
      toast.success(`Domain updated to "${domain}"`);
      notifyDataChanged('leads', 'update', { id: leadId, domain });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update domain');
    }
  };

  const DEFAULT_CATEGORIES: LeadCategoryItem[] = [

    { id: 'cat-pub', name: 'publication', label: 'Publication', icon: '📚', color: 'purple' },

    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },

    { id: 'cat-expo', name: 'exhibition', label: 'Exhibition', icon: '🏛️', color: 'amber' },

    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },

    { id: 'cat-gen', name: 'general', label: 'General', icon: '💼', color: 'gray' },

  ];

  const [categories, setCategories] = useState<LeadCategoryItem[]>(DEFAULT_CATEGORIES);

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'add' | 'manage'>('add');

  const [pendingLeadIdForCategory, setPendingLeadIdForCategory] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState('subscription');
  const [newDomain, setNewDomain] = useState('Agarbatti & Perfume Expo');

  const fetchCategories = async () => {
    try {
      const res = await crmApi.get('/leads/categories');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.warn('Backend categories API error:', err);
    }
  };

  const fetchMyLeads = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get('/leads', {
        params: {
          myLeads: 'true',
          limit: 1000
        }
      });
      const data = res.data?.leads || res.data || [];
      let leadList = Array.isArray(data) ? data : [];

      if (leadList.length > 0) {
        const empEmail = (currentUser?.email || '').toLowerCase().trim();
        const hasOtherOwners = leadList.some((l: any) => {
          const lOwnerId = l.ownerId || l.owner?.id;
          const lOwnerEmail = (l.owner?.email || '').toLowerCase().trim();
          const matchesThisUser = (employeeId && lOwnerId === employeeId) || 
                                  (currentUser?.id && lOwnerId === currentUser.id) ||
                                  (empEmail && lOwnerEmail && lOwnerEmail === empEmail);
          return !matchesThisUser;
        });

        if (hasOtherOwners) {
          const filtered = leadList.filter((l: any) => {
            const lOwnerId = l.ownerId || l.owner?.id || l.assigned_to || l.assignedTo;
            const lOwnerEmail = (l.owner?.email || '').toLowerCase().trim();
            const matchesId = (employeeId && lOwnerId === employeeId) ||
                              (currentUser?.id && lOwnerId === currentUser.id);
            const matchesEmail = empEmail && lOwnerEmail && lOwnerEmail === empEmail;
            return matchesId || matchesEmail;
          });
          if (filtered.length > 0) {
            leadList = filtered;
          }
        }
      }

      setLeads(leadList);
      syncAllLeadsToWhatsAppHub(leadList);
      localStorage.setItem('sys_cached_leads', JSON.stringify(leadList));
    } catch (err) {
      console.warn('Failed to fetch leads:', err);
      const cached = JSON.parse(localStorage.getItem('sys_cached_leads') || '[]');
      if (cached.length > 0) setLeads(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCategoryChange = async (leadId: string, category: string, e?: any) => {
    try {
      const res = await crmApi.put(`/leads/${leadId}`, { category });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, category } : l));
      toast.success(`Category updated to ${category}`);
      notifyDataChanged('leads', 'update', { id: leadId, category });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update category');
    }
  };

  const handleMergeDuplicates = async (primaryLead: Lead, duplicateLead: Lead) => {
    try {
      const res = await crmApi.post('/leads/merge', {
        primaryLeadId: primaryLead.id,
        secondaryLeadId: duplicateLead.id
      });
      toast.success(res.data?.message || 'Leads merged successfully!');
      fetchMyLeads();
      notifyDataChanged('leads', 'merge', { primaryId: primaryLead.id, secondaryId: duplicateLead.id });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to merge leads');
    }
  };

  useEffect(() => {
    fetchMyLeads();
    fetchCategories();
  }, []);

  useDataSync('leads', fetchMyLeads);

  const handleCategoryAdded = (newCat: LeadCategoryItem) => {

    setCategories(prev => {

      if (prev.some(c => c.name.toLowerCase() === newCat.name.toLowerCase())) return prev;

      return [...prev, newCat];

    });

    if (pendingLeadIdForCategory) {

      handleQuickCategoryChange(pendingLeadIdForCategory, newCat.name, {} as any);

      setPendingLeadIdForCategory(null);

    }

    setNewCategory(newCat.name);

  };

  const handleCategoryUpdated = (updatedCat: LeadCategoryItem) => {
    setCategories(prev =>
      prev.map(c => ((c.id && c.id === updatedCat.id) || c.name === updatedCat.name ? updatedCat : c))
    );
    fetchMyLeads();
  };

  const handleCategoryDeleted = (deletedCatName: string) => {
    setCategories(prev => prev.filter(c => c.name !== deletedCatName));
    fetchMyLeads();
  };

  const [timelineLead, setTimelineLead] = useState<any>(null);

  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // New Lead Modal State

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleAutoCleanDuplicates = async () => {
    try {
      setIsCleaningDuplicates(true);
      const res = await crmApi.post('/leads/auto-deduplicate');
      toast.success(res.data?.message || 'Duplicates merged and cleaned successfully! All leads are 100% unique.');
      fetchMyLeads();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to auto-clean duplicates');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [newFullName, setNewFullName] = useState('');

  const [newPhone, setNewPhone] = useState('');

  const [newEmail, setNewEmail] = useState('');

  const [newCompanyName, setNewCompanyName] = useState('');

  const [newSource, setNewSource] = useState('manual');

  const [newPriority, setNewPriority] = useState('medium');

  const [newNotes, setNewNotes] = useState('');

  // Remark & Status Update Modal State

// Dedicated Reminder Modal State
  const [selectedLeadForReminder, setSelectedLeadForReminder] = useState<Lead | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  const openReminderModal = (lead: Lead) => {
    setSelectedLeadForReminder(lead);
    setIsReminderModalOpen(true);
  };

  const [selectedLeadForRemark, setSelectedLeadForRemark] = useState<Lead | null>(null);

  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);

  const [remarkStatus, setRemarkStatus] = useState('contacted');

  const [newRemarkText, setNewRemarkText] = useState('');

  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [isWhatsAppSettingsOpen, setIsWhatsAppSettingsOpen] = useState(false);
  const [targetWhatsAppLead, setTargetWhatsAppLead] = useState<Lead | null>(null);
  const [waCurrentMode, setWaCurrentMode] = useState<WhatsAppMode>(getWhatsAppPreferredMode());

  // Edit Lead Modal State

  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editFullName, setEditFullName] = useState('');

  const [editPhone, setEditPhone] = useState('');

  const [editEmail, setEditEmail] = useState('');

  const [editCompanyName, setEditCompanyName] = useState('');

  const [editCity, setEditCity] = useState('');

  const [editCategory, setEditCategory] = useState('subscription');
  const [editDomain, setEditDomain] = useState('Agarbatti & Perfume Expo');

  const [editStatus, setEditStatus] = useState('new');

  const [editPriority, setEditPriority] = useState('medium');

  const [editDealValue, setEditDealValue] = useState('');

  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState('');

  const [editSource, setEditSource] = useState('');

  const [editNotes, setEditNotes] = useState('');

  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [editDuplicateWarning, setEditDuplicateWarning] = useState<any>(null);

  const [allowDuplicateEdit, setAllowDuplicateEdit] = useState(false);

  // Add Lead Modal Duplicate Detection State

  const [addDuplicateWarning, setAddDuplicateWarning] = useState<any>(null);

  const [allowDuplicateAdd, setAllowDuplicateAdd] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Real-time comprehensive duplicate checking for "Add New Lead"
  useEffect(() => {
    if (!isAddModalOpen) {
      setAddDuplicateWarning(null);
      return;
    }

    const cleanPhoneDigits = (newPhone || '').replace(/[^0-9]/g, '');
    const cleanEmail = (newEmail || '').trim();
    const cleanName = (newFullName || '').trim();
    const cleanCompany = (newCompanyName || '').trim();

    const hasPhone = cleanPhoneDigits.length >= 6;
    const hasEmail = cleanEmail.includes('@') && cleanEmail.length >= 6;
    const hasNameAndCompany = cleanName.length >= 3 && cleanCompany.length >= 3;

    if (!hasPhone && !hasEmail && !hasNameAndCompany) {
      setAddDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await crmApi.get('/leads/check-duplicate', {
          params: {
            phone: newPhone.trim() || undefined,
            email: cleanEmail || undefined,
            fullName: cleanName || undefined,
            companyName: cleanCompany || undefined,
          }
        });
        if (res.data?.isDuplicate) {
          setAddDuplicateWarning(res.data.existingLead);
        } else {
          setAddDuplicateWarning(null);
        }
      } catch {
        setAddDuplicateWarning(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newPhone, newEmail, newFullName, newCompanyName, isAddModalOpen]);

  // Real-time duplicate phone checking for "Edit Lead"

  useEffect(() => {

    if (!isEditModalOpen || !selectedLeadForEdit || !editPhone || editPhone.trim() === selectedLeadForEdit.phone.trim() || editPhone.trim().replace(/[^0-9]/g, '').length < 6) {

      setEditDuplicateWarning(null);

      return;

    }

    const timer = setTimeout(async () => {

      try {

        setIsCheckingDuplicate(true);

        const res = await crmApi.get('/leads/check-duplicate', {

          params: { phone: editPhone.trim(), excludeId: selectedLeadForEdit.id }

        });

        if (res.data?.isDuplicate) {

          setEditDuplicateWarning(res.data.existingLead);

        } else {

          setEditDuplicateWarning(null);

        }

      } catch {

        setEditDuplicateWarning(null);

      } finally {

        setIsCheckingDuplicate(false);

      }

    }, 350);

    return () => clearTimeout(timer);

  }, [editPhone, isEditModalOpen, selectedLeadForEdit]);

  const openEditModal = (lead: Lead) => {

    setSelectedLeadForEdit(lead);

    setEditFullName(lead.fullName || '');

    setEditPhone(lead.phone || '');

    setEditEmail(lead.email || '');

    setEditCompanyName(lead.companyName || '');

    setEditCity(lead.city || '');

    setEditCategory((lead.category || 'general').toLowerCase());
    setEditDomain(lead.domain || 'Agarbatti & Perfume Expo');

    setEditStatus(lead.status || 'new');

    setEditPriority(lead.priority || 'medium');

    setEditDealValue((lead as any).dealValue ? String((lead as any).dealValue) : (lead.budget || ''));

    setEditNextFollowUpDate(lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : '');

    setEditSource(lead.source || 'manual');

    setEditNotes(lead.notes || '');

    setEditDuplicateWarning(null);

    setAllowDuplicateEdit(false);

    setIsEditModalOpen(true);

  };

  const handleUpdateLead = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!selectedLeadForEdit) return;

    if (!editFullName.trim()) {

      toast.error('Full Name is required');

      return;

    }

    if (editDuplicateWarning && !allowDuplicateEdit) {

      toast.error('This mobile number belongs to another lead. Check "Allow duplicate" or use another number.');

      return;

    }

    setIsSavingEdit(true);

    try {

      const payload: any = {

        fullName: editFullName.trim(),

        phone: editPhone.trim() || undefined,

        email: editEmail.trim() || null,

        companyName: editCompanyName.trim() || null,

        city: editCity.trim() || null,

        category: editCategory.toLowerCase(),

        domain: editDomain || 'Agarbatti & Perfume Expo',

        status: editStatus,

        priority: editPriority,

        source: editSource.trim() || selectedLeadForEdit.source,

        notes: editNotes.trim() || null,

        allowDuplicate: allowDuplicateEdit,

      };

      if (editDealValue && !isNaN(Number(editDealValue))) {

        payload.dealValue = Number(editDealValue);

      }

      if (editNextFollowUpDate) {

        payload.nextFollowUpDate = new Date(editNextFollowUpDate).toISOString();

      }

      const res = await crmApi.put(`/leads/${selectedLeadForEdit.id}`, payload);

      toast.success('Lead updated successfully!');

      setLeads((prev) =>

        prev.map((l) => (l.id === selectedLeadForEdit.id ? { ...l, ...res.data } : l))

      );

      const cached = JSON.parse(localStorage.getItem('sys_cached_leads') || '[]');

      const updatedCache = cached.map((l: any) => (l.id === selectedLeadForEdit.id ? { ...l, ...res.data } : l));

      localStorage.setItem('sys_cached_leads', JSON.stringify(updatedCache));

      notifyDataChanged('leads', 'update', res.data);

      setIsEditModalOpen(false);

      setSelectedLeadForEdit(null);

    } catch (err: any) {
      if (err.response?.status === 409) {
        setEditDuplicateWarning(err.response?.data?.existingLead || { fullName: 'Existing Customer' });
        toast.error(err.response?.data?.message || 'Duplicate lead denied! Phone or email already belongs to another lead.');
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to update lead');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim()) {
      toast.error('Full Name and Phone number are required');
      return;
    }

    if (addDuplicateWarning && !allowDuplicateAdd) {
      toast.error('This mobile/email/lead belongs to another contact. Check "Allow duplicate" to proceed.');
      return;
    }

    setIsCreatingLead(true);
    try {
      const payload: any = {
        fullName: newFullName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        companyName: newCompanyName.trim() || undefined,
        category: newCategory.toLowerCase(),
        domain: newDomain || 'Agarbatti & Perfume Expo',
        source: newSource || 'manual',
        priority: newPriority,
        notes: newNotes.trim() || undefined,
        ownerId: employeeId,
        allowDuplicate: allowDuplicateAdd,
      };

      const res = await crmApi.post('/leads', payload);
      toast.success('Lead created and assigned successfully!');
      
      const createdLead = res.data?.lead || res.data;
      setLeads((prev) => [createdLead, ...prev]);
      
      const cached = JSON.parse(localStorage.getItem('sys_cached_leads') || '[]');
      localStorage.setItem('sys_cached_leads', JSON.stringify([createdLead, ...cached]));
      notifyDataChanged('leads', 'create', createdLead);

      setIsAddModalOpen(false);
      setNewFullName('');
      setNewPhone('');
      setNewEmail('');
      setNewCompanyName('');
      setNewNotes('');
      setAddDuplicateWarning(null);
      setAllowDuplicateAdd(false);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setAddDuplicateWarning(err.response?.data?.existingLead || { fullName: 'Existing Customer' });
        toast.error(err.response?.data?.message || 'Duplicate lead detected! Check "Allow duplicate" to proceed.');
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to create lead on server.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleOpenWhatsApp = (lead: Lead, e?: React.MouseEvent) => {
    if (e) {
      try {
        e.stopPropagation();
        e.preventDefault();
      } catch (_) {}
    }
    const greeting = `Hello ${lead.fullName}, I am connecting with you regarding your inquiry with ${lead.companyName || 'Incense Media'}. How may we assist you?`;
    openWhatsApp(lead.phone, greeting);
  };

  const openRemarkModal = (lead: Lead) => {

    setSelectedLeadForRemark(lead);

    setRemarkStatus(lead.status || 'contacted');

    setNewRemarkText('');

    setNextFollowUpDate(lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : '');

    setIsRemarkModalOpen(true);

  };

  const handleAddRemarkAndStatus = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!selectedLeadForRemark) return;

    if (!newRemarkText.trim() && remarkStatus === selectedLeadForRemark.status && !nextFollowUpDate) {

      toast.error('Please enter a remark or select a new status');

      return;

    }

    setIsSubmittingRemark(true);

    try {

      const timestamp = new Date().toLocaleString('en-US', {

        month: 'short',

        day: 'numeric',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit',

      });

      const authorName = currentUser?.firstName || currentUser?.name || 'Employee';

      const formattedEntry = `[${timestamp} by ${authorName}]: Status: ${remarkStatus.toUpperCase()}${newRemarkText.trim() ? ` | Remark: ${newRemarkText.trim()}` : ''}${nextFollowUpDate ? ` | Next Followup: ${nextFollowUpDate}` : ''}`;

      const existingNotes = selectedLeadForRemark.notes || '';

      const updatedNotes = existingNotes

        ? `${formattedEntry}\n---\n${existingNotes}`

        : formattedEntry;

      const payload: any = {

        status: remarkStatus,

        notes: updatedNotes,

      };

      const isClosedStatus = ['converted', 'won', 'lost'].includes(remarkStatus.toLowerCase());
      if (isClosedStatus) {
        payload.nextFollowUpDate = null;
      } else if (nextFollowUpDate) {
        payload.nextFollowUpDate = new Date(nextFollowUpDate).toISOString();
      }

      await crmApi.put(`/leads/${selectedLeadForRemark.id}`, payload);

      notifyDataChanged('leads', 'remark_update', { id: selectedLeadForRemark.id });

      toast.success('Lead status & remark updated successfully!');

      setLeads((prev) =>

        prev.map((l) =>

          l.id === selectedLeadForRemark.id

            ? {

                ...l,

                status: remarkStatus,

                notes: updatedNotes,

                nextFollowUpDate: isClosedStatus ? null : (nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : l.nextFollowUpDate),

              }

            : l

        )

      );

      setIsRemarkModalOpen(false);

      setSelectedLeadForRemark(null);

    } catch (err) {

      toast.error('Failed to update remark and status');

    } finally {

      setIsSubmittingRemark(false);

    }

  };

  // Map of phone number counts to identify duplicate leads

  const duplicatePhoneMap = React.useMemo(() => {

    const map = new Map<string, number>();

    (Array.isArray(leads) ? leads : []).forEach((l) => {

      const clean = (l.phone || '').replace(/[^0-9]/g, '');

      if (clean.length >= 6) {

        const key = clean.slice(-10);

        map.set(key, (map.get(key) || 0) + 1);

      }

    });

    return map;

  }, [leads]);

  const totalDuplicatesCount = React.useMemo(() => {

    return (Array.isArray(leads) ? leads : []).filter((l) => {

      const clean = (l.phone || '').replace(/[^0-9]/g, '');

      const key = clean.length >= 6 ? clean.slice(-10) : '';

      return (key && (duplicatePhoneMap.get(key) || 0) > 1) || (l as any).isDuplicate;

    }).length;

  }, [leads, duplicatePhoneMap]);

  const filteredLeads = (Array.isArray(leads) ? leads : []).filter((lead) => {

    if (!lead) return false;

    const clean = (lead.phone || '').replace(/[^0-9]/g, '');

    const phoneKey = clean.length >= 6 ? clean.slice(-10) : '';

    const isDup = (phoneKey && (duplicatePhoneMap.get(phoneKey) || 0) > 1) || (lead as any).isDuplicate;

    const matchesSearch =

      (lead.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||

      (lead.phone || '').includes(searchQuery) ||

      (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||

      (lead.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const lStatus = (lead.status || '').toLowerCase().trim();
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'duplicates_only'
      ? isDup
      : statusFilter === 'converted'
      ? ['converted', 'won'].includes(lStatus)
      : statusFilter === 'active_pipeline'
      ? !['converted', 'won', 'lost'].includes(lStatus)
      : lStatus === statusFilter.toLowerCase();

    const leadSrc = normalizeLeadSource(lead.source);
    const filterSrc = sourceFilter.trim().toLowerCase();
    const matchesSource = sourceFilter === 'all' || leadSrc === filterSrc;

    const leadCat = (lead.category || 'general').trim().toLowerCase();

    const filterCat = categoryFilter.trim().toLowerCase();

    const matchesCategory = categoryFilter === 'all' || leadCat === filterCat;

    return matchesSearch && matchesStatus && matchesSource && matchesCategory;

  });

  const categoryStats = React.useMemo(() => {

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

  const sourceStats = React.useMemo(() => {
    const counts: Record<string, number> = {
      website: 0,
      meta: 0,
      manual: 0,
      import: 0,
      whatsapp: 0,
      expo: 0,
    };

    (Array.isArray(leads) ? leads : []).forEach((l) => {
      const norm = normalizeLeadSource(l.source);
      counts[norm] = (counts[norm] || 0) + 1;
    });

    return STANDARD_SOURCES.map((s) => ({
      key: s.key,
      label: s.label,
      count: counts[s.key] || 0,
    }));
  }, [leads]);

  const getStatusBadge = (status: string) => {

    switch (status) {

      case 'new':

        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'contacted':

        return 'bg-indigo-50 text-indigo-700 border-indigo-200';

      case 'follow_up':

        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'in_progress':

        return 'bg-purple-50 text-purple-700 border-purple-200';

      case 'converted':

      case 'won':

        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'lost':

        return 'bg-rose-50 text-rose-700 border-rose-200';

      default:

        return 'bg-gray-100 text-gray-700 border-gray-200';

    }

  };

  const totalAssigned = Array.isArray(leads) ? leads.length : 0;

  const activeLeadsCount = Array.isArray(leads)
    ? leads.filter((l) => {
        if (!l) return false;
        const s = (l.status || '').toLowerCase().trim();
        return !['converted', 'won', 'lost'].includes(s);
      }).length
    : 0;

  const convertedCount = Array.isArray(leads)
    ? leads.filter((l) => {
        if (!l) return false;
        const s = (l.status || '').toLowerCase().trim();
        return ['converted', 'won'].includes(s);
      }).length
    : 0;

  if (!hasPermission('leads', 'view')) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-gray-600">
          Aapke account ko My Assigned Leads view karne ki permission nahi di gayi hai. Agar aapko access chahiye to apne administrator se contact karein.
        </p>
      </div>
    );
  }

  return (

    <div className="space-y-6 font-sans text-gray-900 pb-10">

      {/* Top Header Banner - Admin Panel Theme */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">

        <div>

          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">

            <UserCheck className="w-6 h-6 text-teal-600" />

            <span>My Assigned Leads</span>

          </h1>

          <p className="text-xs text-gray-500 mt-1">

            Track, update status, add remarks, and schedule follow-ups for your leads.

          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {hasPermission('leads', 'import') && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-teal-200 text-teal-800 hover:bg-teal-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              title="Import leads from Excel sheet (.xlsx, .xls) or CSV file"
            >
              <Upload className="w-4 h-4 text-teal-600" />
              <span>📥 Import Excel / CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title="Add a new lead assigned to you"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>

      </div>

      {/* Stats Summary Cards - Interactive Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs ${
            statusFilter === 'all'
              ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-md'
          }`}
          title="Click to view all assigned leads"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Assigned</span>
              {statusFilter === 'all' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">ALL</span>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{totalAssigned}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Click to view all leads</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform group-hover:scale-105 ${
            statusFilter === 'all'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-teal-50 text-teal-600 border-teal-100'
          }`}>
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(prev => prev === 'active_pipeline' ? 'all' : 'active_pipeline')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs ${
            statusFilter === 'active_pipeline'
              ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-md'
          }`}
          title="Click to view active pipeline leads only"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Pipeline</span>
              {statusFilter === 'active_pipeline' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">FILTERED</span>
              )}
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">{activeLeadsCount}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {statusFilter === 'active_pipeline' ? 'Click to show all leads' : 'Click to filter active leads'}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform group-hover:scale-105 ${
            statusFilter === 'active_pipeline'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(prev => prev === 'converted' ? 'all' : 'converted')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs ${
            statusFilter === 'converted'
              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
          }`}
          title="Click to view successfully converted leads"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Successfully Converted</span>
              {statusFilter === 'converted' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">FILTERED</span>
              )}
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{convertedCount}</div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {statusFilter === 'converted' ? 'Showing converted! Click to reset' : 'Click to view converted leads ↗'}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform group-hover:scale-105 ${
            statusFilter === 'converted'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container - Admin Panel Light Theme */}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs">

        {/* Search & Filters */}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">

          <div className="relative w-full sm:w-80">

            <input

              type="text"

              placeholder="Search leads by name, phone, email, company..."

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 font-medium"

            />

            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />

          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

            <Filter className="w-4 h-4 text-gray-500" />

            <select

              value={sourceFilter}

              onChange={(e) => setSourceFilter(e.target.value)}

              className="text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-teal-600 font-medium"

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

              className="text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-purple-600 font-medium"

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

              className="text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-teal-600 font-medium"

            >

              <option value="all">All Statuses ({totalAssigned})</option>
              <option value="active_pipeline">⚡ Active Pipeline ({activeLeadsCount})</option>
              <option value="converted">🎉 Successfully Converted ({convertedCount})</option>
              <option value="duplicates_only">⚠️ Duplicate Entries Only ({totalDuplicatesCount})</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up">Follow Up</option>
              <option value="in_progress">In Progress</option>
              <option value="lost">Lost</option>

            </select>

            {totalDuplicatesCount > 0 && (

              <button

                type="button"

                onClick={() => setStatusFilter(statusFilter === 'duplicates_only' ? 'all' : 'duplicates_only')}

                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-2xs ${

                  statusFilter === 'duplicates_only'

                    ? 'bg-amber-600 text-white border-amber-600'

                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'

                }`}

                title="Filter leads that have duplicate mobile numbers"

              >

                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />

                <span>⚠️ Duplicates ({totalDuplicatesCount})</span>

              </button>

            )}

          </div>

        </div>

                {/* Source Filter Quick Pills */}

        <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap im-scrollbar">

          <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1 shrink-0">

            <Globe className="w-3.5 h-3.5 text-teal-600" /> Filter by Source:

          </span>

          <button

            onClick={() => setSourceFilter('all')}

            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${

              sourceFilter === 'all'

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

              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${

                sourceFilter.toLowerCase() === src.key

                  ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'

                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'

              }`}

            >

              <span>{src.label}</span>

              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${

                sourceFilter.toLowerCase() === src.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'

              }`}>

                {src.count}

              </span>

            </button>

          ))}

        </div>

                {/* Business Category Filter Quick Pills */}

        <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap im-scrollbar">

          <span className="text-[11px] font-bold text-purple-900 mr-1 flex items-center gap-1 shrink-0">

            <Tag className="w-3.5 h-3.5 text-purple-600" /> Category:

          </span>

          <button

            onClick={() => setCategoryFilter('all')}

            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${

              categoryFilter === 'all'

                ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'

                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'

            }`}

          >

            All ({leads.length})

          </button>

          {categories.map(c => (

            <button

              key={c.name}

              onClick={() => setCategoryFilter(c.name.toLowerCase())}

              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${

                categoryFilter.toLowerCase() === c.name.toLowerCase()

                  ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'

                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'

              }`}

            >

              <span>{c.icon || '🏷️'} {c.label}</span>

              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${

                categoryFilter.toLowerCase() === c.name.toLowerCase() ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'

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

        {/* Leads Table */}

        <div className="overflow-x-auto w-full rounded-xl border border-gray-200/80 shadow-2xs im-scrollbar pb-2">

          {loading ? (

            <div className="text-center py-12 text-xs text-gray-500">Loading your assigned leads...</div>

          ) : filteredLeads.length === 0 ? (

            <div className="text-center py-12 text-xs text-gray-500">

              No assigned leads found matching your criteria.

            </div>

          ) : (

            <table className="min-w-[1450px] w-full text-left text-xs border-collapse">

              <thead>

                <tr className="border-b border-gray-200 text-gray-700 uppercase text-[10px] tracking-wider font-extrabold bg-gray-50/95">
                  <th className="py-3.5 px-4 min-w-[220px]">Lead Name & Company</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Contact Details</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Category</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Status & Source</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Latest Remarks / Notes</th>
                  <th className="py-3.5 px-4 text-center min-w-[420px] whitespace-nowrap">Actions & Remarks</th>
                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">

                {filteredLeads.map((lead) => {

                  const latestRemark = lead.notes

                    ? String(lead.notes).split('\n')[0].replace(/^\[.*?\]\s*/, '')

                    : 'No remarks recorded yet';

                  const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');

                      const phoneKey = cleanPhone.length >= 6 ? cleanPhone.slice(-10) : '';

                      const isDuplicateRow = (phoneKey && (duplicatePhoneMap.get(phoneKey) || 0) > 1) || (lead as any).isDuplicate;

                      const matchingDuplicateLead = isDuplicateRow

                        ? (Array.isArray(leads) ? leads : []).find(l => l.id !== lead.id && (l.phone || '').replace(/[^0-9]/g, '').slice(-10) === phoneKey)

                        : null;

                      return (

                    <tr key={lead.id} className={`group hover:bg-gray-50/80 transition-colors ${isDuplicateRow ? 'bg-amber-50/20' : ''}`}>

                      <td className="py-3.5 px-4">

                        <div
                          className="font-bold text-gray-900 text-sm hover:text-teal-700 hover:underline cursor-pointer flex items-center gap-1.5"
                          onClick={() => openEditModal(lead)}
                          title="Click to view/edit lead details"
                        >
                          <span>{lead.fullName}</span>
                          <Edit className="w-3 h-3 text-gray-400 opacity-60 hover:opacity-100" />
                        </div>

                        {lead.companyName && (

                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">

                            <Building2 className="w-3 h-3 text-gray-400" />

                            <span>{lead.companyName}</span>

                          </div>

                        )}

                      </td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>

                        <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWhatsApp(lead, e);
                            }}
                            className="inline-flex items-center gap-1.5 text-gray-800 font-semibold hover:text-[#25D366] hover:underline transition-colors group cursor-pointer text-left"
                            title={`Click to chat with ${lead.fullName} on WhatsApp (${lead.phone})`}
                          >
                            <Phone className="w-3.5 h-3.5 text-teal-600 group-hover:text-[#25D366] transition-colors" />
                            <span>{lead.phone}</span>
                          </button>

                          {isDuplicateRow && (

                            <span

                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"

                              title={`Duplicate Phone: ${lead.phone} appears multiple times in database`}

                            >

                              ⚠️ Duplicate

                            </span>

                          )}

                        </div>

                        {lead.email && (

                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">

                            <Mail className="w-3 h-3 text-gray-400" />

                            <span>{lead.email}</span>

                          </div>

                        )}

                      </td>

                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={(lead.category || 'general').toLowerCase()}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CATEGORY__') {
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
                          title="Click to categorize lead or edit categories"
                        >
                          {categories.map(c => (
                            <option key={c.name} value={c.name.toLowerCase()}>
                              {c.icon || '🏷️'} {c.label}
                            </option>
                          ))}
                          <option value="__ADD_CATEGORY__" className="font-bold text-purple-700 bg-purple-50">
                            ➕ + Add New Category...
                          </option>
                          <option value="__MANAGE_CATEGORIES__" className="font-bold text-purple-700 bg-purple-50">
                            ✏️ Edit & Manage Categories...
                          </option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">

                        <span

                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${getStatusBadge(lead.status || 'new')}`}

                        >

                          {(lead.status || 'new').replace('_', ' ')}

                        </span>

                        <div className="text-[10px] text-gray-500 capitalize mt-1">
                          Source: <span className="text-gray-700 font-semibold">{STANDARD_SOURCES.find(s => s.key === normalizeLeadSource(lead.source))?.label || '✍️ Manual'}</span>
                        </div>

                      </td>

                      <td className="py-3.5 px-4 max-w-xs">

                        <div className="text-xs text-gray-700 truncate" title={lead.notes || ''}>

                          {latestRemark}

                        </div>

                        {hasPermission('leads', 'reminder') ? (
                          lead.nextFollowUpDate ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                openReminderModal(lead);
                              }}
                              className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer transition-all shadow-2xs"
                              title="Click to view or reschedule reminder"
                            >
                              <CalendarClock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>📅 Reminder: {new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{lead.nextFollowUpDate.includes('T') ? ' ' + new Date(lead.nextFollowUpDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReminderModal(lead);
                              }}
                              className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 hover:border-amber-400 cursor-pointer transition-all shadow-2xs"
                              title="Click to set a follow-up reminder"
                            >
                              <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                              <span>+ Set Reminder</span>
                            </button>
                          )
                        ) : (
                          lead.nextFollowUpDate ? (
                            <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              <CalendarClock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span>📅 Reminder: {new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          ) : null
                        )}

                      </td>

                      <td className="py-3.5 px-4 text-center min-w-[420px] whitespace-nowrap">

                        <div className="inline-flex items-center justify-center gap-2 shrink-0 flex-nowrap">

                          {hasPermission('leads', 'whatsapp') && lead.phone ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWhatsApp(lead, e);
                                }}
                                className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs hover:shadow shrink-0 cursor-pointer"
                                title={`Chat with ${lead.fullName} on WhatsApp (${waCurrentMode === 'app' ? 'Desktop App 1-Window' : waCurrentMode === 'web' ? 'Web Tab' : 'Single-Window Hub'})`}
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <span>WhatsApp</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTargetWhatsAppLead(lead);
                                  setIsWhatsAppSettingsOpen(true);
                                }}
                                className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                title="WhatsApp Chat Settings (Single Window Mode)"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : null}

                          {/* Set Reminder Button - High Visibility Solid Amber/Orange */}
                          {hasPermission('leads', 'reminder') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openReminderModal(lead);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow shrink-0"
                              title={lead.nextFollowUpDate ? `Scheduled: ${new Date(lead.nextFollowUpDate).toLocaleString()}` : 'Set follow-up reminder'}
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              <span>{lead.nextFollowUpDate ? 'Reschedule' : 'Set Reminder'}</span>
                            </button>
                          )}

                          {/* Add Remark Button - High Visibility Solid Teal */}
                          {hasPermission('leads', 'remark') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRemarkModal(lead);
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow shrink-0"
                              title="Add remarks & update status"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Add Remark</span>
                            </button>
                          )}

                          {/* Edit Lead Button - High Visibility Solid Indigo */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(lead);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs hover:shadow shrink-0 cursor-pointer"
                            title="Edit Lead Details (Mobile, Name, Status, Company...)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {hasPermission('leads', 'merge') && isDuplicateRow && matchingDuplicateLead && (

                            <button

                              onClick={(e) => {
                                e.stopPropagation();
                                handleMergeDuplicates(lead, matchingDuplicateLead);
                              }}

                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs hover:shadow shrink-0"

                              title={`Merge duplicate lead #${matchingDuplicateLead.id} into this lead`}

                            >

                              <GitMerge className="w-3.5 h-3.5" />

                              <span>Merge</span>

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          )}

        </div>

      </div>

      {/* MODAL 1: Remark & Status Management Modal */}

      {isRemarkModalOpen && selectedLeadForRemark && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">

          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-gray-900">

            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-gray-200 pb-3">

              <div>

                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">

                  <MessageSquare className="w-5 h-5 text-teal-600" />

                  <span>Update Remark & Lead Status</span>

                </h3>

                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">

                  <span>

                    Lead: <strong className="text-gray-900">{selectedLeadForRemark.fullName}</strong> ({selectedLeadForRemark.phone})

                  </span>

                  {hasPermission('leads', 'whatsapp') && selectedLeadForRemark.phone && (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsApp(selectedLeadForRemark, e);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25D366] hover:bg-[#20BA5A] active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title={`Open WhatsApp chat (${waCurrentMode === 'app' ? 'Desktop App 1-Window' : waCurrentMode === 'web' ? 'Web Tab' : 'Single-Window Hub'})`}
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        <span>WhatsApp</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-black/20 rounded font-normal">
                          {waCurrentMode === 'app' ? 'Desktop App' : waCurrentMode === 'web' ? 'Web' : '1-Window'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetWhatsAppLead(selectedLeadForRemark);
                          setIsWhatsAppSettingsOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200"
                        title="Configure WhatsApp Mode (Single Window vs Web Tab)"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                </div>

              </div>

              <button

                onClick={() => setIsRemarkModalOpen(false)}

                className="text-gray-400 hover:text-gray-600 transition-colors"

              >

                <X className="w-5 h-5" />

              </button>

            </div>

            <form onSubmit={handleAddRemarkAndStatus} className="space-y-4">

              {/* Select Lead Status */}

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Update Status *</label>

                <select

                  value={remarkStatus}

                  onChange={(e) => setRemarkStatus(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl text-teal-700 font-bold focus:outline-none focus:border-teal-600"

                >

                  <option value="new">NEW - Fresh Lead</option>

                  <option value="contacted">CONTACTED - Talked to Client</option>

                  <option value="follow_up">FOLLOW UP - Needs Call Back</option>

                  <option value="in_progress">IN PROGRESS - Requirement Sent</option>

                  <option value="converted">CONVERTED / WON - Deal Closed</option>

                  <option value="lost">LOST - Not Interested</option>

                </select>

              </div>

              {/* Next Follow Up Date Optional */}

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">

                  Next Follow-up Date (Optional)

                </label>

                <input

                  type="date"

                  value={nextFollowUpDate}

                  onChange={(e) => setNextFollowUpDate(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"

                />

              </div>

              {/* New Remark Input */}

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">

                  New Remark / Call Notes *

                </label>

                <textarea

                  rows={3}

                  required

                  placeholder="e.g. Called customer, interested in premium catalogue. Sent sample PDF via WhatsApp..."

                  value={newRemarkText}

                  onChange={(e) => setNewRemarkText(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-600 font-medium"

                />

              </div>

              {/* Remarks History */}

              {selectedLeadForRemark.notes && (

                <div className="space-y-1.5 pt-1">

                  <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">

                    <History className="w-3.5 h-3.5 text-teal-600" />

                    <span>Previous Remarks & History</span>

                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-36 overflow-y-auto text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">

                    {selectedLeadForRemark.notes}

                  </div>

                </div>

              )}

              {/* Action Buttons */}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">

                <button

                  type="button"

                  onClick={() => setIsRemarkModalOpen(false)}

                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={isSubmittingRemark}

                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"

                >

                  <Send className="w-3.5 h-3.5" />

                  <span>{isSubmittingRemark ? 'Saving Remark...' : 'Save Remark & Status'}</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* MODAL 2: Add New Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-gray-900 max-h-[90vh] overflow-y-auto im-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add & Assign New Lead</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter lead details, select vertical & domain</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>

                <input

                  type="text"

                  required

                  placeholder="e.g. Rahul Sharma"

                  value={newFullName}

                  onChange={(e) => setNewFullName(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"

                />

              </div>

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Mobile / Phone Number *</label>

                <input

                  type="text"

                  required

                  placeholder="+91 9876543210"

                  value={newPhone}

                  onChange={(e) => {

                    setNewPhone(e.target.value);

                    setAllowDuplicateAdd(false);

                  }}

                  className={`w-full px-3 py-2 text-xs bg-white border rounded-xl text-gray-900 focus:outline-none font-medium ${

                    addDuplicateWarning ? 'border-amber-400 bg-amber-50/30' : 'border-gray-300 focus:border-teal-600'

                  }`}

                />

                {isCheckingDuplicate && (

                  <div className="text-[10px] text-teal-600 mt-1 flex items-center gap-1 font-semibold animate-pulse">

                    <span>Checking for duplicate phone...</span>

                  </div>

                )}

                {addDuplicateWarning && (
                  <div className="mt-2.5 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Duplicate Entry Denied!</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-lg border border-rose-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="font-bold text-gray-900 text-sm">
                        {addDuplicateWarning.fullName} {addDuplicateWarning.companyName && `(${addDuplicateWarning.companyName})`}
                      </div>
                      <div className="text-gray-600 flex flex-wrap gap-2 text-[11px]">
                        <span>📞 {addDuplicateWarning.phone}</span>
                        {addDuplicateWarning.email && <span>✉️ {addDuplicateWarning.email}</span>}
                      </div>
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] border-t border-rose-100">
                        <span className="text-gray-500 font-semibold">Status:</span>
                        <span className="font-bold uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{addDuplicateWarning.status}</span>
                        <span className="text-gray-500 font-semibold ml-2">Currently Assigned To:</span>
                        <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">👤 {addDuplicateWarning.ownerName || 'Unassigned'}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                      This lead already exists in the system and is assigned to <strong>{addDuplicateWarning.ownerName || 'another employee'}</strong>.
                    </p>
                    <label className="flex items-center gap-2 pt-2 border-t border-rose-200 cursor-pointer font-bold text-[11px] text-rose-900">
                      <input
                        type="checkbox"
                        checked={allowDuplicateAdd}
                        onChange={(e) => setAllowDuplicateAdd(e.target.checked)}
                        className="rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Allow saving duplicate lead</span>
                    </label>
                  </div>
                )}

              </div>

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>

                <input

                  type="email"

                  placeholder="rahul@company.com"

                  value={newEmail}

                  onChange={(e) => setNewEmail(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"

                />

              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Category / Vertical *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingLeadIdForCategory(null);
                        setCategoryModalMode('add');
                        setIsAddCategoryModalOpen(true);
                      }}
                      className="text-[11px] text-purple-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> + Add
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingLeadIdForCategory(null);
                        setCategoryModalMode('manage');
                        setIsAddCategoryModalOpen(true);
                      }}
                      className="text-[11px] text-purple-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>

                <select
                  value={newCategory}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_CATEGORY__') {
                      setPendingLeadIdForCategory(null);
                      setCategoryModalMode('add');
                      setIsAddCategoryModalOpen(true);
                    } else if (e.target.value === '__MANAGE_CATEGORIES__') {
                      setPendingLeadIdForCategory(null);
                      setCategoryModalMode('manage');
                      setIsAddCategoryModalOpen(true);
                    } else {
                      setNewCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-purple-600 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.name} value={c.name.toLowerCase()}>
                      {c.icon || '🏷️'} {c.label}
                    </option>
                  ))}
                  <option value="__ADD_CATEGORY__" className="font-bold text-purple-700 bg-purple-50">
                    ➕ + Add New Category...
                  </option>
                  <option value="__MANAGE_CATEGORIES__" className="font-bold text-purple-700 bg-purple-50">
                    ✏️ Edit & Manage Categories...
                  </option>
                </select>

                <div className="flex flex-wrap gap-1.5 mt-1.5">

                  {categories.slice(0, 8).map((c) => (

                    <button

                      key={c.name}

                      type="button"

                      onClick={() => setNewCategory(c.name.toLowerCase())}

                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${

                        newCategory.toLowerCase() === c.name.toLowerCase() ? 'bg-purple-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                      }`}

                    >

                      {c.icon || '🏷️'} {c.label}

                    </button>

                  ))}

                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Domain *</label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-gray-900 focus:outline-none focus:border-indigo-600 font-bold bg-indigo-50/20"
                >
                  <option value="Agarbatti & Perfume Expo">🏢 Agarbatti & Perfume Expo</option>
                  <option value="Soap & Detergent Expo">🧼 Soap & Detergent Expo</option>
                  <option value="India Stone & Tech Expo">🪨 India Stone & Tech Expo</option>
                  <option value="India FMCG Show">🛒 India FMCG Show</option>
                </select>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    'Agarbatti & Perfume Expo',
                    'Soap & Detergent Expo',
                    'India Stone & Tech Expo',
                    'India FMCG Show'
                  ].map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setNewDomain(dom)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                        newDomain === dom ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {dom}
                    </button>
                  ))}
                </div>
              </div>

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Company Name</label>

                <input

                  type="text"

                  placeholder="Company LLC"

                  value={newCompanyName}

                  onChange={(e) => setNewCompanyName(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"

                />

              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source / Channel *</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium"
                >
                  <option value="manual">✍️ Manual</option>
                  <option value="website">🌐 Website Inquiries</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="expo">🏛️ Exhibition / Expo</option>
                  <option value="meta">📱 Meta Ads</option>
                  <option value="import">📂 Imported</option>
                </select>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {STANDARD_SOURCES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setNewSource(s.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                        newSource === s.key ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Initial Remark / Requirement</label>

                <textarea

                  placeholder="Inquiry notes..."

                  value={newNotes}

                  onChange={(e) => setNewNotes(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-600 font-medium h-20"

                />

              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">

                <button

                  type="button"

                  onClick={() => setIsAddModalOpen(false)}

                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"

                >

                  Cancel

                </button>

                <button
                  type="submit"
                  disabled={isCreatingLead || (Boolean(addDuplicateWarning) && !allowDuplicateAdd)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                    addDuplicateWarning && !allowDuplicateAdd
                      ? 'bg-rose-100 text-rose-700 border border-rose-300 cursor-not-allowed opacity-80'
                      : 'text-white bg-teal-600 hover:bg-teal-700 cursor-pointer'
                  }`}
                >
                  {isCreatingLead ? (
                    <span>Saving Lead...</span>
                  ) : addDuplicateWarning && !allowDuplicateAdd ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Check Box to Allow Duplicate</span>
                    </>
                  ) : (
                    <span>Save Lead</span>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* MODAL: Full Edit Lead Modal (Mobile, Name, Status, Category, Company, etc.) */}

      {isEditModalOpen && selectedLeadForEdit && (

        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">

          <div className="bg-white border border-gray-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-gray-900 max-h-[92vh] overflow-y-auto">

            {/* Header */}

            <div className="flex items-center justify-between border-b border-gray-200 pb-3">

              <div>

                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">

                  <Edit className="w-5 h-5 text-blue-600" />

                  <span>Edit Lead Information</span>

                </h3>

                <p className="text-xs text-gray-500 mt-0.5">

                  Update customer name, mobile number, company, category, and pipeline status.

                </p>

              </div>

              <button

                onClick={() => {

                  setIsEditModalOpen(false);

                  setSelectedLeadForEdit(null);

                }}

                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"

              >

                <X className="w-5 h-5" />

              </button>

            </div>

            {/* Form */}

            <form onSubmit={handleUpdateLead} className="space-y-3.5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Full Name */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>

                  <input

                    type="text"

                    required

                    placeholder="Customer Full Name"

                    value={editFullName}

                    onChange={(e) => setEditFullName(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                  />

                </div>

                {/* Mobile / Phone Number */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile / Phone Number</label>

                  <input

                    type="text"

                    placeholder="+91 9876543210"

                    value={editPhone}

                    onChange={(e) => {

                      setEditPhone(e.target.value);

                      setAllowDuplicateEdit(false);

                    }}

                    className={`w-full px-3 py-2 text-xs bg-white border rounded-xl text-gray-900 focus:outline-none font-medium ${

                      editDuplicateWarning ? 'border-amber-400 bg-amber-50/30' : 'border-gray-300 focus:border-blue-600'

                    }`}

                  />

                  {isCheckingDuplicate && (

                    <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1 font-semibold animate-pulse">

                      <span>Checking duplicate mobile...</span>

                    </div>

                  )}

                </div>

              </div>

              {/* Duplicate Phone Warning inside Edit Modal */}

              {editDuplicateWarning && (

                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5">

                  <div className="flex items-center gap-1.5 font-bold text-amber-800">

                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />

                    <span>Duplicate Mobile Number Warning!</span>

                  </div>

                  <p className="text-[11px] leading-relaxed">

                    Mobile number <strong>{editPhone}</strong> is already used by another lead:

                    <br />

                    <strong>{editDuplicateWarning.fullName}</strong> {editDuplicateWarning.companyName && `(${editDuplicateWarning.companyName})`}

                    <br />

                    Status: <span className="font-bold uppercase text-amber-800">{editDuplicateWarning.status}</span> • Assigned to: <strong>{editDuplicateWarning.ownerName || 'Unassigned'}</strong>

                  </p>

                  <label className="flex items-center gap-2 pt-1 border-t border-amber-200/80 cursor-pointer font-bold text-[11px] text-amber-900">

                    <input

                      type="checkbox"

                      checked={allowDuplicateEdit}

                      onChange={(e) => setAllowDuplicateEdit(e.target.checked)}

                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"

                    />

                    <span>Allow duplicate mobile number for this lead</span>

                  </label>

                </div>

              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Company Name */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Company / Firm Name</label>

                  <input

                    type="text"

                    placeholder="Business / Firm Name"

                    value={editCompanyName}

                    onChange={(e) => setEditCompanyName(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                  />

                </div>

                {/* Email Address */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>

                  <input

                    type="email"

                    placeholder="email@company.com"

                    value={editEmail}

                    onChange={(e) => setEditEmail(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                  />

                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Category */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Business Category *</label>

                  <select

                    value={editCategory}

                    onChange={(e) => setEditCategory(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-purple-600 font-bold"

                  >

                    {categories.map((c) => (

                      <option key={c.name} value={c.name.toLowerCase()}>

                        {c.icon || '🏷️'} {c.label}

                      </option>

                    ))}

                  </select>

                </div>

                {/* Domain Section */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Domain *</label>

                  <select

                    value={editDomain}

                    onChange={(e) => setEditDomain(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-gray-900 focus:outline-none focus:border-indigo-600 font-bold bg-indigo-50/20"

                  >

                    <option value="Agarbatti & Perfume Expo">🏢 Agarbatti & Perfume Expo</option>

                    <option value="Soap & Detergent Expo">🧼 Soap & Detergent Expo</option>

                    <option value="India Stone & Tech Expo">🪨 India Stone & Tech Expo</option>

                    <option value="India FMCG Show">🛒 India FMCG Show</option>

                  </select>

                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Status */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Lead Status *</label>

                  <select

                    value={editStatus}

                    onChange={(e) => setEditStatus(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-bold capitalize"

                  >

                    <option value="new">New</option>

                    <option value="contacted">Contacted</option>

                    <option value="follow_up">Follow Up</option>

                    <option value="in_progress">In Progress</option>

                    <option value="converted">Converted</option>

                    <option value="lost">Lost</option>

                  </select>

                </div>

                {/* Priority */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>

                  <select

                    value={editPriority}

                    onChange={(e) => setEditPriority(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-bold capitalize"

                  >

                    <option value="low">Low</option>

                    <option value="medium">Medium</option>

                    <option value="high">High</option>

                  </select>

                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* City */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">City / Location</label>

                  <input

                    type="text"

                    placeholder="e.g. Jaipur, Delhi"

                    value={editCity}

                    onChange={(e) => setEditCity(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                  />

                </div>

                {/* Next Followup Date */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Next Follow-up Date</label>

                  <input

                    type="date"

                    value={editNextFollowUpDate}

                    onChange={(e) => setEditNextFollowUpDate(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                  />

                </div>

                {/* Deal Value */}

                <div>

                  <label className="block text-xs font-bold text-gray-700 mb-1">Deal Value / Budget</label>

                  <input

                    type="number"

                    placeholder="₹ 50,000"

                    value={editDealValue}

                    onChange={(e) => setEditDealValue(e.target.value)}

                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"

                  />

                </div>

              </div>

              {/* Source */}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source</label>
                <select
                  value={normalizeLeadSource(editSource)}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="manual">✍️ Manual</option>
                  <option value="website">🌐 Website Inquiries</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="expo">🏛️ Exhibition / Expo</option>
                  <option value="meta">📱 Meta Ads</option>
                  <option value="import">📂 Imported</option>
                </select>
              </div>

              {/* Remarks / Notes */}

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Remarks & Inquiry Notes</label>

                <textarea

                  placeholder="Customer requirements, discussions, notes..."

                  value={editNotes}

                  onChange={(e) => setEditNotes(e.target.value)}

                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 font-medium h-24"

                />

              </div>

              {/* Actions */}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">

                <button

                  type="button"

                  onClick={() => {

                    setIsEditModalOpen(false);

                    setSelectedLeadForEdit(null);

                  }}

                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={isSavingEdit || (Boolean(editDuplicateWarning) && !allowDuplicateEdit)}

                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"

                >

                  {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      <LeadRemarkTimelineModal

        isOpen={isTimelineOpen}

        onClose={() => setIsTimelineOpen(false)}

        lead={timelineLead}

        onLeadUpdated={(leadId, updates) => {

          setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));

        }}

      />

      <LeadImportExcelModal

        isOpen={isImportModalOpen}

        onClose={() => setIsImportModalOpen(false)}

        onImportSuccess={() => { fetchMyLeads(); }}

        ownerId={employeeId}

        ownerName={currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'You'}

        role="employee"

      />

{/* Set Lead Reminder Modal */}
      <SetLeadReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setSelectedLeadForReminder(null);
        }}
        lead={selectedLeadForReminder}
        onSuccess={(updated) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
          );
        }}
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

      <WhatsAppModeModal
        isOpen={isWhatsAppSettingsOpen}
        onClose={() => {
          setIsWhatsAppSettingsOpen(false);
          setTargetWhatsAppLead(null);
        }}
        phone={targetWhatsAppLead?.phone}
        leadName={targetWhatsAppLead?.fullName}
        onModeChanged={(mode) => setWaCurrentMode(mode)}
      />
    </div>

  );

};

export default EmployeeLeads;
