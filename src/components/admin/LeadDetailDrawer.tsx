import React, { useState } from 'react';
import { Lead } from '@/lib/types/leads';
import { openWhatsAppChat } from '@/lib/whatsapp';
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  Building,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  Tag,
  FileText,
  History,
  Send,
  Plus,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface LeadDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onUpdateStatus?: (id: string, newStatus: string) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  isOpen,
  onClose,
  lead,
  onUpdateStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'meta' | 'notes' | 'history'>('details');
  const [newNote, setNewNote] = useState('');
  const [notesList, setNotesList] = useState<Array<{ id: string; text: string; time: string }>>([
    { id: '1', text: 'Initial Meta Lead Ad submission recorded.', time: 'Today at 10:30 AM' },
  ]);
  const [selectedStatus, setSelectedStatus] = useState(lead?.status || 'new');

  if (!isOpen || !lead) return null;

  // Parse raw Meta Form fields JSON if available
  let parsedMetaData: Record<string, string> = {};
  if ((lead as any).metaData) {
    try {
      parsedMetaData = JSON.parse((lead as any).metaData);
    } catch (e) {
      parsedMetaData = {};
    }
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotesList((prev) => [
      { id: Date.now().toString(), text: newNote, time: 'Just now' },
      ...prev,
    ]);
    setNewNote('');
    toast.success('Note added successfully');
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    if (onUpdateStatus) {
      onUpdateStatus(lead.id, status);
    }
    toast.success(`Lead status updated to ${status}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">{lead.full_name}</h3>
                {(lead as any).isDuplicate && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-500 text-white flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Duplicate
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-red-400" /> Source: <span className="font-semibold text-gray-200 uppercase">{lead.source}</span>
                {lead.company_name && ` • ${lead.company_name}`}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Bar (Call, WhatsApp, Email) */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-3 gap-3">
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
            <button
              type="button"
              onClick={(e) =>
                openWhatsAppChat(
                  lead.phone,
                  `Hello ${lead.full_name}, thank you for your inquiry on Incense Media.`,
                  e
                )
              }
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Chat on WhatsApp (re-uses running window)"
            >
              <MessageCircle className="w-4 h-4 fill-white" /> WhatsApp
            </button>
            <a
              href={`mailto:${lead.email || ''}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 text-xs font-semibold bg-white px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 mr-6 border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-primaryRed text-primaryRed'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Lead Details
            </button>
            <button
              onClick={() => setActiveTab('meta')}
              className={`py-3 mr-6 border-b-2 transition-colors ${
                activeTab === 'meta'
                  ? 'border-primaryRed text-primaryRed'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Meta Form Data
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-3 mr-6 border-b-2 transition-colors ${
                activeTab === 'notes'
                  ? 'border-primaryRed text-primaryRed'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Notes ({notesList.length})
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Lead Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-primaryRed focus:border-primaryRed capitalize"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                {/* Lead Contact Info */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Phone Number:</span>
                    <span className="font-bold text-gray-900">{lead.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email Address:</span>
                    <span className="font-bold text-gray-900">{lead.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Company:</span>
                    <span className="font-bold text-gray-900">{lead.company_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Campaign:</span>
                    <span className="font-bold text-gray-900">{lead.campaign || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Created At:</span>
                    <span className="font-bold text-gray-900">
                      {new Date(lead.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'meta' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Meta Lead Form Submitted Key-Values
                </h4>
                {Object.keys(parsedMetaData).length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-2xl text-center text-xs text-gray-500">
                    No custom Meta Lead Ad form fields found for this lead.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(parsedMetaData).map(([key, val]) => (
                      <div
                        key={key}
                        className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-gray-700 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a internal note or follow-up comment..."
                    className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 ml-auto"
                  >
                    <Send className="w-3.5 h-3.5" /> Save Note
                  </button>
                </form>

                <div className="space-y-3">
                  {notesList.map((n) => (
                    <div key={n.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1">
                        <span>Admin User</span>
                        <span>{n.time}</span>
                      </div>
                      <p className="text-gray-800 font-medium">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailDrawer;
