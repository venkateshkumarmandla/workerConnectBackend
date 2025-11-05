# WorkerConnect Backend API

Node.js + Express backend for WorkerConnect Labour Management System, connected to Supabase PostgreSQL.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Get your Supabase credentials from:
- Supabase Dashboard → Settings → API

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anonymous/public key
- `SUPABASE_SERVICE_KEY` - Service role key (has admin access)
- `JWT_SECRET` - Secret key for JWT token signing

### 3. Run Database Migrations

Go to your Supabase project and run the SQL scripts from `../scripts/supabase/`:
1. 01-create-tables.sql
2. 02-seed-master-data.sql
3. 03-indexes.sql
4. 04-row-level-security.sql

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 5. Start Production Server

```bash
npm start
```

## API Endpoints

### Authentication

#### Worker
- `POST /api/worker/register` - Register new worker
- `POST /api/worker/login` - Worker login

#### Establishment
- `POST /api/establishment/register` - Register new establishment
- `POST /api/establishment/login` - Establishment login

#### Department
- `POST /api/department/login` - Department user login

### Worker Management

- `GET /api/establishment/workerdetails?establishmentId={id}` - Get workers by establishment
- `POST /api/establishment/persistworkerdetailsbyestablishment` - Add worker to establishment
- `GET /api/establishment/availableaadhaarcarddetails` - Get available workers for assignment

### Attendance

- `POST /api/worker/checkinorout` - Check-in or check-out worker

### Dashboard

- `GET /api/establishment/dashboard/carddetails?establishmentId={id}` - Establishment dashboard stats
- `GET /api/department/dashboard/carddetails` - Department dashboard stats

### Master Data

- `GET /api/establishmentcategory/details` - Get establishment categories
- `GET /api/establishmentworknature/details?categoryId={id}` - Get work natures by category
- `GET /api/location/states` - Get all states
- `GET /api/location/districts?stateId={id}` - Get districts by state
- `GET /api/location/cities?districtId={id}` - Get cities/mandals by district
- `GET /api/location/villages?cityId={id}` - Get villages/areas by city

## API Response Format

All API responses follow this standard format:

```json
{
  "correlationId": "uuid-v4",
  "data": { /* response data */ },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "target": "field_name",
    "details": []
  }
}
```

### Success Response Example

```json
{
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": {
    "workerId": 123,
    "firstName": "John",
    "lastName": "Doe",
    "mobileNumber": 9876543210
  },
  "error": null
}
```

### Error Response Example

```json
{
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mobile number already exists",
    "target": "mobileNumber",
    "details": []
  }
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Login Flow

1. User logs in with credentials
2. Server validates and returns JWT token
3. Client stores token (localStorage/sessionStorage)
4. Client includes token in subsequent requests

### Protected Routes

Protected routes require the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

### Railway

1. Connect your GitHub repository
2. Add environment variables
3. Railway will auto-deploy on push

### Other Platforms

The app can be deployed to any Node.js hosting platform:
- Heroku
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Google Cloud Run

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client setup
│   ├── controllers/
│   │   ├── workerController.js  # Worker business logic
│   │   ├── establishmentController.js
│   │   ├── departmentController.js
│   │   ├── attendanceController.js
│   │   └── locationController.js
│   ├── routes/
│   │   ├── worker.js             # Worker routes
│   │   ├── establishment.js      # Establishment routes
│   │   ├── department.js         # Department routes
│   │   ├── attendance.js         # Attendance routes
│   │   └── location.js           # Location/master data routes
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── errorHandler.js       # Error handling
│   ├── utils/
│   │   ├── response.js           # Response formatter
│   │   └── validation.js         # Input validation
│   └── server.js                 # Main Express app
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Development

### Adding New Endpoints

1. Create controller function in `src/controllers/`
2. Add route in `src/routes/`
3. Register route in `src/server.js`
4. Test with Postman/Thunder Client

### Database Queries

Use Supabase client for all database operations:

```javascript
import { supabase } from '../config/supabase.js';

// Select
const { data, error } = await supabase
  .from('worker')
  .select('*')
  .eq('worker_id', 123);

// Insert
const { data, error } = await supabase
  .from('worker')
  .insert({ firstName: 'John', lastName: 'Doe' });

// Update
const { data, error } = await supabase
  .from('worker')
  .update({ status: 'inactive' })
  .eq('worker_id', 123);

// Delete
const { data, error } = await supabase
  .from('worker')
  .delete()
  .eq('worker_id', 123);
```

## Troubleshooting

### Cannot connect to database
- Check Supabase credentials in `.env`
- Verify project is not paused in Supabase dashboard
- Check internet connection

### Authentication errors
- Verify JWT_SECRET is set
- Check token expiration
- Ensure Authorization header is included

### CORS errors
- Update FRONTEND_URL in `.env`
- Check CORS configuration in `server.js`

## Support

For issues or questions:
- Check the migration plan: `../supabase-postgresql-migration.plan.md`
- Review Supabase documentation: https://supabase.com/docs
- Contact the development team

# workerConnectBackend
