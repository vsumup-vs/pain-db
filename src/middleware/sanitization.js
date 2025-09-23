const xss = require('xss');
const validator = require('validator');

// Sanitize request data
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Sanitize individual values
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    // Remove XSS attempts
    value = xss(value, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // Escape special characters
    value = validator.escape(value);
    
    // Trim whitespace
    value = value.trim();
  }
  
  return value;
};

module.exports = {
  sanitizeInput
};