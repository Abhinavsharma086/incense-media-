import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import { MediaCampaign } from "../../lib/types/crm";
import crmApi from "../../api/crmApi";

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: MediaCampaign | null;
  onSave: () => void;
}

const CampaignFormModal: React.FC<CampaignFormModalProps> = ({ isOpen, onClose, campaign, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    clientName: "",
    platform: "Meta",
    service: "",
    startDate: "",
    endDate: "",
    budget: "",
    objective: "Lead Generation",
    status: "active",
    notes: "",
    adSpend: "0",
    impressions: "0",
    reach: "0",
    clicks: "0",
    leadsGenerated: "0",
    qualifiedLeads: "0",
    conversions: "0",
    revenue: "0",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || "",
        clientName: campaign.clientName || "",
        platform: campaign.platform || "Meta",
        service: campaign.service || "",
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : "",
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : "",
        budget: campaign.budget ? campaign.budget.toString() : "",
        objective: campaign.objective || "Lead Generation",
        status: campaign.status || "active",
        notes: campaign.notes || "",
        adSpend: campaign.adSpend ? campaign.adSpend.toString() : "0",
        impressions: campaign.impressions ? campaign.impressions.toString() : "0",
        reach: campaign.reach ? campaign.reach.toString() : "0",
        clicks: campaign.clicks ? campaign.clicks.toString() : "0",
        leadsGenerated: campaign.leadsGenerated ? campaign.leadsGenerated.toString() : "0",
        qualifiedLeads: campaign.qualifiedLeads ? campaign.qualifiedLeads.toString() : "0",
        conversions: campaign.conversions ? campaign.conversions.toString() : "0",
        revenue: campaign.revenue ? campaign.revenue.toString() : "0",
      });
    } else {
      setFormData({
        name: "",
        clientName: "",
        platform: "Meta",
        service: "",
        startDate: "",
        endDate: "",
        budget: "",
        objective: "Lead Generation",
        status: "active",
        notes: "",
        adSpend: "0",
        impressions: "0",
        reach: "0",
        clicks: "0",
        leadsGenerated: "0",
        qualifiedLeads: "0",
        conversions: "0",
        revenue: "0",
      });
    }
  }, [campaign, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientName || !formData.startDate) {
      toast.error("Name, Client, and Start Date are required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (campaign) {
        await crmApi.put(`/campaigns/${campaign.id}`, formData);
        toast.success("Campaign updated successfully");
      } else {
        await crmApi.post('/campaigns', formData);
        toast.success("Campaign created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(campaign ? "Failed to update campaign" : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit Campaign" : "Create Media Campaign"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Campaign Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Campaign Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" required />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">Client Name</label>
                <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" required />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">Platform</label>
                <select name="platform" value={formData.platform} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option value="Meta">Meta (FB/IG)</option>
                  <option value="Google">Google Ads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">Start Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" required />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">End Date (Optional)</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">Total Budget ($)</label>
                <input type="number" name="budget" value={formData.budget} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" required />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-700">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Tracking Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Ad Spend ($)</label>
                <input type="number" name="adSpend" value={formData.adSpend} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Revenue ($)</label>
                <input type="number" name="revenue" value={formData.revenue} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Impressions</label>
                <input type="number" name="impressions" value={formData.impressions} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Clicks</label>
                <input type="number" name="clicks" value={formData.clicks} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Leads Generated</label>
                <input type="number" name="leadsGenerated" value={formData.leadsGenerated} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Conversions</label>
                <input type="number" name="conversions" value={formData.conversions} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Save Campaign"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignFormModal;
