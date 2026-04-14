export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidIsraeliPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  const israeliMobileRegex = /^(05[0-9])\d{7}$/;
  const israeliLandlineRegex = /^(0[2-9])\d{7}$/;
  return israeliMobileRegex.test(cleaned) || israeliLandlineRegex.test(cleaned);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isValidAddress = (address: string): boolean => {
  return address.trim().length >= 5;
};

export const isValidBusinessName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const isValidWeight = (weight: number): boolean => {
  return weight > 0 && weight <= 50;
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
};

export const validateDeliveryForm = (data: {
  pickupAddress: string;
  deliveryAddress: string;
  packageType: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!isValidAddress(data.pickupAddress)) {
    errors.pickupAddress = 'נא להזין כתובת איסוף תקינה';
  }

  if (!isValidAddress(data.deliveryAddress)) {
    errors.deliveryAddress = 'נא להזין כתובת משלוח תקינה';
  }

  if (!data.packageType) {
    errors.packageType = 'נא לבחור סוג חבילה';
  }

  return errors;
};
