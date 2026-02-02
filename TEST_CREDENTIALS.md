# Test Credentials and Sample Data Reference

## 🔐 Login Credentials

> **Note**: All passwords are hashed with bcrypt. The plain text password for all accounts is: `password123`

---

## 👤 Department Users (Admin Level)

### User 1: Rajesh Kumar
- **Email**: `rajesh.kumar@apdept.gov.in`
- **Password**: `password123`
- **Mobile**: `9876543210`
- **Role**: Department Admin
- **Use Case**: Department-level monitoring and management

### User 2: Priya Sharma
- **Email**: `priya.sharma@apdept.gov.in`
- **Password**: `password123`
- **Mobile**: `9876543211`
- **Role**: Department Manager
- **Use Case**: Department-level reporting

---

## 🏢 Establishment Accounts

### Establishment 1: Sunrise Construction Pvt Ltd
- **Email**: `contact@sunriseconstruction.com`
- **Password**: `password123`
- **Mobile**: `9876543220`
- **Contact Person**: Venkatesh Reddy
- **Location**: Hyderabad, Telangana
- **Workers**: 7 workers assigned
- **Departments**: Construction Site A, Electrical, Plumbing
- **Use Case**: Test department-wise attendance dashboard

**Test Scenarios**:
- View department statistics at `/establishment/departments`
- Click "Construction Site A" to see 3 workers
- Click "Electrical" to see 1 worker
- Click "Plumbing" to see 1 worker
- Worker 5 (Krishna Prasad) is currently checked in (incomplete status)

---

### Establishment 2: Tech Manufacturing Industries
- **Email**: `info@techmfg.com`
- **Password**: `password123`
- **Mobile**: `9876543221`
- **Contact Person**: Lakshmi Devi
- **Location**: KPHB Industrial Estate, Hyderabad
- **Workers**: 5 workers assigned
- **Departments**: Assembly Line, Quality Control
- **Use Case**: Test manufacturing shift attendance

**Test Scenarios**:
- View department statistics
- Different shift timings (7 AM - 3:30 PM)
- Quality control department tracking

---

### Establishment 3: Digital Solutions Ltd
- **Email**: `hr@digitalsolutions.com`
- **Password**: `password123`
- **Mobile**: `9876543222`
- **Contact Person**: Ramesh Babu
- **Location**: Hitech City, Hyderabad
- **Workers**: 3 workers assigned
- **Departments**: Development, Testing
- **Use Case**: Test IT company flexible hours

**Test Scenarios**:
- Flexible work hours (9:30 AM - 6 PM)
- Remote work locations
- Development and Testing teams

---

## 👷 Worker Accounts

### Construction Workers (Establishment 1)

#### Worker 1: Ravi Kumar
- **Mobile**: `9876543230`
- **Password**: `password123`
- **Email**: `ravi.kumar@worker.com`
- **Card ID**: `CARD001`
- **Department**: Construction Site A
- **Attendance**: Excellent (17 days present in January)
- **Use Case**: Test worker with perfect attendance

#### Worker 2: Sita Devi
- **Mobile**: `9876543231`
- **Password**: `password123`
- **Email**: `sita.devi@worker.com`
- **Card ID**: `CARD002`
- **Department**: Construction Site A
- **Attendance**: Good (9 days present, 2 absences)
- **Use Case**: Test worker with some absences

#### Worker 3: Mohan Rao
- **Mobile**: `9876543232`
- **Password**: `password123`
- **Email**: `mohan.rao@worker.com`
- **Card ID**: `CARD003`
- **Department**: Electrical
- **Attendance**: Good (7 days present)
- **Use Case**: Test electrical department worker

#### Worker 4: Lakshmi Reddy
- **Mobile**: `9876543233`
- **Password**: `password123`
- **Email**: `lakshmi.reddy@worker.com`
- **Card ID**: `CARD004`
- **Department**: Plumbing
- **Attendance**: Good (5 days present)
- **Use Case**: Test plumbing department worker

#### Worker 5: Krishna Prasad
- **Mobile**: `9876543234`
- **Password**: `password123`
- **Email**: `krishna.prasad@worker.com`
- **Card ID**: `CARD005`
- **Department**: Construction Site A
- **Status**: **Currently Checked In** (no check-out today)
- **Use Case**: Test incomplete attendance (checked in but not out)

---

### Manufacturing Workers (Establishment 2)

#### Worker 6: Suresh Babu
- **Mobile**: `9876543235`
- **Password**: `password123`
- **Email**: `suresh.babu@worker.com`
- **Card ID**: `CARD006`
- **Department**: Assembly Line
- **Shift**: Morning (7 AM - 3:30 PM)
- **Use Case**: Test early shift worker

#### Worker 7: Padma Rani
- **Mobile**: `9876543236`
- **Password**: `password123`
- **Email**: `padma.rani@worker.com`
- **Card ID**: `CARD007`
- **Department**: Quality Control
- **Use Case**: Test quality control department

---

### IT Workers (Establishment 3)

#### Worker 9: Anjali Sharma
- **Mobile**: `9876543238`
- **Password**: `password123`
- **Email**: `anjali.sharma@worker.com`
- **Card ID**: `CARD009`
- **Department**: Development
- **Shift**: Flexible (9:30 AM - 6 PM)
- **Use Case**: Test development team attendance

#### Worker 10: Karthik Reddy
- **Mobile**: `9876543239`
- **Password**: `password123`
- **Email**: `karthik.reddy@worker.com`
- **Card ID**: `CARD010`
- **Department**: Testing
- **Shift**: Flexible (10 AM - 6:30 PM)
- **Use Case**: Test testing team attendance

---

## 🧪 Test Scenarios

### Scenario 1: Establishment Department Dashboard
1. Login as: `contact@sunriseconstruction.com` / `password123`
2. Navigate to: `/establishment/departments`
3. **Expected**: See 3 departments:
   - Construction Site A (3 workers, 2 present, 1 checked in)
   - Electrical (1 worker, 1 present)
   - Plumbing (1 worker, 1 present)

### Scenario 2: Department Workers View
1. From department dashboard, click "Construction Site A"
2. **Expected**: See table with 3 workers:
   - Ravi Kumar (Present, checked out)
   - Sita Devi (Present, checked out)
   - Krishna Prasad (Present, still checked in - no check-out time)

### Scenario 3: Worker Monthly Summary
1. Login as: `ravi.kumar@worker.com` / `password123`
2. Navigate to: `/dashboard/worker`
3. **Expected**: See monthly summary:
   - Total Working Days: ~20 (Mon-Fri in January)
   - Days Present: 17
   - Days Absent: 3
   - Attendance Percentage: 85%

### Scenario 4: Date Filtering
1. Login as establishment
2. Go to department dashboard
3. Change date to `2026-01-31`
4. **Expected**: See historical attendance for that date

### Scenario 5: Search Functionality
1. Login as establishment
2. Navigate to department workers view
3. Search for "Ravi"
4. **Expected**: Filter shows only Ravi Kumar

### Scenario 6: Different Departments
1. Login as: `info@techmfg.com` / `password123`
2. View departments
3. **Expected**: See Assembly Line and Quality Control departments

---

## 📊 Database Statistics

After running the sample data SQL:
- **Department Users**: 2
- **Establishments**: 3
- **Workers**: 15
- **Establishment-Worker Mappings**: 15
- **Attendance Records**: ~50+ (covering last 30 days)

---

## 🔧 Setup Instructions

1. **Run SQL Script**:
   ```bash
   # Copy sample-data.sql content
   # Paste into Supabase SQL Editor
   # Execute the script
   ```

2. **Verify Data**:
   ```sql
   -- Check counts
   SELECT COUNT(*) FROM worker;
   SELECT COUNT(*) FROM establishment;
   SELECT COUNT(*) FROM attendance;
   ```

3. **Test Login**:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3000`

4. **Test APIs** (using curl or Postman):
   ```bash
   # Login first to get session cookie
   curl -X POST http://localhost:3000/api/establishment/login \
     -H "Content-Type: application/json" \
     -d '{"mobileNumber": "9876543220", "password": "password123"}'
   
   # Then test department stats
   curl -X GET http://localhost:3000/api/attendance/establishment/1/department-stats \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
   ```

---

## 🎯 Quick Test Checklist

- [ ] Login as establishment user
- [ ] View department dashboard
- [ ] Click on department to see workers
- [ ] Test date selector
- [ ] Test search functionality
- [ ] Login as worker
- [ ] View monthly attendance summary
- [ ] Test check-in/check-out functionality
- [ ] Verify role-based access (worker can't access other worker's data)
- [ ] Test API endpoints with Postman

---

## 📝 Notes

- All passwords are `password123` for testing
- Attendance data covers last 30 days (January 2026)
- Worker 5 (Krishna Prasad) has incomplete attendance (checked in but not out)
- Different departments have different shift timings
- Construction: 8:30 AM - 5:30 PM
- Manufacturing: 7:00 AM - 3:30 PM
- IT: 9:30 AM - 6:00 PM

---

## 🐛 Troubleshooting

**Issue**: Can't login
- **Solution**: Ensure sample data SQL was executed successfully
- **Solution**: Check if backend server is running on port 3000

**Issue**: No attendance data showing
- **Solution**: Verify attendance records were inserted
- **Solution**: Check date filter (default is today, change to past dates)

**Issue**: Department dashboard empty
- **Solution**: Ensure `work_location` field is populated in attendance table
- **Solution**: Check establishment_worker mappings exist

---

## 🚀 Ready to Test!

You now have:
- ✅ 3 establishments with different industries
- ✅ 15 workers across different departments
- ✅ 50+ attendance records for realistic testing
- ✅ All login credentials documented
- ✅ Multiple test scenarios to validate functionality
