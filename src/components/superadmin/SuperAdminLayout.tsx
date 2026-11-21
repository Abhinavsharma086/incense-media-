import React, { useState, useEffect } from 'react';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminHeader from './SuperAdminHeader';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleClose = () => {
    setIsCollapsed(true);
  };

  return (
    <div className="flex bg-[#F5F2EB] font-sans h-screen overflow-hidden text-slate-900 relative">
      {/* Mobile backdrop overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={handleToggle} onClose={handleClose} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden ml-0 bg-[#F5F2EB]">
        <SuperAdminHeader onToggleSidebar={handleToggle} isCollapsed={isCollapsed} />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 min-h-0 bg-[#F5F2EB]">
          <div className="mx-auto max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
