# Student Attendance & Usage Flow

This document explains the complete student attendance flow — from course registration through to exam eligibility — covering how the system handles lecture sessions, auto-absent marking, attendance verification, exeat leave, and eligibility calculation.

---

## Table of Contents

1. [Database Architecture](#1-database-architecture)
2. [Core Entities & Their Relationships](#2-core-entities--their-relationships)
3. [Step-by-Step Attendance Flow](#3-step-by-step-attendance-flow)
4. [Status Types & Their Effects](#4-status-types--their-effects)
5. [Eligibility Calculation](#5-eligibility-calculation)
6. [Exeat Leave Integration](#6-exeat-leave-integration)
7. [Session vs Event Attendance](#7-session-vs-event-attendance)
8. [Scheduled Tasks (Cron Jobs)](#8-scheduled-tasks-cron-jobs)
9. [Common Scenarios](#9-common-scenarios)

---

## 1. Database Architecture

The system uses **two MySQL databases**:

### Local Database (`mysql`) — Read/Write
All attendance tables live here. This is where all writes happen.

| Table | Purpose |
|---|---|
| `attendance_sessions` | Individual lecture/class sessions (date, time, venue, course link) |
| `attendance_records` | Per-student attendance entries for each session |
| `attendance_status_types` | Lookup of status codes (present, absent, exeat_leave, etc.) |
| `attendance_excuses` | Submitted and approved excuse requests |
| `attendance_institutional_events` | Chapel, seminar, special events |
| `attendance_event_attendance` | Per-participant event attendance records |
| `attendance_debts` | Financial penalties for missed mandatory events |
| `attendance_exam_eligibility` | Per-course eligibility status per student |

### Remote Database (`mysql_remote`) — Read Only
The university's existing portal database. The attendance system **never writes** here.

| Table | Purpose |
|---|---|
| `course_regs` | Student course registrations per semester |
| `courses` | Course definitions (code, title, credit load) |
| `course_assigneds` | Lecturer-to-course assignments per semester |
| `students` | Student demographic data |
| `staff` | Staff demographic data |
| `academic_sessions` | Academic session definitions |
| `vu_semesters` | Semester definitions |
| `exeat_requests` | Student exeat (leave) requests |
| `exeat_approvals` | Exeat approval chain records |

---

## 2. Core Entities & Their Relationships

```
courses (remote)
  .id ─── course_regs.course_id ─── student registered for a course
  .code (e.g. CSC101)
  .title (e.g. Introduction to Computer Science)

course_assigneds (remote)
  .id ─── attendance_sessions.course_assigned_id ─── session belongs to a course assignment
  .course_id ─── courses.id
  .staff_id ─── the lecturer teaching this course
  .academic_session_id
  .vu_semester_id

attendance_sessions (local)
  .id ─── attendance_records.session_id
  .course_assigned_id ─── course_assigneds.id (links to course)
  .session_date ─── the date of the lecture
  .opens_at ─── when attendance opens
  .closes_at ─── when attendance closes
  .status ─── scheduled → active → closed

attendance_records (local)
  .id
  .student_id ─── students.id (remote)
  .session_id ─── attendance_sessions.id
  .status_id ─── attendance_status_types.id (present, absent, exeat_leave, etc.)
  .attendance_method ─── how it was recorded (biometric, qr, auto_absent, exeat_leave)
  .academic_session_id
  .vu_semester_id
  .venue_id

course_regs (remote)
  .student_id ─── the registered student
  .course_id ─── courses.id
  .course_assigned_id ─── course_assigneds.id (same link as sessions use)
  .academic_session_id
  .vu_semester_id
  .is_course_reg ─── 2 = registered, 1 = selected, 3 = deleted
  .status ─── 1 = active

exeat_requests (remote)
  .id
  .student_id
  .departure_date ─── when the student leaves
  .return_date ─── when the student returns
  .status ─── pending, security_signin, hostel_signin, completed, rejected
  .is_expired

exeat_approvals (remote)
  .id
  .exeat_request_id
  .staff_id ─── who approved
  .status ─── approved, rejected, pending
  .role ─── dean, secretary, cmd, etc.
```

### Key Relationship: How a Lecture Session Connects to Students

```
attendance_sessions.course_assigned_id 
  → course_assigneds.id (remote) 
    → course_assigneds.course_id → courses.id → courses.code (CSC101)
    → course_regs.course_assigned_id (remote) 
      → course_regs.student_id → students.id
```

This chain is what allows the system to know: **"Session X is a CSC101 lecture. Which students should be there?"** — by looking up all students registered for that course assignment.

---

## 3. Step-by-Step Attendance Flow

### Phase 1: Course Registration (Portal Side — Already Works)

1. A student registers for courses at the beginning of the semester through the university portal.
2. This creates records in `course_regs` (remote DB) with:
   - `student_id` → the student
   - `course_id` → CSC101, CSC201, etc.
   - `course_assigned_id` → the specific lecturer's assignment
   - `academic_session_id` + `vu_semester_id` → current semester
   - `is_course_reg = 2` → fully registered
   - `status = 1` → active

### Phase 2: Lecture Timetable Upload (Staff Action)

1. A lecturer or administrator uploads/creates the lecture timetable.
2. Each lecture becomes an `attendance_session` record:
   - `course_assigned_id` → which course/lecturer assignment
   - `session_date` → the date of the lecture
   - `opens_at` → when students can start marking attendance
   - `closes_at` → deadline for marking attendance
   - `status` → initially `scheduled`

   **Example:** CSC101 is scheduled every Monday 10am–12noon.
   - Session #1: Monday June 5, 10am–12pm (scheduled)
   - Session #2: Monday June 12, 10am–12pm (scheduled)
   - Session #3: Monday June 19, 10am–12pm (scheduled)
   - ...and so on for the semester

### Phase 3: Session Activation (Automatic)

1. The `attendance:process-events` cron job runs **every minute**.
2. It finds all `scheduled` sessions whose `opens_at` time has arrived.
3. For each one approaching activation, it runs `AutoAbsentMarkService::markAbsentForSession()`.
4. Then it changes the session status to `active`.

### Phase 4: Auto-Absent Marking (Automatic)

This is the critical step that happens when a session activates.

1. The system reads the session's `course_assigned_id`.
2. It queries the remote `course_regs` table:
   ```sql
   SELECT student_id, academic_session_id, vu_semester_id
   FROM course_regs
   WHERE course_assigned_id = {session.course_assigned_id}
     AND is_course_reg IN (1, 2)
     AND status = 1
   ```
3. For **every registered student** that does NOT already have an attendance record for this session, it creates:
   ```json
   {
     "student_id": {student.id},
     "session_id": {session.id},
     "status_id": {absent_status_id},
     "attendance_method": "auto_absent",
     "timestamp": {session_date 00:00:00},
     "venue_id": {session.venue_id},
     "academic_session_id": {from course_regs},
     "vu_semester_id": {from course_regs},
     "metadata": {
       "auto_marked": true,
       "source": "auto_absent_on_activation"
     }
   }
   ```

**Result:** Every registered student now has an `absent` attendance record for this lecture. They are marked absent by default — the starting position is "you were supposed to be here but you weren't marked present yet."

### Phase 5: Attendance Marking (Student Action)

When the student arrives at the lecture venue, they mark attendance via one of these methods:

| Method | How it works | Overrides |
|---|---|---|
| **Biometric (Face)** | Student scans face via mobile app or terminal camera → AWS Rekognition verifies identity → changes absent → present | `absent` → `present` |
| **Fingerprint** | Student scans fingerprint via terminal → matches stored template → marks present | `absent` → `present` |
| **QR Code** | QA officer scans student's QR code at exam hall → marks attendance | `absent` → `present` |
| **Manual (Staff)** | Lecturer or admin manually marks a student as present | `absent` → `present` |

**Important:** The system only changes existing records — it does NOT create new ones during attendance marking (because the auto-absent already created them). If a student somehow doesn't have an auto-absent record (e.g., course_regs was updated late), the system creates a new record on the fly.

### Phase 6: Session Closure (Automatic)

1. When `closes_at` time passes, the cron job changes the session status to `closed`.
2. No further attendance marking is allowed for that session.
3. The attendance records are now frozen — this is the data used for eligibility calculation.

### Phase 7: Exeat Leave Override (Automatic, Hourly)

If a student has an **approved exeat** that covers the lecture date, the `attendance:process-exeat-leave` command handles it:

1. Queries remote `exeat_requests` where:
   - `is_expired = false`
   - `status NOT IN ('rejected')`
   - Has at least one `exeat_approval` with `status = 'approved'`
2. For each approved exeat, finds all `active` sessions whose `session_date` falls between `departure_date` and `return_date`.
3. For each matching session:
   - If the student has **no record** → creates one with `exeat_leave` status
   - If the student has **absent** → upgrades to `exeat_leave`
   - If the student already has `exeat_leave` or `present` → skips

**Why this matters:** `exeat_leave` counts as present for eligibility (see section 5).

### Phase 8: Eligibility Evaluation (Automatic, Hourly)

The `attendance:evaluate-eligibility` command runs every hour and recalculates per-course eligibility for all students.

**See section 5 for the full calculation.**

---

## 4. Status Types & Their Effects

| Status | Code | Counts as Present? | Counts as Absent? | How Applied |
|---|---|---|---|---|
| **Present** | `present` | ✅ Yes | ❌ No | Student verified attendance via biometric/QR/manual |
| **Late** | `late` | ✅ Yes | ❌ No | Student arrived after grace period but before close |
| **Absent** | `absent` | ❌ No | ✅ Yes | Default — auto-created on session activation |
| **Excused** | `excused` | ❌ No | ❌ No | Staff-approved excuse — neutral, excluded from total |
| **Proxy** | `proxy` | ✅ Yes | ❌ No | Authorized proxy marked attendance |
| **Exeat Leave** | `exeat_leave` | ✅ Yes | ❌ No | Auto-marked from approved exeat — counts toward eligibility |
| **Exam Leave** | `exam_leave` | ❌ No | ❌ No | For exam timetable conflicts — neutral (separate from exeat) |
| **Official Assignment** | `official_assignment` | ❌ No | ❌ No | Student on institutional duty — neutral |
| **Medical Leave** | `medical_leave` | ❌ No | ❌ No | Approved medical absence — neutral |

### How Statuses Affect Percentage

- **Counts as Present = Yes**: Included in `attended_classes` count. Increases percentage.
- **Counts as Absent = Yes**: Included in total but NOT in attended. Decreases percentage.
- **Counts as Absent = No AND Counts as Present = No ("Neutral")**: Excluded from total classes. Does not affect percentage either way.

---

## 5. Eligibility Calculation

The eligibility engine (`EligibilityEngineService`) calculates per-course eligibility for each student.

### Formula

```
attended_classes   = records where status.counts_as_present = true
neutral_classes    = records where status.counts_as_present = false 
                     AND status.counts_as_absent = false
total_classes      = number of closed sessions for this course
adjusted_total     = total_classes - neutral_classes

attendance_percentage = (attended_classes / adjusted_total) × 100
```

### Requirements for ELIGIBLE status

| Condition | Required |
|---|---|
| Attendance percentage | ≥ 80% |
| School fees | Cleared (checked via remote `tuition_fees` table) |
| Attendance debts | No unpaid debts |
| Course registration | Has at least one attendance record for the course |

### Example Calculations

**Scenario A: Student attends regularly**
- 20 total sessions, 18 present, 2 absent
- attended = 18, neutral = 0, adjusted_total = 20
- **90%** ✅ ELIGIBLE

**Scenario B: Student has exeat leave**
- 20 total sessions, 14 present, 2 exeat_leave, 4 absent
- attended = 14 + 2 = 16 (exeat_leave counts as present!)
- neutral = 0, adjusted_total = 20
- **80%** ✅ ELIGIBLE

**Scenario C: Without exeat_leave counting as present (old behavior)**
- 20 total sessions, 14 present, 2 exeat_leave, 4 absent
- attended = 14, neutral = 2, adjusted_total = 18
- **77.78%** ❌ NOT ELIGIBLE

**Scenario D: Student has excused absence**
- 20 total sessions, 15 present, 1 excused, 4 absent
- attended = 15, neutral = 1, adjusted_total = 19
- **78.95%** ❌ NOT ELIGIBLE

The excused absence doesn't hurt (excluded from total), but it also doesn't help. The student still needs 80% of the remaining sessions.

**Scenario E: Student misses many classes**
- 20 total sessions, 10 present, 10 absent
- attended = 10, neutral = 0, adjusted_total = 20
- **50%** ❌ NOT ELIGIBLE

---

## 6. Exeat Leave Integration

### What is an Exeat?

An exeat is official permission from the university allowing a student to be away from campus for a specific period. It is requested through the university portal and goes through an approval chain (dean, secretary, CMD, etc.).

### How Exeat Interacts with Attendance

```
1. Student applies for exeat → Approved by school authorities
                               ↓
2. Student leaves campus on departure_date
   Returns on return_date
                               ↓
3. attendance:process-exeat-leave (runs hourly)
   Finds approved exeats with active date ranges
                               ↓
4. For each approved exeat:
   - Find active lecture sessions between departure_date and return_date
   - For each session:
     - If student has "absent" record → change to "exeat_leave"
     - If student has no record → create "exeat_leave" record
                               ↓
5. Eligibility engine sees "exeat_leave" as present
   Student's attendance percentage is not negatively affected
```

### Example

- **Course:** CSC101 (every Monday)
- **Exeat:** Departure June 22 (Saturday), Return June 24 (Monday)
- **Sessions affected:** CSC101 session on Monday June 23
- **Without exeat:** Student would be absent → 0% for that session
- **With exeat:** Student marked as `exeat_leave` → counts as present for eligibility

### Important Notes

- Exeat leave only marks sessions that are **course-related** (have a `course_assigned_id`).
- Sessions that the student already marked as `present` are left unchanged.
- Sessions marked as `exeat_leave` are NOT overridden by any later process.
- The command only processes exeats that have at least one `exeat_approval` record with `status = 'approved'`.

---

## 7. Session vs Event Attendance

The system has **two separate attendance subsystems**:

### Lecture Session Attendance

| Aspect | Details |
|---|---|
| **Table** | `attendance_records` |
| **Linked to** | `attendance_sessions` → `course_assigneds` → `courses` |
| **Participants** | Determined by `course_regs` (students registered for the course) |
| **Auto-creation** | ✅ Yes — `AutoAbsentMarkService` creates absent records on activation |
| **Affects exam eligibility** | ✅ Yes — 80% rule applies |
| **Financial penalty** | ❌ No |
| **Marking methods** | Biometric, QR, terminal, manual |

### Event Attendance (Chapel, Seminars, Special Events)

| Aspect | Details |
|---|---|
| **Table** | `attendance_event_attendance` |
| **Linked to** | `attendance_institutional_events` |
| **Participants** | Determined by target groups (faculty, department, level, etc.) |
| **Auto-creation** | ❌ No — participants enroll but no auto-absent |
| **Affects exam eligibility** | ❌ No |
| **Financial penalty** | ✅ Yes — mandatory events generate debts for absentees |
| **Marking methods** | Biometric, QR, terminal, manual |

### How to Tell Which is Which

- If a session has a `course_assigned_id` → it's a **lecture session** → affects eligibility
- If a session has an `institutional_event_id` → it's an **event session** → may generate penalties
- A session can have both (a lecture that's also part of a wider event)

---

## 8. Scheduled Tasks (Cron Jobs)

| Command | Schedule | What it does |
|---|---|---|
| `attendance:process-events` | **Every minute** | Activates scheduled sessions (triggers auto-absent), closes expired sessions/events, generates penalties for mandatory events |
| `attendance:process-exeat-leave` | **Hourly** | Reads approved exeats, upgrades absent → exeat_leave for covered sessions |
| `attendance:evaluate-eligibility` | **Hourly** | Recalculates exam eligibility for all students per course |
| `attendance:weekly-compliance` | **Saturday 8am** | Sends weekly compliance/summary notifications |

### Flow Diagram

```
                    ┌─────────────────────────────┐
                    │  Lecturer uploads timetable  │
                    │  (creates attendance_sessions)│
                    └──────────┬──────────────────┘
                               │ status = 'scheduled'
                               ▼
              ┌────────────────────────────────────┐
              │  attendance:process-events (1 min)  │
              │  ┌────────────────────────────┐     │
              │  │ Finds sessions whose       │     │
              │  │ opens_at has arrived       │     │
              │  └──────────┬─────────────────┘     │
              │             ▼                       │
              │  ┌────────────────────────────┐     │
              │  │ AutoAbsentMarkService:      │     │
              │  │ For each session:           │     │
              │  │ 1. Query course_regs (remote)│     │
              │  │    for registered students  │     │
              │  │ 2. Create "absent" records  │     │
              │  │    for each student         │     │
              │  └──────────┬─────────────────┘     │
              │             ▼                       │
              │  ┌────────────────────────────┐     │
              │  │ Set session status → active │     │
              │  └────────────────────────────┘     │
              └──────────┬──────────────────────────┘
                         ▼
              ┌────────────────────────────────────┐
              │ Students mark attendance:           │
              │ - Face biometric → present          │
              │ - Fingerprint → present             │
              │ - QR scan → present                 │
              │ - Manual (staff) → present          │
              │ - Late arrival → late               │
              └──────────────────┬──────────────────┘
                         ▼
              ┌────────────────────────────────────┐
              │  attendance:process-exeat-leave     │
              │  (hourly)                           │
              │  Finds approved exeats              │
              │  Changes absent → exeat_leave       │
              │  for covered sessions               │
              └──────────────────┬──────────────────┘
                         ▼
              ┌────────────────────────────────────┐
              │  attendance:process-events (1 min)  │
              │  Closes_expired sessions            │
              │  (status → closed)                  │
              └──────────────────┬──────────────────┘
                         ▼
              ┌────────────────────────────────────┐
              │  attendance:evaluate-eligibility    │
              │  (hourly)                           │
              │  Calculates % per course:           │
              │  present + late + exeat_leave       │
              │  ──────────────────────── × 100     │
              │     total - neutral                 │
              │                                     │
              │  ≥ 80% + fees cleared + no debts    │
              │  = ELIGIBLE ✅                      │
              └────────────────────────────────────┘
```

---

## 9. Common Scenarios

### Scenario 1: Student attends all lectures

```
Course: CSC101 — 15 sessions in semester
Student actions:
  - Attends all 15 lectures, marks biometric each time
  - Has no exeat, no excuses

Records: 15 present, 0 absent
Percentage: 15/15 = 100% ✅ ELIGIBLE
```

### Scenario 2: Student misses some lectures but has exeat coverage

```
Course: CSC101 — 15 sessions in semester
Student actions:
  - Attends 10 lectures (10 present)
  - Has approved exeat covering 2 lecture dates
  - Misses 3 lectures without excuse

Records: 10 present, 2 exeat_leave, 3 absent
attended = 10 + 2 = 12
adjusted_total = 15 - 0 = 15
Percentage: 12/15 = 80% ✅ ELIGIBLE
```

### Scenario 3: Student misses too many lectures without exeat

```
Course: CSC101 — 15 sessions in semester
Student actions:
  - Attends 10 lectures (10 present)
  - Misses 5 lectures without any exeat or excuse

Records: 10 present, 5 absent
attended = 10
adjusted_total = 15
Percentage: 10/15 = 66.67% ❌ NOT ELIGIBLE
```

### Scenario 4: Student has official excuse

```
Course: CSC101 — 15 sessions in semester
Student actions:
  - Attends 11 lectures (11 present)
  - Has staff-approved excuse for 1 session (excused)
  - Misses 3 lectures without excuse

Records: 11 present, 1 excused, 3 absent
attended = 11
neutral = 1 (excused is neutral)
adjusted_total = 15 - 1 = 14
Percentage: 11/14 = 78.57% ❌ NOT ELIGIBLE
```

Note: The excused absence didn't hurt (removed from total), but the student still needs 80% of the remaining sessions. 11/14 = 78.57% is just under 80%.

### Scenario 5: Student registers late and misses auto-absent

```
When a course registration is added AFTER auto-absent ran:
  - The student won't have records for past sessions
  - When they try to mark attendance for a future session:
    - If session is active → system creates the record with "present" status
    - Past sessions remain without records (treated differently by eligibility)
  
Note: The eligibility engine currently requires at least one attendance record
to consider a student registered. Missing all sessions = not registered.
```

### Scenario 6: Mixed — course sessions and events

```
Course: CSC101 — 15 sessions
Event: Mandatory chapel every Wednesday — 6 events

Student:
  - Attends 12 CSC101 lectures (12 present, 3 absent)
  - Attends 4 chapels (4 present, 2 absent from mandatory events)

CSC101 eligibility:
  attended = 12, adjusted_total = 15
  Percentage: 12/15 = 80% ✅ ELIGIBLE

Chapel penalties:
  - 2 missed mandatory events → 2 penalty debts generated
  - These debts must be paid for full clearance
  - But they don't affect CSC101 exam eligibility directly
```

---

## Summary of Key Principles

1. **Default is absent**: When a session activates, every registered student starts as absent. They must actively mark attendance to change this.

2. **Exeat leave = present**: Approved exeat overrides absent → exeat_leave, which counts as present for eligibility.

3. **Eligibility is per-course**: A student might be eligible for CSC101 but not CSC201, depending on their attendance in each.

4. **Sessions ≠ Events**: Lecture sessions affect exam eligibility. Events affect financial compliance. Both use the same status types but are calculated independently.

5. **Data flows one direction**: Remote portal → Local attendance system (read only). The attendance system never writes to the portal.

6. **Everything is automated**: From session activation to absent marking to eligibility evaluation, the system runs on cron jobs with no manual intervention needed.
