
-- 1. Create Establishment if it doesn't exist
INSERT INTO establishment (establishment_id, establishment_name, registration_number, mobile_number, email_id, status)
VALUES (1, 'Green Valley Constructions', 'REG123456', 9876543210, 'contact@greenvalley.com', 'active')
ON CONFLICT (establishment_id) DO NOTHING;

-- 2. Assign Worker (ID=1) to Establishment
INSERT INTO establishment_worker (establishment_id, worker_id, estmt_worker_id, work_location, status, working_from_date)
VALUES (1, 1, 1001, 'Building Site A', 'active', '2026-01-01')
ON CONFLICT (worker_id, establishment_id) DO NOTHING;

-- 3. Create Sample Attendance for December 2025 and January 2026
-- We will insert several days of attendance to test month selection

-- Clear old data if any (optional)
DELETE FROM attendance WHERE worker_id = 1;

-- January 2026 records (Present for most weekdays)
DO $$
DECLARE
    d DATE;
BEGIN
    FOR d IN '2026-01-01'::DATE .. '2026-01-31'::DATE
    LOOP
        -- Skip weekends (6=Sat, 0=Sun)
        IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
            INSERT INTO attendance (
                establishment_id, 
                worker_id, 
                estmt_worker_id, 
                work_location, 
                check_in_date_time, 
                check_out_date_time, 
                status
            )
            VALUES (
                1, 
                1, 
                1001, 
                'Building Site A', 
                (d + TIME '09:00:00')::TIMESTAMP, 
                (d + TIME '18:00:00')::TIMESTAMP, 
                'o'
            );
        END IF;
    END LOOP;
END $$;

-- December 2025 records (A few records to test month switching)
DO $$
DECLARE
    d DATE;
BEGIN
    FOR d IN '2025-12-15'::DATE .. '2025-12-20'::DATE
    LOOP
        INSERT INTO attendance (
            establishment_id, 
            worker_id, 
            estmt_worker_id, 
            work_location, 
            check_in_date_time, 
            check_out_date_time, 
            status
        )
        VALUES (
            1, 
            1, 
            1001, 
            'Building Site A', 
            (d + TIME '08:30:00')::TIMESTAMP, 
            (d + TIME '17:30:00')::TIMESTAMP, 
            'o'
        );
    END LOOP;
END $$;

-- One incomplete record for today
INSERT INTO attendance (
    establishment_id, 
    worker_id, 
    estmt_worker_id, 
    work_location, 
    check_in_date_time, 
    check_out_date_time, 
    status
)
VALUES (
    1, 
    1, 
    1001, 
    'Building Site A', 
    (CURRENT_DATE + TIME '09:15:00')::TIMESTAMP, 
    NULL, 
    'i'
);
