import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Globe,
  Download,
  CheckCircle2,
  ExternalLink,
  Copy,
  Info,
  Layers,
  Settings,
} from 'lucide-react';
import { toast } from '../ui/sonner';
import {
  getWhatsAppPreferredMode,
  setWhatsAppPreferredMode,
  WhatsAppMode,
  formatWhatsAppPhone,
} from '../../lib/whatsapp';

interface WhatsAppModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone?: string;
  leadName?: string;
  onModeChanged?: (newMode: WhatsAppMode) => void;
}

export const WhatsAppModeModal: React.FC<WhatsAppModeModalProps> = ({
  isOpen,
  onClose,
  phone,
  leadName,
  onModeChanged,
}) => {
  const [currentMode, setCurrentMode] = useState<WhatsAppMode>(getWhatsAppPreferredMode());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSelectMode = (mode: WhatsAppMode) => {
    setCurrentMode(mode);
    setWhatsAppPreferredMode(mode);
    if (onModeChanged) onModeChanged(mode);
    toast.success(
      mode === 'hub'
        ? 'Single-Window WhatsApp Hub selected (Recommended)!'
        : mode === 'app'
        ? 'WhatsApp Desktop App mode selected (Single Running Window)!'
        : 'WhatsApp Web mode selected!'
    );
  };

  const handleCopyContact = () => {
    const cleanPhone = formatWhatsAppPhone(phone);
    if (!cleanPhone) return;
    const text = `+${cleanPhone}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`Copied contact +${cleanPhone} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-gray-900 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                WhatsApp Chat Settings
              </h3>
              <p className="text-xs text-gray-500">
                Choose how WhatsApp chats open from the CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lead Context info */}
        {phone && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500">Target Contact: </span>
              <strong className="text-gray-800">
                {leadName ? `${leadName} ` : ''}(+{formatWhatsAppPhone(phone)})
              </strong>
            </div>
            <button
              onClick={handleCopyContact}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md font-medium text-[11px] transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? 'Copied' : 'Copy Number'}
            </button>
          </div>
        )}

        {/* Mode Options */}
        <div className="space-y-3">
          {/* Option 1: WhatsApp Single-Window Hub (Recommended) */}
          <div
            onClick={() => handleSelectMode('hub')}
            className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all ${
              currentMode === 'hub'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    currentMode === 'hub'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      WhatsApp Single-Window Hub
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recommended &bull; 1-Window
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    All CRM leads open and update in <strong>one single persistent tab</strong>. Clicking any lead in CRM switches this single window without opening multiple tabs!
                  </p>
                </div>
              </div>
              <div className="shrink-0 mt-1">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    currentMode === 'hub'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {currentMode === 'hub' && <CheckCircle2 className="w-3 h-3 stroke-3" />}
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: WhatsApp Desktop App */}
          <div
            onClick={() => handleSelectMode('app')}
            className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all ${
              currentMode === 'app'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    currentMode === 'app'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      WhatsApp Desktop App
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Windows App
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    Directly opens or focuses your <strong>running WhatsApp Desktop app</strong> on Windows. Zero browser tabs opened.
                  </p>
                </div>
              </div>
              <div className="shrink-0 mt-1">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    currentMode === 'app'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {currentMode === 'app' && <CheckCircle2 className="w-3 h-3 stroke-3" />}
                </div>
              </div>
            </div>
          </div>

          {/* Option 3: Direct WhatsApp Web */}
          <div
            onClick={() => handleSelectMode('web')}
            className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all ${
              currentMode === 'web'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    currentMode === 'web'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      Direct WhatsApp Web (web.whatsapp.com)
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    Opens WhatsApp Web directly. Note: Chrome may open separate tabs for each lead unless using the Extension below.
                  </p>
                </div>
              </div>
              <div className="shrink-0 mt-1">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    currentMode === 'web'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {currentMode === 'web' && <CheckCircle2 className="w-3 h-3 stroke-3" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Extension helper callout for Chrome users */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 space-y-2 text-xs text-amber-900">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-amber-800">
              <Layers className="w-4 h-4 text-amber-600 shrink-0" />
              Chrome Single-Tab Helper Extension
            </span>
            <a
              href="/downloads/crm-whatsapp-extension.zip"
              download="crm-whatsapp-extension.zip"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors shrink-0"
              onClick={() => toast.success('Downloaded extension zip! Follow instructions below.')}
            >
              <Download className="w-3 h-3" />
              Download (.zip)
            </a>
          </div>
          <p className="text-[11px] text-amber-800/90 leading-relaxed">
            Agar aap WhatsApp Web use karte hain aur chahte hain ki Chrome har baar naya tab na khole, to sirf 1 baar hamara lightweight extension load kar lein. Har lead automatically existing tab me redirect hogi!
          </p>
          <div className="text-[10px] text-amber-700/80 bg-amber-100/50 p-2 rounded-lg font-mono leading-relaxed">
            1. Zip unzip karein &rarr; 2. Chrome me <code>chrome://extensions</code> kholein &rarr; 3. Developer Mode ON karke &ldquo;Load unpacked&rdquo; karein.
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Done & Save Preference
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModeModal;
