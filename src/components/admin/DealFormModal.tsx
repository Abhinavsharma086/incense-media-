import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Deal } from "../../lib/types/crm";
import { Lead } from "../../lib/types/leads";
import crmApi from "../../api/crmApi";

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: Deal | null;
  onSave: () => void; // Trigger fetch on parent
}

const DealFormModal: React.FC<DealFormModalProps> = ({ isOpen, onClose, deal, onSave }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    stage: "new",
    probability: "50",
    expectedCloseDate: "",
    services: "",
    leadId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      crmApi.get('/leads').then(res => setLeads(res.data)).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (deal) {
      setFormData({
        name: deal.name || "",
        value: deal.value ? deal.value.toString() : "",
        stage: deal.stage || "new",
        probability: deal.probability ? deal.probability.toString() : "50",
        expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : "",
        services: deal.services || "",
        leadId: deal.leadId || "",
      });
    } else {
      setFormData({
        name: "",
        value: "",
        stage: "new",
        probability: "50",
        expectedCloseDate: "",
        services: "",
        leadId: "",
      });
    }
  }, [deal, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.leadId || !formData.value) {
      toast.error("Name, Lead, and Value are required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value),
        probability: parseInt(formData.probability),
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toISOString() : null,
      };

      if (deal) {
        await crmApi.put(`/deals/${deal.id}`, payload);
        toast.success("Deal updated successfully");
      } else {
        await crmApi.post('/deals', payload);
        toast.success("Deal created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(deal ? "Failed to update deal" : "Failed to create deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] rounded-lg">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Deal Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                placeholder="e.g. Website Redesign"
                required
              />
            </div>
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
              <label className="text-sm font-medium text-gray-700">Deal Value ($)</label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Stage</label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="meeting">Meeting</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Probability (%)</label>
              <input
                type="number"
                name="probability"
                value={formData.probability}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Expected Close Date</label>
              <input
                type="date"
                name="expectedCloseDate"
                value={formData.expectedCloseDate}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primaryRed focus:border-primaryRed"
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
              {isSubmitting ? "Saving..." : "Save Deal"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DealFormModal;
