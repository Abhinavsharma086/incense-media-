import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import { LeadScoreRule } from "../../lib/types/crm";
import crmApi from "../../api/crmApi";

interface ScoringRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: LeadScoreRule | null;
  onSave: () => void;
}

const ScoringRuleFormModal: React.FC<ScoringRuleFormModalProps> = ({ isOpen, onClose, rule, onSave }) => {
  const [formData, setFormData] = useState({
    action: "website_enquiry",
    points: "10",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rule) {
      setFormData({
        action: rule.action || "website_enquiry",
        points: rule.points ? rule.points.toString() : "10",
        description: rule.description || "",
      });
    } else {
      setFormData({
        action: "website_enquiry",
        points: "10",
        description: "",
      });
    }
  }, [rule, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.action || !formData.points) {
      toast.error("Action and Points are required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        action: formData.action,
        points: parseInt(formData.points),
        description: formData.description,
      };

      if (rule) {
        await crmApi.put(`/scoring/${rule.id}`, payload);
        toast.success("Rule updated successfully");
      } else {
        await crmApi.post('/scoring', payload);
        toast.success("Rule created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(rule ? "Failed to update rule" : "Failed to create rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Scoring Rule" : "Add Scoring Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Action Type</label>
              <select
                name="action"
                value={formData.action}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                required
              >
                <option value="website_enquiry">Website Enquiry</option>
                <option value="whatsapp_reply">WhatsApp Reply</option>
                <option value="meeting_booked">Meeting Booked</option>
                <option value="pricing_requested">Pricing Requested</option>
                <option value="proposal_viewed">Proposal Viewed</option>
                <option value="no_response">No Response (Negative)</option>
                <option value="email_opened">Email Opened</option>
                <option value="demo_completed">Demo Completed</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Points to Award/Deduct</label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                placeholder="e.g. 10 or -10"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Use a negative number to deduct points.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Rule details..."
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
              {isSubmitting ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScoringRuleFormModal;
