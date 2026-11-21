import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Key, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecurityConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  title: string;
  description: string;
  actionText?: string;
  variant?: 'danger' | 'warning';
}

export const SecurityConfirmationModal: React.FC<SecurityConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionText = 'Confirm & Execute',
  variant = 'danger',
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Super Admin password is required for confirmation.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Authentication failed. Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Header pattern accent */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${variant === 'danger' ? 'bg-red-600' : 'bg-amber-500'}`} />
        
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            variant === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              Re-enter Super Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Super Admin password"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-slate-300 hover:bg-slate-800 text-xs px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`text-xs px-5 py-2 font-semibold shadow-md ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Verifying...
                </>
              ) : (
                actionText
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
