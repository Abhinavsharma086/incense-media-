import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import { FollowUp } from "../../lib/types/crm";
import { Lead } from "../../lib/types/leads";
import crmApi from "../../api/crmApi";

interface FollowUpFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp?: FollowUp | null;
  onSave: () => void;
}

const FollowUpFormModal: React.FC<FollowUpFormModalProps> = ({ isOpen, onClose, followUp, onSave }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    leadId: "",
    type: "call",
    priority: "medium",
    scheduledDate: "",
    scheduledTime: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      crmApi.get('/leads').then(res => setLeads(res.data)).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (followUp) {
      const dateObj = new Date(followUp.scheduledAt);
      setFormData({
        leadId: followUp.leadId || "",
        type: followUp.type || "call",
        priority: followUp.priority || "medium",
        scheduledDate: dateObj.toISOString().split('T')[0],
        scheduledTime: dateObj.toTimeString().slice(0, 5),
        notes: followUp.notes || "",
      });
    } else {
      setFormData({
        leadId: "",
        type: "call",
        priority: "medium",
        scheduledDate: "",
        scheduledTime: "",
        notes: "",
      });
    }
  }, [followUp, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leadId || !formData.scheduledDate || !formData.scheduledTime) {
      toast.error("Lead, Date, and Time are required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Combine date and time
      const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}:00`).toISOString();

      const payload = {
        leadId: formData.leadId,
        type: formData.type,
        priority: formData.priority,
        scheduledAt,
        notes: formData.notes,
      };

      if (followUp) {
        await crmApi.put(`/followups/${followUp.id}`, payload);
        toast.success("Follow-up updated successfully");
      } else {
        await crmApi.post('/followups', payload);
        toast.success("Follow-up scheduled successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(followUp ? "Failed to update follow-up" : "Failed to schedule follow-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>{followUp ? "Edit Follow-up" : "Schedule Follow-up"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Associated Lead</label>
              <select
                name="leadId"
                value={formData.leadId}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                required
              >
                <option value="">Select a Lead</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.full_name || l.email || l.phone}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
              >
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Details for the follow-up..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Follow-up"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FollowUpFormModal;
