import React, { useState, useEffect } from 'react';
import crmApi from '../../api/crmApi';
import { toast } from '../ui/sonner';
import {
  X,
  MessageSquare,
  Phone,
  MessageCircle,
  Calendar,
  Send,
  User,
  Clock,
  RefreshCw,
  Building2,
  Tag,
  CheckCircle2,
  History,
  RotateCcw,
  UserCheck,
  Globe,
  FileText
} from 'lucide-react';
import { Lead } from '../../lib/types/leads';

interface LeadRemarkTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdated?: (leadId: string, updates: any) => void;
}

interface TimelineItem {
  id: string;
  kind: 'activity' | 'assignment';
  type: string;
  description: string;
  timestamp: string;
  author?: string;
  authorRole?: string | null;
  fromEmployee?: string | null;
  toEmployee?: string | null;
}

export const LeadRemarkTimelineModal: React.FC<LeadRemarkTimelineModalProps> = ({
  isOpen,
  onClose,
  lead,
  onLeadUpdated,
}) => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [remarkType, setRemarkType] = useState<string>('remark');
  const [remarkText, setRemarkText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('keep_current');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  const fetchTimeline = async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const res = await crmApi.get(`/leads/${lead.id}/timeline`);
      if (res.data) {
        setTimeline(res.data.timeline || []);
        setLeadDetails(res.data.lead || lead);
      }
    } catch (err) {
      console.warn('Failed to load timeline directly, falling back to lead profile:', err);
      try {
        const leadRes = await crmApi.get(`/leads/${lead.id}`);
        if (leadRes.data) {
          const l = leadRes.data;
          setLeadDetails(l);
          const acts = (l.activities || []).map((a: any) => ({
            id: a.id,
            kind: 'activity' as const,
            type: a.type || 'remark',
            description: a.description,
            timestamp: a.createdAt,
            author: a.authorName || 'Team Member',
            authorRole: a.authorRole || null,
          }));
          const logs = (l.assignmentLogs || []).map((log: any) => ({
            id: log.id,
            kind: 'assignment' as const,
            type: 'assignment',
            description: log.reason || (log.toEmployee ? `Assigned to ${log.toEmployee.firstName} ${log.toEmployee.lastName}` : 'Lead unassigned'),
            timestamp: log.timestamp,
            author: log.assignedBy ? `${log.assignedBy.firstName} ${log.assignedBy.lastName}` : 'System',
            fromEmployee: log.fromEmployee ? `${log.fromEmployee.firstName} ${log.fromEmployee.lastName}` : null,
            toEmployee: log.toEmployee ? `${log.toEmployee.firstName} ${log.toEmployee.lastName}` : null,
          }));
          const combined = [...acts, ...logs].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setTimeline(combined);
        }
      } catch (innerErr) {
        console.error('Error fetching lead timeline:', innerErr);
        toast.error('Could not load activity history');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead?.id) {
      setLeadDetails(lead);
      setRemarkText('');
      setRemarkType('remark');
      setSelectedStatus('keep_current');
      setNextFollowUpDate('');
      fetchTimeline();
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkText.trim()) {
      toast.error('Please enter a remark or discussion notes');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        type: remarkType,
        description: remarkText.trim(),
      };

      if (selectedStatus && selectedStatus !== 'keep_current') {
        payload.status = selectedStatus;
      }
      if (nextFollowUpDate) {
        payload.nextFollowUpDate = nextFollowUpDate;
      }

      const res = await crmApi.post(`/leads/${lead.id}/activities`, payload);

      toast.success('Remark added to timeline!');
      setRemarkText('');
      setSelectedStatus('keep_current');
      setNextFollowUpDate('');

      // Refresh timeline immediately
      await fetchTimeline();

      // Notify parent component to update table
      if (onLeadUpdated) {
        onLeadUpdated(lead.id, {
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.nextFollowUpDate ? { next_follow_up_date: payload.nextFollowUpDate } : {}),
        });
      }
    } catch (err: any) {
      console.error('Error saving remark:', err);
      toast.error(err?.response?.data?.message || 'Failed to add remark');
    } finally {
      setSubmitting(false);
    }
  };

  const getSourceBadge = (source?: string) => {
    const s = (source || 'manual').toLowerCase();
    if (s.includes('website')) return { label: 'Website Inquiry', icon: '🌐', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s.includes('meta')) return { label: 'Meta Ads', icon: '📱', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (s.includes('manual')) return { label: 'Manual Entry', icon: '✍️', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (s.includes('import')) return { label: 'Imported', icon: '📂', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (s.includes('whatsapp')) return { label: 'WhatsApp', icon: '💬', color: 'bg-green-50 text-green-700 border-green-200' };
    return { label: source || 'Direct', icon: '🎯', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  const getActivityTypeConfig = (type: string, kind: string) => {
    if (kind === 'assignment') {
      return {
        label: 'Assignment',
        icon: <UserCheck className="w-3.5 h-3.5 text-indigo-600" />,
        badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        markerBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      };
    }

    const t = (type || '').toLowerCase();
    switch (t) {
      case 'call':
        return {
          label: 'Call Log',
          icon: <Phone className="w-3.5 h-3.5 text-emerald-600" />,
          badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          markerBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };
      case 'whatsapp':
        return {
          label: 'WhatsApp Follow-up',
          icon: <MessageCircle className="w-3.5 h-3.5 text-green-600" />,
          badgeBg: 'bg-green-50 border-green-200 text-green-800',
          markerBg: 'bg-green-100 text-green-700 border-green-200',
        };
      case 'meeting':
        return {
          label: 'Meeting / Discussion',
          icon: <Calendar className="w-3.5 h-3.5 text-purple-600" />,
          badgeBg: 'bg-purple-50 border-purple-200 text-purple-800',
          markerBg: 'bg-purple-100 text-purple-700 border-purple-200',
        };
      case 'status_change':
        return {
          label: 'Status Changed',
          icon: <RotateCcw className="w-3.5 h-3.5 text-amber-600" />,
          badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
          markerBg: 'bg-amber-100 text-amber-700 border-amber-200',
        };
      case 'note':
      case 'remark':
      default:
        return {
          label: 'Remark / Note',
          icon: <MessageSquare className="w-3.5 h-3.5 text-blue-600" />,
          badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
          markerBg: 'bg-blue-100 text-blue-700 border-blue-200',
        };
    }
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const srcBadge = getSourceBadge(leadDetails?.source || lead.source);
  const currentLeadStatus = leadDetails?.status || lead.status || 'new';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
                <History className="w-5 h-5 text-indigo-400" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {leadDetails?.fullName || lead.full_name}
              </h2>
              {leadDetails?.companyName && (
                <span className="text-xs text-slate-300 flex items-center gap-1 font-medium bg-white/10 px-2 py-0.5 rounded-full">
                  <Building2 className="w-3 h-3 text-slate-400" /> {leadDetails.companyName}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" /> {leadDetails?.phone || lead.phone}
              </span>
              {(leadDetails?.email || lead.email) && (
                <span>• {leadDetails?.email || lead.email}</span>
              )}
              <span>•</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${srcBadge.color}`}>
                <span>{srcBadge.icon}</span>
                <span>{srcBadge.label}</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white capitalize">
                Status: {currentLeadStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTimeline}
              disabled={loading}
              title="Refresh timeline"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {/* Add Remark Form Card */}
          <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                Add New Remark / Activity
              </span>
              <span className="text-[11px] text-slate-400">Updates timeline in real time</span>
            </div>

            <form onSubmit={handleAddRemark} className="space-y-3">
              {/* Type Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'remark', label: 'Remark / Note', icon: MessageSquare },
                  { id: 'call', label: 'Call Log', icon: Phone },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'meeting', label: 'Meeting', icon: Calendar },
                  { id: 'follow_up', label: 'Follow Up', icon: Clock },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = remarkType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRemarkType(t.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  required
                  rows={2}
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Enter call outcome, discussion points, customer requirement, or next step..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 font-medium resize-none bg-slate-50/50"
                />
              </div>

              {/* Options Row: Quick Status Change & Next Follow Up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Update Lead Status (Optional)
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 bg-white font-medium focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="keep_current">Keep Current ({currentLeadStatus})</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="interested">Interested</option>
                    <option value="converted">Converted</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Next Follow-up Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 bg-white font-medium focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                  <span>{submitting ? 'Saving Remark...' : 'Save Remark & Timeline'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Activity & Remarks Timeline ({timeline.length})
              </h3>
              {loading && <span className="text-[11px] text-slate-400">Loading timeline...</span>}
            </div>

            {loading && timeline.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                <p className="text-xs text-slate-500 font-medium">Fetching history...</p>
              </div>
            ) : timeline.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((item) => {
                  const cfg = getActivityTypeConfig(item.type, item.kind);

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot/Icon */}
                      <div
                        className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${cfg.markerBg}`}
                      >
                        {cfg.icon}
                      </div>

                      {/* Event Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-indigo-200 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.badgeBg}`}>
                              {cfg.label}
                            </span>
                            {item.author && (
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                {item.author}
                                {item.authorRole && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({item.authorRole})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                          {item.description}
                        </p>

                        {/* Assignment Details pill if available */}
                        {item.kind === 'assignment' && (item.fromEmployee || item.toEmployee) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                            {item.fromEmployee && <span>From: <strong className="text-slate-700">{item.fromEmployee}</strong></span>}
                            {item.fromEmployee && item.toEmployee && <span>→</span>}
                            {item.toEmployee && <span>Assigned to: <strong className="text-indigo-600">{item.toEmployee}</strong></span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700 mb-1">No Remarks Logged Yet</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Be the first to log a discussion, follow-up call, or client feedback using the form above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadRemarkTimelineModal;

