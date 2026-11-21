import React, { useState, useEffect } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import { notifyDataChanged } from '@/lib/useDataSync';
import {
  X,
  CalendarClock,
  Clock,
  Calendar,
  Phone,
  MessageCircle,
  Building2,
  Sparkles,
  Flame,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Bell,
  Briefcase,
  FileText,
} from 'lucide-react';

export interface SetLeadReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedLead: any) => void;
  lead: {
    id: string;
    fullName?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    companyName?: string;
    company_name?: string;
    nextFollowUpDate?: string | null;
    next_follow_up_date?: string | null;
    status?: string;
    priority?: string;
    notes?: string;
  } | null;
}

export const SetLeadReminderModal: React.FC<SetLeadReminderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lead,
}) => {
  const currentUser = getCurrentUser();

  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('11:00');
  const [actionType, setActionType] = useState<string>('call');
  const [priority, setPriority] = useState<string>('medium');
  const [agenda, setAgenda] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize form when lead changes
  useEffect(() => {
    if (isOpen && lead) {
      const existingDateStr = lead.nextFollowUpDate || lead.next_follow_up_date;
      if (existingDateStr) {
        const d = new Date(existingDateStr);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setReminderDate(`${yyyy}-${mm}-${dd}`);

          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          setReminderTime(`${hh}:${min}`);
        } else {
          setDefaultDate();
        }
      } else {
        setDefaultDate();
      }
      setPriority(lead.priority || 'medium');
      setActionType('call');
      setAgenda('');
    }
  }, [isOpen, lead]);

  const setDefaultDate = () => {
    const now = new Date();
    if (now.getHours() < 18) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setReminderDate(`${yyyy}-${mm}-${dd}`);
      const nextHour = Math.min(now.getHours() + 1, 18);
      setReminderTime(`${String(nextHour).padStart(2, '0')}:00`);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setReminderDate(`${yyyy}-${mm}-${dd}`);
      setReminderTime('10:30');
    }
  };

  const handleQuickPreset = (daysAhead: number, timeStr: string) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setReminderDate(`${yyyy}-${mm}-${dd}`);
    setReminderTime(timeStr);
  };

  const handlePresetNextMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + ((7 - day + 1) % 7 || 7);
    d.setDate(diff);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setReminderDate(`${yyyy}-${mm}-${dd}`);
    setReminderTime('10:30');
  };

  if (!isOpen || !lead) return null;

  const leadName = lead.fullName || lead.full_name || 'Prospect';
  const companyName = lead.companyName || lead.company_name || '';
  const leadPhone = lead.phone || '';
  const existingDateStr = lead.nextFollowUpDate || lead.next_follow_up_date;
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderDate) {
      toast.error('Please pick a reminder date');
      return;
    }

    setIsSubmitting(true);
    try {
      const combined = new Date(`${reminderDate}T${reminderTime || '11:00'}:00`);
      const isoDate = combined.toISOString();
      const authorName = currentUser?.firstName || currentUser?.name || 'Employee';
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const formattedDateHuman = combined.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const reminderLog = `[${timestamp} by ${authorName}]: ⏰ Scheduled Reminder for ${formattedDateHuman} at ${reminderTime} | Action: ${actionType.toUpperCase()} | Priority: ${priority.toUpperCase()}${agenda.trim() ? ` | Agenda: ${agenda.trim()}` : ''}`;

      const existingNotes = lead.notes || '';
      const updatedNotes = existingNotes ? `${reminderLog}\n---\n${existingNotes}` : reminderLog;

      const payload = {
        nextFollowUpDate: isoDate,
        priority: priority,
        notes: updatedNotes,
      };

      const res = await crmApi.put(`/leads/${lead.id}`, payload);

      // Also record follow-up entry
      try {
        await crmApi.post('/follow-ups', {
          leadId: lead.id,
          scheduledAt: isoDate,
          type: actionType,
          priority: priority,
          notes: agenda.trim() || `Follow-up reminder set by ${authorName}`,
        });
      } catch (fErr) {
        // Soft fail follow-up sub-record
      }

      notifyDataChanged('leads', 'reminder_set', { id: lead.id });

      const updatedLead = {
        ...lead,
        ...res.data,
        nextFollowUpDate: isoDate,
        next_follow_up_date: isoDate,
        priority: priority,
        notes: updatedNotes,
      };

      toast.success(`⏰ Reminder set for ${leadName} on ${formattedDateHuman} at ${reminderTime}!`);
      if (onSuccess) onSuccess(updatedLead);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to set reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearReminder = async () => {
    if (!lead) return;
    setIsSubmitting(true);
    try {
      await crmApi.put(`/leads/${lead.id}`, {
        nextFollowUpDate: null,
      });

      notifyDataChanged('leads', 'reminder_cleared', { id: lead.id });

      const updatedLead = {
        ...lead,
        nextFollowUpDate: null,
        next_follow_up_date: null,
      };

      toast.success('Reminder removed successfully');
      if (onSuccess) onSuccess(updatedLead);
      onClose();
    } catch (err: any) {
      toast.error('Failed to clear reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Set Follow-Up Reminder</h2>
              <p className="text-xs text-amber-100 font-medium">Schedule a callback or task reminder for this lead</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lead Summary Pill */}
        <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{leadName}</span>
            {companyName && (
              <span className="text-xs text-gray-600 flex items-center gap-1 font-medium">
                <Building2 className="w-3 h-3 text-gray-400" />
                {companyName}
              </span>
            )}
          </div>
          {leadPhone && (
            <div className="text-xs font-semibold text-amber-900 flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded-md">
              <Phone className="w-3 h-3 text-amber-700" />
              <span>{leadPhone}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto im-scrollbar">
          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-2">
              <Sparkles className="w-3 h-3 text-amber-600" /> Quick Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPreset(0, '17:00')}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-[11px] font-bold text-gray-700 transition-all text-center shadow-2xs"
              >
                ⚡ Today 5 PM
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(1, '10:00')}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-[11px] font-bold text-gray-700 transition-all text-center shadow-2xs"
              >
                🌅 Tomorrow 10 AM
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(2, '11:00')}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-[11px] font-bold text-gray-700 transition-all text-center shadow-2xs"
              >
                📅 In 2 Days
              </button>
              <button
                type="button"
                onClick={handlePresetNextMonday}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-[11px] font-bold text-gray-700 transition-all text-center shadow-2xs"
              >
                🗓️ Next Mon
              </button>
            </div>
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Reminder Date *
              </label>
              <input
                type="date"
                min={todayStr}
                required
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Action Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Action Required
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="call">📞 Phone Call</option>
                <option value="whatsapp">💬 WhatsApp Message</option>
                <option value="meeting">🤝 Client Meeting / Demo</option>
                <option value="proposal">📄 Send Quote / Proposal</option>
                <option value="followup">⏰ General Follow-up</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> Priority Level
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 text-xs font-bold rounded-xl border capitalize transition-all ${
                      priority === p
                        ? p === 'high'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : p === 'medium'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agenda & Notes */}
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> Reminder Agenda / Notes
            </label>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="e.g. Call to confirm stall booking, discuss payment terms, send updated brochure..."
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-gray-400"
            />
          </div>

          {/* Existing Reminder Alert */}
          {existingDateStr && (
            <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Currently scheduled: <strong>{new Date(existingDateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearReminder}
                disabled={isSubmitting}
                className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CalendarClock className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Set Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetLeadReminderModal;

