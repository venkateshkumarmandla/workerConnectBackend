# Swagger API Documentation

## 📚 Access Swagger UI

### Local Development
```
http://localhost:3001/api-docs
```

### Production (Render)
```
https://workerconnectbackend.onrender.com/api-docs
```

## 📄 OpenAPI JSON Specification

### Local Development
```
http://localhost:3001/api-docs.json
```

### Production (Render)
```
https://workerconnectbackend.onrender.com/api-docs.json
```

## 🎯 Quick Links

- **Swagger UI (Interactive)**: `/api-docs`
- **OpenAPI JSON**: `/api-docs.json`
- **Health Check**: `/health`
- **API Root**: `/`

## 📋 What's Documented

The Swagger documentation includes:

### 1. **Health Endpoints**
- `GET /health` - Health check

### 2. **SAML Authentication**
- `GET /saml/login` - Initiate SAML authentication
- `POST /saml/acs` - SAML callback (ACS)
- `POST /saml/logout` - SAML logout
- `GET /metadata` - Service Provider metadata XML
- `POST /card-scan` - Card reader scan endpoint
- `GET /saml/status` - Check authentication status

### 3. **Worker Endpoints**
- `POST /api/worker/register` - Register new worker
- `POST /api/worker/login` - Worker login
- `GET /api/worker/profile/{workerId}` - Get worker profile

### 4. **Establishment Endpoints**
- `POST /api/establishment/register` - Register establishment
- `POST /api/establishment/login` - Establishment login
- `GET /api/establishment/dashboard/carddetails` - Dashboard stats
- `GET /api/establishment/workerdetails` - Get workers by establishment
- `POST /api/establishment/persistworkerdetailsbyestablishment` - Add worker to establishment
- `GET /api/establishment/availableaadhaarcarddetails` - Get available workers

### 5. **Department Endpoints**
- `POST /api/department/register` - Register department user
- `POST /api/department/login` - Department login
- `GET /api/department/dashboard/carddetails` - Dashboard stats
- `GET /api/department/establishments` - Get all establishments
- `GET /api/department/workers` - Get all workers
- `GET /api/department/compliance` - Get compliance records
- `GET /api/department/applications` - Get applications for review
- `GET /api/department/documents` - Get documents for verification
- `GET /api/department/locations` - Get active locations

### 6. **Attendance Endpoints**
- `POST /api/attendance/checkinorout` - Check-in or check-out worker
- `GET /api/attendance/worker/{workerId}` - Get worker attendance
- `GET /api/attendance/establishment/{establishmentId}` - Get establishment attendance
- `GET /api/attendance/current` - Get currently checked-in workers

### 7. **Location & Master Data**
- `GET /api/location/states` - Get all states
- `GET /api/location/districts` - Get districts by state
- `GET /api/location/cities` - Get cities by district
- `GET /api/location/villages` - Get villages by city
- `GET /api/establishmentcategory/details` - Get establishment categories
- `GET /api/establishmentworknature/details` - Get work natures by category

## 🔐 Authentication

The Swagger UI supports two authentication methods:

### 1. JWT Bearer Token
- Click the **Authorize** button in Swagger UI
- Select `bearerAuth`
- Enter your JWT token (obtained from login endpoints)
- Format: `Bearer <your-token>`

### 2. SAML Authentication
- SAML authentication is handled via browser redirects
- Use `/saml/login` to initiate authentication
- Session cookie is automatically set after successful authentication

## 🧪 Testing in Swagger UI

1. **Open Swagger UI**: Navigate to `/api-docs`
2. **Try an endpoint**: Click on any endpoint to expand it
3. **Click "Try it out"**: This enables interactive testing
4. **Fill in parameters**: Enter required request body or parameters
5. **Execute**: Click "Execute" to send the request
6. **View response**: See the response, status code, and headers

## 📝 Example: Testing Worker Login

1. Go to `/api-docs`
2. Find `POST /api/worker/login`
3. Click "Try it out"
4. Enter request body:
   ```json
   {
     "mobileNumber": "9876543210",
     "password": "Worker@123"
   }
   ```
5. Click "Execute"
6. Copy the JWT token from the response
7. Click "Authorize" button at the top
8. Paste token in `bearerAuth` field
9. Now you can test protected endpoints

## 🔗 Integration with Other Tools

### Postman
1. Import the OpenAPI spec: `/api-docs.json`
2. Postman will generate a collection with all endpoints
3. Set up environment variables for base URL

### Insomnia
1. Import the OpenAPI spec: `/api-docs.json`
2. All endpoints will be available in Insomnia

### Code Generation
Use the OpenAPI spec to generate client SDKs:
- **OpenAPI Generator**: https://openapi-generator.tech
- **Swagger Codegen**: https://swagger.io/tools/swagger-codegen/

## 📊 API Information

- **API Title**: WorkerConnect Backend API
- **Version**: 1.0.0
- **OpenAPI Version**: 3.0.0
- **Base URLs**:
  - Local: `http://localhost:3001`
  - Production: `https://workerconnectbackend.onrender.com`

## 🛠️ Customization

The Swagger configuration is in:
- **Config**: `src/config/swagger.js`
- **Route Documentation**: Swagger comments in route files (`src/routes/*.js`)

To add documentation to a new endpoint, add Swagger comments:

```javascript
/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     summary: Endpoint description
 *     tags: [Tag Name]
 *     responses:
 *       200:
 *         description: Success
 */
```

## 📚 Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)

## 🚀 Quick Start

1. Start the server: `npm start`
2. Open browser: `http://localhost:3001/api-docs`
3. Explore and test the API!

---

**Note**: The Swagger UI is available in both development and production environments.


