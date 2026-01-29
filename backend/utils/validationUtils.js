// Base62 characters for validation
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Validate short code format
const validateShortCode = (code) => {
  // Check length (should be 6 characters)
  if (!code || code.length !== 6) {
    return false;
  }
  
  // Check if all characters are Base62
  for (let char of code) {
    if (!BASE62_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
};

module.exports = {
  validateShortCode
};