const crypto = require('crypto');

// Base62 characters for encoding
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Generate Base62 encoded string
const generateBase62 = (num) => {
  if (num === 0) return BASE62[0];
  
  let result = '';
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
};

// Generate short code using MD5 hash
const generateShortCode = (url, salt = '') => {
  const hash = crypto.createHash('md5').update(url + salt).digest('hex');
  const num = parseInt(hash.substring(0, 8), 16);
  let base62Code = generateBase62(num);
  
  // Ensure exactly 6 characters by padding with leading zeros if needed
  while (base62Code.length < 6) {
    base62Code = BASE62[0] + base62Code;
  }
  
  return base62Code.substring(0, 6);
};

// Generate unique short code with collision handling
const generateUniqueCode = async (url, checkExists) => {
  let shortCode = generateShortCode(url);
  let attempts = 0;
  
  // Check for collisions and regenerate if needed
  while (await checkExists(shortCode) && attempts < 10) {
    const salt = Math.random().toString(36).substring(2, 8);
    shortCode = generateShortCode(url, salt);
    attempts++;
  }
  
  if (attempts >= 10) {
    // Fallback to timestamp-based code - ensure 6 characters
    let timestampCode = generateBase62(Date.now());
    while (timestampCode.length < 6) {
      timestampCode = BASE62[0] + timestampCode;
    }
    shortCode = timestampCode.substring(0, 6);
  }
  
  return shortCode;
};

module.exports = { generateUniqueCode };