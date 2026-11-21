import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import {
  getInvoices,
} from '@/lib/roleAuthStore';
import crmApi from '@/api/crmApi';
import {
  FileText,
  ArrowRight,
  UserCheck,
  DollarSign,
  BarChart3,
  BellRing,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EmployeeDashboard: React.FC = () => {
  const user = getCurrentUser();
  const adminId = user?.adminId || 'admin-1';
  const employeeId = user?.id || 'emp-1';

  const [leadsCount, setLeadsCount] = useState<number>(0);
  const [activeLeadsCount, setActiveLeadsCount] = useState<number>(0);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(true);
  const [reminderStats, setReminderStats] = useState<{ pending: number; overdue: number }>({ pending: 0, overdue: 0 });

  const invoices = getInvoices(adminId);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await crmApi.get('/leads?myLeads=true');
        const all = Array.isArray(res.data) ? res.data : [];
        const myLeads = all.filter((l: any) => {
          if (!employeeId) return false;
          return (
            l.ownerId === employeeId ||
            l.assigned_to === employeeId ||
            l.assignedTo === employeeId ||
            (l.owner && (l.owner.id === employeeId || (user?.email && l.owner.email === user.email)))
          );
        });
        setLeadsCount(myLeads.length);
        setActiveLeadsCount(
          myLeads.filter((l: any) => !['converted', 'won', 'lost'].includes(l.status)).length
        );
      } catch (err) {
        console.warn('Leads fetch error on dashboard:', err);
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();

    crmApi.get('/accounting/reminders/counts')
      .then((res) => {
        if (res.data?.counts) {
          setReminderStats({
            pending: res.data.counts.pending || 0,
            overdue: res.data.counts.overdue || 0,
          });
        }
      })
      .catch(() => {});
  }, [employeeId]);

  return (
    <div className="space-y-8 font-sans">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-red-900 via-gray-900 to-slate-900 rounded-2xl p-6 lg:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-gray-800">
        <div>
          <span className="px-3 py-1 bg-white/10 text-red-200 text-xs font-semibold rounded-full border border-white/20">
            EMPLOYEE WORKSPACE
          </span>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">
            Welcome back, {user?.name || 'Employee'} 👋
          </h1>
          <p className="text-gray-300 text-sm mt-1">
            Access assigned company modules and manage daily operations for {user?.companyName || 'your organization'}.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          to="/employee/leads"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-teal-300 hover:shadow-md transition-all group"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">My Assigned Leads</p>
            <h3 className="text-2xl font-bold text-teal-600 mt-1">
              {loadingLeads ? '...' : leadsCount}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{activeLeadsCount} active leads in pipeline</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <UserCheck className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/employee/reminders"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Payment Reminders</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {reminderStats.pending}
            </h3>
            <p className={`text-[11px] mt-0.5 font-bold ${reminderStats.overdue > 0 ? 'text-rose-600 animate-pulse' : 'text-gray-400'}`}>
              {reminderStats.overdue > 0 ? `${reminderStats.overdue} Overdue Limit!` : 'Collection deadlines'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BellRing className="w-6 h-6" />
          </div>
        </Link>


        <Link
          to="/employee/invoices"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Company Invoices</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{invoices.length}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Billing vouchers & records</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/employee/payments"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Payment Receipts</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">Receipts</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Track incoming payments</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Permitted Modules Quick Cards */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Quick Work Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/employee/leads"
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-teal-50/50 hover:border-teal-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">My Assigned Leads</div>
                <div className="text-xs text-gray-500">Track status, remarks & followups</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
          </Link>

          <Link
            to="/employee/invoices"
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-purple-50/50 hover:border-purple-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Billing & Invoices</div>
                <div className="text-xs text-gray-500">Create & review GST invoices</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </Link>

          <Link
            to="/employee/payments"
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-amber-50/50 hover:border-amber-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Payment Receipts</div>
                <div className="text-xs text-gray-500">Record incoming customer payments</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </Link>

          <Link
            to="/employee/reports"
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Accounting Reports</div>
                <div className="text-xs text-gray-500">Sales registers & ageing summaries</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
