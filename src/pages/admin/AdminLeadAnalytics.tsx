import React, { useState, useEffect } from 'react';
import crmApi from '@/api/crmApi';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  Target,
  DollarSign,
  PieChart as PieIcon,
  Clock,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdminLeadAnalytics: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/leads/dashboard');
      setStats(res.data);
    } catch (err: any) {
      toast.error('Failed to load lead analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Mon', leads: 24, converted: 6 },
    { name: 'Tue', leads: 38, converted: 12 },
    { name: 'Wed', leads: 42, converted: 15 },
    { name: 'Thu', leads: 30, converted: 9 },
    { name: 'Fri', leads: 55, converted: 18 },
    { name: 'Sat', leads: 20, converted: 5 },
    { name: 'Sun', leads: 15, converted: 3 },
  ];

  const sourceData = [
    { name: 'Meta Ads', value: 65, color: '#1877F2' },
    { name: 'Website Form', value: 20, color: '#10B981' },
    { name: 'Manual Walk-in', value: 10, color: '#F59E0B' },
    { name: 'CSV Import', value: 5, color: '#6366F1' },
  ];

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primaryRed" /> Lead Conversion Analytics & Performance
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Detailed metrics on lead acquisition, source ROI, conversion funnel, and team response speeds.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Leads</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats?.totalLeads || 224}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +18.4% from last week
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Conversion Rate</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">28.5%</p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">64 Converted Leads</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Source ROI</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">Meta Ads</p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">65% of Total Volume</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Response Time</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">14 Mins</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Speed-to-Call Optimized</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-gray-200 shadow-xs bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-900">
              Weekly Lead Volume & Conversion Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="converted" fill="#10b981" name="Converted" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs bg-white flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Lead Source Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
              {sourceData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="font-medium text-gray-700">{s.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLeadAnalytics;
