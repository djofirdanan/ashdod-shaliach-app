// ============================================================
// FORMATTERS - אשדוד-שליח Courier App
// ============================================================

/**
 * Format currency amount in ILS (₪)
 */
export function formatCurrency(amount: number, currency = 'ILS'): string {
  if (currency === 'ILS') {
    return `₪${amount.toFixed(2)}`;
  }
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format distance
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} מ'`;
  }
  return `${km.toFixed(1)} ק"מ`;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} דק'`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours} ש'`;
  }
  return `${hours} ש' ${mins} דק'`;
}

/**
 * Format a date to a locale Hebrew string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a date to show only the time
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for relative display (today, yesterday, etc.)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דק'`;
  if (diffHour < 24) return `לפני ${diffHour} ש'`;
  if (diffDay === 1) return 'אתמול';
  if (diffDay < 7) return `לפני ${diffDay} ימים`;
  return formatDate(dateString);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format delivery type to Hebrew
 */
export function formatDeliveryType(type: string): string {
  const map: Record<string, string> = {
    food: 'אוכל',
    package: 'חבילה',
    document: 'מסמך',
    grocery: 'מכולת',
    pharmacy: 'תרופות',
    other: 'אחר',
  };
  return map[type] || type;
}

/**
 * Format delivery status to Hebrew
 */
export function formatDeliveryStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'ממתין',
    accepted: 'התקבל',
    going_to_pickup: 'בדרך לאיסוף',
    at_pickup: 'באיסוף',
    picked_up: 'נאסף',
    going_to_delivery: 'בדרך למסירה',
    at_delivery: 'במסירה',
    delivered: 'נמסר',
    cancelled: 'בוטל',
    failed: 'נכשל',
  };
  return map[status] || status;
}

/**
 * Format vehicle type to Hebrew
 */
export function formatVehicleType(type: string): string {
  const map: Record<string, string> = {
    bicycle: 'אופניים',
    motorcycle: 'אופנוע',
    car: 'רכב',
    electric_scooter: 'קורקינט חשמלי',
    walking: 'הליכה',
  };
  return map[type] || type;
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string): string {
  return `#${orderNumber}`;
}

/**
 * Truncate text to a max length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Format countdown timer seconds to MM:SS
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a number with + prefix for positive values
 */
export function formatSignedNumber(value: number): string {
  if (value > 0) return `+${value}`;
  return value.toString();
}
