import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

export const formatCurrency = (amount: number): string => {
  return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: he });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: he });
  } catch {
    return dateStr;
  }
};

export const formatTimeAgo = (dateStr: string): string => {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: he });
  } catch {
    return dateStr;
  }
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}מ'`;
  return `${km.toFixed(1)} ק"מ`;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'yellow',
    assigned: 'blue',
    picked_up: 'indigo',
    in_transit: 'purple',
    delivered: 'green',
    failed: 'red',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
};

export const truncate = (str: string, maxLen: number): string => {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
};

export const generateTrackingNumber = (): string => {
  return `ASH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};
