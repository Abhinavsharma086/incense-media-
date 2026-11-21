import React, { useState, useEffect } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import {
  X,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  Building,
  Sparkles,
} from 'lucide-react';

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: any;
  initialReminder?: any;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  initialReminder,
}) => {
  const currentUser = getCurrentUser();

  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form Fields
  const [reminderDateTime, setReminderDateTime] = useState<string>('');
  const [expectedAmount, setExpectedAmount] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [reminderType, setReminderType] = useState<string>('call');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load unpaid invoices if no invoice is passed
  useEffect(() => {
    if (isOpen && !invoice) {
      crmApi.get('/accounting/invoices', { params: { status: 'UNPAID' } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setAvailableInvoices(list);
          if (list.length > 0 && !selectedInvoiceId) {
            setSelectedInvoiceId(list[0].id);
            setSelectedInvoice(list[0]);
            setExpectedAmount(String(list[0].balanceAmount || list[0].grandTotal || ''));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, invoice]);

  // Sync selected invoice
  useEffect(() => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setSelectedInvoiceId(invoice.id);
      setExpectedAmount(String(invoice.balanceAmount ?? invoice.grandTotal ?? ''));
    }
  }, [invoice]);

  // Load initial reminder data if editing
  useEffect(() => {
    if (initialReminder) {
      const dt = initialReminder.reminderDate || initialReminder.timeLimit;
      if (dt) {
        const d = new Date(dt);
        // format YYYY-MM-DDTHH:mm
        const pad = (n: number) => String(n).padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setReminderDateTime(formatted);
      }
      setExpectedAmount(String(initialReminder.expectedAmount ?? ''));
      setPriority(initialReminder.priority || 'medium');
      setReminderType(initialReminder.reminderType || 'call');
      setNotes(initialReminder.notes || '');
    } else {
      // Default time: Tomorrow 11:00 AM
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setReminderDateTime(formatted);
    }
  }, [initialReminder, isOpen]);

  if (!isOpen) return null;

  // Preset Date-Time Helpers
  const applyPreset = (preset: 'today_5pm' | 'tomorrow_11am' | 'in_3_days' | 'in_7_days' | 'next_monday') => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'today_5pm') {
      d.setHours(17, 0, 0, 0);
    } else if (preset === 'tomorrow_11am') {
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
    } else if (preset === 'in_3_days') {
      d.setDate(d.getDate() + 3);
      d.setHours(11, 0, 0, 0);
    } else if (preset === 'in_7_days') {
      d.setDate(d.getDate() + 7);
      d.setHours(11, 0, 0, 0);
    } else if (preset === 'next_monday') {
      const day = d.getDay();
      const diff = (8 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(10, 0, 0, 0);
    }

    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setReminderDateTime(formatted);
  };

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    const found = availableInvoices.find((i) => i.id === invId);
    if (found) {
      setSelectedInvoice(found);
      setExpectedAmount(String(found.balanceAmount ?? found.grandTotal ?? ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice');
      return;
    }

    if (!reminderDateTime) {
      toast.error('Please set a reminder date and time limit');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: initialReminder?.id,
        invoiceId: selectedInvoiceId,
        partyId: selectedInvoice?.partyId || selectedInvoice?.party?.id,
        employeeId: currentUser?.id || currentUser?.userId,
        employeeName: currentUser?.name || currentUser?.firstName || 'Employee',
        reminderDate: new Date(reminderDateTime).toISOString(),
        timeLimit: new Date(reminderDateTime).toISOString(),
        expectedAmount: parseFloat(expectedAmount) || 0,
        priority,
        reminderType,
        notes,
      };

      const res = await crmApi.post('/accounting/reminders', payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Payment reminder set successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to save reminder');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving payment reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 to-black text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">
                {initialReminder ? 'Reschedule Payment Reminder' : 'Set Payment Reminder & Time Limit'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Schedule payment reminder and follow-up deadline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Invoice & Party Details Card */}
          {invoice ? (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    {invoice.invoiceNumber}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-sm mt-1">{invoice.party?.name}</div>
                {invoice.party?.phone && (
                  <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{invoice.party.phone}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Balance Due</span>
                <span className="text-base font-black text-amber-600 font-mono">
                  ₹{(invoice.balanceAmount ?? invoice.grandTotal)?.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 block">
                  Total: ₹{invoice.grandTotal?.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select Invoice for Reminder <span className="text-red-500">*</span>
              </label>
              {availableInvoices.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
                  Loading unpaid invoices...
                </div>
              ) : (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-600 outline-none"
                >
                  {availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.party?.name} (Bal: ₹{(inv.balanceAmount || inv.grandTotal)?.toFixed(2)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Quick Shortcuts */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Quick Time Limit Presets</span>
              <span className="text-[10px] font-normal text-amber-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 1-Click Set
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('today_5pm')}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-left transition-colors"
              >
                ⏰ Today (5:00 PM)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tomorrow_11am')}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-left transition-colors"
              >
                ☀️ Tomorrow (11 AM)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('in_3_days')}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-left transition-colors"
              >
                📅 In 3 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset('in_7_days')}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-left transition-colors"
              >
                📦 In 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset('next_monday')}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-left transition-colors col-span-2 sm:col-span-1"
              >
                💼 Next Monday
              </button>
            </div>
          </div>

          {/* DateTime Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Reminder Date & Follow-up Deadline <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={reminderDateTime}
                onChange={(e) => setReminderDateTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Amount & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Expected Collection (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  placeholder="Amount expected"
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold font-mono focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-600 outline-none"
              >
                <option value="urgent">🚨 Urgent (Overdue / High Value)</option>
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🔵 Normal Priority</option>
              </select>
            </div>
          </div>

          {/* Follow-up Channel */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Follow-up Channel
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'call', label: 'Phone Call', icon: Phone },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'visit', label: 'In Person', icon: Building },
              ].map((ch) => {
                const Icon = ch.icon;
                const isSelected = reminderType === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setReminderType(ch.id)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="text-[10px]">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Commitment */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Payment Remarks / Customer Commitment
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Party promised 50% NEFT by Thursday 3 PM, check balance on Saturday..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reminderDateTime}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving Reminder...' : 'Confirm & Set Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentReminderModal;

