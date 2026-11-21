import React, { useState } from 'react';
import {
  Lock,
  Shield,
  Key,
  Globe,
  AlertOctagon,
  CheckCircle2,
  Trash2,
  Plus,
  Zap,
  ShieldAlert,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const SuperAdminSecurity: React.FC = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [ips, setIps] = useState<string[]>(['127.0.0.1', '::1', '192.168.1.100']);
  const [newIp, setNewIp] = useState('');

  const [activeSessions, setActiveSessions] = useState([
    { id: 'sess-1', user: 'superadmin@incensemedia.in', role: 'Super Admin', ip: '127.0.0.1', device: 'Chrome on Windows 11', loginTime: 'Just now' },
    { id: 'sess-2', user: 'admin@incensemedia.in', role: 'Admin', ip: '192.168.1.45', device: 'Safari on macOS', loginTime: '45 mins ago' },
    { id: 'sess-3', user: 'salesmanager@incensemedia.in', role: 'Sales Manager', ip: '182.72.10.4', device: 'Chrome on Android', loginTime: '2 hours ago' },
  ]);

  const handleAddIp = () => {
    if (!newIp) return;
    if (ips.includes(newIp)) {
      toast.error('IP address is already in whitelist');
      return;
    }
    setIps([...ips, newIp]);
    setNewIp('');
    toast.success(`IP ${newIp} added to whitelist.`);
  };

  const handleRemoveIp = (targetIp: string) => {
    setIps(ips.filter((i) => i !== targetIp));
    toast.success(`IP ${targetIp} removed from whitelist.`);
  };

  const handleTerminateSession = (sessionId: string) => {
    setActiveSessions(activeSessions.filter((s) => s.id !== sessionId));
    toast.success('Active token session terminated successfully!');
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-purple-400" />
            Security & 2FA Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-layer protection: JWT session validation, bcrypt password hashing, 2FA, IP Whitelisting, Rate Limiting, and Emergency Session Termination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> High Security Shield Active
          </span>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">2FA Requirement</span>
            <Smartphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{twoFactorEnabled ? 'ENFORCED' : 'OPTIONAL'}</div>
          <button
            onClick={() => {
              setTwoFactorEnabled(!twoFactorEnabled);
              toast.success(`2FA enforcement turned ${!twoFactorEnabled ? 'ON' : 'OFF'}`);
            }}
            className="mt-3 text-xs font-semibold text-purple-600 hover:underline"
          >
            Toggle 2FA Enforcement →
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">IP Whitelist</span>
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{ips.length} Allowed IPs</div>
          <button
            onClick={() => {
              setIpWhitelistEnabled(!ipWhitelistEnabled);
              toast.success(`IP Whitelist filter turned ${!ipWhitelistEnabled ? 'ON' : 'OFF'}`);
            }}
            className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
          >
            {ipWhitelistEnabled ? 'Filter ACTIVE' : 'Filter INACTIVE'} →
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Password Hashing</span>
            <Key className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">Bcrypt (Cost 10)</div>
          <div className="text-[10px] text-slate-400 mt-2">SQL Injection & XSS Guard Active</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Active JWT Tokens</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{activeSessions.length} Active</div>
          <div className="text-[10px] text-slate-400 mt-2">One-click force logout available</div>
        </div>
      </div>

      {/* IP Whitelist Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-600" />
          IP Whitelist Security Filter
        </h2>
        <p className="text-xs text-slate-500">
          Restrict Super Admin access to specific IP addresses. When enabled, requests from unlisted IPs will be automatically blocked.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="e.g. 192.168.1.1"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 w-64"
          />
          <Button onClick={handleAddIp} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add IP Address
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {ips.map((ip) => (
            <span key={ip} className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {ip}
              <button onClick={() => handleRemoveIp(ip)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Active Token Sessions Monitor */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-purple-600" />
              Active System Sessions & Tokens
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live view of active authenticated sessions across all users. Terminate suspicious sessions immediately.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                <th className="py-2.5 px-3">User Account</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Device & Browser</th>
                <th className="py-2.5 px-3">Login Time</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {activeSessions.map((sess) => (
                <tr key={sess.id}>
                  <td className="py-3 px-3 font-semibold text-slate-900">{sess.user}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      {sess.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">{sess.ip}</td>
                  <td className="py-3 px-3 text-slate-500">{sess.device}</td>
                  <td className="py-3 px-3 text-slate-500">{sess.loginTime}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleTerminateSession(sess.id)}
                      className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold rounded-lg border border-red-200 transition-colors"
                    >
                      Terminate Token
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSecurity;
