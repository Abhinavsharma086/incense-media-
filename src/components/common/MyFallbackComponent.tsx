import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface MyFallbackComponentProps {
  error?: Error;
}

const MyFallbackComponent: React.FC<MyFallbackComponentProps> = ({ error }) => {
  const handleHardRefresh = () => {
    try {
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('_t', Date.now().toString());
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <AlertTriangle className="w-7 h-7" />
        </div>
        
        <h1 className="text-xl font-extrabold text-gray-900 mb-1">
          Something went wrong
        </h1>
        <p className="text-xs text-gray-500 mb-4">
          An unexpected error occurred while rendering this page.
        </p>

        {error && (
          <div className="text-left bg-slate-50 p-3.5 rounded-xl border border-gray-200 text-xs mb-4">
            <div className="font-bold text-gray-700 mb-1 flex items-center justify-between">
              <span>Error details</span>
              <span className="text-[10px] text-gray-400 font-mono">React ErrorBoundary</span>
            </div>
            <pre className="text-rose-700 font-mono overflow-auto max-h-36 whitespace-pre-wrap text-[11px] leading-relaxed">
              {error.message || 'Unknown error'}
            </pre>
            {error.stack && (
              <details className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                <summary className="cursor-pointer font-semibold text-gray-600">View Stack Trace</summary>
                <pre className="mt-1 overflow-auto max-h-28 whitespace-pre-wrap text-[9px] font-mono text-gray-600">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleHardRefresh}
            className="w-full bg-primaryRed hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Page (Clear Cache)</span>
          </button>
          
          <button
            onClick={() => { window.location.href = '/employee/dashboard'; }}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyFallbackComponent;
