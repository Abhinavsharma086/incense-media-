import React, { useState, useEffect } from 'react';
import crmApi from '../../api/crmApi';
import { FollowUp } from '../../lib/types/crm';
import { Calendar, CheckCircle, Clock, AlertCircle, Plus, Phone, Mail, MessageCircle, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import FollowUpFormModal from '../../components/admin/FollowUpFormModal';
import { openWhatsAppChat } from '@/lib/whatsapp';

const AdminFollowUps: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFollowUp, setCurrentFollowUp] = useState<FollowUp | null>(null);

  const fetchFollowUps = async () => {
    try {
      const response = await crmApi.get('/followups');
      setFollowUps(response.data);
    } catch (error) {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleComplete = async (id: string) => {
    try {
      await crmApi.put(`/followups/${id}`, { status: 'completed' });
      toast.success('Follow-up marked as completed');
      fetchFollowUps();
    } catch (error) {
      toast.error('Failed to complete follow-up');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filteredFollowUps = followUps.filter(f => {
    if (activeTab === 'completed') return f.status === 'completed';
    if (f.status === 'completed') return false;
    
    const scheduledAt = new Date(f.scheduledAt);
    scheduledAt.setHours(0, 0, 0, 0);

    if (activeTab === 'today') return scheduledAt.getTime() === now.getTime();
    if (activeTab === 'upcoming') return scheduledAt.getTime() >= tomorrow.getTime();
    if (activeTab === 'overdue') return scheduledAt.getTime() < now.getTime();
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryRed"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your daily tasks and meetings</p>
        </div>
        <button 
          onClick={() => { setCurrentFollowUp(null); setIsModalOpen(true); }}
          className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Schedule Follow-up
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'today' ? 'border-b-2 border-gray-900 text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <Clock className="w-4 h-4" /> Today
          </button>
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-gray-900 text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <Calendar className="w-4 h-4" /> Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('overdue')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'overdue' ? 'border-b-2 border-red-600 text-red-600 bg-red-50/50' : 'text-gray-500 hover:text-red-600 hover:bg-red-50/30'}`}
          >
            <AlertCircle className="w-4 h-4" /> Overdue
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'completed' ? 'border-b-2 border-green-600 text-green-600 bg-green-50/50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50/30'}`}
          >
            <CheckCircle className="w-4 h-4" /> Completed
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredFollowUps.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
              <p>No follow-ups found for this category.</p>
            </div>
          ) : (
            filteredFollowUps.map(followUp => (
              <div key={followUp.id} className="p-5 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${followUp.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-primaryRed'}`}>
                    {getIcon(followUp.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{followUp.lead?.fullName}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide font-semibold ${getPriorityColor(followUp.priority)}`}>
                        {followUp.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{followUp.lead?.companyName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(followUp.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {followUp.lead?.phone}</span>
                      <span className="capitalize text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{followUp.type.replace('_', ' ')}</span>
                    </div>
                    {followUp.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100 italic">{followUp.notes}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                  {followUp.lead?.phone && (
                    <button
                      type="button"
                      onClick={(e) => openWhatsAppChat(followUp.lead?.phone || '', `Hello ${followUp.lead?.fullName || ''}, following up regarding our previous conversation from Incense Media.`, e)}
                      className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                      title="Chat on WhatsApp (re-uses running window)"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  {followUp.status !== 'completed' && (
                    <button 
                      onClick={() => handleComplete(followUp.id)}
                      className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                  <button 
                    onClick={() => { setCurrentFollowUp(followUp); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <FollowUpFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        followUp={currentFollowUp}
        onSave={fetchFollowUps}
      />
    </div>
  );
};

export default AdminFollowUps;
