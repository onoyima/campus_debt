Node.js Attendance Integration Architecture for Laravel + Vite University Management System

Overview

This document outlines the recommended enterprise architecture for integrating ZKTeco biometric devices into the University Management System built with Laravel 12 + Vite.

The goal is to provide a scalable, real-time attendance infrastructure capable of supporting:

* Class Attendance
* Staff Attendance
* Chapel/Mass Attendance
* Institutional Events
* Examination Hall Verification
* Electronic Examination Clearance
* Debt Recovery
* Attendance Analytics
* Multi-campus deployment
* Hundreds of biometric devices
* and more making sure that you dont change the exisiting implementations

The architecture separates business logic from biometric communication, ensuring scalability, maintainability, and high availability.

⸻

Architecture Overview

                           USERS
                             │
                             │
                  Laravel 12 + Vite Web Application
                (Business Logic & REST API Layer)
                             │
          REST API + WebSockets (Laravel Reverb)
                             │
                   Redis + Laravel Queues
                             │
                 Node.js Attendance Service
             (Biometric Device Integration Layer)
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ZKT Device 1         ZKT Device 2        ZKT Device N
 Classroom A            Chapel Hall         Exam Hall

⸻

System Responsibilities

Laravel (Business Layer)

Laravel serves as the central business engine of the application.

It is responsible for:

* Authentication
* Role-Based Access Control (RBAC)
* Student Management
* Staff Management
* Course Management
* Timetable Management
* Event Management
* Attendance Policies
* Debt Recovery
* Exeat Management
* Examination Eligibility
* Electronic Exam Card
* Notifications
* Reporting
* Analytics
* Administrative Configuration
* And more

Laravel does not communicate directly with biometric devices.

⸻

Node.js Attendance Service

The Node.js Attendance Service is responsible for all biometric device communication.

Responsibilities include:

* Connecting to all ZKTeco devices
* Listening for fingerprint scans
* Listening for facial recognition scans
* Listening for RFID scans
* Receiving real-time attendance events
* Managing device heartbeat
* Device synchronization
* Offline caching
* Retry mechanisms
* Uploading attendance events to Laravel
* Receiving device commands from Laravel

The Node.js service contains no institutional business rules.

It only captures and forwards biometric events.

⸻

Project Structure

University-System/
├── laravel-app/
│   ├── app/
│   ├── routes/
│   ├── database/
│   ├── resources/
│   └── ...
│
└── attendance-service/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── routes/
    │   ├── middleware/
    │   ├── services/
    │   ├── devices/
    │   ├── jobs/
    │   ├── websocket/
    │   ├── cache/
    │   └── server.js
    │
    ├── package.json
    └── README.md

Both applications share the same Laravel API but remain independent.

⸻

Database Design

devices

Stores biometric device information.

Field	Description
id	Primary Key
name	Device Name
serial_number	Device Serial Number
ip_address	Device IP
port	Communication Port
building	Building
room	Room
purpose	Classroom / Exam Hall / Office
status	Online / Offline
firmware	Firmware Version
last_seen	Last Heartbeat

⸻

device_logs

Stores all communication logs.



⸻

attendance_events

Stores immutable biometric events received from devices.



These records should never be modified or deleted.

⸻

attendance_records

Stores processed attendance after Laravel validates each event.


sync_logs

Tracks synchronization activities.


Device Registration Workflow

1. Administrator opens Device Management.
2. Registers a new biometric device.
3. Specifies:
    * Device Name
    * IP Address
    * Port
    * Serial Number
    * Building
    * Room
    * Purpose
4. Laravel stores the configuration.
5. Node.js retrieves registered devices through the API.
6. Node establishes communication with each configured device.

⸻

Attendance Workflow

Step 1

Administrator creates an attendance event.

Example:

* Course: CSC401
* Venue: Hall A
* Start Time: 8:00 AM
* End Time: 10:00 AM
* Attendance Rule: Mandatory
* Late Penalty: ₦500

⸻

Step 2

Node.js requests active events.

GET /api/events/current

Laravel returns:

* Active event
* Venue
* Assigned device
* Start time
* End time
* Expected participants
* Attendance rules

⸻

Step 3

Student scans fingerprint.

The ZKTeco device captures:

* User ID
* Verification Type
* Timestamp

Node.js immediately receives the event.

⸻

Step 4

Node.js sends the attendance event to Laravel.

POST /api/attendance/verify

Payload:

{
  "device": 3,
  "uid": "127",
  "timestamp": "2026-07-05T08:12:14"
}

⸻

Step 5

Laravel validates:

* Student identity
* Active event
* Participant eligibility
* Attendance window
* Clock-in or Clock-out
* Attendance status

Possible outcomes:

* Present
* Late
* Absent
* Duplicate Attendance
* Invalid Event
* Not Registered

⸻

Step 6

Laravel stores the processed attendance record.

⸻

Step 7

Laravel broadcasts live updates.

Examples:

* Attendance Recorded
* Student Late
* Attendance Percentage Updated
* Dashboard Statistics Updated

⸻

Live Attendance Dashboard

Using Laravel Reverb and WebSockets, attendance dashboards update instantly without refreshing.

Lecturers can monitor:

* Students Present
* Students Late
* Students Absent
* Attendance Percentage
* Real-Time Attendance Count

⸻

Examination Hall Verification

The same biometric workflow is reused during examinations.

Student scans fingerprint.

Node.js forwards verification to Laravel.

Laravel checks:

* Course Registration
* Attendance Requirement (Minimum 80%)
* School Fees
* Outstanding Debts
* Exeat Compliance
* Examination Schedule
* Disciplinary Restrictions

If all requirements are met:

Access Granted

If not:

Access Denied
Reason:
Outstanding Debt
Attendance Below 80%
Course Not Registered
See QA Desk

⸻

Offline Support

The Node.js Attendance Service shall support offline operation.

If Laravel becomes temporarily unavailable:

* Attendance events shall be cached locally using SQLite or another lightweight embedded database.
* Events shall remain queued.
* Synchronization shall resume automatically when connectivity is restored.
* Duplicate uploads shall be prevented.

No attendance records shall be lost during temporary network failures.

⸻

Laravel API Endpoints



⸻

WebSocket Events

Laravel shall broadcast real-time events including:

* AttendanceRecorded
* AttendanceUpdated
* StudentLate
* StudentAbsent
* EventStarted
* EventEnded
* ExamAccessGranted
* ExamAccessDenied
* DeviceOnline
* DeviceOffline

⸻

Attendance Service Modules

attendance-service/
src/
├── config/
├── controllers/
├── routes/
├── middleware/
├── services/
│   ├── DeviceManager.js
│   ├── AttendanceService.js
│   ├── EventScheduler.js
│   ├── ApiService.js
│   ├── SyncService.js
│   └── WebSocketService.js
│
├── devices/
│   ├── ZKTConnection.js
│   ├── DeviceListener.js
│   └── DeviceCommands.js
│
├── jobs/
│   ├── HeartbeatJob.js
│   ├── SyncJob.js
│   └── RetryJob.js
│
├── websocket/
├── cache/
└── server.js

⸻

Device Command Queue

To avoid constant polling and tight coupling between Laravel and the Node.js service, the system shall implement a Device Command Queue.

Whenever an administrator performs a device-related action, Laravel shall create a command entry in a queue rather than communicating directly with the biometric device.

Examples of queued commands include:

* Register biometric device
* Restart device
* Synchronize users
* Synchronize fingerprint templates
* Synchronize facial templates
* Update device configuration
* Lock or unlock device
* Clear attendance logs
* Retrieve attendance logs
* Update firmware
* Refresh device status

The Node.js Attendance Service shall periodically retrieve pending commands, execute them on the appropriate device, report the execution status back to Laravel, and mark completed commands as processed.

This architecture improves reliability, simplifies auditing, supports retry mechanisms, and enables asynchronous device management.

⸻

Recommended Technology Stack

Web Application

* Laravel 12
* PHP 8.3+
* Vite
* Vue.js or React
* Laravel Reverb
* Redis
* MySQL or PostgreSQL

Attendance Service

* Node.js (LTS)
* Express.js
* Socket Programming
* SQLite (Offline Cache)
* Axios
* Winston (Logging)
* PM2 (Process Management)



Implementation Roadmap

Phase 1

* Laravel Web Application
* User Management
* RBAC
* Events
* Timetable
* Course Management
* REST API

⸻

Phase 2

* Node.js Attendance Service
* ZKTeco Device Integration
* Device Registration
* Attendance Synchronization
* Offline Cache
* Device Monitoring

⸻

Phase 3

* Real-Time Attendance
* Laravel Reverb
* Redis
* Live Dashboards
* Notifications

⸻

Phase 4

* Attendance Compliance Engine
* Debt Recovery Integration
* QA Monitoring
* Exeat Integration
* Examination Eligibility Engine
* Automated Penalty Processing

⸻

Phase 5

* Electronic Examination Clearance
* Biometric Examination Hall Verification
* Advanced Analytics
* Multi-Campus Deployment
* Device Clustering
* High Availability
* Performance Optimization

⸻

Conclusion

This architecture establishes Laravel as the centralized business and decision engine while delegating all biometric communication to a dedicated Node.js Attendance Service. The separation of concerns improves scalability, resilience, and maintainability, enabling the platform to support thousands of users, hundreds of biometric devices, multiple campuses, and real-time attendance processing without requiring future architectural redesign. It provides a robust foundation for integrating attendance with debt recovery, academic compliance, examination eligibility, and electronic examination clearance within a unified university management system.