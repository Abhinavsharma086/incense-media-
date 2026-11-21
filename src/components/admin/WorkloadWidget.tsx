import React, { useEffect, useState } from 'react';
import crmApi from '../../api/crmApi';
import { BarChart3, Users, AlertTriangle, CheckCircle2, ChevronRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeWorkload {
  id: string;
  name: string;
  email: string;
  role: string;
  activeLeads: number;
  totalLeads: number;
  units: {
    unitId: string;
    unitName: string;
    maxCapacity: number;
    isActive: boolean;
  }[];
}

const FALLBACK_WORKLOADS: EmployeeWorkload[] = [];

export const WorkloadWidget: React.FC = () => {
  const [workloads, setWorkloads] = useState<EmployeeWorkload[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWorkload = async () => {
      setLoading(true);
      try {
        const res = await crmApi.get('/leads/workload');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setWorkloads(res.data);
        } else {
          setWorkloads([]);
        }
      } catch (err) {
        console.warn('Workload API offline, using active representative workload metrics', err);
        setWorkloads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkload();
  }, []);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs font-sans space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Team Workload Balancing
          </h3>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
          Live Lead Counts
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : workloads.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          No active telecallers found
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
          {workloads.map((emp) => {
            const defaultCapacity = emp.units?.[0]?.maxCapacity || 50;
            const pct = Math.min(100, Math.round((emp.activeLeads / defaultCapacity) * 100));
            const isNearCapacity = pct >= 80;
            const isOverCapacity = pct >= 95;

            return (
              <div
                key={emp.id}
                className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/60 transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {emp.name?.[0] || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {emp.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {emp.units?.map((u) => u.unitName).join(', ') || emp.role}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900">{emp.activeLeads}</span>
                    <span className="text-[10px] text-slate-400 font-semibold"> / {defaultCapacity}</span>
                  </div>
                </div>

                {/* Capacity Progress Bar with Status indicator */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isOverCapacity
                          ? 'bg-rose-500'
                          : isNearCapacity
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-semibold ${
                        isOverCapacity
                          ? 'text-rose-600'
                          : isNearCapacity
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {isOverCapacity
                        ? 'Capacity Full'
                        : isNearCapacity
                        ? 'High Load (80%+)'
                        : 'Optimal Capacity'}
                    </span>
                    <span className="text-slate-400 font-medium">{pct}% allocated</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <Link
          to="/admin/units"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          <span>Configure Round Robin & Units</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default WorkloadWidget;
