import React from 'react';
import { Badge } from '../ui/Badge';
import { DELIVERY_STATUS_LABELS } from '../../utils/constants';
import type { DeliveryStatus } from '../../types';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
}

const statusColors: Record<DeliveryStatus, 'yellow' | 'blue' | 'indigo' | 'purple' | 'green' | 'red' | 'gray'> = {
  pending: 'yellow',
  assigned: 'blue',
  picked_up: 'indigo',
  in_transit: 'purple',
  delivered: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({ status }) => {
  return (
    <Badge color={statusColors[status]} dot>
      {DELIVERY_STATUS_LABELS[status]}
    </Badge>
  );
};
