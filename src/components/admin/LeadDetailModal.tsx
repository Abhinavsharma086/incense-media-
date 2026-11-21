import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Lead, LeadActivity, LeadComment } from "../../lib/types/leads";
import { mockActivities, mockComments } from "../../lib/mockData/leads";
import { Clock, MessageSquare, Phone, UserPlus, CheckCircle } from "lucide-react";
import { toast } from "../../components/ui/sonner";

import crmApi from "../../api/crmApi";

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  employees?: any[];
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ isOpen, onClose, lead, onUpdate, employees: propEmployees }) => {
  const [status, setStatus] = useState<string>("new");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [nextFollowUp, setNextFollowUp] = useState<string>("");
  const [newComment, setNewComment] = useState("");
  const [employeesList, setEmployeesList] = useState<any[]>(propEmployees || []);
  
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [comments, setComments] = useState<LeadComment[]>([]);

  useEffect(() => {
    if (propEmployees && propEmployees.length > 0) {
      setEmployeesList(propEmployees);
    } else {
      crmApi.get('/units/employees/available').then(res => {
        if (Array.isArray(res.data)) setEmployeesList(res.data);
      }).catch(() => {});
    }
  }, [propEmployees]);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status || "new");
      setAssignedTo(lead.assigned_to || "unassigned");
      let safeDate = "";
      if (lead.next_follow_up_date) {
        try {
          const d = new Date(lead.next_follow_up_date);
          if (!isNaN(d.getTime())) safeDate = d.toISOString().split('T')[0];
        } catch {}
      }
      setNextFollowUp(safeDate);
      
      // Load mock activities and comments for this lead
      setActivities(mockActivities.filter(a => a.lead_id === lead.id));
      setComments(mockComments.filter(c => c.lead_id === lead.id));
    }
  }, [lead]);

  if (!lead) return null;

  const handleSave = () => {
    onUpdate(lead.id, { 
      status: status as any, 
      assigned_to: assignedTo === "unassigned" ? null : assignedTo,
      next_follow_up_date: nextFollowUp ? new Date(nextFollowUp).toISOString() : null
    });
    onClose();
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: LeadComment = {
      id: `comment_${Date.now()}`,
      lead_id: lead.id,
      user_id: "admin",
      user_name: "Super Admin",
      comment: newComment,
      created_at: new Date().toISOString()
    };
    
    setComments([comment, ...comments]);
    setNewComment("");
    toast.success("Comment added");
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'call_logged': return <Phone className="w-4 h-4 text-green-500" />;
      case 'assigned': return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'note_added': return <MessageSquare className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Combine and sort activities and comments for the timeline
  const timelineItems = [...activities, ...comments].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex justify-between items-center">
            <span>Lead Profile: {lead.full_name}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize 
              ${lead.priority === 'high' ? 'bg-red-100 text-red-800' : 
                lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {lead.priority} Priority
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Left Column: Lead Info & Update Form */}
          <div className="w-full md:w-1/2 p-6 border-r">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Contact Details</h4>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium truncate" title={lead.email}>{lead.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{lead.phone}</p>
              </div>
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium">{lead.company_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Source</p>
                <p className="font-medium capitalize">{lead.source}</p>
              </div>
              <div>
                <p className="text-gray-500">Created At</p>
                <p className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</p>
              </div>
              {lead.source === 'meta' && (
                <div>
                  <p className="text-gray-500">Campaign</p>
                  <p className="font-medium truncate" title={lead.campaign_name}>{lead.campaign_name || '-'}</p>
                </div>
              )}
            </div>

            {lead.raw_field_data && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Raw Lead Data</h4>
                <div className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto border border-gray-200">
                  <pre className="text-gray-700 m-0">
                    {JSON.stringify(lead.raw_field_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Update Lead</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Assign To</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employeesList.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName || emp.name} {emp.lastName || ''} {emp.roleName ? `(${emp.roleName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Next Follow-up Date</label>
                <input 
                  type="date" 
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed text-sm"
                />
              </div>

              <Button onClick={handleSave} className="w-full bg-primaryRed text-white hover:bg-red-700 mt-2">
                Save Updates
              </Button>
            </div>
          </div>

          {/* Right Column: Timeline & Comments */}
          <div className="w-full md:w-1/2 p-6 bg-gray-50 flex flex-col h-full">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Activity Timeline</h4>
            
            <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-6">
              {timelineItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No activity recorded yet.</p>
              ) : (
                <div className="relative border-l border-gray-200 ml-3 space-y-6">
                  {timelineItems.map((item: any) => {
                    const isComment = 'comment' in item;
                    return (
                      <div key={item.id} className="relative pl-6">
                        <span className="absolute -left-2.5 bg-white border border-gray-200 rounded-full p-1 shadow-sm flex items-center justify-center">
                          {isComment ? <MessageSquare className="w-3 h-3 text-primaryRed" /> : getActivityIcon(item.activity_type)}
                        </span>
                        
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-900">{item.user_name}</span>
                          <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        
                        {isComment ? (
                          <div className="text-sm text-gray-700 bg-white p-3 rounded-md shadow-sm border border-gray-100 mt-1">
                            {item.comment}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {item.description}
                            {item.old_value && item.new_value && (
                              <span className="block text-xs mt-1 text-gray-500">
                                Changed from <span className="font-medium text-gray-700">{item.old_value}</span> to <span className="font-medium text-gray-700">{item.new_value}</span>
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Comment Box */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm mt-auto">
              <Textarea 
                placeholder="Add a note or comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-2 text-sm border-none focus-visible:ring-0 px-0 resize-none"
                rows={2}
              />
              <div className="flex justify-between items-center border-t pt-2">
                <Button variant="ghost" size="sm" className="text-gray-500 h-8 px-2">
                  <Phone className="w-4 h-4 mr-1" /> Log Call
                </Button>
                <Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm" className="bg-gray-900 text-white hover:bg-gray-800 h-8">
                  Post Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailModal;
