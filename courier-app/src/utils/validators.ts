// ============================================================
// VALIDATORS - אשדוד-שליח Courier App
// ============================================================

/**
 * Validate Israeli phone number
 */
export function isValidIsraeliPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Israeli mobile: 05X-XXXXXXX
  return /^(05[0-9]|972-?5[0-9])\d{7}$/.test(cleaned);
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('הסיסמה חייבת להכיל לפחות 8 תווים');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('הסיסמה חייבת להכיל אות גדולה אחת לפחות');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('הסיסמה חייבת להכיל ספרה אחת לפחות');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Israeli ID number (Teudat Zehut)
 */
export function isValidIsraeliId(id: string): boolean {
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleaned[i]) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Validate vehicle plate (Israeli format)
 */
export function isValidVehiclePlate(plate: string): boolean {
  const cleaned = plate.replace(/[\s\-]/g, '').toUpperCase();
  // Israeli plates: 7-8 digits or old format with letters
  return /^[0-9]{7,8}$/.test(cleaned) || /^[0-9]{2,3}[A-Z]{2,3}[0-9]{2,3}$/.test(cleaned);
}

/**
 * Validate that a string is not empty
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validate minimum length
 */
export function minLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

/**
 * Validate maximum length
 */
export function maxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

/**
 * Validate name (Hebrew or English letters, spaces, hyphens)
 */
export function isValidName(name: string): boolean {
  return /^[\u0590-\u05FFa-zA-Z\s\-']{2,50}$/.test(name.trim());
}

/**
 * Get field validation error messages
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateLoginForm(phone: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isNotEmpty(phone)) {
    errors.phone = 'נדרש מספר טלפון';
  } else if (!isValidIsraeliPhone(phone)) {
    errors.phone = 'מספר טלפון לא תקין';
  }

  if (!isNotEmpty(password)) {
    errors.password = 'נדרשת סיסמה';
  } else if (password.length < 6) {
    errors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
  }

  return errors;
}

export function validateRegisterForm(
  name: string,
  phone: string,
  email: string,
  password: string,
  confirmPassword: string
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isNotEmpty(name)) {
    errors.name = 'נדרש שם';
  } else if (!isValidName(name)) {
    errors.name = 'שם לא תקין';
  }

  if (!isNotEmpty(phone)) {
    errors.phone = 'נדרש מספר טלפון';
  } else if (!isValidIsraeliPhone(phone)) {
    errors.phone = 'מספר טלפון לא תקין';
  }

  if (email && !isValidEmail(email)) {
    errors.email = 'כתובת אימייל לא תקינה';
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors[0];
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'הסיסמאות אינן תואמות';
  }

  return errors;
}
