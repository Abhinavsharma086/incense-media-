import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import {
  Facebook,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Radio,
  ExternalLink,
  ShieldCheck,
  X,
  Key,
  Globe,
  Info,
  Copy,
} from 'lucide-react';

interface MetaPage {
  id: string;
  pageId: string;
  pageName: string;
  category?: string;
  isSubscribed: boolean;
  formsCount: number;
}

interface MetaAccount {
  id: string;
  facebookUserId: string;
  name: string;
  email?: string;
  tokenExpiresAt: string;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  pages: MetaPage[];
}

export const MetaSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Connect Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'token' | 'oauth'>('token');
  const [manualToken, setManualToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [oauthConfig, setOauthConfig] = useState<{ isConfigured: boolean; url: string; appId: string; redirectUri: string } | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/meta/accounts');
      setAccounts(res.data);
    } catch (err: any) {
      toast.error('Failed to load Meta accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchOauthConfig = async () => {
    try {
      const res = await crmApi.get('/meta/auth/url');
      setOauthConfig(res.data);
    } catch (err: any) {
      console.error('Failed to fetch OAuth config', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchOauthConfig();

    // Check if OAuth code is returned in query string
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleOAuthCodeExchange(code);
    }
  }, []);

  const handleOAuthCodeExchange = async (tokenOrCode: string) => {
    if (!tokenOrCode.trim()) {
      toast.error('Please enter a valid Facebook Access Token or OAuth Code');
      return;
    }
    setConnecting(true);
    setTokenError(null);
    try {
      const res = await crmApi.post('/meta/auth/callback', { shortLivedToken: tokenOrCode.trim() });
      toast.success(res.data.message || 'Facebook account connected successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsModalOpen(false);
      setManualToken('');
      setTokenError(null);
      fetchAccounts();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to connect Meta account. Please verify token.';
      setTokenError(msg);
      toast.error(msg, { duration: 6000 });
    } finally {
      setConnecting(false);
    }
  };

  const handleOpenConnectModal = () => {
    setTokenError(null);
    setIsModalOpen(true);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await crmApi.post('/meta/sync');
      toast.success(res.data.message || 'Leads synced successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to sync Meta leads');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (window.confirm('Are you sure you want to disconnect this Meta account?')) {
      try {
        await crmApi.delete(`/meta/accounts/${id}`);
        setAccounts((prev) => prev.filter((acc) => acc.id !== id));
        toast.success('Meta account disconnected successfully');
      } catch (err: any) {
        toast.error('Failed to disconnect account');
      }
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Facebook className="w-7 h-7 text-blue-600" /> Meta Lead Ads Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect Facebook & Instagram Lead Ads to automatically fetch and sync leads into your CRM in real time.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncNow}
            disabled={syncing || accounts.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing Meta Leads...' : 'Sync Now'}</span>
          </button>
          <button
            onClick={handleOpenConnectModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Facebook className="w-4 h-4 fill-white" />
            <span>Connect with Facebook</span>
          </button>
        </div>
      </div>

      {/* Auto-Sync & Webhook Status Alert */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <span>Realtime Webhook & 15-Min Auto-Sync Active</span>
              <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" /> LIVE
              </span>
            </div>
            <div className="text-xs text-blue-800 mt-0.5">
              Meta Graph API v21.0 Leadgen webhooks receive new leads instantly. Auto-sync runs every 15 minutes.
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts List */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="mx-auto w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Fetching connected Meta accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Facebook className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Meta Accounts Connected</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Connect your Facebook business account or enter an Access Token to automatically import leads from Facebook and Instagram Lead Ads campaigns.
          </p>
          <button
            onClick={handleOpenConnectModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all inline-flex items-center gap-2"
          >
            <Facebook className="w-4 h-4 fill-white" /> Connect Facebook Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Account Header Bar */}
              <div className="p-5 bg-gray-50/60 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {acc.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>{acc.name}</span>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Connected
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      User ID: {acc.facebookUserId} {acc.email && `• ${acc.email}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Token Expiry Warning Alert */}
                  {acc.isExpiringSoon ? (
                    <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Token Expires in {acc.daysUntilExpiry} days!</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Expires in {acc.daysUntilExpiry} days</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>

              {/* Pages Grid */}
              <div className="p-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Connected Facebook Pages ({acc.pages.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acc.pages.map((page) => (
                    <div
                      key={page.id}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{page.pageName}</div>
                            <div className="text-xs text-gray-500">Page ID: {page.pageId}</div>
                          </div>
                        </div>

                        {page.isSubscribed && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Webhook Active
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          {page.formsCount} Lead Form(s)
                        </span>
                        <a
                          href={`https://facebook.com/${page.pageId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
                        >
                          View Page <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONNECT FACEBOOK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">
                  <Facebook className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Connect Facebook Lead Ads</h3>
                  <p className="text-xs text-blue-100">Select connection method to sync Meta Lead Ads</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('token')}
                className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  activeTab === 'token'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Key className="w-4 h-4" /> Direct Access Token (Instant)
              </button>
              <button
                onClick={() => setActiveTab('oauth')}
                className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  activeTab === 'oauth'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Globe className="w-4 h-4" /> Facebook OAuth Dialog
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'token' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Fastest & Most Reliable Connection Method!</span>
                      <p className="text-blue-800 mt-1">
                        Generate a User or Page Access Token from Facebook's Graph Explorer or Developer Console and paste it below.
                      </p>
                    </div>
                  </div>

                  {tokenError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-red-900">Token Verification Error</div>
                        <div className="mt-0.5 leading-relaxed">{tokenError}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Meta Access Token (User or Page Token)
                    </label>
                    <textarea
                      rows={3}
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste your EAAG... Facebook Access Token here"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all outline-none"
                    />
                  </div>

                  {/* Step-by-step Helper */}
                  <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2 text-xs">
                    <div className="font-bold text-gray-800 flex items-center justify-between">
                      <span>How to get your Facebook Access Token:</span>
                      <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Open Graph Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 pl-1">
                      <li>Open Meta Graph API Explorer.</li>
                      <li>Select your Meta App and click <strong>Generate Access Token</strong>.</li>
                      <li>Grant <code>leads_retrieval</code> and <code>pages_show_list</code> permissions.</li>
                      <li>Copy the generated token string and paste it in the box above.</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => handleOAuthCodeExchange(manualToken)}
                    disabled={connecting || !manualToken.trim()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Token & Fetching Pages...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Connect Account Now</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {oauthConfig?.isConfigured ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Meta App ID configured: <strong>{oauthConfig.appId}</strong></span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Clicking below will open Facebook's official OAuth login screen. Grant permissions to connect your Facebook account automatically.
                      </p>
                      <button
                        onClick={() => {
                          if (oauthConfig.url) window.location.href = oauthConfig.url;
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Facebook className="w-4 h-4 fill-white" />
                        <span>Open Facebook Login Screen</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Meta App Credentials Not Configured</span>
                          <p className="text-amber-800 mt-1">
                            OAuth redirect requires a registered Facebook App ID (<code>META_APP_ID</code>) in backend <code>.env</code> file.
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs text-gray-700 space-y-2">
                        <p className="font-bold text-gray-900">Recommended Next Step:</p>
                        <p>
                          Use the <strong>Direct Access Token</strong> tab above! It works instantly without needing a full Meta App configuration.
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('token')}
                        className="w-full py-2.5 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        <span>Switch to Direct Access Token Input</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaSettings;
