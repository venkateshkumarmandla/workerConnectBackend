import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API response formatter
 * Matches the existing backend's response format
 */

export const successResponse = (data, correlationId = null) => {
  return {
    correlationId: correlationId || uuidv4(),
    data: data,
    error: null
  };
};

export const errorResponse = (code, message, target = null, details = [], correlationId = null) => {
  return {
    correlationId: correlationId || uuidv4(),
    data: null,
    error: {
      code: code,
      message: message,
      target: target,
      details: details
    }
  };
};

// Common error responses
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

