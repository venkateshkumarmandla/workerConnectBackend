-- =====================================================
-- SAMPLE DATA FOR WORKER ATTENDANCE MONITORING SYSTEM
-- =====================================================
-- This file contains realistic sample data for testing
-- Run this in your Supabase SQL editor
-- =====================================================

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM attendance;
-- DELETE FROM establishment_worker;
-- DELETE FROM worker;
-- DELETE FROM establishment;
-- DELETE FROM department_user;

-- =====================================================
-- 1. DEPARTMENT USERS (Admin/Department Level)
-- =====================================================
INSERT INTO department_user (first_name, last_name, email_id, password, contact_number, department_role_id, status, created_at, updated_at)
VALUES 
  ('Rajesh', 'Kumar', 'rajesh.kumar@apdept.gov.in', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 9876543210, 1, 'active', NOW(), NOW()),
  ('Priya', 'Sharma', 'priya.sharma@apdept.gov.in', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 9876543211, 2, 'active', NOW(), NOW());

-- =====================================================
-- 2. ESTABLISHMENTS (Companies/Sites)
-- =====================================================
INSERT INTO establishment (establishment_name, contact_person, mobile_number, email_id, password, address, city, state, pincode, category_id, work_nature_id, status, created_at, updated_at)
VALUES 
  -- Construction Company
  ('Sunrise Construction Pvt Ltd', 'Venkatesh Reddy', '9876543220', 'contact@sunriseconstruction.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Plot 45, Industrial Area', 'Hyderabad', 'Telangana', '500032', 1, 1, 'active', NOW(), NOW()),
  
  -- Manufacturing Company
  ('Tech Manufacturing Industries', 'Lakshmi Devi', '9876543221', 'info@techmfg.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'KPHB Industrial Estate', 'Hyderabad', 'Telangana', '500072', 2, 2, 'active', NOW(), NOW()),
  
  -- IT Services
  ('Digital Solutions Ltd', 'Ramesh Babu', '9876543222', 'hr@digitalsolutions.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Hitech City', 'Hyderabad', 'Telangana', '500081', 3, 3, 'active', NOW(), NOW());

-- =====================================================
-- 3. WORKERS (Employees)
-- =====================================================
INSERT INTO worker (full_name, mobile_number, email_id, password, aadhaar_card_number, access_card_id, date_of_birth, gender, address, city, state, pincode, status, created_at, updated_at)
VALUES 
  -- Construction Workers
  ('Ravi Kumar', '9876543230', 'ravi.kumar@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789012', 'CARD001', '1990-05-15', 'Male', 'Kukatpally', 'Hyderabad', 'Telangana', '500072', 'active', NOW(), NOW()),
  ('Sita Devi', '9876543231', 'sita.devi@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789013', 'CARD002', '1992-08-20', 'Female', 'Miyapur', 'Hyderabad', 'Telangana', '500049', 'active', NOW(), NOW()),
  ('Mohan Rao', '9876543232', 'mohan.rao@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789014', 'CARD003', '1988-03-10', 'Male', 'Madhapur', 'Hyderabad', 'Telangana', '500081', 'active', NOW(), NOW()),
  ('Lakshmi Reddy', '9876543233', 'lakshmi.reddy@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789015', 'CARD004', '1995-11-25', 'Female', 'Gachibowli', 'Hyderabad', 'Telangana', '500032', 'active', NOW(), NOW()),
  ('Krishna Prasad', '9876543234', 'krishna.prasad@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789016', 'CARD005', '1991-07-18', 'Male', 'Kondapur', 'Hyderabad', 'Telangana', '500084', 'active', NOW(), NOW()),
  
  -- Manufacturing Workers
  ('Suresh Babu', '9876543235', 'suresh.babu@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789017', 'CARD006', '1989-12-05', 'Male', 'KPHB', 'Hyderabad', 'Telangana', '500072', 'active', NOW(), NOW()),
  ('Padma Rani', '9876543236', 'padma.rani@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789018', 'CARD007', '1993-04-22', 'Female', 'Nizampet', 'Hyderabad', 'Telangana', '500090', 'active', NOW(), NOW()),
  ('Venkat Swamy', '9876543237', 'venkat.swamy@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789019', 'CARD008', '1987-09-14', 'Male', 'Bachupally', 'Hyderabad', 'Telangana', '500090', 'active', NOW(), NOW()),
  
  -- IT Workers
  ('Anjali Sharma', '9876543238', 'anjali.sharma@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789020', 'CARD009', '1994-06-30', 'Female', 'Hitech City', 'Hyderabad', 'Telangana', '500081', 'active', NOW(), NOW()),
  ('Karthik Reddy', '9876543239', 'karthik.reddy@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789021', 'CARD010', '1992-02-17', 'Male', 'Gachibowli', 'Hyderabad', 'Telangana', '500032', 'active', NOW(), NOW()),
  
  -- Additional Workers for better testing
  ('Ramya Devi', '9876543240', 'ramya.devi@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789022', 'CARD011', '1990-10-12', 'Female', 'Kukatpally', 'Hyderabad', 'Telangana', '500072', 'active', NOW(), NOW()),
  ('Naresh Kumar', '9876543241', 'naresh.kumar@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789023', 'CARD012', '1991-01-08', 'Male', 'Miyapur', 'Hyderabad', 'Telangana', '500049', 'active', NOW(), NOW()),
  ('Divya Rani', '9876543242', 'divya.rani@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789024', 'CARD013', '1993-05-19', 'Female', 'Madhapur', 'Hyderabad', 'Telangana', '500081', 'active', NOW(), NOW()),
  ('Prakash Reddy', '9876543243', 'prakash.reddy@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789025', 'CARD014', '1989-08-27', 'Male', 'Kondapur', 'Hyderabad', 'Telangana', '500084', 'active', NOW(), NOW()),
  ('Swathi Sharma', '9876543244', 'swathi.sharma@worker.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', '123456789026', 'CARD015', '1994-03-15', 'Female', 'KPHB', 'Hyderabad', 'Telangana', '500072', 'active', NOW(), NOW());

-- =====================================================
-- 4. ESTABLISHMENT_WORKER (Worker-Establishment Mapping)
-- =====================================================
-- Get establishment and worker IDs (adjust these based on your actual IDs)
-- Assuming establishment IDs are 1, 2, 3 and worker IDs are 1-15

-- Sunrise Construction Workers (Establishment 1)
INSERT INTO establishment_worker (establishment_id, worker_id, working_from_date, working_to_date, status, created_at, updated_at)
VALUES 
  (1, 1, '2024-01-01', '2026-12-31', 'active', NOW(), NOW()),
  (1, 2, '2024-01-01', '2026-12-31', 'active', NOW(), NOW()),
  (1, 3, '2024-02-01', '2026-12-31', 'active', NOW(), NOW()),
  (1, 4, '2024-02-01', '2026-12-31', 'active', NOW(), NOW()),
  (1, 5, '2024-03-01', '2026-12-31', 'active', NOW(), NOW()),
  (1, 11, '2024-03-01', '2026-12-31', 'active', NOW(), NOW()),
  (1, 12, '2024-04-01', '2026-12-31', 'active', NOW(), NOW());

-- Tech Manufacturing Workers (Establishment 2)
INSERT INTO establishment_worker (establishment_id, worker_id, working_from_date, working_to_date, status, created_at, updated_at)
VALUES 
  (2, 6, '2024-01-01', '2026-12-31', 'active', NOW(), NOW()),
  (2, 7, '2024-01-01', '2026-12-31', 'active', NOW(), NOW()),
  (2, 8, '2024-02-01', '2026-12-31', 'active', NOW(), NOW()),
  (2, 13, '2024-02-01', '2026-12-31', 'active', NOW(), NOW()),
  (2, 14, '2024-03-01', '2026-12-31', 'active', NOW(), NOW());

-- Digital Solutions Workers (Establishment 3)
INSERT INTO establishment_worker (establishment_id, worker_id, working_from_date, working_to_date, status, created_at, updated_at)
VALUES 
  (3, 9, '2024-01-01', '2026-12-31', 'active', NOW(), NOW()),
  (3, 10, '2024-01-01', '2026-12-31', 'active', NOW(), NOW()),
  (3, 15, '2024-02-01', '2026-12-31', 'active', NOW(), NOW());

-- =====================================================
-- 5. ATTENDANCE RECORDS (Last 30 days)
-- =====================================================
-- This creates realistic attendance data for the past month

-- Helper: Generate attendance for last 30 days for each worker
-- Worker 1 (Ravi Kumar) - Construction - Good attendance
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  -- Last week (Feb 2026)
  (1, 1, 1, 'Construction Site A', '2026-02-02 08:30:00', '2026-02-02 17:30:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-02-01 08:45:00', '2026-02-01 17:15:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-31 08:20:00', '2026-01-31 17:45:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-30 08:35:00', '2026-01-30 17:20:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-29 08:40:00', '2026-01-29 17:35:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-28 08:25:00', '2026-01-28 17:40:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-27 08:30:00', '2026-01-27 17:25:00', 'o', NOW(), NOW()),
  -- Previous weeks
  (1, 1, 1, 'Construction Site A', '2026-01-24 08:35:00', '2026-01-24 17:30:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-23 08:40:00', '2026-01-23 17:20:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-22 08:30:00', '2026-01-22 17:35:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-21 08:25:00', '2026-01-21 17:40:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-20 08:35:00', '2026-01-20 17:25:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-17 08:30:00', '2026-01-17 17:30:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-16 08:40:00', '2026-01-16 17:20:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-15 08:35:00', '2026-01-15 17:35:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-14 08:30:00', '2026-01-14 17:25:00', 'o', NOW(), NOW()),
  (1, 1, 1, 'Construction Site A', '2026-01-13 08:25:00', '2026-01-13 17:40:00', 'o', NOW(), NOW());

-- Worker 2 (Sita Devi) - Construction - Some absences
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (1, 2, 2, 'Construction Site A', '2026-02-02 09:00:00', '2026-02-02 17:00:00', 'o', NOW(), NOW()),
  (1, 2, 2, 'Construction Site A', '2026-01-31 09:15:00', '2026-01-31 17:10:00', 'o', NOW(), NOW()),
  (1, 2, 2, 'Construction Site A', '2026-01-30 09:00:00', '2026-01-30 17:05:00', 'o', NOW(), NOW()),
  -- Absent on 2026-01-29
  (1, 2, 2, 'Construction Site A', '2026-01-28 09:10:00', '2026-01-28 17:15:00', 'o', NOW(), NOW()),
  (1, 2, 2, 'Construction Site A', '2026-01-27 09:05:00', '2026-01-27 17:00:00', 'o', NOW(), NOW()),
  (1, 2, 2, 'Construction Site A', '2026-01-24 09:00:00', '2026-01-24 17:10:00', 'o', NOW(), NOW()),
  -- Absent on 2026-01-23
  (1, 2, 2, 'Construction Site A', '2026-01-22 09:15:00', '2026-01-22 17:05:00', 'o', NOW(), NOW()),
  (1, 2, 2, 'Construction Site A', '2026-01-21 09:00:00', '2026-01-21 17:00:00', 'o', NOW(), NOW()),
  (1, 2, 2, 'Construction Site A', '2026-01-20 09:10:00', '2026-01-20 17:15:00', 'o', NOW(), NOW());

-- Worker 3 (Mohan Rao) - Construction - Electrical Department
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (1, 3, 3, 'Electrical', '2026-02-02 08:00:00', '2026-02-02 16:30:00', 'o', NOW(), NOW()),
  (1, 3, 3, 'Electrical', '2026-02-01 08:15:00', '2026-02-01 16:45:00', 'o', NOW(), NOW()),
  (1, 3, 3, 'Electrical', '2026-01-31 08:00:00', '2026-01-31 16:30:00', 'o', NOW(), NOW()),
  (1, 3, 3, 'Electrical', '2026-01-30 08:10:00', '2026-01-30 16:40:00', 'o', NOW(), NOW()),
  (1, 3, 3, 'Electrical', '2026-01-29 08:05:00', '2026-01-29 16:35:00', 'o', NOW(), NOW()),
  (1, 3, 3, 'Electrical', '2026-01-28 08:00:00', '2026-01-28 16:30:00', 'o', NOW(), NOW()),
  (1, 3, 3, 'Electrical', '2026-01-27 08:15:00', '2026-01-27 16:45:00', 'o', NOW(), NOW());

-- Worker 4 (Lakshmi Reddy) - Construction - Plumbing Department
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (1, 4, 4, 'Plumbing', '2026-02-02 08:30:00', '2026-02-02 17:00:00', 'o', NOW(), NOW()),
  (1, 4, 4, 'Plumbing', '2026-02-01 08:45:00', '2026-02-01 17:15:00', 'o', NOW(), NOW()),
  (1, 4, 4, 'Plumbing', '2026-01-31 08:30:00', '2026-01-31 17:00:00', 'o', NOW(), NOW()),
  (1, 4, 4, 'Plumbing', '2026-01-30 08:40:00', '2026-01-30 17:10:00', 'o', NOW(), NOW()),
  (1, 4, 4, 'Plumbing', '2026-01-29 08:35:00', '2026-01-29 17:05:00', 'o', NOW(), NOW());

-- Worker 5 (Krishna Prasad) - Construction - Currently checked in (incomplete)
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (1, 5, 5, 'Construction Site A', '2026-02-02 08:30:00', NULL, 'i', NOW(), NOW()),
  (1, 5, 5, 'Construction Site A', '2026-02-01 08:35:00', '2026-02-01 17:30:00', 'o', NOW(), NOW()),
  (1, 5, 5, 'Construction Site A', '2026-01-31 08:40:00', '2026-01-31 17:25:00', 'o', NOW(), NOW());

-- Worker 6 (Suresh Babu) - Manufacturing - Assembly Line
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (2, 6, 8, 'Assembly Line', '2026-02-02 07:00:00', '2026-02-02 15:30:00', 'o', NOW(), NOW()),
  (2, 6, 8, 'Assembly Line', '2026-02-01 07:15:00', '2026-02-01 15:45:00', 'o', NOW(), NOW()),
  (2, 6, 8, 'Assembly Line', '2026-01-31 07:00:00', '2026-01-31 15:30:00', 'o', NOW(), NOW()),
  (2, 6, 8, 'Assembly Line', '2026-01-30 07:10:00', '2026-01-30 15:40:00', 'o', NOW(), NOW());

-- Worker 7 (Padma Rani) - Manufacturing - Quality Control
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (2, 7, 9, 'Quality Control', '2026-02-02 08:00:00', '2026-02-02 16:30:00', 'o', NOW(), NOW()),
  (2, 7, 9, 'Quality Control', '2026-02-01 08:15:00', '2026-02-01 16:45:00', 'o', NOW(), NOW()),
  (2, 7, 9, 'Quality Control', '2026-01-31 08:00:00', '2026-01-31 16:30:00', 'o', NOW(), NOW());

-- Worker 9 (Anjali Sharma) - IT - Development Team
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (3, 9, 13, 'Development', '2026-02-02 09:30:00', '2026-02-02 18:00:00', 'o', NOW(), NOW()),
  (3, 9, 13, 'Development', '2026-02-01 09:45:00', '2026-02-01 18:15:00', 'o', NOW(), NOW()),
  (3, 9, 13, 'Development', '2026-01-31 09:30:00', '2026-01-31 18:00:00', 'o', NOW(), NOW());

-- Worker 10 (Karthik Reddy) - IT - Testing Team
INSERT INTO attendance (establishment_id, worker_id, estmt_worker_id, work_location, check_in_date_time, check_out_date_time, status, created_at, updated_at)
VALUES 
  (3, 10, 14, 'Testing', '2026-02-02 10:00:00', '2026-02-02 18:30:00', 'o', NOW(), NOW()),
  (3, 10, 14, 'Testing', '2026-02-01 10:15:00', '2026-02-01 18:45:00', 'o', NOW(), NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify data was inserted correctly

-- Check total counts
SELECT 'Department Users' as table_name, COUNT(*) as count FROM department_user
UNION ALL
SELECT 'Establishments', COUNT(*) FROM establishment
UNION ALL
SELECT 'Workers', COUNT(*) FROM worker
UNION ALL
SELECT 'Establishment Workers', COUNT(*) FROM establishment_worker
UNION ALL
SELECT 'Attendance Records', COUNT(*) FROM attendance;

-- Check today's attendance
SELECT 
  e.establishment_name,
  w.full_name,
  a.work_location,
  a.check_in_date_time,
  a.check_out_date_time,
  a.status
FROM attendance a
JOIN worker w ON a.worker_id = w.worker_id
JOIN establishment e ON a.establishment_id = e.establishment_id
WHERE DATE(a.check_in_date_time) = CURRENT_DATE
ORDER BY e.establishment_name, a.check_in_date_time;
