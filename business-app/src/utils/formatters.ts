import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { DeliveryStatus, PackageType, DeliveryZone } from '../types';

export const formatCurrency = (amount: number): string => {
  return `₪${amount.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `היום ${format(date, 'HH:mm')}`;
    }
    if (isYesterday(date)) {
      return `אתמול ${format(date, 'HH:mm')}`;
    }
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: he });
  } catch {
    return dateString;
  }
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} דקות`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} שעות`;
  }
  return `${hours} שעות ו-${remainingMinutes} דקות`;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatWeight = (weight?: number): string => {
  if (!weight) return 'לא צוין';
  if (weight < 1) return `${(weight * 1000).toFixed(0)} גרם`;
  return `${weight.toFixed(1)} ק"ג`;
};

export const getStatusLabel = (status: DeliveryStatus): string => {
  const labels: Record<DeliveryStatus, string> = {
    pending: 'ממתין',
    searching_courier: 'מחפש שליח',
    courier_accepted: 'שליח אישר',
    picked_up: 'נאסף',
    in_transit: 'בדרך',
    delivered: 'נמסר',
    cancelled: 'בוטל',
    failed: 'נכשל',
  };
  return labels[status] || status;
};

export const getPackageTypeLabel = (type: PackageType): string => {
  const labels: Record<PackageType, string> = {
    regular: 'רגיל',
    express: 'אקספרס',
    fragile: 'שביר',
    vip: 'VIP',
  };
  return labels[type] || type;
};

export const getZoneLabel = (zone: DeliveryZone): string => {
  const labels: Record<DeliveryZone, string> = {
    ashdod_north: 'אשדוד צפון',
    ashdod_south: 'אשדוד דרום',
    ashdod_center: 'אשדוד מרכז',
    nearby_cities: 'ערים סמוכות',
  };
  return labels[zone] || zone;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const formatTimeAgo = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    return `לפני ${diffDays} ימים`;
  } catch {
    return '';
  }
};
