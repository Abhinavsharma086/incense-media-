import React from 'react';
import LeadImportExcelModal from '../common/LeadImportExcelModal';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

const LeadImportModal: React.FC<LeadImportModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
  return (
    <LeadImportExcelModal
      isOpen={isOpen}
      onClose={onClose}
      onImportSuccess={onImportSuccess}
      role="admin"
    />
  );
};

export default LeadImportModal;
