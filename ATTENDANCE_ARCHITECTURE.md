# Attendance & Compliance System — Complete Architecture Plan

## Architecture Overview: Dual MySQL Databases

This system uses **two MySQL databases** — one local (read/write) and one remote (read-only):

| Database | Engine | Purpose |
|---|---|---|
| **Local MySQL** (XAMPP) | `127.0.0.1:3306`, DB: `attendance_system` | All new attendance-prefixed tables — **READ/WRITE** |
| **Remote MySQL** (existing) | `c67239.sgvps.net:3306`, DB: `dbinv2oggorg69` | Existing portal/exeat tables — **READ ONLY** |

The Laravel backend connects to **both** databases. Existing portal tables (users, students, staff, courses, etc.) are **READ-ONLY** via a separate `mysql_remote` connection — the attendance system never modifies them. All new attendance tables live in the local `attendance_system` database **with the `attendance_` prefix** so they can be identified and exported via `SHOW TABLES LIKE 'attendance_%'`.

**⚠️ CRITICAL:** 
- Do NOT modify existing portal tables (users, students, staff, courses, etc.)
- Do NOT add columns to existing tables
- All existing data is treated as read-only reference
- No FOREIGN KEY constraints to portal tables — portal IDs are stored as plain BIGINT columns
- FOREIGN KEY constraints between local attendance tables are enforced

Authentication uses the remote `users` table via Sanctum tokens (read-only). **No new login system.** Student and staff identity comes from remote `students` and `staff` tables respectively.

> **Note:** The `course_regs` table **DOES exist** in the remote MySQL database. It stores student-course enrollments with `is_course_reg = 2` meaning registered.

---

## Section 1: Existing MySQL Tables — Reference-Only (No Changes)

### 1.1 Portal Tables

| Table | Key Fields | How Attendance System Uses It |
|---|---|---|
| `users` | `id`, `fname`, `mname`, `lname`, `email`, `phone_no`, `user_type` (1=admin, 2=student, 7=applicant), `password` | Central auth hub — Sanctum token authentication |
| `students` | `id`, `user_id`, `reg_no`, `matric_no`, `fname`, `mname`, `lname`, `email`, `gender`, `dob`, `phone`, `passport`, `signature` | Student identity, passport photo (facial enrollment base) |
| `staff` | `id`, `user_id`, `fname`, `mname`, `lname`, `email`, `phone`, `gender`, `title` | Staff identity, lecturer/convener assignment |
| `student_academics` | `student_id`, `faculty_id`, `department_id`, `course_study_id`, `level`, `academic_session_id`, `vu_semester_id`, `entry_session_id`, `studentship` (1=normal, 2=deferred, 3=withdrawn, 4=expelled, 5=suspended), `matric_no` | Eligibility checks: faculty, dept, programme, level, session, studentship status |
| `staff_work_profiles` | `staff_id`, `staff_no`, `faculty_id`, `department_id`, `admin_department_id`, `staff_position_id`, `grade_level_id` | Staff faculty/department assignment, position-based RBAC inference |
| `courses` | `id`, `course_study_id`, `department_id`, `credit_load`, `title`, `code`, `level`, `semester_offered` | Course identity for attendance sessions and exam eligibility |
| `course_assigneds` | `id`, `staff_id`, `course_id`, `department_id`, `academic_session_id`, `vu_session_id`, `vu_semester_id`, `status` | Lecturer-to-course assignment — used to create attendance sessions |
| `course_regs` | `id`, `student_id`, `course_id`, `course_assigned_id`, `level`, `academic_session_id`, `vu_semester_id`, `vu_session_id`, `is_course_reg` (2=registered), `is_carryover` | **Student-course enrollment.** `is_course_reg = 2` = registered. Used for eligibility and attendance scope |
| `departments` | `id`, `name`, `abb`, `faculty_id` | Hierarchy for reporting, event targeting, chapel day assignment |
| `faculties` | `id`, `name`, `abb` | Faculty-level reporting and permissions |
| `lecture_venues` | `id`, `name`, `capacity`, `coordinate`, `attitude` | Venue base data — extended by `attendance_venues` |
| `vu_sessions` | `id`, `session`, `start_date`, `end_date`, `status` (1=active) | Academic session calendar |
| `vu_semesters` | `id`, `academic_session_id`, `semester_id` (1=First, 2=Second), `status` | Semester within session |
| `academic_sessions` | `id`, `vu_session_id`, `session`, `batch`, `programme_id` | Programme-specific academic period |
| `semesters` | `id`, `semester` (1=First, 2=Second) | Semester lookup |
| `levels` | `id`, `level` (100-600) | Academic level lookup |
| `course_studies` | `id`, `name`, `abb`, `department_id`, `duration` | Programme of study |
| `student_contacts` | `student_id`, `surname`, `other_names`, `phone_no`, `email`, `phone_no_two` | Parent/guardian contact for attendance notifications |
| `roles` / `role_user` | Role assignments | Existing RBAC — staff roles include VC, DVC, Dean, HOD, Lecturer, Exam Officer |
| `staff_positions` | `id`, `name` | Position lookup — Dean, HOD, Lecturer. Used for RBAC inference |
| `tuition_fees` | `student_id`, `amount`, `payment_status` | Financial clearance for exam eligibility |
| `other_fee_trans` | `student_id`, `description`, `amount`, `payment_status` | Other fee payment tracking |
| `studentships` | `id`, `name` | Status lookup (1=normal, 2=deferred, 3=withdrawn, 4=expelled, 5=suspended) |
| `course_register_logs` | `student_id`, `academic_session_id`, `vu_semester_id`, `level`, `department_id`, `course_study_id` | Registration audit per semester |
| `time_tables` | Schedule data | Class schedule reference for attendance session generation |

### 1.2 Exeat Tables (Integration Points)

| Table | Key Fields | Integration |
|---|---|---|
| `exeat_requests` | `id`, `student_id`, `matric_no`, `departure_date`, `return_date`, `category_id`, `status` | Approved exeat periods → mark "Exam Leave". Workflow: `pending` → `secretary_review` → `parent_consent` → `dean_review` → `hostel_signout` → `security_signout` → `security_signin` → `hostel_signin` → `completed` |
| `student_exeat_debts` | `id`, `student_id`, `exeat_request_id`, `amount`, `payment_status` | **READ ONLY.** Attendance system reads this for consolidated financial ledger. All new debt/payment records live in `attendance_debts` and `attendance_debt_payments`. |
| `exeat_approvals` | `exeat_request_id`, `staff_id`, `role`, `status`, `comment`, `method` | Workflow audit trail |
| `exeat_roles` | `id`, `name` (admin, cmd, dean, debtLaw, deputy-dean, hostel_admin, secretary, security, student_exeat_applier) | Role pattern to replicate for attendance roles |
| `staff_exeat_roles` | `staff_id`, `exeat_role_id`, `assigned_at` | Links staff to exeat roles — pattern to replicate for attendance roles |
| `exeat_notifications` | `id`, `exeat_request_id`, `recipient_type` (student/staff/admin), `recipient_id`, `notification_type`, `title`, `message`, `data` (JSON), `delivery_methods` (JSON), `priority`, `status`, `scheduled_at`, `sent_at`, `delivered_at`, `read_at`, `retry_count` | Full notification system with delivery tracking — reuse for attendance alerts |
| `notifications` (Laravel) | `id` (UUID), `type`, `notifiable_type`, `notifiable_id`, `data` (JSON), `read_at` | Laravel's native notification table for in-app alerts |

---

## Section 2: MySQL Schema — All New Attendance Tables (prefix: `attendance_`)

All new tables are created in the local MySQL database `attendance_system` with the `attendance_` prefix for easy identification and export. Portal tables are accessed read-only via a separate `mysql_remote` connection with no `attendance_` prefix.

```php
// config/database.php
'connections' => [
    'mysql' => [
        'driver' => 'mysql',
        'host' => env('DB_HOST', '127.0.0.1'),
        'port' => env('DB_PORT', 3306),
        'database' => env('DB_DATABASE', 'attendance_system'),
        'username' => env('DB_USERNAME', 'root'),
        'password' => env('DB_PASSWORD', ''),
        'strict' => false,
    ],

    'mysql_remote' => [
        'driver' => 'mysql',
        'host' => env('REMOTE_DB_HOST', 'c67239.sgvps.net'),
        'port' => env('REMOTE_DB_PORT', 3306),
        'database' => env('REMOTE_DB_DATABASE', 'dbinv2oggorg69'),
        'username' => env('REMOTE_DB_USERNAME'),
        'password' => env('REMOTE_DB_PASSWORD'),
        'strict' => false,
    ],
],
```

### 2.1 Venue & Terminal Infrastructure

**Relationship Map:**
- `attendance_venues.lecture_venue_id` → `lecture_venues.id` (optional, for venues already in portal)
- `attendance_venues.faculty_id` → `faculties.id` (faculty ownership)
- `attendance_venues.department_id` → `departments.id` (department ownership)
- `attendance_terminals.venue_id` → `attendance_venues.id` (MySQL FK)

```sql
CREATE TABLE attendance_venues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lecture_venue_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    venue_type VARCHAR(50) NOT NULL,
    faculty_id BIGINT UNSIGNED NULL,
    department_id BIGINT UNSIGNED NULL,
    capacity INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_venues_faculty ON attendance_venues(faculty_id);
CREATE INDEX idx_venues_dept ON attendance_venues(department_id);

CREATE TABLE attendance_terminals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venue_id BIGINT UNSIGNED NOT NULL,
    device_id VARCHAR(100) NOT NULL UNIQUE,
    device_certificate TEXT NOT NULL,
    terminal_type VARCHAR(50) NOT NULL DEFAULT 'dedicated',
    os VARCHAR(50) NULL,
    firmware_version VARCHAR(50) NULL,
    is_active TINYINT(1) DEFAULT 1,
    last_sync_at TIMESTAMP NULL,
    last_poll_at TIMESTAMP NULL,
    public_key TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES attendance_venues(id) ON DELETE CASCADE
);

CREATE TABLE attendance_venue_terminal_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    terminal_id BIGINT UNSIGNED NOT NULL,
    event VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    payload JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (terminal_id) REFERENCES attendance_terminals(id)
);
CREATE INDEX idx_terminal_logs_terminal ON attendance_venue_terminal_logs(terminal_id);
CREATE INDEX idx_terminal_logs_created ON attendance_venue_terminal_logs(created_at);
```

### 2.2 Attendance Core

**Relationship Map:**
- `attendance_sessions.course_assigned_id` → `course_assigneds.id` (links session to a course offering)
- `attendance_sessions.staff_id` → `staff.id` (lecturer or convener who opened the session)
- `attendance_sessions.venue_id` → `attendance_venues.id` (MySQL FK)
- `attendance_records.student_id` → `students.id` (every attendance belongs to a student)
- `attendance_records.session_id` → `attendance_sessions.id` (MySQL FK, for class-based)
- `attendance_records.status_id` → `attendance_status_types.id` (MySQL FK)
- `attendance_records.verified_by_terminal_id` → `attendance_terminals.id` (MySQL FK)
- `attendance_records.venue_id` → `attendance_venues.id` (MySQL FK)
- `attendance_records.academic_session_id` → `academic_sessions.id`
- `attendance_records.vu_semester_id` → `vu_semesters.id`
- `attendance_excuses.student_id` → `students.id`
- `attendance_excuses.approved_by` → `staff.id`
- `attendance_staff_clocking.staff_id` → `staff.id`
- `attendance_staff_clocking.status_id` → `attendance_status_types.id` (MySQL FK)

```sql
CREATE TABLE attendance_status_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    counts_as_present TINYINT(1) DEFAULT 0,
    counts_as_absent TINYINT(1) DEFAULT 0,
    requires_approval TINYINT(1) DEFAULT 0,
    is_system TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO attendance_status_types (code, display_name, description, counts_as_present, counts_as_absent, requires_approval, sort_order) VALUES
('present', 'Present', 'Student was present and verified', 1, 0, 0, 1),
('late', 'Late', 'Student arrived after the grace period', 1, 0, 0, 2),
('absent', 'Absent', 'Student did not attend', 0, 1, 0, 3),
('excused', 'Excused', 'Absence approved by authorized personnel', 0, 0, 1, 4),
('proxy', 'Proxy', 'Attendance recorded by authorized proxy', 1, 0, 1, 5),
('exam_leave', 'Examination Leave', 'Official examination leave - does not affect percentage', 0, 0, 1, 6),
('official_assignment', 'Official Assignment', 'Student on official institutional duty', 0, 0, 1, 7),
('medical_leave', 'Medical Leave', 'Student on approved medical leave', 0, 0, 1, 8);

CREATE TABLE attendance_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_assigned_id BIGINT UNSIGNED NULL,
    institutional_event_id BIGINT UNSIGNED NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NULL,
    session_date DATE NOT NULL,
    opens_at TIMESTAMP NOT NULL,
    closes_at TIMESTAMP NOT NULL,
    grace_period_end TIMESTAMP NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    venue_id BIGINT UNSIGNED NULL,
    attendance_methods JSON NULL,
    max_participants INT NULL,
    notes TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES attendance_venues(id)
);
CREATE INDEX idx_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_sessions_type ON attendance_sessions(session_type);
CREATE INDEX idx_sessions_status ON attendance_sessions(status);
CREATE INDEX idx_sessions_course ON attendance_sessions(course_assigned_id);
CREATE INDEX idx_sessions_event ON attendance_sessions(institutional_event_id);
CREATE INDEX idx_sessions_staff ON attendance_sessions(staff_id);
CREATE INDEX idx_sessions_venue ON attendance_sessions(venue_id);

CREATE TABLE attendance_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NULL,
    institutional_event_id BIGINT UNSIGNED NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    attendance_method VARCHAR(50) NOT NULL,
    verified_by_terminal_id BIGINT UNSIGNED NULL,
    verified_by_staff_id BIGINT UNSIGNED NULL,
    timestamp TIMESTAMP NOT NULL,
    venue_id BIGINT UNSIGNED NULL,
    academic_session_id BIGINT UNSIGNED NULL,
    vu_semester_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    liveness_score DECIMAL(5, 2) NULL,
    confidence_score DECIMAL(5, 2) NULL,
    device_id VARCHAR(100) NULL,
    sync_status VARCHAR(50) DEFAULT 'synced',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (status_id) REFERENCES attendance_status_types(id),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
    FOREIGN KEY (verified_by_terminal_id) REFERENCES attendance_terminals(id),
    FOREIGN KEY (venue_id) REFERENCES attendance_venues(id)
);
CREATE INDEX idx_records_student ON attendance_records(student_id);
CREATE INDEX idx_records_session ON attendance_records(session_id);
CREATE INDEX idx_records_event ON attendance_records(institutional_event_id);
CREATE INDEX idx_records_timestamp ON attendance_records(timestamp);
CREATE INDEX idx_records_status ON attendance_records(status_id);
CREATE INDEX idx_records_sync ON attendance_records(sync_status);

CREATE TABLE attendance_excuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    attendance_record_id BIGINT UNSIGNED NULL,
    session_id BIGINT UNSIGNED NULL,
    institutional_event_id BIGINT UNSIGNED NULL,
    excuse_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    document_path VARCHAR(500) NULL,
    approved_by BIGINT UNSIGNED NOT NULL,
    approved_at TIMESTAMP NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by BIGINT UNSIGNED NULL,
    review_comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
);
CREATE INDEX idx_excuses_student ON attendance_excuses(student_id);
CREATE INDEX idx_excuses_status ON attendance_excuses(status);

CREATE TABLE attendance_staff_clocking (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id BIGINT UNSIGNED NOT NULL,
    clock_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    venue_id BIGINT UNSIGNED NULL,
    verified_by_terminal_id BIGINT UNSIGNED NULL,
    attendance_method VARCHAR(50) NOT NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    sync_status VARCHAR(50) DEFAULT 'synced',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES attendance_venues(id),
    FOREIGN KEY (verified_by_terminal_id) REFERENCES attendance_terminals(id),
    FOREIGN KEY (status_id) REFERENCES attendance_status_types(id)
);
CREATE INDEX idx_staff_clocking_staff ON attendance_staff_clocking(staff_id);
CREATE INDEX idx_staff_clocking_date ON attendance_staff_clocking(timestamp);
```

### 2.3 Institutional Event Engine

**Relationship Map:**
- `attendance_institutional_events.organizer_id` → `staff.id` (Event Convener who created it)
- `attendance_institutional_events.venue_id` → `attendance_venues.id` (MySQL FK)
- `attendance_institutional_events.event_category_id` → `attendance_event_categories.id` (MySQL FK)
- `attendance_event_target_groups.institutional_event_id` → `attendance_institutional_events.id` (MySQL FK)
- `attendance_event_participants.participant_id` → `students.id` or `staff.id` (polymorphic, based on `participant_type`)
- `attendance_event_attendance.participant_id` → `students.id` or `staff.id`
- `attendance_event_attendance.status_id` → `attendance_status_types.id` (MySQL FK)

```sql
CREATE TABLE attendance_event_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    icon VARCHAR(50) NULL,
    color VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO attendance_event_categories (name, description) VALUES
('academic_lecture', 'Scheduled academic class'),
('chapel_mass', 'Institutional worship program'),
('seminar', 'Academic seminar'),
('workshop', 'Academic or professional workshop'),
('conference', 'Academic conference'),
('staff_meeting', 'Staff/departmental/faculty meeting'),
('senate_meeting', 'Senate meeting'),
('convocation', 'Convocation ceremony'),
('orientation', 'Orientation program'),
('examination_briefing', 'Pre-examination briefing'),
('student_assembly', 'Student assembly'),
('institutional_ceremony', 'Other institutional ceremony'),
('departmental_meeting', 'Departmental meeting'),
('faculty_meeting', 'Faculty meeting');

CREATE TABLE attendance_institutional_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    event_category_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
    venue_id BIGINT UNSIGNED NULL,
    organizer_id BIGINT UNSIGNED NOT NULL,
    organizing_unit_id BIGINT UNSIGNED NULL,
    organizing_unit_type VARCHAR(50) NULL,
    academic_session_id BIGINT UNSIGNED NULL,
    vu_semester_id BIGINT UNSIGNED NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    attendance_open_time TIME NOT NULL,
    attendance_close_time TIME NOT NULL,
    grace_period_minutes INT DEFAULT 0,
    is_mandatory TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    recurrence_rule JSON NULL,
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_category_id) REFERENCES attendance_event_categories(id),
    FOREIGN KEY (venue_id) REFERENCES attendance_venues(id)
);
CREATE INDEX idx_events_category ON attendance_institutional_events(event_category_id);
CREATE INDEX idx_events_organizer ON attendance_institutional_events(organizer_id);
CREATE INDEX idx_events_date ON attendance_institutional_events(start_date);
CREATE INDEX idx_events_status ON attendance_institutional_events(status);

CREATE TABLE attendance_event_target_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institutional_event_id BIGINT UNSIGNED NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institutional_event_id) REFERENCES attendance_institutional_events(id) ON DELETE CASCADE
);
CREATE INDEX idx_target_event ON attendance_event_target_groups(institutional_event_id);

CREATE TABLE attendance_event_participants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institutional_event_id BIGINT UNSIGNED NOT NULL,
    participant_type VARCHAR(20) NOT NULL,
    participant_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institutional_event_id, participant_type, participant_id),
    FOREIGN KEY (institutional_event_id) REFERENCES attendance_institutional_events(id) ON DELETE CASCADE
);
CREATE INDEX idx_participants_event ON attendance_event_participants(institutional_event_id);
CREATE INDEX idx_participants_user ON attendance_event_participants(participant_id);

CREATE TABLE attendance_event_attendance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institutional_event_id BIGINT UNSIGNED NOT NULL,
    participant_type VARCHAR(20) NOT NULL,
    participant_id BIGINT UNSIGNED NOT NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    attendance_method VARCHAR(50) NOT NULL,
    verified_by_terminal_id BIGINT UNSIGNED NULL,
    timestamp TIMESTAMP NOT NULL,
    venue_id BIGINT UNSIGNED NULL,
    sync_status VARCHAR(50) DEFAULT 'synced',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institutional_event_id) REFERENCES attendance_institutional_events(id),
    FOREIGN KEY (status_id) REFERENCES attendance_status_types(id),
    FOREIGN KEY (verified_by_terminal_id) REFERENCES attendance_terminals(id),
    FOREIGN KEY (venue_id) REFERENCES attendance_venues(id)
);
CREATE INDEX idx_event_attendance_event ON attendance_event_attendance(institutional_event_id);
CREATE INDEX idx_event_attendance_user ON attendance_event_attendance(participant_id);
```

### 2.4 Penalty Schedule & Debt Recovery

**Relationship Map:**
- `attendance_penalty_schedule.created_by` → `staff.id` (admin who created the penalty)
- `attendance_event_penalty_assignments.institutional_event_id` → `attendance_institutional_events.id` (MySQL FK)
- `attendance_event_penalty_assignments.penalty_id` → `attendance_penalty_schedule.id` (MySQL FK)
- `attendance_debts.student_id` → `students.id` (the debtor)
- `attendance_debts.institutional_event_id` → `attendance_institutional_events.id` (MySQL FK)
- `attendance_debts.cleared_by` → `staff.id`
- `attendance_debt_payments.attendance_debt_id` → `attendance_debts.id` (MySQL FK)
- `attendance_debt_payments.verified_by` → `staff.id`
- `attendance_student_debt_ledger.student_id` → `students.id`

```sql
CREATE TABLE attendance_penalty_schedule (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    penalty_type VARCHAR(50) NOT NULL DEFAULT 'fixed',
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    applicable_to VARCHAR(20) NOT NULL DEFAULT 'student',
    applies_to_late TINYINT(1) DEFAULT 0,
    applies_to_absence TINYINT(1) DEFAULT 1,
    max_cumulative_amount DECIMAL(10, 2) NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE attendance_event_penalty_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institutional_event_id BIGINT UNSIGNED NOT NULL,
    penalty_id BIGINT UNSIGNED NOT NULL,
    applies_to VARCHAR(20) NOT NULL DEFAULT 'absence',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institutional_event_id, penalty_id, applies_to),
    FOREIGN KEY (institutional_event_id) REFERENCES attendance_institutional_events(id) ON DELETE CASCADE,
    FOREIGN KEY (penalty_id) REFERENCES attendance_penalty_schedule(id)
);

CREATE TABLE attendance_debts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    institutional_event_id BIGINT UNSIGNED NULL,
    attendance_record_id BIGINT UNSIGNED NULL,
    penalty_id BIGINT UNSIGNED NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    due_date DATE NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    clearance_status VARCHAR(50) DEFAULT 'pending',
    cleared_by BIGINT UNSIGNED NULL,
    cleared_at TIMESTAMP NULL,
    waiver_reason TEXT NULL,
    waiver_approved_by BIGINT UNSIGNED NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institutional_event_id) REFERENCES attendance_institutional_events(id),
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id),
    FOREIGN KEY (penalty_id) REFERENCES attendance_penalty_schedule(id)
);
CREATE INDEX idx_debts_student ON attendance_debts(student_id);
CREATE INDEX idx_debts_status ON attendance_debts(payment_status);
CREATE INDEX idx_debts_student_status ON attendance_debts(student_id, payment_status);

CREATE TABLE attendance_debt_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attendance_debt_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_reference VARCHAR(255) NULL,
    payment_method VARCHAR(50) NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by BIGINT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    receipt_url VARCHAR(500) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attendance_debt_id) REFERENCES attendance_debts(id)
);

CREATE TABLE attendance_student_debt_ledger (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    academic_session_id BIGINT UNSIGNED NULL,
    vu_semester_id BIGINT UNSIGNED NULL,
    total_outstanding DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_cleared DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_overdue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (student_id, academic_session_id, vu_semester_id)
);
```

### 2.5 Examination Eligibility Engine

**Relationship Map:**
- `attendance_exam_eligibility.student_id` → `students.id` (the student)
- `attendance_exam_eligibility.course_id` → `courses.id` (the course)
- `attendance_exam_eligibility.eligibility_status_id` → `attendance_exam_eligibility_statuses.id` (MySQL FK)
- `attendance_exam_eligibility_logs.student_id` → `students.id`
- `attendance_exam_eligibility_logs.course_id` → `courses.id`
- `attendance_exam_eligibility_logs.changed_by` → `staff.id` (NULL = system-generated)

```sql
CREATE TABLE attendance_exam_eligibility_statuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_eligible TINYINT(1) DEFAULT 0
);

INSERT INTO attendance_exam_eligibility_statuses (code, display_name, description, is_eligible) VALUES
('qualified', 'Qualified', 'All requirements satisfied', 1),
('pending_clearance', 'Pending Clearance', 'Minor requirements pending', 0),
('attendance_deficiency', 'Attendance Deficiency', 'Below minimum attendance threshold', 0),
('outstanding_debt', 'Outstanding Financial Obligations', 'Unpaid fees or penalties', 0),
('not_eligible', 'Not Eligible', 'Multiple requirements not met', 0);

CREATE TABLE attendance_exam_eligibility (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    academic_session_id BIGINT UNSIGNED NOT NULL,
    vu_semester_id BIGINT UNSIGNED NOT NULL,
    eligibility_status_id BIGINT UNSIGNED NOT NULL,
    attendance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    required_attendance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 80.00,
    total_classes INT NOT NULL DEFAULT 0,
    attended_classes INT NOT NULL DEFAULT 0,
    school_fees_cleared TINYINT(1) DEFAULT 0,
    attendance_debts_cleared TINYINT(1) DEFAULT 0,
    exeat_debts_cleared TINYINT(1) DEFAULT 0,
    course_registered TINYINT(1) DEFAULT 0,
    reasons_json JSON NULL,
    last_evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (student_id, course_id, academic_session_id, vu_semester_id),
    FOREIGN KEY (eligibility_status_id) REFERENCES attendance_exam_eligibility_statuses(id)
);
CREATE INDEX idx_eligibility_student ON attendance_exam_eligibility(student_id);
CREATE INDEX idx_eligibility_course ON attendance_exam_eligibility(course_id);
CREATE INDEX idx_eligibility_status ON attendance_exam_eligibility(eligibility_status_id);

CREATE TABLE attendance_exam_eligibility_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    previous_status_id BIGINT UNSIGNED NULL,
    new_status_id BIGINT UNSIGNED NOT NULL,
    changed_by BIGINT UNSIGNED NULL,
    change_reason TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (previous_status_id) REFERENCES attendance_exam_eligibility_statuses(id),
    FOREIGN KEY (new_status_id) REFERENCES attendance_exam_eligibility_statuses(id)
);
```

### 2.6 Biometric Data

**Relationship Map:**
- `attendance_biometric_templates.user_id` → `students.id` or `staff.id` (polymorphic via `user_type`)
- `attendance_biometric_templates.enrolled_by` → `staff.id`
- `attendance_biometric_templates.enrolled_terminal_id` → `attendance_terminals.id` (MySQL FK)
- `attendance_biometric_verification_logs.user_id` → `students.id` or `staff.id`
- `attendance_biometric_verification_logs.template_id` → `attendance_biometric_templates.id` (MySQL FK)
- `attendance_biometric_verification_logs.terminal_id` → `attendance_terminals.id` (MySQL FK)

```sql
CREATE TABLE attendance_biometric_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    template_type VARCHAR(20) NOT NULL,
    encrypted_template TEXT NOT NULL,
    template_hash VARCHAR(64) NOT NULL,
    algorithm_version VARCHAR(50) NULL,
    is_active TINYINT(1) DEFAULT 1,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enrolled_by BIGINT UNSIGNED NULL,
    enrolled_terminal_id BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrolled_terminal_id) REFERENCES attendance_terminals(id)
);
CREATE INDEX idx_biometric_user ON attendance_biometric_templates(user_id, user_type);
CREATE INDEX idx_biometric_type ON attendance_biometric_templates(template_type);

CREATE TABLE attendance_biometric_verification_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    method VARCHAR(20) NOT NULL,
    template_id BIGINT UNSIGNED NULL,
    terminal_id BIGINT UNSIGNED NULL,
    result VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(5, 2) NULL,
    liveness_score DECIMAL(5, 2) NULL,
    error_message TEXT NULL,
    duration_ms INT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES attendance_biometric_templates(id),
    FOREIGN KEY (terminal_id) REFERENCES attendance_terminals(id)
);
CREATE INDEX idx_biometric_logs_user ON attendance_biometric_verification_logs(user_id);
CREATE INDEX idx_biometric_logs_result ON attendance_biometric_verification_logs(result);
```

### 2.7 Offline Sync

```sql
CREATE TABLE attendance_offline_pending_sync (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    terminal_id BIGINT UNSIGNED NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT UNSIGNED NULL,
    action VARCHAR(20) NOT NULL,
    payload JSON NOT NULL,
    device_timestamp TIMESTAMP NOT NULL,
    server_timestamp TIMESTAMP NULL,
    conflict_resolution VARCHAR(50) NULL,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP NULL,
    FOREIGN KEY (terminal_id) REFERENCES attendance_terminals(id)
);
CREATE INDEX idx_sync_status ON attendance_offline_pending_sync(status);
CREATE INDEX idx_sync_terminal ON attendance_offline_pending_sync(terminal_id, status);

CREATE TABLE attendance_sync_conflict_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sync_id BIGINT UNSIGNED NOT NULL,
    resolution_strategy VARCHAR(50) NOT NULL,
    device_payload JSON NOT NULL,
    server_payload JSON NOT NULL,
    resolved_payload JSON NOT NULL,
    resolved_by VARCHAR(50) DEFAULT 'system',
    resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sync_id) REFERENCES attendance_offline_pending_sync(id)
);
```

### 2.8 Staff Compliance & QA

**Relationship Map:**
- `attendance_staff_compliance.staff_id` → `staff.id`
- `attendance_staff_compliance.institutional_event_id` → `attendance_institutional_events.id` (MySQL FK)
- `attendance_staff_compliance.attendance_status_id` → `attendance_status_types.id` (MySQL FK)
- `attendance_staff_compliance.qa_approved_by` → `staff.id`
- `attendance_qa_compliance_reports.generated_by` → `staff.id`

```sql
CREATE TABLE attendance_staff_compliance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id BIGINT UNSIGNED NOT NULL,
    institutional_event_id BIGINT UNSIGNED NOT NULL,
    attendance_status_id BIGINT UNSIGNED NULL,
    reported_to_qa TINYINT(1) DEFAULT 0,
    reported_to_bursary TINYINT(1) DEFAULT 0,
    reported_to_hr TINYINT(1) DEFAULT 0,
    deduction_processed TINYINT(1) DEFAULT 0,
    deduction_amount DECIMAL(10, 2) NULL,
    report_reference VARCHAR(100) NULL,
    qa_approved TINYINT(1) DEFAULT 0,
    qa_approved_by BIGINT UNSIGNED NULL,
    qa_approved_at TIMESTAMP NULL,
    bursary_processed TINYINT(1) DEFAULT 0,
    bursary_processed_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institutional_event_id) REFERENCES attendance_institutional_events(id),
    FOREIGN KEY (attendance_status_id) REFERENCES attendance_status_types(id)
);
CREATE INDEX idx_staff_compliance_staff ON attendance_staff_compliance(staff_id);
CREATE INDEX idx_staff_compliance_event ON attendance_staff_compliance(institutional_event_id);

CREATE TABLE attendance_qa_compliance_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    parameters JSON NULL,
    generated_by BIGINT UNSIGNED NULL,
    file_path VARCHAR(500) NULL,
    export_format VARCHAR(20) NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.9 Attendance Roles (RBAC)

**Relationship Map:**
- `attendance_staff_roles.staff_id` → `staff.id` (staff granted a role)
- `attendance_staff_roles.attendance_role_id` → `attendance_roles.id` (MySQL FK)
- `attendance_staff_roles.assigned_by` → `staff.id` (admin who assigned the role)

```sql
CREATE TABLE attendance_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    permissions JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO attendance_roles (name, display_name, description) VALUES
('event_convener', 'Event Convener', 'Can create, configure, and manage institutional events'),
('qa_officer', 'Quality Assurance Officer', 'Can monitor compliance, view reports, manage exam hall access'),
('debt_recovery_officer', 'Debt Recovery Officer', 'Can view debts, verify payments, approve clearance'),
('bursary_officer', 'Bursary Officer', 'Can access attendance-related financial reports and deductions'),
('examination_officer', 'Examination Officer', 'Can manage exam eligibility and clearance'),
('security_personnel', 'Security Personnel', 'Can verify students at examination halls and gates'),
('student_affairs', 'Student Affairs Officer', 'Can manage student attendance complaints and exceptions'),
('system_administrator', 'System Administrator', 'Full system access, role management, penalty schedule');

CREATE TABLE attendance_staff_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id BIGINT UNSIGNED NOT NULL,
    attendance_role_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (staff_id, attendance_role_id),
    FOREIGN KEY (attendance_role_id) REFERENCES attendance_roles(id)
);
CREATE INDEX idx_staff_roles_staff ON attendance_staff_roles(staff_id);
```

### 2.10 Attendance Notifications

```sql
CREATE TABLE attendance_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recipient_type VARCHAR(20) NOT NULL,
    recipient_id BIGINT UNSIGNED NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    delivery_methods JSON NULL,
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    retry_count INT DEFAULT 0,
    action_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_recipient ON attendance_notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_status ON attendance_notifications(status);
CREATE INDEX idx_notifications_type ON attendance_notifications(notification_type);
```

---

## Section 3: Data Flow — MySQL with Attendance Tables

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REMOTE MYSQL (PORTAL TABLES)                  │
│                         ⚠ READ ONLY                                 │
│                                                                     │
│  users ──> students ──> student_academics                          │
│       │         └──> course_regs ──> courses                        │
│       │         └──> student_contacts                               │
│       │         └──> exeat_requests ──> exeat_approvals             │
│       │         └──> student_exeat_debts                            │
│       │         └──> tuition_fees / other_fee_trans                 │
│       │                                                             │
│       └──> staff ──> staff_work_profiles                            │
│                └──> course_assigneds                                │
│                └──> staff_exeat_roles                               │
│                                                                     │
│  lecture_venues, departments, faculties, vu_sessions,               │
│  vu_semesters, academic_sessions, levels, course_studies,           │
│  semesters, roles, role_user, staff_positions                       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ READ ONLY via mysql_remote connection
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL MYSQL (attendance_system DB)                │
│                    ALL 30 TABLES WITH attendance_ PREFIX             │
│                    ALL WRITES HERE                                   │
│                                                                     │
│  attendance_venues ──> attendance_terminals                         │
│  attendance_sessions ──> attendance_records                         │
│  attendance_status_types                                            │
│  attendance_excuses ──> attendance_staff_clocking                   │
│                                                                     │
│  attendance_institutional_events ──> attendance_event_target_groups  │
│       └──> attendance_event_participants                            │
│       └──> attendance_event_attendance                              │
│                                                                     │
│  attendance_penalty_schedule ──> attendance_event_penalty_assignments│
│       └──> attendance_debts ──> attendance_debt_payments           │
│       └──> attendance_student_debt_ledger                           │
│                                                                     │
│  attendance_exam_eligibility_statuses ──> attendance_exam_eligibility│
│       └──> attendance_exam_eligibility_logs                         │
│                                                                     │
│  attendance_biometric_templates ──> attendance_biometric_verification_logs│
│  attendance_staff_compliance ──> attendance_qa_compliance_reports   │
│  attendance_roles ──> attendance_staff_roles                        │
│  attendance_notifications                                           │
│  attendance_offline_pending_sync ──> attendance_sync_conflict_log   │
└─────────────────────────────────────────────────────────────────────┘
```

**Important:** Portal tables are READ-ONLY. The attendance system NEVER writes to existing portal tables. All new data goes into `attendance_`-prefixed tables in the local database. There are **NO FOREIGN KEY constraints to portal tables** — all portal IDs (students.id, staff.id, etc.) are stored as plain BIGINT columns with comments documenting the remote reference. Foreign key constraints are enforced only between local `attendance_`-prefixed tables.

---

## Section 4: Attendance Percentage Calculation

```
For each course per student per semester:

  total_sessions = COUNT(attendance_sessions WHERE mysql_course_assigned_id = X
                      AND session_type = 'class'
                      AND status = 'closed')

  attended = COUNT(attendance_records WHERE mysql_student_id = Y
                  AND session_id IN (sessions_above)
                  AND status_id IN (present, late, proxy))

  percentage = (attended / total_sessions) * 100

  Statuses that count as "attended":  present, late, proxy
  Statuses that do NOT affect %:      exam_leave, official_assignment, medical_leave, excused
  Statuses that count as absent:      absent

  Note: excused, exam_leave, official_assignment, medical_leave are excluded from BOTH
        numerator and denominator (they don't punish the student)
```

---

## Section 5: Examination Eligibility Engine Logic

```
Eligibility is evaluated per course whenever:
  1. Attendance is recorded — attendance_records created/updated (attendance_ table)
  2. Payment is made via attendance payment system — debt_payments created (attendance_ table)
  3. Debt is cleared — attendance_debts.payment_status updated (attendance_ table)
  4. Portal system notifies attendance system — tuition_fees/other_fee_trans updated in portal tables (triggered by portal system via webhook or the attendance system polls portal tables periodically)
  5. Exeat is approved/rejected (attendance system reads exeat_requests in portal tables — READ ONLY)
  6. Course registration changes (attendance system reads course_regs in portal tables — READ ONLY)
  7. Bulk re-evaluation via scheduled command

Eligibility rules:
  - attendance_percentage >= required_attendance_percentage (default 80%)
  - school_fees_cleared == TRUE (check portal tuition_fees)
  - NO outstanding attendance_debts with payment_status != cleared/waived
  - NO outstanding exeat debts (check portal student_exeat_debts)
  - is registered for the course (course_regs.is_course_reg = 2)

Approved exeat periods → mark relevant attendance_sessions as "Exam Leave" → excluded from %

Status mapping:
  qualified:            all requirements met
  pending_clearance:    minor docs/payments pending
  attendance_deficiency: attendance < 80%
  outstanding_debt:     unpaid fees or penalties
  not_eligible:         multiple failures (e.g., attendance < 80% AND debts)
```

---

## Section 6: Payment Processing System

The attendance system is the **central payment hub** for all institutional debts — both attendance-related and any other institutional financial obligations. All payment data lives exclusively in the attendance-prefixed tables; the existing portal financial tables are never modified.

### 6.1 Payment Architecture

```
Student Dashboard / Debt Recovery Portal
            │
            ▼
┌──────────────────────────────────────┐
│      Payment Processing Engine        │
│          (MySQL attendance tables)     │
│                                        │
│  ┌──────────────────┐                 │
│  │ Debt Consolidation│ ← Reads from:  │
│  │    Engine         │   • attendance_debts (attendance_ table) │
│  │                   │   • student_exeat_debts (portal - RO)    │
│  │                   │   • tuition_fees (portal - RO)           │
│  │                   │   • other_fee_trans (portal - RO)        │
│  └────────┬─────────┘                 │
│           │                            │
│           ▼                            │
│  ┌──────────────────┐                 │
│  │   Payment Gateway │                 │
│  │   (Paystack/     │                 │
│  │    Bank Transfer) │                 │
│  └────────┬─────────┘                 │
│           │                            │
│           ▼                            │
│  ┌──────────────────┐                 │
│  │  debt_payments   │  ← All payment  │
│  │  + receipts      │     records      │
│  └──────────────────┘                 │
└──────────────────────────────────────┘
```

### 6.2 Debt Types Handled

| Debt Type | Source | Storage | Payment Handler |
|---|---|---|---|
| Attendance Penalty | Auto-generated from missed events | `attendance_debts` (MySQL) | Attendance Payment Engine |
| Late Attendance Fine | Auto-generated from late arrivals | `attendance_debts` (MySQL) | Attendance Payment Engine |
| Chapel/Mass Penalty | Auto-generated from absence | `attendance_debts` (MySQL) | Attendance Payment Engine |
| Seminar Penalty | Auto-generated from absence | `attendance_debts` (MySQL) | Attendance Payment Engine |
| Exeat Violation | Read from portal tables (exeat system) | Displayed on consolidated ledger, payments recorded in MySQL | Attendance Payment Engine |
| Tuition Fee Balance | Read from portal tables | Displayed on consolidated ledger (informational) | Handled by existing portal system |

### 6.3 Payment Flow

```
1. Student views consolidated debt on dashboard
   (reads attendance_debts + portal student_exeat_debts read-only)

2. Student initiates payment for one or more debts
   → POST /api/payments/initialize
   → Amount, debt_ids, payment_method (paystack/bank_transfer)

3. Payment Gateway integration:
   a. Paystack: Initialize transaction → get authorization URL
   b. Bank Transfer: Generate payment reference + account details

4. On successful payment callback:
   → POST /api/payments/verify (webhook or redirect)
   → Create debt_payments record (MySQL attendance_ table)
   → Update attendance_debts.payment_status = 'paid'
   → Update student_debt_ledger (recalculate totals)
   → Dispatch EvaluateEligibilityJob (re-check exam eligibility)
   → Dispatch SendAttendanceNotificationJob (confirmation to student)

5. Manual verification for bank transfers:
   → Debt Recovery Officer verifies payment proof
   → Sets payment_status = 'cleared' or 'verified'
   → Same downstream effects as step 4

6. All payment history stored in MySQL (attendance_ tables):
   → debt_payments table (transaction reference, amount, method, date, verifier)
   → attendance_debts.payment_status tracks lifecycle
```

### 6.4 Consolidated Student Ledger

The `student_debt_ledger` table maintains a real-time aggregated view:

```
For each student per session/semester:
  total_outstanding = SUM(attendance_debts.amount WHERE payment_status IN ('unpaid','overdue'))
                    + SUM(portal student_exeat_debts.amount WHERE payment_status IN ('unpaid'))
  total_paid       = SUM(debt_payments.amount)
  total_cleared    = SUM(attendance_debts.amount WHERE payment_status = 'cleared')
  total_overdue    = SUM(attendance_debts.amount WHERE due_date < NOW() AND payment_status = 'unpaid')
```

This ledger is used by:
- **Student Dashboard** — shows real-time debt status
- **Exeat System** — called via API to check if student is blocked
- **Exam Eligibility Engine** — financial clearance check
- **Debt Recovery Portal** — officer analytics and reporting
- **QA Compliance Reports** — financial compliance tracking

### 6.5 Payment Gateway Configuration

```php
// config/paystack.php (reuse existing exeat Paystack config, or add new)
'paystack' => [
    'publicKey' => env('ATTENDANCE_PAYSTACK_PUBLIC_KEY'),
    'secretKey' => env('ATTENDANCE_PAYSTACK_SECRET_KEY'),
    'paymentUrl' => 'https://api.paystack.co',
],

// Supported payment methods
PAYMENT_METHODS = ['paystack', 'bank_transfer', 'cash', 'waiver']
```

## Section 7: Automated Debt Generation Flow

```
1. Event ends OR attendance session closes
2. System checks attendance_event_attendance for each targeted participant
3. For absent participants (no record):
   a. Look up penalty_schedule for that event's penalty_id
   b. Create attendance_debt record with amount, reason, due_date
   c. Update student_debt_ledger (recalculate totals)
   d. Send notification via attendance_notifications
4. For late participants (record with "late" status):
   a. If event has late_penalty assigned → generate reduced debt
5. Debt automatically blocks:
   - New exeat requests (via integration with portal exeat system)
   - Examination eligibility (exam_eligibility.attendance_debts_cleared = FALSE)
6. When debt is paid/cleared:
   a. Create debt_payments record
   b. Update attendance_debts.payment_status
   c. Update student_debt_ledger
   d. Re-evaluate exam_eligibility for all courses
```

---

## Section 8: Staff Salary Deduction Flow

```
1. Staff mandatory event ends
2. System identifies absent staff via attendance_event_attendance
3. Generates staff_compliance_record with deduction info
4. Report auto-forwarded to QA portal (notification sent)
5. QA officer reviews → approves/rejects
6. Approved report forwarded to Bursary (reported_to_bursary = TRUE)
7. Bursary officer processes deduction via existing payroll system
8. deduction_processed = TRUE, deduction_amount recorded

Multi-step approval ensures legal compliance and prevents automated
salary docking without human oversight.
```

---

## Section 9: Integration with Exeat System

The exeat system (existing Laravel app, separate codebase) and the attendance system communicate via **API calls and read-only access to portal tables**. The attendance system never writes to portal tables.

**Architecture:**
- Exeat system reads attendance debt data by calling the attendance system's REST API endpoints
- Attendance system reads exeat requests from portal tables (read-only) to detect weekday overlaps
- Exeat blocking is enforced via the exeat system's own logic — it calls the attendance system API to check for outstanding debts

| Scenario | Action |
|---|---|
| Exeat approved with weekday overlap | Attendance system detects via read-only query to portal `exeat_requests` → creates `attendance_records` with `exam_leave` status |
| Student has unpaid attendance debts | Exeat system calls `GET /api/attendance/student/{id}/debt-status` → attendance system queries `attendance_debts` and portal `student_exeat_debts` (read-only) → returns block status |
| Student clears all debts | Attendance system re-evaluates `exam_eligibility` → exeat system can poll or be notified via webhook |
| Weekly compliance notification | Attendance system generates and sends `attendance_notifications` independently |
| Exeat overdue | Attendance system reads overdue exeats from portal tables (read-only) → generates penalty debt in `attendance_debts` |

---

## Section 10: Supported Roles (RBAC)

| Role | Module Access | Description |
|---|---|---|
| System Administrator | All modules | Full system access, manage roles, configure penalties, manage venues/terminals |
| Event Convener | Event Engine + Attendance | Create, configure, manage institutional events, open/close sessions |
| Quality Assurance (QA) | Compliance + Reports + Exam Hall | Monitor compliance, generate reports, verify students at exam halls |
| Debt Recovery Officer | Debt Recovery | View debts, verify payments, approve clearance, generate reports |
| Bursary Officer | Financial Reports | Access attendance-related financial reports, deduction schedules |
| Examination Officer | Eligibility + Clearance | Manage exam eligibility, view clearance dashboard |
| Security Personnel | Exam Hall Verification | Verify students at examination halls via biometric/search |
| Student Affairs Officer | Complaints + Exceptions | Manage attendance complaints, exception handling |
| Dean | Department/Faculty Reports | View faculty-wide compliance and attendance reports |
| Head of Department | Department Reports | View departmental compliance and attendance reports |
| Lecturer | Attendance Sessions | Open/close sessions, mark proxy/excused, view statistics |
| Staff Member | Self Clocking | Clock-in/out, view own attendance records |
| Student | Self Attendance | Record attendance, view timetable, history, eligibility status |

---

## Section 11: Redis Optimization Strategy

Redis is the **performance backbone** of this system. It handles caching, rate limiting, queue processing, session management, and real-time counters to keep MySQL load minimal.

### 11.1 Connection Configuration

```php
// config/database.php
'redis' => [
    'client' => 'phpredis',
    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', 6379),
        'database' => 0,        // cache, sessions, rate limits
    ],
    'cache' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', 6379),
        'database' => 1,        // dedicated for data cache
    ],
    'queue' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', 6379),
        'database' => 2,        // dedicated for job queues
    ],
    'session' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', 6379),
        'database' => 3,        // dedicated for sessions
    ],
],
```

### 11.2 Caching Strategy

| Cache Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `student:{id}:profile` | String | 1 hour | Cached student data from MySQL (avoids repeated MySQL reads) |
| `staff:{id}:profile` | String | 1 hour | Cached staff data from MySQL |
| `student:{id}:courses:{session}:{semester}` | Set | 30 min | Courses the student is registered for (`course_regs`) |
| `course:{id}:assigned_lecturer:{session}` | String | 30 min | Which lecturer teaches a course this session |
| `venue:{id}:active_sessions` | Set | 5 min | Currently open attendance sessions at a venue |
| `session:{id}:attendance_count` | Counter | Until session closes | Real-time count of students who marked attendance |
| `session:{id}:participants` | Set | Until session closes | Student IDs who already attended (prevents duplicates) |
| `student:{id}:active_sessions` | Set | 5 min | Which open sessions a student can attend |
| `student:{id}:eligibility:{course}:{session}` | String | 15 min | Cached exam eligibility status per course |
| `student:{id}:debt_total` | String | 10 min | Cached total outstanding debt |
| `terminal:{id}:auth_token` | String | 24 hours | Terminal device authentication cache |
| `biometric:template:{user_type}:{user_id}` | String | Until re-enrollment | Cached biometric template for quick verification |

**Cache Invalidation Triggers:**
- Student profile updated → flush `student:{id}:profile`
- Course registered/dropped → flush `student:{id}:courses:{session}:{semester}`
- Attendance recorded → flush `student:{id}:active_sessions`, `session:{id}:*`
- Eligibility re-evaluated → flush `student:{id}:eligibility:*`
- Debt generated/paid → flush `student:{id}:debt_total`, `student:{id}:eligibility:*`

### 11.3 Rate Limiting

Redis-backed rate limiting protects the API from abuse and terminal flooding:

```php
// Throttle per terminal device
Redis::throttle('terminal:' . $terminalId)
    ->allow(100)->every(60)     // 100 requests per minute per terminal
    ->then(function () {
        // process attendance
    }, function () {
        throw new \Exception('Terminal rate limit exceeded');
    });

// Throttle per student (prevent rapid re-attempts)
Redis::throttle('student:' . $studentId)
    ->allow(1)->every(5)        // 1 attendance attempt per 5 seconds
    ->then(function () {
        // process biometric verification
    });

// Global API rate limit
Redis::throttle('api:' . $request->ip())
    ->allow(2000)->every(60)    // 2000 requests per minute per IP
```

### 11.4 Queue Processing

All async operations go through Laravel Queues (Redis driver) to keep API responses fast:

| Queue Name | Worker Count | Jobs | Priority |
|---|---|---|---|
| `attendance-high` | 4 workers | Biometric verification logging, real-time eligibility update | High |
| `attendance-default` | 6 workers | Attendance record creation, debt generation, notification dispatch | Normal |
| `attendance-low` | 2 workers | Weekly compliance summaries, report generation, data export | Low |
| `attendance-sync` | 3 workers | Offline sync processing, conflict resolution | Normal |

**Key Jobs:**
```php
php artisan queue:work redis --queue=attendance-high,attendance-default,attendance-low,attendance-sync
```

**Critical Queue Jobs:**
- `EvaluateEligibilityJob` — Re-evaluate exam eligibility after attendance/debt/payment changes
- `GenerateDebtJob` — Generate attendance debt after event closure
- `SendAttendanceNotificationJob` — Send notifications via configured channels
- `ProcessOfflineSyncJob` — Process batched sync from offline terminals
- `UpdateDebtLedgerJob` — Recalculate student debt ledger totals
- `GenerateWeeklyComplianceReportJob` — Generate and distribute weekly summaries
- `CheckExeatOverlapJob` — Check approved exeats for weekday overlaps (mark exam leave)

### 11.5 Session & Real-Time

| Use Case | Redis Structure | Details |
|---|---|---|
| Laravel Sessions | `SESSION_DRIVER=redis` | All user sessions in Redis (database 3) |
| Live Attendance Count | `INCR session:{id}:attendance_count` | Real-time counter shown on lecturer dashboard |
| Active Session Tracking | `SADD active_sessions {session_id}` | Track all currently open sessions for polling |
| Terminal Heartbeat | `SET terminal:{id}:last_seen {timestamp} EX 300` | Terminal health monitoring |
| Concurrent Request Lock | `SET lock:student:{id} {uuid} NX EX 3` | Prevent duplicate attendance submissions |

### 11.6 Technology Stack

| Component | Technology | Status |
|---|---|---|
| Backend | Laravel (new project) | New — dual database connections |
| Primary Database | **Local MySQL** (`attendance_system`) | Local DB with 30 `attendance_`-prefixed tables (read/write) |
| Secondary Database | **Remote MySQL** (`dbinv2oggorg69`) | Existing portal tables (read-only via `mysql_remote` connection) |
| Auth | Sanctum (portal `users` table) | Existing — tokens from users table |
| Admin Portal | React (Inertia, new) | New pages for attendance, events, debts, eligibility, QA |
| Mobile App (Student + Staff) | React Native | New modules for attendance, event participation |
| Attendance Terminal | Android Application | New — uses same API with device certificate auth |
| Cache (Redis) | Database 0 + 1 | Data cache: student profiles, course regs, templates, eligibility, debt totals |
| Queues (Redis) | Database 2 | Job queues for eligibility, debt gen, notifications, sync |
| Sessions (Redis) | Database 3 | All user session storage |
| Object Storage | S3-compatible | Biometric enrollment images, excuse documents, reports |

---

## Section 12: Implementation Order

| Phase | Modules | Description |
|---|---|---|
| **Phase 1** | Venue & Terminal Infrastructure | Create attendance-prefixed tables, venues, terminals, certificates, device auth |
| **Phase 2** | Attendance Core | Sessions, records, status types, excuse management, percentage calculation |
| **Phase 3** | Attendance Roles | RBAC tables, role assignments, middleware |
| **Phase 4** | Biometric Enrollment & Verification | Template storage (AES-256 encrypted), liveness detection, verification logging |
| **Phase 5** | Staff Clocking | Clock-in/out, staff attendance records, venue restriction |
| **Phase 6** | Institutional Event Engine | Events, categories, target groups, participant generation, recurrence |
| **Phase 7** | Penalty Schedule & Debt Recovery | Penalty definitions, auto-debt generation, payment tracking, ledger |
| **Phase 8** | Examination Eligibility Engine | Continuous evaluation, eligibility dashboard, status triggers |
| **Phase 9** | Staff Compliance & QA | Compliance records, QA report generation, bursary/HR integration |
| **Phase 10** | Exeat Integration | Exam leave auto-marking, debt blocking, combined ledger |
| **Phase 11** | Offline Sync | Terminal sync protocol, conflict resolution, retry logic |
| **Phase 12** | Notifications & Reporting | Attendance notifications, weekly summaries, exports (PDF/Excel/CSV) |

---

## Section 13: Strategic Recommendations

### Technical & Security

1. **Biometric Data Privacy (GDPR/NDPR):** Encrypt templates with AES-256-GCM using hardware-backed keystores (Android TEE). Never store raw images. Store only hashed templates on terminals.

2. **Offline Conflict Resolution:** Use cryptographic handshakes for terminal-server sync. Server timestamp wins for eligibility/status changes; device timestamp wins for attendance time. Log all conflicts.

3. **Peak Load Handling:** At exam start times, thousands of biometric requests hit the API. Use Redis for request throttling, queue buffering, and template caching. MySQL handles the write throughput with proper indexing.

4. **Database Indexing Strategy:** All MySQL attendance tables have indexes on foreign keys, status fields, and timestamp fields for query performance.

### Operational & Governance

5. **Exam Hall Bottleneck Prevention:** Push "Pending Clearance" warnings heavily via weekly notifications. 99% of issues should be resolved before exam day, not at the hall door.

6. **Staff Deduction Legal Policy:** Multi-step approval workflow (HR → Dean → Bursary) before any salary deduction. Manual override capability for edge cases.

7. **Grace Periods for Variable Fines:** Build operational safety buffer into the Event Compliance Engine. Allow configurable grace minutes to prevent false positives from terminal queue delays.

8. **Audit Trail:** Every attendance action records: user, time, device, venue, method, and status. `attendance_venue_terminal_logs`, `attendance_biometric_verification_logs`, and `attendance_exam_eligibility_logs` provide immutable audit trails.
