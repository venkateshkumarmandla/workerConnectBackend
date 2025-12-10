/**
 * Swagger/OpenAPI Documentation Definitions
 * 
 * This file contains comprehensive Swagger documentation for all API endpoints.
 * These definitions are referenced in the route files using @swagger comments.
 */

export const swaggerPaths = {
  // Worker endpoints
  '/api/worker/register': {
    post: {
      summary: 'Register a new worker',
      description: 'Creates a new worker account with personal and address information',
      tags: ['Worker'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['aadhaarNumber', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'mobileNumber', 'password'],
              properties: {
                aadhaarNumber: { type: 'string', pattern: '^[0-9]{12}$', example: '123456789012' },
                firstName: { type: 'string', example: 'John' },
                middleName: { type: 'string', example: 'Kumar' },
                lastName: { type: 'string', example: 'Doe' },
                gender: { type: 'string', enum: ['male', 'female', 'other'] },
                dateOfBirth: { type: 'string', format: 'date', example: '1990-01-15' },
                age: { type: 'integer', example: 34 },
                relativeName: { type: 'string', example: 'Father Name' },
                caste: { type: 'string', example: 'OBC' },
                mobileNumber: { type: 'string', pattern: '^[0-9]{10}$', example: '9876543210' },
                password: { type: 'string', format: 'password', example: 'Worker@123' },
                perStateId: { type: 'integer', example: 1 },
                perDistrictId: { type: 'integer', example: 10 },
                perCityId: { type: 'integer', example: 1 },
                perPincode: { type: 'integer', example: 500003 },
                isSameAsPerAddr: { type: 'boolean', example: true }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Worker registered successfully' },
        400: { description: 'Validation error' }
      }
    }
  }
};


