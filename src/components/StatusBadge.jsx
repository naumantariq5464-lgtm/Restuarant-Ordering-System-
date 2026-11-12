import React from 'react';
import { Clock, ChefHat, CheckCircle2, XCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const getBadgeConfig = () => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { label: 'Confirmed', icon: Clock, className: 'confirmed' };
      case 'cooking':
        return { label: 'Cooking', icon: ChefHat, className: 'cooking' };
      case 'delivered':
        return { label: 'Delivered', icon: CheckCircle2, className: 'delivered' };
      case 'cancelled':
        return { label: 'Cancelled', icon: XCircle, className: 'cancelled' };
      default:
        return { label: status, icon: Clock, className: 'confirmed' };
    }
  };

  const { label, icon: Icon, className } = getBadgeConfig();

  return (
    <span className={`status-badge ${className}`}>
      <Icon size={13} />
      <span>{label}</span>
    </span>
  );
}
