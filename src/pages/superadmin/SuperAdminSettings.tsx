import React, { useEffect, useState } from 'react';
import {
  Settings,
  Globe,
  CreditCard,
  Mail,
  Zap,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchGlobalSettingsApi, updateGlobalSettingsApi, GlobalSettingItem } from '@/api/superAdminApi';
import { toast } from 'sonner';

export const SuperAdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'site' | 'payment' | 'email' | 'flags' | 'security'>('site');

  const [settings, setSettings] = useState<Record<string, string>>({
    site_name: 'Incense Media Command Portal',
    support_email: 'info@incensemedia.in',
    support_phone: '9549404000',
    maintenance_mode: 'false',
    payment_gateway_mode: 'live',
    currency_symbol: '₹',
    default_gst_rate: '18',
    smtp_host: 'smtp.incensemedia.in',
    email_notifications_enabled: 'true',
    auto_sync_meta_leads: 'true',
    max_failed_login_attempts: '5',
    session_timeout_hours: '24',
    two_factor_required_super_admin: 'false',
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res: GlobalSettingItem[] = await fetchGlobalSettingsApi();
      const map: Record<string, string> = { ...settings };
      if (Array.isArray(res)) {
        for (const item of res) {
          map[item.key] = item.value;
        }
      }
      setSettings(map);
    } catch (err) {
      toast.error('Failed to load global settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleToggle = (key: string) => {
    setSettings((prev) => {
      const currentBool = prev[key] === 'true';
      return { ...prev, [key]: (!currentBool).toString() };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateGlobalSettingsApi(settings);
      toast.success('Global settings updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-600" />
            Global Settings & Feature Flags
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure system-wide settings, payment gateway mode, email integration, feature flags, and maintenance mode.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Global Settings'}
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl p-1 gap-1">
        {[
          { id: 'site', label: 'Site & Support Config', icon: Globe },
          { id: 'payment', label: 'Payment Settings', icon: CreditCard },
          { id: 'email', label: 'Email & SMTP', icon: Mail },
          { id: 'flags', label: 'Feature Flags', icon: Zap },
          { id: 'security', label: 'Security & Limits', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Box */}
      <div className="bg-white rounded-b-2xl border border-slate-200 p-6 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" /> Loading configuration...
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* SITE CONFIG */}
            {activeTab === 'site' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Application Site & Support Metadata</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application Title / Site Name</label>
                  <input
                    type="text"
                    value={settings.site_name || ''}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email Address</label>
                    <input
                      type="email"
                      value={settings.support_email || ''}
                      onChange={(e) => handleChange('support_email', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Support Helpline Phone</label>
                    <input
                      type="text"
                      value={settings.support_phone || ''}
                      onChange={(e) => handleChange('support_phone', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENT SETTINGS */}
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Payment Gateway & Financial Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Gateway Mode</label>
                    <select
                      value={settings.payment_gateway_mode || 'live'}
                      onChange={(e) => handleChange('payment_gateway_mode', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500 font-semibold"
                    >
                      <option value="live">LIVE Production Gateway</option>
                      <option value="test">TEST / Sandbox Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={settings.currency_symbol || '₹'}
                      onChange={(e) => handleChange('currency_symbol', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default GST Rate (%)</label>
                  <input
                    type="number"
                    value={settings.default_gst_rate || '18'}
                    onChange={(e) => handleChange('default_gst_rate', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* EMAIL & SMTP */}
            {activeTab === 'email' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Email Notifications & SMTP Server</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Hostname</label>
                  <input
                    type="text"
                    value={settings.smtp_host || ''}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Automated Email Alerts</div>
                    <div className="text-[11px] text-slate-400">Send system alert emails on lead assignment and login notifications.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('email_notifications_enabled')}
                    className={`text-2xl transition-all ${settings.email_notifications_enabled === 'true' ? 'text-purple-600' : 'text-slate-400'}`}
                  >
                    {settings.email_notifications_enabled === 'true' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>
            )}

            {/* FEATURE FLAGS */}
            {activeTab === 'flags' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Dynamic Feature Flags</h3>

                <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div>
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" /> Maintenance Mode
                    </div>
                    <div className="text-[11px] text-amber-700">When enabled, non-Super Admin users cannot log in.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('maintenance_mode')}
                    className={`transition-all ${settings.maintenance_mode === 'true' ? 'text-amber-600' : 'text-slate-400'}`}
                  >
                    {settings.maintenance_mode === 'true' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Meta Lead Ads Auto-Sync</div>
                    <div className="text-[11px] text-slate-400">Run background cron auto-syncing Meta Facebook leadgen ads every 15 mins.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('auto_sync_meta_leads')}
                    className={`transition-all ${settings.auto_sync_meta_leads === 'true' ? 'text-purple-600' : 'text-slate-400'}`}
                  >
                    {settings.auto_sync_meta_leads === 'true' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>
            )}

            {/* SECURITY & LIMITS */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Security Rules & Rate Limits</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Failed Login Attempts</label>
                    <input
                      type="number"
                      value={settings.max_failed_login_attempts || '5'}
                      onChange={(e) => handleChange('max_failed_login_attempts', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Session Timeout (Hours)</label>
                    <input
                      type="number"
                      value={settings.session_timeout_hours || '24'}
                      onChange={(e) => handleChange('session_timeout_hours', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Enforce 2FA for Super Admin</div>
                    <div className="text-[11px] text-slate-400">Require two-factor authentication for Super Admin accounts.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('two_factor_required_super_admin')}
                    className={`transition-all ${settings.two_factor_required_super_admin === 'true' ? 'text-purple-600' : 'text-slate-400'}`}
                  >
                    {settings.two_factor_required_super_admin === 'true' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminSettings;
