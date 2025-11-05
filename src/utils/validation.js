/**
 * Input validation utilities
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateMobileNumber = (mobile) => {
  // Indian mobile numbers: 10 digits
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(String(mobile));
};

export const validateAadhaar = (aadhaar) => {
  // Aadhaar: 12 digits
  const aadhaarRegex = /^\d{12}$/;
  return aadhaarRegex.test(String(aadhaar));
};

export const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  return password && password.length >= 8;
};

export const validatePincode = (pincode) => {
  // Indian pincode: 6 digits
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(String(pincode));
};

export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove any HTML tags and trim whitespace
  return input.replace(/<[^>]*>/g, '').trim();
};

export const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  }
  return missing;
};

