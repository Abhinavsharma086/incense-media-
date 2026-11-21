import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Upload,
  Globe,
  Mail,
  Lock,
  Bell,
  Boxes,
  Receipt,
  UserCheck,
  Shield,
  Zap,
  KeyRound,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  CreditCard,
} from 'lucide-react';
import AdminItems from './accounting/AdminItems';
import AdminAccountingSettings from './accounting/AdminAccountingSettings';
import { getCurrentUser } from '@/lib/auth';
import { fetchGlobalSettingsApi, updateGlobalSettingsApi, GlobalSettingItem } from '@/api/superAdminApi';
import { instance } from '@/api/axiosInstance';
import { useDataSync, notifyDataChanged } from '@/lib/useDataSync';
import { toast } from 'sonner';

export const AdminSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const currentUser = getCurrentUser();

  const currentName = typeof currentUser?.name === 'string' ? currentUser.name : '';
  const nameParts = currentName.trim().split(/\s+/).filter(Boolean);

  // Profile Control State
  const [profileData, setProfileData] = useState({
    firstName: nameParts[0] || 'Admin',
    lastName: nameParts.slice(1).join(' ') || 'User',
    email: currentUser?.email || 'admin@incensemedia.in',
    phone: (currentUser as any)?.phone || '9549404000',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Global Settings State
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({
    site_name: 'Incense Media Command Portal',
    support_email: 'info@incensemedia.in',
    support_phone: '9549404000',
    maintenance_mode: 'false',
    payment_gateway_mode: 'live',
    currency_symbol: '₹',
    default_gst_rate: '18',
    smtp_host: 'smtp.incensemedia.in',
    smtp_port: '587',
    email_notifications_enabled: 'true',
    auto_sync_meta_leads: 'true',
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const loadGlobalSettings = React.useCallback(async () => {
    try {
      setGlobalLoading(true);
      const res: GlobalSettingItem[] = await fetchGlobalSettingsApi();
      const map: Record<string, string> = { ...globalSettings };
      if (Array.isArray(res)) {
        for (const item of res) {
          map[item.key] = item.value;
        }
      }
      setGlobalSettings(map);
    } catch (err) {
      // Fallback silently if offline or restricted
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalSettings();
  }, [loadGlobalSettings]);

  // Multi-browser and cross-tab synchronization for Settings
  useDataSync('settings', loadGlobalSettings);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Profile Update Handler
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await instance.put('/api/auth/profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        currentPassword: profileData.currentPassword || undefined,
        newPassword: profileData.newPassword || undefined,
      });

      // Update stored user details
      const existingUser = getCurrentUser() || {};
      const updatedUser = {
        ...existingUser,
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        phone: profileData.phone,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      notifyDataChanged('user_profile', 'update', updatedUser);

      toast.success(res.data.message || 'Profile updated successfully!');
      setProfileData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile details');
    } finally {
      setProfileSaving(false);
    }
  };

  // Global Settings Save Handler
  const handleGlobalSave = async () => {
    try {
      setGlobalSaving(true);
      await updateGlobalSettingsApi(globalSettings);
      notifyDataChanged('settings', 'update', globalSettings);
      toast.success('Global System Settings updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update settings');
    } finally {
      setGlobalSaving(false);
    }
  };

  const handleToggleSetting = (key: string) => {
    setGlobalSettings((prev) => {
      const current = prev[key] === 'true';
      return { ...prev, [key]: (!current).toString() };
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profile Control', icon: UserCheck },
    { id: 'global', label: 'Global System & Flags', icon: Zap },
    { id: 'items', label: 'Items & Products Catalog', icon: Boxes },
    { id: 'accounting', label: 'Accounting & BUSY ERP', icon: Receipt },
    { id: 'general', label: 'Site Metadata', icon: Globe },
    { id: 'email', label: 'Email & SMTP', icon: Mail },
    { id: 'security', label: 'Security & Access', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6 font-sans pb-12 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Admin Panel Settings & Profile Control
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your personal admin profile, security credentials, item catalog, BUSY ERP integration, and system feature flags.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="border-b border-gray-200 bg-gray-50/50 overflow-x-auto">
          <nav className="flex space-x-2 p-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* TAB 1: PROFILE CONTROL & ACCOUNT PREFERENCES */}
          {activeTab === 'profile' && (
            <div className="space-y-8 max-w-4xl">
              {/* Account Overview Header Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center border-2 border-indigo-400 shadow-inner">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        `${(profileData.firstName && profileData.firstName[0]) || 'A'}${(profileData.lastName && profileData.lastName[0]) || 'U'}`
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">
                        {profileData.firstName} {profileData.lastName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200 mt-0.5">{profileData.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300">
                      <span className="flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10">
                        <Shield className="w-3 h-3 text-indigo-300" /> Role: {currentUser?.role || 'Admin'}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarPreview(URL.createObjectURL(file));
                        toast.success('Profile photo updated in session');
                      }
                    }}
                  />
                </label>
              </div>

              {/* Personal Information & Password Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 uppercase tracking-wider">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        disabled
                        value={profileData.email}
                        className="w-full p-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl text-xs font-semibold cursor-not-allowed"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Email address is locked to your admin account.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Reset Section */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    Security & Change Password
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        placeholder="At least 6 chars"
                        minLength={6}
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        minLength={6}
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {profileSaving ? 'Updating Profile...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: GLOBAL SYSTEM SETTINGS & FEATURE FLAGS */}
          {activeTab === 'global' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider">Global System & Feature Control</h2>
                  <p className="text-xs text-gray-500">Super Admin system settings, payment modes, and operational feature flags.</p>
                </div>
                <button
                  onClick={handleGlobalSave}
                  disabled={globalSaving}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md"
                >
                  {globalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {globalSaving ? 'Saving...' : 'Save Global Flags'}
                </button>
              </div>

              {globalLoading ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" /> Loading System Settings...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Site Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Site Title / App Name</label>
                      <input
                        type="text"
                        value={globalSettings.site_name || ''}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, site_name: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Support Email</label>
                      <input
                        type="email"
                        value={globalSettings.support_email || ''}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, support_email: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment & Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Payment Gateway Mode</label>
                      <select
                        value={globalSettings.payment_gateway_mode || 'live'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, payment_gateway_mode: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                      >
                        <option value="live">LIVE Production Gateway</option>
                        <option value="test">TEST Sandbox Gateway</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Currency Symbol</label>
                      <input
                        type="text"
                        value={globalSettings.currency_symbol || '₹'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, currency_symbol: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Default GST Rate (%)</label>
                      <input
                        type="number"
                        value={globalSettings.default_gst_rate || '18'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, default_gst_rate: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Operational Toggles */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-4 bg-amber-50/60 rounded-2xl border border-amber-200">
                      <div>
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" /> System Maintenance Mode
                        </div>
                        <div className="text-[11px] text-amber-700 mt-0.5">
                          When enabled, non-Super Admin users cannot log in.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSetting('maintenance_mode')}
                        className={`transition-all ${globalSettings.maintenance_mode === 'true' ? 'text-amber-600' : 'text-gray-400'}`}
                      >
                        {globalSettings.maintenance_mode === 'true' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <div>
                        <div className="text-xs font-bold text-gray-900">Meta Lead Ads Background Auto-Sync</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Automatically run 15-minute background cron syncing Meta Facebook leadgen ads.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSetting('auto_sync_meta_leads')}
                        className={`transition-all ${globalSettings.auto_sync_meta_leads === 'true' ? 'text-indigo-600' : 'text-gray-400'}`}
                      >
                        {globalSettings.auto_sync_meta_leads === 'true' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Dedicated Items Management */}
          {activeTab === 'items' && <AdminItems />}

          {/* TAB 4: Dedicated Accounting & BUSY Settings */}
          {activeTab === 'accounting' && <AdminAccountingSettings />}

          {/* TAB 5: General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6 w-full">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider">General Site & Company Info</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Site / Organization Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Incense Media"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Site URL
                  </label>
                  <input
                    type="url"
                    defaultValue="https://incensemedia.in"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Site Description
                </label>
                <textarea
                  rows={3}
                  defaultValue="Leading Trade Media Organization specializing in B2B events, magazines, and incense industry content."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md">
                  <Save className="w-4 h-4" /> Save General Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: Email & SMTP Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6 w-full">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider">Email & SMTP Server Configuration</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    defaultValue="smtp.incensemedia.in"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    placeholder="587"
                    defaultValue="587"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    SMTP Username / Sender Email
                  </label>
                  <input
                    type="email"
                    defaultValue="info@incensemedia.in"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    SMTP Password / App Secret
                  </label>
                  <input
                    type="password"
                    defaultValue="••••••••••••"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md">
                  <Save className="w-4 h-4" /> Save SMTP Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6 w-full">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider">Security & Access Policy</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Two-Factor Authentication (2FA)</h3>
                    <p className="text-xs text-gray-500">Enforce 2FA verification for admin & accounting users</p>
                  </div>
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                    Enabled
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Idle Session Timeout</h3>
                    <p className="text-xs text-gray-500">Automatically end session after inactivity</p>
                  </div>
                  <select className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>2 hours</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-4xl">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider">Notification Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Invoice Creation Alerts</h3>
                    <p className="text-xs text-gray-500">Send instant notification when a new tax invoice is generated</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">BUSY ERP Sync Alerts</h3>
                    <p className="text-xs text-gray-500">Notify admins when BUSY sync fails or succeeds</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-600" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;