import React, { useState, useEffect } from 'react';
import crmApi from '../../api/crmApi';
import { LeadScoreRule } from '../../lib/types/crm';
import { Plus, Trash2, Edit2, AlertCircle, Settings2, Target } from 'lucide-react';
import { toast } from 'sonner';
import ScoringRuleFormModal from '../../components/admin/ScoringRuleFormModal';

const AdminLeadScoring: React.FC = () => {
  const [rules, setRules] = useState<LeadScoreRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<LeadScoreRule | null>(null);

  const fetchRules = async () => {
    try {
      const response = await crmApi.get('/scoring');
      setRules(response.data);
    } catch (error) {
      toast.error('Failed to load scoring rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRuleActive = async (id: string, currentStatus: boolean) => {
    try {
      await crmApi.put(`/scoring/${id}`, { isActive: !currentStatus });
      toast.success('Rule updated');
      fetchRules();
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this scoring rule?')) {
      try {
        await crmApi.delete(`/scoring/${id}`);
        toast.success('Rule deleted');
        fetchRules();
      } catch (error) {
        toast.error('Failed to delete rule');
      }
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Scoring Rules</h1>
          <p className="text-sm text-gray-500 mt-1">Configure automated points for lead activities</p>
        </div>
        <button 
          onClick={() => { setCurrentRule(null); setIsModalOpen(true); }}
          className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {rules.length === 0 ? (
             <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500">
               <Settings2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
               <h3 className="text-lg font-medium text-gray-900">No rules configured</h3>
               <p className="mt-1">Add rules to automatically score leads based on their actions.</p>
             </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Action Type</th>
                    <th className="px-6 py-4">Points</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primaryRed" />
                        {rule.action.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${rule.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {rule.points > 0 ? '+' : ''}{rule.points}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleRuleActive(rule.id, rule.isActive)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.isActive ? 'bg-primaryRed' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setCurrentRule(rule); setIsModalOpen(true); }}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border border-red-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-primaryRed" /> How it works
            </h3>
            <div className="space-y-4 text-sm text-gray-700">
              <p>Lead scoring helps your team prioritize follow-ups by automatically qualifying leads based on their engagement.</p>
              
              <div className="space-y-2 pt-2 border-t border-red-200">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Cold</span>
                  <span className="font-semibold">0 - 30</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Warm</span>
                  <span className="font-semibold">31 - 60</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600"></div> Hot</span>
                  <span className="font-semibold">61 - 100+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ScoringRuleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rule={currentRule}
        onSave={fetchRules}
      />
    </div>
  );
};

export default AdminLeadScoring;
