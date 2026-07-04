# Integrated Institutional Attendance, Presence Verification & Examination Movement Management System

A comprehensive university attendance and compliance platform serving **students**, **academic staff**, **non-academic staff**, **faculty administrators**, and **institutional management**. Built with Laravel 12 + React (Inertia.js) + React Native.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [User Roles & Access](#user-roles--access)
- [Module Reference](#module-reference)
- [API Documentation](#api-documentation)
- [Mobile App](#mobile-app)
- [Scheduled Tasks](#scheduled-tasks)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This system provides **secure, location-aware, biometric attendance verification** for:

- Classroom Attendance
- Seminar Attendance
- Chapel / Mass Attendance
- Staff Attendance (clock-in/out)
- Special Institutional Events
- Examination Leave & Movement Tracking
- Debt Recovery & Financial Compliance
- Examination Eligibility & Electronic Clearance

The system eliminates attendance fraud, proxy attendance, location spoofing, and unauthorized attendance submissions while maintaining a seamless experience for all users.

---

## Core Features

### Attendance Management
| Feature | Description |
|---|---|
| **Multi-method verification** | Facial recognition (AWS Rekognition), fingerprint, terminal-based |
| **Venue authentication** | Attendance only valid from approved locations via registered terminals |
| **Time enforcement** | Attendance only within configured windows with grace period support |
| **Session management** | Lecturers open/close sessions; auto-closure on timeout |
| **Status types** | Present, Late, Absent, Excused, Proxy, Exam Leave, Official Assignment, Medical Leave |
| **Excuse management** | Students submit excuses; authorized personnel approve |

### Event Management
| Feature | Description |
|---|---|
| **Event creation** | Title, description, category, venue, date, time window, grace period |
| **Dynamic participant selection** | By faculty, department, level, programme, individual, or combination |
| **Recurring events** | Daily, weekly, monthly, semester-based, custom |
| **Concurrent events** | Multiple simultaneous events at different venues without interference |
| **Automated lifecycle** | Auto-activate, close, classify attendance, generate penalties |
| **Staff compliance** | Auto-generated compliance records for mandatory events |

### Financial Compliance
| Feature | Description |
|---|---|
| **Penalty schedule** | Centralized configurable fine amounts per violation type |
| **Auto debt generation** | Missing compulsory events automatically create financial obligations |
| **Cumulative ledger** | Per-student consolidated debt view across all violation types |
| **Paystack integration** | Online payment processing with webhook verification |
| **Debt recovery portal** | Dedicated interface for recovery officers |

### Examination Management
| Feature | Description |
|---|---|
| **Eligibility engine** | Continuous evaluation per course checking attendance %, fees, debts, registration |
| **Electronic clearance** | Digital replacement for paper examination cards |
| **Hall verification** | QA officers verify students at exam venue by ID/matric/name |
| **80% threshold** | Configurable minimum attendance percentage per course |

### Offline Support
| Feature | Description |
|---|---|
| **Terminal sync** | Attendance terminals queue records when offline |
| **Conflict resolution** | Stale-update rejection, duplicate detection, conflict logging |
| **Mobile offline queue** | React Native app queues records locally when disconnected |
| **Automatic retry** | Exponential backoff with configurable retry limits |

### Administrative
| Feature | Description |
|---|---|
| **RBAC** | 8 configurable roles (system_admin, qa_officer, event_convener, etc.) |
| **Soft delete** | All 30 tables support trash/restore/force-delete |
| **Audit trail** | Auto-logged create/update/delete/restore with user, IP, old/new values |
| **Weekly compliance** | Automated Saturday notifications summarizing attendance, debts, eligibility |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REMOTE MYSQL (Portal Database)                     │
│                         ⚠ READ ONLY ONLY                             │
│                                                                      │
│  students, staff, student_academics, courses, course_regs,           │
│  departments, faculties, academic_sessions, vu_semesters,            │
│  lecture_venues, exeat_requests, tuition_fees, other_fee_trans       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ READ ONLY via mysql_remote connection
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL MYSQL (attendance_system DB)                │
│                    ALL 30+ TABLES WITH attendance_ PREFIX            │
│                    ALL WRITES HERE — NO EXCEPTIONS                   │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Venues &   │  │  Attendance  │  │   Events &   │               │
│  │  Terminals   │  │   Core       │  │  Penalties   │               │
│  │              │  │              │  │              │               │
│  │ • venues     │  │ • sessions   │  │ • events     │               │
│  │ • terminals  │  │ • records    │  │ • categories │               │
│  │ • logs       │  │ • excuses    │  │ • target_grps│               │
│  └─────────────┘  │ • clocking    │  │ • participants│              │
│                    └──────────────┘  │ • attendance  │               │
│                                       │ • penalties   │               │
│  ┌─────────────┐  ┌──────────────┐   │ • debts       │               │
│  │ Biometrics   │  │  Eligibility │   │ • payments    │               │
│  │              │  │              │   │ • ledger      │               │
│  │ • templates  │  │ • statuses   │   └──────────────┘               │
│  │ • verif_logs │  │ • eligibility│                                   │
│  └─────────────┘  │ • logs       │  ┌──────────────┐               │
│                    └──────────────┘  │  System       │               │
│  ┌─────────────┐  ┌──────────────┐  │              │               │
│  │  Offline     │  │  Compliance  │  │ • roles      │               │
│  │  Sync        │  │              │  │ • staff_roles│               │
│  │              │  │ • staff_comp │  │ • notifications              │
│  │ • pending    │  │ • qa_reports │  │ • audit_trail│               │
│  │ • conflicts  │  └──────────────┘  └──────────────┘               │
│  └─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Remote portal tables are READ ONLY** — the attendance system never writes to existing portal tables
2. **No FOREIGN KEY constraints to portal tables** — portal IDs stored as plain BIGINT columns
3. **All new data in `attendance_`-prefixed tables** in local MySQL
4. **Sanctum tokens persisted locally** via custom `PersonalAccessToken` model
5. **API-first design** — frontend is a consumer, backend is pure REST JSON

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Laravel | 12.62 | PHP framework |
| PHP | 8.2.12 | Runtime |
| MySQL | 8.x (XAMPP) | Primary database |
| Sanctum | Latest | API token authentication |
| Inertia.js | Latest | Server-driven SPA |
| Laravel Queues | Database driver | Async job processing |

### Frontend (Web Admin)
| Technology | Purpose |
|---|---|
| React | UI library |
| Tailwind CSS v4 | Styling (Veritas brand: `#004f40`, milk `#FDF8F0`, cream `#FAF3E3`) |
| Vite | Build tool |
| Inertia.js | Server-side rendering integration |
| Axios | HTTP client |

### Mobile App
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.76.6 | Cross-platform mobile app |
| TypeScript | 5.5.4 | Type safety |
| react-native-vision-camera | 4.6.0 | Face capture |
| react-native-biometrics | 3.0.1 | Fingerprint verification |
| react-native-reanimated | 3.16.0 | Animations |
| react-navigation | 7.x | Screen navigation |
| AsyncStorage | 2.1.0 | Offline queue storage |

### Biometric Providers
| Provider | Use |
|---|---|
| **AWS Rekognition** | Production face comparison + liveness detection |
| **LocalTestProvider** | Development/testing (hash-based mock) |

### Payment Gateway
| Gateway | Status |
|---|---|
| **Paystack** | Fully implemented (initialize, verify, webhook, bank list, account resolution) |

---

## Quick Start

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL 8.x (XAMPP recommended on Windows)
- React Native CLI (for mobile app)

### Installation

```bash
# Clone the repository
git clone <repo-url> attendance-system
cd attendance-system

# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials

# Generate application key
php artisan key:generate

# Run migrations (creates all 31 tables)
php artisan migrate

# (Optional) Seed test data
php artisan db:seed

# Install mobile app dependencies
cd mobile-app
npm install
cd ..

# Start development servers
php artisan serve          # Backend on http://localhost:8000
npm run dev                # Vite dev server for Inertia
```

---

## Database Setup

### Environment Configuration

```env
# Local DB (attendance system)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=attendance_system
DB_USERNAME=root
DB_PASSWORD=

# Remote DB (existing portal - READ ONLY)
REMOTE_DB_HOST=c67239.sgvps.net
REMOTE_DB_PORT=3306
REMOTE_DB_DATABASE=dbinv2oggorg69
REMOTE_DB_USERNAME=
REMOTE_DB_PASSWORD=

# Sanctum
SESSION_DRIVER=database
SANCTUM_STATEFUL_DOMAINS=localhost:8000

# Paystack (Live keys)
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=

# AWS Rekognition (optional - for production biometrics)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_REKOGNITION_COLLECTION_ID=

# Termii SMS (optional)
TERMII_API_KEY=
TERMII_SENDER_ID=
```

### Database Tables

The migration system creates **31 total tables**:

- **30 `attendance_*` tables** in the local database covering: venues, terminals, sessions, records, excuses, clocking, events, categories, participants, attendance, penalties, debts, payments, ledger, eligibility, biometrics, sync, compliance, QA, roles, notifications, audit trail
- **1 `personal_access_tokens` table** for Sanctum token storage (forced to `mysql` connection)

---

## User Roles & Access

### Current Implemented Roles

| Role | Access Level | Middleware |
|---|---|---|
| `system_administrator` | Full system access | `role:system_administrator` |
| `event_convener` | Create/manage institutional events | `role:event_convener` |
| `examination_officer` | Exam eligibility & clearance | `role:examination_officer` |
| `qa_officer` | Compliance monitoring & reports | `role:qa_officer` |
| `debt_recovery_officer` | Debt management & payment verification | `role:debt_recovery_officer` |
| `bursary_officer` | Financial reports & deductions | `role:bursary_officer` |
| `security_personnel` | Exam hall & gate verification | `role:security_personnel` |
| `student_affairs` | Student complaints & exceptions | `role:student_affairs` |

### Role-Guarded Route Groups

| Route Group | Allowed Roles |
|---|---|
| System Admin | `system_administrator` |
| Examination & QA | `examination_officer`, `qa_officer`, `system_administrator` |
| Events | `event_convener`, `system_administrator` |
| Finance | `bursary_officer`, `debt_recovery_officer`, `system_administrator` |

### Special Users

- **Ghost Admins** (IDs: 506, 577, 596): Bypass all middleware checks, role verification, timestamps, and audit logging

---

## Module Reference

### 1. Venue & Terminal Infrastructure
- `attendance_venues` — Lecture halls, chapels, staff offices, event venues
- `attendance_terminals` — Biometric devices assigned to venues
- `attendance_venue_terminal_logs` — Terminal event history

### 2. Attendance Core
- `attendance_sessions` — Class/event attendance periods
- `attendance_records` — Individual attendance entries
- `attendance_excuses` — Approved absence reasons
- `attendance_staff_clocking` — Staff clock-in/out records
- `attendance_status_types` — 8 configurable statuses

### 3. Event Engine
- `attendance_institutional_events` — All configured events
- `attendance_event_categories` — 14 predefined categories
- `attendance_event_target_groups` — Participant selection rules
- `attendance_event_participants` — Resolved participant list
- `attendance_event_attendance` — Event attendance records
- `attendance_event_penalty_assignments` — Per-event penalty rules

### 4. Financial Compliance
- `attendance_penalty_schedule` — Centralized penalty definitions
- `attendance_debts` — Per-student financial obligations
- `attendance_debt_payments` — Payment records
- `attendance_student_debt_ledger` — Cumulative debt summary

### 5. Examination Engine
- `attendance_exam_eligibility_statuses` — 5 statuses (qualified through not_eligible)
- `attendance_exam_eligibility` — Per-course eligibility records
- `attendance_exam_eligibility_logs` — Change history

### 6. Biometrics
- `attendance_biometric_templates` — Encrypted face/fingerprint templates
- `attendance_biometric_verification_logs` — Verification attempt history

### 7. Offline Sync
- `attendance_offline_pending_sync` — Queued records from terminals
- `attendance_sync_conflict_log` — Dispute records

### 8. Staff Compliance & QA
- `attendance_staff_compliance` — Staff attendance compliance
- `attendance_qa_compliance_reports` — Generated report metadata

### 9. RBAC
- `attendance_roles` — 8 configurable role definitions
- `attendance_staff_roles` — Staff-to-role assignments

### 10. Notifications
- `attendance_notifications` — Full notification history with delivery tracking

### 11. Audit Trail
- `attendance_audit_trail` — Auto-logged all CRUD operations (ghost admins excluded)

---

## API Documentation

The API provides **150+ named routes** organized by middleware group.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Authenticate student or staff |
| GET | `/api/me` | Get current user profile |
| POST | `/api/logout` | Revoke current token |

### Student Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/student-dashboard/overview` | Student dashboard aggregations |
| POST | `/api/attendance-records` | Submit attendance (student-facing) |
| GET/POST/PUT/DEL | `/api/excuses` | Manage excuses |
| GET | `/api/exeats` | List exeat requests |
| GET | `/api/exeats/{id}` | View exeat details |
| POST | `/api/biometric-templates` | Enroll biometric |
| POST | `/api/biometric-templates/verify` | Verify identity |
| GET | `/api/offline-sync/stats` | Sync queue status |
| POST | `/api/offline-sync/batch` | Submit offline batch |

### Staff Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/staff-clockings/my` | Personal clocking history |
| POST | `/api/staff-clockings/clock-in` | Clock in |
| POST | `/api/staff-clockings/clock-out` | Clock out |
| POST | `/api/biometric-templates/enroll` | Staff biometric enrollment |
| POST | `/api/biometric-templates/verify-me` | Staff biometric verification |

### Admin Endpoints (Role-Gated)
Each role group has full CRUD for its domain. See `routes/api.php` for complete listing.

| Group | Prefix | Roles |
|---|---|---|
| System Admin | `/api/venues`, `/terminals`, `/roles`, `/staff-roles`, `/audit-logs`, ... | `system_administrator` |
| Exams & QA | `/api/sessions`, `/attendance-records`, `/exam-eligibility`, `/staff-compliance`, ... | `examination_officer`, `qa_officer` |
| Events | `/api/event-categories`, `/api/institutional-events`, `/api/event-participants`, ... | `event_convener` |
| Finance | `/api/debts`, `/api/debt-payments`, `/api/penalty-schedule`, `/api/payments`, ... | `bursary_officer`, `debt_recovery_officer` |

### Soft Delete Endpoints
Every resource supports:
| Method | Endpoint |
|---|---|
| POST | `/api/{resource}/{id}/restore` |
| DELETE | `/api/{resource}/{id}/force` |

### Audit Logs
| Method | Endpoint |
|---|---|
| GET | `/api/audit-logs?event=&auditable_type=&date_from=&date_to=` |
| GET | `/api/audit-logs/{id}` |
| GET | `/api/audit-logs/event-types` |

---

## Mobile App

Location: `mobile-app/`

### Screens

| Screen | Description |
|---|---|
| **Login** | Email/matric + password authentication |
| **Student Dashboard** | Course count, attendance %, debts, quick actions |
| **Staff Dashboard** | Attendance actions, events, profile |
| **Attendance** | Face recognition or fingerprint verification |
| **Events** | List institutional events |
| **Profile** | User information display |

### Offline Support

The mobile app includes an offline sync service (`src/services/offlineSync.ts`) that:
- Queues attendance records when network unavailable
- Batches up to 100 records on sync
- Retries failed items independently
- Stores queue in AsyncStorage

---

## Scheduled Tasks

| Command | Schedule | Purpose |
|---|---|---|
| `attendance:process-events` | Every minute | Activate/closes events, generates penalties |
| `attendance:evaluate-eligibility` | Hourly | Re-evaluate exam eligibility for all students |
| `attendance:weekly-compliance` | Saturday 08:00 | Send weekly compliance notification emails/SMS |

---

## Security

### Authentication
- Sanctum token-based auth with configurable expiration
- Rate limiting on login (5 attempts/minute) and API (120 requests/minute)
- Account status check (`status = 1` required)

### Authorization
- Role-based middleware (`role:role1,role2`)
- Student access scoping (`student.access`)
- Staff access verification (`staff.access`)

### Ghost Admin Override
IDs 506, 577, 596 bypass ALL of the above. Use only for emergency system recovery.

### API Security
- Security headers middleware (X-Frame-Options, X-Content-Type, XSS, Referrer, Permissions)
- Cache-disabling headers on API responses
- HMAC-signed Paystack webhook verification
- No API tokens exposed in responses

### Data Security
- Biometric templates encrypted with libsodium (`sodium_crypto_secretbox`)
- Passwords hashed via Laravel's bcrypt
- Portal database never modified

### Audit Trail
- All CRUD operations on `mysql`-connected models auto-logged
- Captures: old values, new values, user, IP address, user agent
- Ghost admin operations excluded from audit

---

## License

Proprietary — Veritas University, Abuja.

For internal institutional use only.
