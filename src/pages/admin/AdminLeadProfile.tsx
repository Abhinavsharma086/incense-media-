import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Briefcase, Globe, DollarSign, Target, Calendar, CalendarClock, Clock, MessageCircle, ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import crmApi from '@/api/crmApi';
import { toast } from 'sonner';
import LeadFormModal from '../../components/admin/LeadFormModal';
import SetLeadReminderModal from '../../components/common/SetLeadReminderModal';
import { Lead } from '../../lib/types/leads';
import { openWhatsAppChat } from '@/lib/whatsapp';

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userId?: string;
}

interface LeadProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  companyName: string | null;
  website: string | null;
  city: string | null;
  industry: string | null;
  source: string;
  campaign: string | null;
  status: string;
  interestedService: string | null;
  budget: string | null;
  priority: string;
  leadScore: number;
  dealValue: number | null;
  notes: string | null;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  activities: Activity[];
}

// Map from LeadProfile to Lead type expected by form
const mapProfileToFormLead = (profile: LeadProfile): Lead => ({
  id: profile.id,
  full_name: profile.fullName,
  email: profile.email || '',
  phone: profile.phone,
  company_name: profile.companyName || '',
  website: profile.website,
  city: profile.city,
  industry: profile.industry,
  source: profile.source,
  campaign: profile.campaign,
  status: profile.status as any,
  priority: profile.priority as any,
  interested_services: profile.interestedService,
  budget: profile.budget,
  deal_value: profile.dealValue,
  notes: profile.notes || '',
  created_at: '',
  updated_at: '',
});

const AdminLeadProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  const fetchLead = async () => {
    try {
      const response = await crmApi.get(`/leads/${id}`);
      setLead(response.data);
    } catch (error) {
      toast.error('Failed to load lead profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLead();
    }
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await crmApi.post(`/leads/${id}/activities`, {
        type: 'note',
        description: newNote
      });
      toast.success('Note added');
      setNewNote('');
      fetchLead();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryRed"></div>
      </div>
    );
  }

  if (!lead) return <div>Lead not found</div>;

  const handleSaveLead = async (updates: Partial<Lead>) => {
    try {
      const dbUpdates = {
        fullName: updates.full_name,
        phone: updates.phone,
        email: updates.email,
        companyName: updates.company_name,
        website: updates.website,
        city: updates.city,
        industry: updates.industry,
        source: updates.source,
        campaign: updates.campaign,
        status: updates.status,
        priority: updates.priority,
        interestedService: updates.interested_services,
        budget: updates.budget,
        dealValue: updates.deal_value ? parseFloat(updates.deal_value.toString()) : null,
      };
      if (updates.notes !== undefined) {
        (dbUpdates as any).notes = updates.notes;
      }
      await crmApi.put(`/leads/${id}`, dbUpdates);
      toast.success('Lead updated successfully');
      fetchLead();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      {/* existing JSX */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/leads')} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              {lead.fullName}
              <select
                value={lead.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  try {
                    await crmApi.put(`/leads/${id}`, { status: newStatus });
                    setLead(prev => prev ? { ...prev, status: newStatus } : null);
                    toast.success(`Status updated to "${newStatus.replace('_', ' ')}"`);
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || 'Failed to update status');
                  }
                }}
                className="text-xs font-bold px-2.5 py-1 rounded-md border bg-red-50 text-primaryRed border-red-200 uppercase tracking-wider cursor-pointer focus:outline-none"
                title="Change lead status"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up">Follow Up</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> {lead.companyName || 'Independent'} 
              <span className="text-gray-300">•</span> 
              Added on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.phone && (
            <button
              type="button"
              onClick={(e) => openWhatsAppChat(lead.phone, `Hello ${lead.fullName}, greetings from Incense Media!`, e)}
              className="bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white px-4 py-2.5 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              title="Chat on WhatsApp (re-uses running window)"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp</span>
            </button>
          )}
          <button 
            onClick={() => setIsReminderOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-colors shadow-sm"
            title="Set follow-up reminder for this lead"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Set Reminder</span>
          </button>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg flex items-center text-sm font-medium transition-colors shadow-sm"
          >
            Edit Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Core Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 pb-4 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-primaryRed" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500 font-medium">Email</span>
                  <span className="text-sm text-gray-900 font-medium truncate">{lead.email || '-'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primaryRed" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-gray-500 font-medium">Phone</span>
                    <button
                      type="button"
                      onClick={(e) => openWhatsAppChat(lead.phone, `Hello ${lead.fullName}, greetings from Incense Media!`, e)}
                      className="text-sm text-gray-900 font-medium truncate text-left hover:text-[#25D366] hover:underline cursor-pointer"
                      title="Click to chat on WhatsApp"
                    >
                      {lead.phone}
                    </button>
                  </div>
                </div>
                {lead.phone && (
                  <button
                    type="button"
                    onClick={(e) => openWhatsAppChat(lead.phone, `Hello ${lead.fullName}, greetings from Incense Media!`, e)}
                    className="p-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
                    title="Chat on WhatsApp (re-uses running window)"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-primaryRed" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500 font-medium">Company</span>
                  <span className="text-sm text-gray-900 font-medium truncate">{lead.companyName || '-'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primaryRed" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500 font-medium">Location</span>
                  <span className="text-sm text-gray-900 font-medium truncate">{lead.city || '-'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-primaryRed" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500 font-medium">Website</span>
                  <span className="text-sm text-gray-900 font-medium truncate">{lead.website || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 pb-4 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900">Sales Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-500 font-medium">Source</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize bg-gray-100 px-2.5 py-1 rounded-md">{lead.source}</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-500 font-medium">Priority</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize bg-gray-100 px-2.5 py-1 rounded-md">{lead.priority}</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-500 font-medium">Deal Value</span>
                  <span className="text-sm font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md flex items-center">
                    <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                    {lead.dealValue?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-500 font-medium">Interested In</span>
                  <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md max-w-[150px] truncate">{lead.interestedService || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {lead.notes && (
            <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-gray-50/50 pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-semibold text-gray-900">Lead Remarks & Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-lg max-h-60 overflow-y-auto font-mono">
                  {lead.notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Activities */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden h-full">
            <CardHeader className="bg-gray-50/50 pb-4 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900">Activity History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Add Note */}
              <div className="mb-6 flex gap-3">
                <input
                  type="text"
                  placeholder="Add a note or log an activity..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primaryRed transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button 
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Log
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {(lead.activities || []).map((activity) => (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Marker */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-red-50 text-primaryRed shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                      {getActivityIcon(activity.type)}
                    </div>
                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 capitalize text-sm">{activity.type.replace('_', ' ')}</span>
                        <time className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </time>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
                    </div>
                  </div>
                ))}
                
                {(!lead.activities || lead.activities.length === 0) && (
                  <div className="text-center py-8 text-gray-500 text-sm relative z-10 bg-white">
                    No activity history yet. Log a note above!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <SetLeadReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        lead={lead}
        onSuccess={() => {
          fetchLead();
        }}
      />

      <LeadFormModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lead={mapProfileToFormLead(lead)}
        onSave={handleSaveLead}
      />
    </div>
  );
};

export default AdminLeadProfile;
