import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/sonner";
import { Lead } from "../../lib/types/leads";
import crmApi from "../../api/crmApi";
import { AlertTriangle, Loader2 } from "lucide-react";

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSave: (leadData: Partial<Lead> & { allowDuplicate?: boolean }) => void | Promise<void>;
}

const DEFAULT_CATEGORIES = [
  "subscription",
  "advertisement",
  "expo-stall",
  "social-media-promotion"
];

const STANDARD_DOMAINS = [
  "Agarbatti & Perfume Expo",
  "Soap & Detergent Expo",
  "India Stone & Tech Expo",
  "India FMCG Show"
];

const LeadFormModal: React.FC<LeadFormModalProps> = ({ isOpen, onClose, lead, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    website: "",
    city: "",
    industry: "",
    source: "manual",
    campaign: "",
    interested_services: "",
    category: "subscription",
    domain: "Agarbatti & Perfume Expo",
    budget: "",
    deal_value: "",
    priority: "medium",
    status: "new",
    notes: "",
  });
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    crmApi.get('/leads/categories')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map((c: any) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
          if (names.length > 0) {
            setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...names.map((n: string) => n.toLowerCase())])));
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company_name: lead.company_name || "",
        website: lead.website || "",
        city: lead.city || "",
        industry: lead.industry || "",
        source: lead.source || "manual",
        campaign: lead.campaign || "",
        interested_services: lead.interested_services || "",
        category: (lead.category || "subscription").toLowerCase(),
        domain: lead.domain || "Agarbatti & Perfume Expo",
        budget: lead.budget || "",
        deal_value: lead.deal_value ? lead.deal_value.toString() : "",
        priority: lead.priority || "medium",
        status: lead.status || "new",
        notes: lead.notes || "",
      });
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        company_name: "",
        website: "",
        city: "",
        industry: "",
        source: "manual",
        campaign: "",
        interested_services: "",
        category: "subscription",
        domain: "Agarbatti & Perfume Expo",
        budget: "",
        deal_value: "",
        priority: "medium",
        status: "new",
        notes: "",
      });
    }
    setDuplicateWarning(null);
    setAllowDuplicate(false);
  }, [lead, isOpen]);

  // Real-time duplicate check with debounce
  useEffect(() => {
    if (!isOpen) return;

    const rawPhone = (formData.phone || '').trim();
    const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
    const cleanEmail = (formData.email || '').trim();

    if (cleanDigits.length < 6 && (!cleanEmail || !cleanEmail.includes('@'))) {
      setDuplicateWarning(null);
      return;
    }

    // Skip warning if editing and phone/email haven't changed from original
    if (lead) {
      const origDigits = (lead.phone || '').trim().replace(/[^0-9]/g, '');
      const origEmail = (lead.email || '').trim().toLowerCase();
      const phoneUnchanged = cleanDigits.length >= 6 && (cleanDigits === origDigits || origDigits.endsWith(cleanDigits) || cleanDigits.endsWith(origDigits));
      const emailUnchanged = cleanEmail ? cleanEmail.toLowerCase() === origEmail : true;
      if (phoneUnchanged && emailUnchanged) {
        setDuplicateWarning(null);
        return;
      }
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await crmApi.get('/leads/check-duplicate', {
          params: {
            phone: rawPhone,
            email: cleanEmail || undefined,
            fullName: formData.full_name?.trim() || undefined,
            companyName: formData.company_name?.trim() || undefined,
            excludeId: lead?.id || undefined,
          }
        });
        if (res.data?.isDuplicate) {
          setDuplicateWarning(res.data.existingLead);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.email, formData.full_name, formData.company_name, lead?.id, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      toast.error("Name and Phone are required");
      return;
    }

    if (duplicateWarning) {
      toast.error(`Duplicate lead denied! This lead is already assigned to ${duplicateWarning.ownerName || 'another employee'}.`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave({ ...formData, allowDuplicate } as any);
      onClose();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      const msg = error?.response?.data?.message || 'Failed to save lead';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {lead ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              required
            />
          </div>
          
          {/* Phone & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Phone / Mobile Number <span className="text-red-500">*</span>
                </label>
                {isCheckingDuplicate && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                    Checking duplicates...
                  </span>
                )}
              </div>
              <input 
                type="text" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                  duplicateWarning 
                    ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-200' 
                    : 'border-gray-300 focus:ring-primaryRed/30 focus:border-primaryRed'
                }`}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Email Address
              </label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
          </div>

          {/* Real-time duplicate alert banner */}
          {duplicateWarning && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 shadow-xs flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <p className="font-bold text-rose-950 text-sm">Duplicate Lead Denied!</p>
                  <p className="text-rose-900 text-xs">
                    This lead already exists in CRM: <strong>{duplicateWarning.fullName}</strong> {duplicateWarning.companyName && `(${duplicateWarning.companyName})`}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span>📞 {duplicateWarning.phone}</span>
                    {duplicateWarning.email && <span>✉️ {duplicateWarning.email}</span>}
                    <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 ml-2">
                      👤 Assigned to: {duplicateWarning.ownerName || duplicateWarning.assignedToName || 'Unassigned'}
                    </span>
                  </div>
                  <p className="text-rose-700 text-[11px] font-medium pt-1">
                    Duplicate entries are strictly blocked to protect existing employee allocations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Company & Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Company Name</label>
              <input 
                type="text" 
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g. Acme Industries"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Website</label>
              <input 
                type="text" 
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
          </div>

          {/* City & Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">City / Location</label>
              <input 
                type="text" 
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Mumbai, Delhi, Jaipur"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Industry</label>
              <input 
                type="text" 
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g. Fragrance, Cosmetics, Retail"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
          </div>

          {/* Category, Domain & Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              >
                <option value="subscription">📦 Subscription</option>
                <option value="advertisement">📢 Advertisement</option>
                <option value="expo-stall">🏛️ Expo Stall</option>
                <option value="social-media-promotion">📱 Social Media Promotion</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-800 uppercase tracking-wider">Domain / Vertical</label>
              <select 
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-purple-200 bg-purple-50/50 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-600 text-sm font-semibold"
              >
                {STANDARD_DOMAINS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Source</label>
              <select 
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm font-medium"
              >
                <option value="facebook">📘 Facebook</option>
                <option value="instagram">📸 Instagram</option>
                <option value="website">🌐 Website Enquiries</option>
                <option value="manual">✍️ Manual Entry</option>
                <option value="import">📂 Bulk Import</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="expo">🏛️ Exhibition / Expo</option>
                <option value="google">🔍 Google</option>
                <option value="referral">👥 Referral</option>
              </select>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</label>
              <select 
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status</label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm capitalize"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up">Follow up</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
          
          {/* Interested Services & Campaign */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Interested Services</label>
              <input 
                type="text" 
                name="interested_services"
                value={formData.interested_services}
                onChange={handleChange}
                placeholder="e.g. Magazine Ad, Expo Stall"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Campaign</label>
              <input 
                type="text" 
                name="campaign"
                value={formData.campaign}
                onChange={handleChange}
                placeholder="e.g. Diwali Expo 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
          </div>

          {/* Budget & Deal Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Budget</label>
              <input 
                type="text" 
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g. ₹50,000 - ₹1,00,000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Deal Value (₹)</label>
              <input 
                type="number" 
                name="deal_value"
                value={formData.deal_value}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Notes / Remarks</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Add any additional notes about this lead..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed/30 focus:border-primaryRed text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="rounded-lg" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gray-900 text-white hover:bg-black min-w-[120px] rounded-lg font-bold"
              disabled={isSubmitting || Boolean(duplicateWarning)}
            >
              {isSubmitting ? "Saving..." : (lead ? "Save Changes" : "Create Lead")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormModal;
