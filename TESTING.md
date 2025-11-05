# API Testing Guide

## Quick Start Testing

Use these curl commands or import into Postman/Thunder Client to test all endpoints.

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Master Data Endpoints

### Get States

```bash
curl http://localhost:3001/api/location/states
```

### Get Districts (Andhra Pradesh)

```bash
curl http://localhost:3001/api/location/districts?stateId=1
```

### Get Cities (Visakhapatnam District)

```bash
curl "http://localhost:3001/api/location/cities?districtId=10"
```

### Get Establishment Categories

```bash
curl http://localhost:3001/api/establishmentcategory/details
```

### Get Work Natures by Category

```bash
curl "http://localhost:3001/api/establishmentworknature/details?categoryId=1"
```

---

## Worker Endpoints

### Register Worker

```bash
curl -X POST http://localhost:3001/api/worker/register \
  -H "Content-Type: application/json" \
  -d '{
    "aadhaarNumber": "123456789012",
    "firstName": "John",
    "middleName": "Kumar",
    "lastName": "Doe",
    "gender": "male",
    "dateOfBirth": "1990-01-15",
    "age": 34,
    "relativeName": "Father Name",
    "caste": "OBC",
    "mobileNumber": "9876543210",
    "password": "Worker@123",
    "perStateId": 1,
    "perDistrictId": 10,
    "perCityId": 1,
    "perPincode": 500003,
    "isSameAsPerAddr": true
  }'
```

### Worker Login

```bash
curl -X POST http://localhost:3001/api/worker/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210",
    "password": "Worker@123"
  }'
```

**Save the token from response for authenticated requests!**

### Get Worker Profile (Requires Authentication)

```bash
curl http://localhost:3001/api/worker/profile/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Establishment Endpoints

### Register Establishment

```bash
curl -X POST http://localhost:3001/api/establishment/register \
  -H "Content-Type: application/json" \
  -d '{
    "establishmentName": "ABC Construction Ltd",
    "contactPerson": "Rajesh Kumar",
    "mobileNumber": "9876543211",
    "emailId": "contact@abcconstruction.com",
    "password": "Estab@123",
    "doorNumber": "12-34",
    "street": "MG Road",
    "stateId": 1,
    "stateCode": "AP",
    "districtId": 10,
    "districtCode": "VSP",
    "districtName": "Visakhapatnam",
    "cityId": 1,
    "cityCode": "VSP-URB",
    "cityName": "Visakhapatnam Urban",
    "pincode": 530001,
    "categoryId": 3,
    "workNatureId": 9,
    "commencementDate": "2024-01-01",
    "completionDate": "2025-12-31",
    "constructionEstimatedCost": 5000000,
    "noOfMaleWorkers": 20,
    "noOfFemaleWorkers": 5
  }'
```

### Establishment Login

```bash
curl -X POST http://localhost:3001/api/establishment/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543211",
    "password": "Estab@123"
  }'
```

**Save the token from response!**

### Get Dashboard Card Details

```bash
curl "http://localhost:3001/api/establishment/dashboard/carddetails?establishmentId=1"
```

### Get Workers by Establishment

```bash
curl "http://localhost:3001/api/establishment/workerdetails?establishmentId=1"
```

### Get Available Workers

```bash
curl http://localhost:3001/api/establishment/availableaadhaarcarddetails \
  -H "Authorization: Bearer YOUR_ESTABLISHMENT_TOKEN"
```

### Add Worker to Establishment

```bash
curl -X POST http://localhost:3001/api/establishment/persistworkerdetailsbyestablishment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ESTABLISHMENT_TOKEN" \
  -d '{
    "establishmentId": 1,
    "workerId": 1,
    "aadhaarCardNumber": "123456789012",
    "workingFromDate": "2024-01-01",
    "workingToDate": "2024-12-31",
    "status": "active"
  }'
```

---

## Department Endpoints

### Department Login

```bash
curl -X POST http://localhost:3001/api/department/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "admin@workerconnect.gov.in",
    "password": "Admin@123"
  }'
```

**Note**: You need to create a department user first or use the seeded admin account.

### Get Department Dashboard

```bash
curl http://localhost:3001/api/department/dashboard/carddetails \
  -H "Authorization: Bearer YOUR_DEPT_TOKEN"
```

### Get All Establishments (Department View)

```bash
curl http://localhost:3001/api/department/establishments \
  -H "Authorization: Bearer YOUR_DEPT_TOKEN"
```

### Get All Workers (Department View)

```bash
curl http://localhost:3001/api/department/workers \
  -H "Authorization: Bearer YOUR_DEPT_TOKEN"
```

---

## Attendance Endpoints

### Check-In

```bash
curl -X POST http://localhost:3001/api/attendance/checkinorout \
  -H "Content-Type: application/json" \
  -d '{
    "attendanceId": 0,
    "establishmentId": 1,
    "workerId": 1,
    "estmtWorkerId": 1,
    "workLocation": "Construction Site - Block A",
    "status": "i"
  }'
```

**Save the attendanceId from response for check-out!**

### Check-Out

```bash
curl -X POST http://localhost:3001/api/attendance/checkinorout \
  -H "Content-Type: application/json" \
  -d '{
    "attendanceId": 1,
    "establishmentId": 1,
    "workerId": 1,
    "estmtWorkerId": 1,
    "workLocation": "Construction Site - Block A",
    "status": "o"
  }'
```

### Get Worker Attendance History

```bash
curl http://localhost:3001/api/attendance/worker/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Establishment Attendance

```bash
curl http://localhost:3001/api/attendance/establishment/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Currently Checked-In Workers

```bash
curl "http://localhost:3001/api/attendance/current?establishmentId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Postman Collection

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "WorkerConnect API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/health"
      }
    },
    {
      "name": "Worker Register",
      "request": {
        "method": "POST",
        "url": "http://localhost:3001/api/worker/register",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"aadhaarNumber\":\"123456789012\",\"firstName\":\"John\",\"lastName\":\"Doe\",\"gender\":\"male\",\"dateOfBirth\":\"1990-01-15\",\"mobileNumber\":\"9876543210\",\"password\":\"Worker@123\"}"
        }
      }
    },
    {
      "name": "Worker Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:3001/api/worker/login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"mobileNumber\":\"9876543210\",\"password\":\"Worker@123\"}"
        }
      }
    }
  ]
}
```

---

## Testing Checklist

### ✅ Basic Functionality
- [ ] Health check returns "healthy"
- [ ] Get states returns Andhra Pradesh
- [ ] Get districts returns 13 districts
- [ ] Get categories returns 6 categories

### ✅ Worker Flow
- [ ] Register new worker succeeds
- [ ] Login with worker credentials succeeds
- [ ] Get worker profile returns correct data
- [ ] Duplicate registration fails with error

### ✅ Establishment Flow
- [ ] Register new establishment succeeds
- [ ] Login with establishment credentials succeeds
- [ ] Dashboard shows zero workers initially
- [ ] Add worker to establishment succeeds
- [ ] Dashboard shows updated worker count

### ✅ Attendance Flow
- [ ] Worker check-in succeeds
- [ ] Worker check-out succeeds
- [ ] Cannot check-in twice without check-out
- [ ] Attendance history shows records

### ✅ Authentication
- [ ] Endpoints with auth return 401 without token
- [ ] Endpoints with auth work with valid token
- [ ] Expired token returns 403

### ✅ Error Handling
- [ ] Missing required fields returns validation error
- [ ] Invalid mobile number returns error
- [ ] Invalid Aadhaar returns error
- [ ] Database errors return proper error response

---

## Database Verification

Run these queries in Supabase SQL Editor:

### Check Worker Registration

```sql
SELECT * FROM worker ORDER BY created_at DESC LIMIT 5;
```

### Check Establishment Registration

```sql
SELECT * FROM establishment ORDER BY created_at DESC LIMIT 5;
```

### Check Attendance Records

```sql
SELECT 
    a.*,
    w.full_name as worker_name,
    e.establishment_name
FROM attendance a
JOIN worker w ON a.worker_id = w.worker_id
JOIN establishment e ON a.establishment_id = e.establishment_id
ORDER BY a.check_in_date_time DESC
LIMIT 10;
```

### Check Active Workers at Establishments

```sql
SELECT 
    e.establishment_name,
    COUNT(ew.estmt_worker_id) as total_workers
FROM establishment e
LEFT JOIN establishment_worker ew ON e.establishment_id = ew.establishment_id 
    AND ew.status = 'active'
GROUP BY e.establishment_id, e.establishment_name;
```

---

## Common Issues

### 400 Bad Request
- Check request body format
- Verify all required fields are provided
- Validate data types (numbers as numbers, not strings)

### 401 Unauthorized
- Check Authorization header is included
- Verify token format: `Bearer YOUR_TOKEN`
- Token might be expired (default: 7 days)

### 404 Not Found
- Verify endpoint URL is correct
- Check if backend is running on port 3001

### 500 Internal Server Error
- Check backend console for error details
- Verify database connection
- Check Supabase credentials in .env

---

## Performance Testing

Test with multiple concurrent requests:

```bash
# Install apache bench
sudo apt-get install apache2-utils

# Test 100 requests with 10 concurrent
ab -n 100 -c 10 http://localhost:3001/health
```

---

## Happy Testing! 🎉

For more information, see:
- `../MIGRATION_GUIDE.md` - Complete setup guide
- `README.md` - Backend documentation
- `../scripts/supabase/README.md` - Database documentation

