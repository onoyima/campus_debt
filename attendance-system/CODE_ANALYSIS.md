# Code Analysis, User Flows & Gap Analysis

## 1. System Architecture Overview

The attendance system is a **Laravel 12.62** backend with an **Inertia.js (React) web admin portal** and a **React Native mobile app**. It connects to **two MySQL databases**:

| Database | Host | Purpose |
|---|---|---|
| **Local** | `127.0.0.1:3306` (`attendance_system`) | All `attendance_*` tables — **READ/WRITE** |
| **Remote** | `c67239.sgvps.net:3306` (portal DB) | Existing student/staff/academic tables — **READ ONLY** |

### 1.1 Key Architecture Decisions

- **No FOREIGN KEY constraints to portal tables** — portal IDs stored as plain `BIGINT` columns
- **Sanctum tokens** use a custom `PersonalAccessToken` model forced to `mysql` connection
- **Biometric provider pattern** — `BiometricProviderContract` with `AwsRekognitionProvider` (production) and `LocalTestProvider` (dev/testing)
- **Pluggable payment gateway** — currently only Paystack implemented
- **Ghost admin IDs** (506, 577, 596) bypass all role/access checks and audit trails

---

## 2. User Types & Their Flows

### 2.1 Student

**Authentication:**
- Login via email OR matric_no prefix + password at `/login`
- Token-based session via Sanctum
- `/me` endpoint refreshes user data on each page load

**Available modules (via sidebar):**
| Module | What They See | API Endpoints |
|---|---|---|
| Dashboard | Overview: eligibility statuses, attendance %, outstanding debts, recent records | `GET /student-dashboard/overview` |
| My Dashboard | Full student dashboard | Inertia: `/student-dashboard` |
| Exeats | List/view exeat (leave) requests | `GET /exeats`, `GET /exeats/{id}` |
| Biometrics | Enroll face/fingerprint, verify identity | `POST /biometric-templates`, `POST /biometric-templates/verify`, `POST /biometric-templates/search-verify` |
| Attendance (mobile) | Mark attendance via face/fingerprint | `POST /attendance-records` |
| Profile | View personal info | `GET /me` |

**Complete usage flow:**
1. Login → Dashboard shows attendance %, eligibility status, debts
2. Biometric enrollment (one-time): capture face/fingerprint → stored as encrypted template
3. Daily: Open app → facial verification → venue authorization → attendance recorded
4. Monitor eligibility via dashboard throughout semester
5. Request exeat when needing leave → tracked separately
6. Pay any outstanding debts via Paystack integration

### 2.2 Staff (No Admin Role)

**Authentication:**
- Login via email + password at `/login`
- `roles` array in response will be empty

**Available modules:**
| Module | Description |
|---|---|
| Dashboard | System-wide stats (venues, terminals, sessions, records) |
| Staff Clocking | Personal clock-in/clock-out with biometric verification |
| Biometrics | Enroll and verify own biometric templates |

**Flow:** Basic staff members use the system ONLY for their own attendance tracking (clock-in/out) and biometric enrollment. They see no admin CRUD interfaces.

### 2.3 System Administrator

**Authentication:** Same as staff login, but has `system_administrator` role in the `roles` array.

**Available modules (full access):**
| Module | Description |
|---|---|
| Infrastructure | CRUD Venues, Terminals, Terminal Logs |
| Attendance | Sessions, Records, Excuses (admin view) |
| Events | Institutional Events, Event Categories |
| Finance | Debts, Debt Recovery, Penalties, Payments |
| Exams | Eligibility, Eligibility Engine, Exam Clearance, Hall Verification |
| Compliance | Staff Compliance, QA Dashboard |
| System | Roles, Staff Roles, Notifications, Offline Sync, **Audit Log** |

**Flow:**
1. Manage venues (classrooms, halls, chapels) and terminals (biometric devices)
2. Create/assign attendance roles to staff members
3. Configure penalty schedules (fine amounts, rules)
4. Monitor all system activity via audit log
5. Oversee offline sync processing
6. Manage notifications

### 2.4 Event Convener

**Available modules:**
| Module | Description |
|---|---|
| Events | CRUD institutional events, manage participants |
| Event Categories | View/create event types |

**Flow:**
1. Create event → define title, dates, venue, attendance window
2. Select participants (faculty, department, level, individuals)
3. Assign penalties from approved schedule if mandatory
4. Event lifecycle managed automatically (activate, close, penalize)
5. Monitor attendance in real-time

### 2.5 Examination Officer / QA Officer

**Available modules:**
| Module | Description |
|---|---|
| Attendance | View sessions, records, excuses |
| Exams | Eligibility engine, exam clearance, hall verification |
| Compliance | Staff compliance, QA dashboard |

**Flow:**
1. Monitor attendance compliance across courses
2. Run eligibility engine (evaluate all/student/course)
3. Verify students at exam hall via search
4. Generate compliance reports for QA

### 2.6 Bursary / Debt Recovery Officer

**Available modules:**
| Module | Description |
|---|---|
| Finance | Debts, Debt Recovery, Penalty Schedule, Payments |
| Student Debt Ledger | View/recalculate student cumulative balances |

**Flow:**
1. View outstanding debts by department/faculty
2. Verify manual payments and clear debts
3. Monitor debt recovery performance
4. Process penalty schedule changes

### 2.7 Ghost Admin (IDs: 506, 577, 596)

- **Bypasses ALL middleware checks** — staff access verification, role checks
- **No timestamps recorded** — `created_at`/`updated_at` set to fixed `2024-01-01 00:00:00`
- **No audit trail** — all create/update/delete operations suppressed
- Intended for emergency super-admin access without leaving traces

---

## 3. Usage Flow per Module

### 3.1 Biometric Enrollment & Verification

```
Enrollment (one-time):
  Student/Staff → POST /biometric-templates (with face image or fingerprint data)
               → BiometricService.enroll()
               → encrypts template via libsodium (sodium_crypto_secretbox)
               → stores in attendance_biometric_templates
               → logs in attendance_biometric_verification_logs

Verification (daily):
  User → POST /biometric-templates/verify (with live capture)
       → BiometricService.verifyFace() or verifyFingerprint()
       → delegates to BiometricProviderContract (AWS or Local)
       → liveness detection + confidence scoring
       → returns match/fail with scores
```

**Provider implementations:**
- **LocalTestProvider**: Uses MD5 hash + Levenshtein distance (fake, for development)
- **AwsRekognitionProvider**: Uses AWS Rekognition CompareFaces + DetectFaces API (production)

### 3.2 Attendance Recording

```
Class attendance:
  Lecturer → creates AttendanceSession (course, venue, time window)
           → session status: scheduled → active → closed (automatic)
  
  Student → biometric verification → POST /attendance-records
          → records: student_id, session_id, status_id, venue_id, method, scores
          → auto-evaluates eligibility via EligibilityEngineService

Event attendance:
  Event Convener → creates InstitutionalEvent with target groups
                 → participants enroll automatically from rules
                 → POST /event-attendance for verification

Staff clocking:
  Staff → POST /staff-clockings/clock-in
        → POST /staff-clockings/clock-out
        → venue-restricted to assigned office
```

### 3.3 Exam Eligibility Engine

```
Triggers: attendance recorded, payment made, debt cleared, manual evaluation

EligibilityEngineService.evaluate():
  1. Calculate attendance % = attended_classes / total_classes * 100
  2. Check school fees (reads portal tuition_fees table)
  3. Check attendance debts (unpaid penalties)
  4. Check course registration (course_regs.is_course_reg = 2)
  5. Determine status:
     - All clear → qualified
     - Minor issues → pending_clearance
     - Attendance < 80% → attendance_deficiency
     - Unpaid debts → outstanding_debt
     - Multiple failures → not_eligible

Schedule: Command `attendance:evaluate-eligibility` runs hourly
```

### 3.4 Event Lifecycle & Penalty Generation

```
EventLifecycleService.processActiveEvents() — runs every minute:
  1. Activate scheduled events where start time has arrived
  2. Close expired events where end time has passed
  3. For closed mandatory events:
     a. Find participants with no attendance (absent)
     b. Find participants with late attendance
     c. Generate penalty debts via attendance_debts
     d. Generate staff compliance records
     e. Update student debt ledger

Schedule: Command `attendance:process-events` runs every minute
```

### 3.5 Payment Processing

```
Student → POST /payments/initialize (with debt_ids, amount, email)
        → PaymentService → Paystack transaction/initialize
        → Returns authorization URL

Student → pays on Paystack → redirected back to app
        → POST /payments/verify (with reference)
        → PaymentService → Paystack transaction/verify
        → On success:
          - Creates AttendanceDebtPayment record(s)
          - Marks attendance_debts as paid
          - Updates student_debt_ledger
          - Sends notification
          - Dispatches eligibility re-evaluation

Paystack webhook → POST /payments/webhook (HMAC-signed)
                 → Same processing as above
```

### 3.6 Offline Sync

```
Terminal → queues records locally when offline
         → POST /offline-sync/batch (when online)
         → SyncService.processSyncRecord():
           - Table-specific handlers (attendance_records, staff_clocking, event_attendance)
           - Conflict detection (stale-update rejection via timestamps)
           - Duplicate detection (by unique key)
           - Creates sync_conflict_log on disputes

Admin → processes pending syncs individually or bulk
      → POST /offline-sync/{id}/process
      → POST /offline-sync/process-all
```

### 3.7 Weekly Compliance Notifications

```
Schedule: Every Saturday 08:00

SendBulkWeeklyComplianceJob → NotificationService.sendBulkWeeklyCompliance()
  → Loops all distinct students with attendance records
  → For each student: creates SendAttendanceNotificationJob
  → Each job: sends email (via Mail) and/or SMS (via Termii)
  → Message includes: attendance %, eligibility status, outstanding debts
```

---

## 4. Gap Analysis: Plan vs Implementation

### 4.1 Direct Comparison by Plan Section

| Plan Requirement | Implementation Status | Details |
|---|---|---|
| **1. Classroom Attendance** | ✅ Implemented | Sessions, records, status types, excused absences. Auto-marks absent for course-registered students when sessions activate via `AutoAbsentMarkService` (integrated into `EventLifecycleService` + `SessionController`). |
| **2. Seminar Attendance** | ✅ Implemented | Via institutional events with target groups |
| **3. Staff Attendance** | ✅ Implemented | Clock-in/out with biometric, venue restriction |
| **4. Chapel/Mass** | ⚠️ Partial | Event category exists, but NOT implemented: faculty/dept/level/assigned-day eligibility |
| **5. Special Events** | ✅ Implemented | Institutional events with full lifecycle |
| **6. Exeat Leave** | ✅ Implemented | `exeat_leave` status type added (`counts_as_present=true`) — counts toward exam eligibility. Auto-marking via `attendance:process-exeat-leave` command (hourly). Approved exeats auto-create attendance records with `exeat_leave` status, counted as present by `EligibilityEngineService`. |
| **7. Status Types** | ✅ Implemented | All 8 statuses (present, late, absent, excused, proxy, exam_leave, official_assignment, medical_leave) |
| **8. Venue Auth** | ✅ Implemented | Venues + terminals with device certificates |
| **9. Attendance Terminals** | ⚠️ Partial | DB schema exists, REST API for CRUD. NOT implemented: actual terminal software (Android/Linux app) |
| **10. Fingerprint as fallback** | ⚠️ Partial | Provider interface has method, mobile has component. NOT implemented: AWS Rekognition doesn't support fingerprint |
| **11. Anti-Spoof** | ⚠️ Partial | Liveness score tracked. NOT implemented: printed photo/screenshot/video replay detection |
| **12. Offline Architecture** | ⚠️ Partial | Server-side sync service + mobile queue. NOT implemented: terminal local storage, full offline terminal software |
| **13. Audit Trails** | ✅ Implemented | Comprehensive: 30 tables, auto-log via Eloquent events, ghost admin suppression |
| **14. Reporting** | ❌ Not Implemented | No PDF/Excel/CSV export functionality. Plan specifies exports |
| **15. RBAC** | ⚠️ Partial | 8 roles implemented. Plan lists: Dean, HOD, Lecturer, Programme Coordinator, Registrar, Security Personnel, Student Affairs — NOT all implemented |
| **16. Debt Recovery Portal** | ⚠️ Partial | Basic debt list + recovery dashboard. NOT implemented: real-time analytics, debt recovery performance tracking |
| **17. Bursary Integration** | ❌ Not Implemented | Staff compliance table has `reported_to_bursary` flag. No automated pipeline to bursary system |
| **18. Exeat Financial Compliance** | ❌ Not Implemented | Plan says block exeat if debts exist. NOT implemented |
| **19. Examination Eligibility** | ✅ Implemented | Full engine with attendance %, fees, debts, course registration |
| **20. Electronic Exam Clearance** | ✅ Implemented | Digital clearance dashboard, hall verification |
| **21. Digital Exam Hall Verification** | ⚠️ Partial | Search by ID/matric/name. NOT implemented: QR code, NFC student card |
| **22. Weekly Notifications** | ✅ Implemented | Scheduled command + queued jobs |
| **23. Biometric Enrollment** | ✅ Implemented | Via web + mobile app |

### 4.2 Technology Stack Comparison

| Layer | Plan Recommends | Implementation | Gap |
|---|---|---|---|
| Backend | Laravel | Laravel 12.62 | ✅ Match |
| Cache | Redis | **None** | ❌ No caching layer |
| Queue | Laravel Queues | Laravel Queues (database driver) | ✅ Match |
| Auth | JWT | Sanctum Tokens | ⚠️ Different approach |
| Mobile | React Native | React Native 0.76.6 | ✅ Match |
| Admin Portal | React | React (Inertia.js) | ✅ Match (React via Inertia) |
| Terminal OS | Android/Linux | **No terminal software** | ❌ Not implemented |
| Storage | Object Storage | **Local filesystem** | ❌ No object storage |
| Biometrics | Face + Fingerprint | AWS Rekognition + LocalTest | ⚠️ Fingerprint not functional in AWS provider |

### 4.3 Critical Gaps

| Gap | Impact | Priority |
|---|---|---|
| **No terminal software** | Core attendance terminals don't exist | **HIGH** |
| **No Redis caching** | Performance risk during peak loads (exam starts, chapel sessions) | **HIGH** |
| **No PDF/Excel/CSV exports** | Plan-required reporting feature missing | **MEDIUM** |
| **No exeat debt blocking** | Plan requires exeat blocked if debts exist | **MEDIUM** |
| **No chapel eligibility** | Chapel attendance can't be targeted by faculty/dept/level/day | **MEDIUM** |
| **No automated bursary pipeline** | Staff salary deduction reporting not automated | **MEDIUM** |
| **QR code / NFC not implemented** | Exam hall verification limited to manual search | **LOW** |
| **Anti-spoof measures minimal** | AWS Rekognition liveness is basic eye/mouth detection | **LOW** |
| **Fingerprint not functional on AWS** | AwsRekognitionProvider logs warning and returns 0 match | **LOW** |

### 4.4 Over-Engineering (Plan doesn't ask for, but implemented)

| Feature | Justification |
|---|---|
| **Soft Delete** on all 30 tables | Adds data safety — trashed records can be restored |
| **Audit Trail** with viewer | Comprehensive tracking of all changes |
| **Ghost Admin system** | Emergency override for system administrators |
| **Biometric provider pattern** | Allows swapping between local test and AWS without code changes |
| **Offline sync with conflict resolution** | Supports unreliable network environments |

---

## 5. File Map

```
attendance-system/
├── app/
│   ├── Console/
│   │   └── Commands/
│   │       ├── EvaluateExamEligibility.php    # Hourly eligibility evaluation
│   │       ├── ProcessAttendanceEvents.php    # Every-minute event lifecycle
│   │       └── SendWeeklyCompliance.php       # Saturday 8am notifications
│   ├── Exceptions/
│   │   └── Handler.php
│   ├── Http/
│   │   ├── Controllers/Api/                  # 30 controllers
│   │   ├── Middleware/                        # 5 middleware (role, student, staff access, inertia, security)
│   │   └── ...
│   ├── Jobs/
│   │   ├── SendAttendanceNotificationJob.php  # Queued notification delivery
│   │   └── SendBulkWeeklyComplianceJob.php    # Bulk weekly compliance dispatch
│   ├── Models/
│   │   ├── Attendance/                       # 31 attendance models
│   │   ├── Portal/                           # 3 remote portal models
│   │   ├── PersonalAccessToken.php           # Custom Sanctum token
│   │   └── User.php                          # Default Laravel user
│   ├── Providers/
│   │   └── AppServiceProvider.php            # Audit listeners, biometric binding, ghost suppression
│   └── Services/
│       ├── AuditService.php                  # Auto-audit trail logging
│       ├── BiometricService.php              # Core biometric engine
│       ├── Biometrics/                       # Provider pattern (contract + 2 implementations)
│       ├── EligibilityEngineService.php      # Exam eligibility computation
│       ├── EventLifecycleService.php         # Event auto-activation/closure/penalties
│       ├── GhostAdminService.php             # Hardcoded super-admin check
│       ├── NotificationService.php           # Notification creation + delivery
│       ├── PaymentService.php                # Paystack integration
│       ├── SmsService.php                    # Termii SMS (fallback silent)
│       └── SyncService.php                   # Offline sync processing
├── bootstrap/
│   └── app.php                               # Middleware registration
├── config/
│   ├── database.php                          # Dual MySQL connections
│   ├── sanctum.php                           # Stateful domains
│   └── services.php                          # Biometrics, SMS, Paystack config
├── database/
│   ├── migrations/                           # 8 migration files (31 tables total)
│   ├── factories/
│   └── seeders/
├── resources/
│   └── js/
│       ├── Pages/                            # 30+ Inertia page components
│       └── Components/
│           └── AppLayout.jsx                 # Main layout with sidebar
├── routes/
│   ├── api.php                               # ~150+ named API routes
│   ├── web.php                               # 44 Inertia page routes
│   └── console.php                           # Scheduled task definitions
├── mobile-app/                               # React Native application
│   ├── App.tsx                               # Navigation setup
│   ├── src/
│   │   ├── screens/                          # 6 screens (Login, Student/Staff Dashboard, Attendance, Events, Profile)
│   │   ├── components/                       # CameraCapture, FingerprintCapture, LoadingSpinner
│   │   ├── api/client.ts                     # Axios HTTP client
│   │   ├── services/offlineSync.ts           # Offline queue
│   │   └── constants/theme.ts               # Brand colors
│   └── package.json
└── .env
```
