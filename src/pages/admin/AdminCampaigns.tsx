import React, { useState, useEffect } from 'react';
import crmApi from '../../api/crmApi';
import { MediaCampaign } from '../../lib/types/crm';
import { Plus, BarChart2, Edit2, Trash2, Calendar, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import CampaignFormModal from '../../components/admin/CampaignFormModal';
import { Link } from 'react-router-dom';

const AdminCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<MediaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<MediaCampaign | null>(null);
  
  // Filters
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCampaigns = async () => {
    try {
      let query = '';
      if (platformFilter) query += `platform=${platformFilter}&`;
      if (statusFilter) query += `status=${statusFilter}&`;
      
      const response = await crmApi.get(`/campaigns?${query}`);
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [platformFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await crmApi.delete(`/campaigns/${id}`);
        toast.success('Campaign deleted');
        fetchCampaigns();
      } catch (error) {
        toast.error('Failed to delete campaign');
      }
    }
  };

  // Helper calculation functions
  const calculateCPL = (spend: number, leads: number) => leads > 0 ? (spend / leads).toFixed(2) : '0.00';
  const calculateConversionRate = (conversions: number, clicks: number) => clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0';
  const calculateROI = (spend: number, revenue: number) => spend > 0 ? (((revenue - spend) / spend) * 100).toFixed(1) : '0.0';
  const calculateCAC = (spend: number, conversions: number) => conversions > 0 ? (spend / conversions).toFixed(2) : 'N/A';

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Media Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Track ad spend, ROI, and performance across all channels</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/campaigns/dashboard" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
            <BarChart2 className="w-4 h-4" /> View Dashboard
          </Link>
          <button 
            onClick={() => { setCurrentCampaign(null); setIsModalOpen(true); }}
            className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <select 
          value={platformFilter} 
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primaryRed"
        >
          <option value="">All Platforms</option>
          <option value="Meta">Meta</option>
          <option value="Google">Google Ads</option>
          <option value="LinkedIn">LinkedIn</option>
        </select>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primaryRed"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-4">Campaign</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Spend / Budget</th>
                <th className="px-4 py-4">Leads (CPL)</th>
                <th className="px-4 py-4">Conv. Rate</th>
                <th className="px-4 py-4">Revenue (ROI)</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No campaigns found</h3>
                    <p className="mt-1">Create your first media campaign to start tracking performance.</p>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{camp.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{camp.clientName} • {camp.platform}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                        ${camp.status === 'active' ? 'bg-green-100 text-green-700' : 
                          camp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-gray-100 text-gray-700'}`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">${camp.adSpend.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">of ${camp.budget.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{camp.leadsGenerated}</div>
                      <div className="text-xs text-gray-500">${calculateCPL(camp.adSpend, camp.leadsGenerated)} / lead</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{calculateConversionRate(camp.conversions, camp.clicks)}%</div>
                      <div className="text-xs text-gray-500">{camp.conversions} conv. (CAC: ${calculateCAC(camp.adSpend, camp.conversions)})</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-green-600">${camp.revenue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {calculateROI(camp.adSpend, camp.revenue)}%
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setCurrentCampaign(camp); setIsModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(camp.id)} 
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CampaignFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaign={currentCampaign}
        onSave={fetchCampaigns}
      />
    </div>
  );
};

export default AdminCampaigns;
