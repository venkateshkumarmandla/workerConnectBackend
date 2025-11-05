import { errorResponse, ERROR_CODES } from '../utils/response.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle Supabase/PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(400).json(
          errorResponse(
            ERROR_CODES.DUPLICATE_ENTRY,
            'A record with this information already exists',
            err.constraint || 'database',
            [err.detail]
          )
        );
      
      case '23503': // Foreign key violation
        return res.status(400).json(
          errorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Referenced record does not exist',
            err.constraint || 'database',
            [err.detail]
          )
        );
      
      case '23502': // Not null violation
        return res.status(400).json(
          errorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Required field is missing',
            err.column || 'database',
            [err.detail]
          )
        );
      
      default:
        return res.status(500).json(
          errorResponse(
            ERROR_CODES.DATABASE_ERROR,
            'Database operation failed',
            'database',
            [err.message]
          )
        );
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      errorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'Invalid authentication token',
        'authorization'
      )
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      errorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'Authentication token has expired',
        'authorization'
      )
    );
  }

  // Default error
  res.status(err.statusCode || 500).json(
    errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      err.message || 'An unexpected error occurred',
      'server',
      err.details || []
    )
  );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json(
    errorResponse(
      ERROR_CODES.NOT_FOUND,
      `Route ${req.method} ${req.path} not found`,
      'route'
    )
  );
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

