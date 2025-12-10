/**
 * Swagger/OpenAPI Configuration
 * 
 * This file contains the Swagger configuration and API documentation
 * for the WorkerConnect Backend API.
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WorkerConnect Backend API',
      version: '1.0.0',
      description: `
# WorkerConnect Backend API Documentation

A comprehensive REST API for the WorkerConnect Labour Management System with SAML authentication support.

## Features
- Worker, Establishment, and Department management
- Attendance tracking with check-in/check-out
- Location and master data management
- SAML 2.0 authentication with SafeNet Trusted Access
- Card-based authentication integration

## Base URL
- **Local Development**: http://localhost:3001
- **Production (Render)**: https://workerconnectbackend.onrender.com

## Authentication
The API supports two authentication methods:
1. **JWT Token Authentication** - For standard API endpoints
2. **SAML Authentication** - For SSO integration with SafeNet Trusted Access

## Response Format
All API responses follow a standard format:
\`\`\`json
{
  "correlationId": "uuid-v4",
  "data": { /* response data */ },
  "error": null
}
\`\`\`
      `,
      contact: {
        name: 'WorkerConnect Team',
        email: 'support@workerconnect.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local Development Server'
      },
      {
        url: 'https://workerconnectbackend.onrender.com',
        description: 'Production Server (Render)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoints'
        },
        samlAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'saml.sid',
          description: 'SAML session cookie (set after SAML authentication)'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            correlationId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique correlation ID for the request'
            },
            data: {
              type: 'object',
              nullable: true
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'AUTHENTICATION_ERROR',
                    'AUTHORIZATION_ERROR',
                    'NOT_FOUND',
                    'DUPLICATE_ENTRY',
                    'DATABASE_ERROR',
                    'INTERNAL_ERROR'
                  ]
                },
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                target: {
                  type: 'string',
                  description: 'Field or resource that caused the error'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            correlationId: {
              type: 'string',
              format: 'uuid'
            },
            data: {
              type: 'object'
            },
            error: {
              type: 'null'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and status endpoints'
      },
      {
        name: 'SAML Authentication',
        description: 'SAML 2.0 authentication endpoints for SafeNet Trusted Access integration'
      },
      {
        name: 'Worker',
        description: 'Worker registration, login, and profile management'
      },
      {
        name: 'Establishment',
        description: 'Establishment registration, login, and management'
      },
      {
        name: 'Department',
        description: 'Department user authentication and management'
      },
      {
        name: 'Attendance',
        description: 'Worker attendance tracking and check-in/check-out'
      },
      {
        name: 'Location',
        description: 'Location and master data endpoints (states, districts, cities, villages)'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/server.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;


