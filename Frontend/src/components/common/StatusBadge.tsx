import React from 'react';
import { getStatusColor } from '../../utils/formatters';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const safeStatus = status || 'unknown';
  const colorClass = getStatusColor(safeStatus);

  let displayText = safeStatus.replace(/_/g, ' ').toUpperCase();
  if (safeStatus === 'repair_in_progress_handovered') {
    displayText = 'REPAIR IN PROGRESS(Handovered)';
  }

  return (
    <span className={`badge ${colorClass} ${className}`}>
      {displayText}
    </span>
  );
};

export default StatusBadge;
