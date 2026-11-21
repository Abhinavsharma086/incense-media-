import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  Copy,
  GitMerge,
  Trash2,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Building,
} from 'lucide-react';

interface DuplicateGroup {
  type: 'phone' | 'email';
  matchValue: string;
  leads: any[];
}

export const AdminLeadDuplicates: React.FC = () => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [mergingId, setMergingId] = useState<string | null>(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/leads/duplicates');
      setDuplicateGroups(res.data);
    } catch (err: any) {
      toast.error('Failed to detect duplicate leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleMerge = async (primaryLead: any, secondaryLead: any) => {
    if (
      !window.confirm(
        `Are you sure you want to merge "${secondaryLead.fullName}" into "${primaryLead.fullName}"? Notes and activities will be combined.`
      )
    ) {
      return;
    }

    setMergingId(secondaryLead.id);
    try {
      await crmApi.post('/leads/merge', {
        primaryLeadId: primaryLead.id,
        secondaryLeadId: secondaryLead.id,
        mergedFields: {
          fullName: primaryLead.fullName || secondaryLead.fullName,
          phone: primaryLead.phone || secondaryLead.phone,
          email: primaryLead.email || secondaryLead.email,
          companyName: primaryLead.companyName || secondaryLead.companyName,
          status: primaryLead.status,
        },
      });
      toast.success('Leads merged successfully!');
      fetchDuplicates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to merge leads');
    } finally {
      setMergingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Copy className="w-7 h-7 text-amber-600" /> Duplicate Lead Detection & Merge Tool
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Detect leads sharing duplicate phone numbers or email addresses and merge them cleanly into unified customer profiles.
          </p>
        </div>
        <button
          onClick={fetchDuplicates}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
        >
          <GitMerge className="w-4 h-4" /> Scan Duplicates Now
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="mx-auto w-10 h-10 border-4 border-gray-200 border-t-amber-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Scanning lead database for duplicates...</p>
        </div>
      ) : duplicateGroups.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center shadow-sm">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Duplicate Leads Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Your lead database is clean! All incoming phone numbers and email addresses are unique.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicateGroups.map((group, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Cluster Header */}
              <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Duplicate Cluster ({group.type.toUpperCase()}: {group.matchValue})
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-200 text-amber-900">
                    {group.leads.length} Records
                  </span>
                </div>
              </div>

              {/* Side-by-side Leads Comparison */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.leads.map((lead, leadIdx) => {
                  const isPrimary = leadIdx === 0;
                  const otherLead = group.leads[isPrimary ? 1 : 0];

                  return (
                    <div
                      key={lead.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPrimary
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-gray-200 bg-gray-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                            isPrimary
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {isPrimary ? 'Primary Record' : 'Secondary Record'}
                        </span>

                        <span className="text-[10px] text-gray-400">
                          ID: {lead.id.substring(0, 8)}...
                        </span>
                      </div>

                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Name:</span>
                          <span className="font-bold text-gray-900">{lead.fullName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Phone:</span>
                          <span className="font-mono text-gray-800">{lead.phone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Email:</span>
                          <span className="font-mono text-gray-800">{lead.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Source:</span>
                          <span className="font-semibold text-gray-700 uppercase">{lead.source}</span>
                        </div>
                      </div>

                      {!isPrimary && (
                        <button
                          onClick={() => handleMerge(group.leads[0], lead)}
                          disabled={mergingId === lead.id}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>
                            {mergingId === lead.id ? 'Merging...' : 'Merge Into Primary'}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLeadDuplicates;
