import React from 'react';
import SharedHeader from '@/shared/components/SharedHeader';

interface EmployeeHeaderProps {
  onToggleSidebar: () => void;
  isCollapsed?: boolean;
}

const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({ onToggleSidebar, isCollapsed = false }) => {
  return (
    <SharedHeader
      role="Employee"
      title="Employee Portal"
      onToggleSidebar={onToggleSidebar}
      isCollapsed={isCollapsed}
    />
  );
};

export default EmployeeHeader;

