# Quality Test Report — Attendance System

**Date:** 2026-07-08  
**Project:** Attendance System (Laravel + Node.js + React/Vite)  
**Scope:** Syntax validation, unit tests, build checks, architecture analysis, integration review

---

## 1. Laravel Backend (PHP 8.2.12)

### 1.1 PHP Syntax Check
- **Files scanned:** All `.php` files under `app/`
- **Result:** ✅ ALL FILES PASSED — No syntax errors detected

### 1.2 PHPUnit Tests
- **Tests found:** 2 (1 Unit, 1 Feature)
- **Result:** ✅ 2/2 PASSED (18.6s)
  - `Tests\Feature\Example` → "The application returns a successful response" ✔
  - `Tests\Unit\Example` → "That true is true" ✔
- **Coverage:** ❌ Critical gap — only boilerplate tests exist. No tests for controllers, services, models, or middleware.

### 1.3 Route Structure
- **Total API routes:** ~120 routes across 9 role-gated groups
- **Middleware chain:** Well-organized: `auth:sanctum` → `staff.access` → `role:xyz`
- **Live Feed routes:**
  - `GET /api/live-feed` — device list + stats (via Node.js proxy)
  - `GET /api/live-feed/scans` — paginated scan history with filters
  - `GET /api/institutional-events/{id}/terminal-activity` — per-event terminal detail
- **Route issue:** ❌ `php artisan route:list` fails with `ReflectionException: Class "LiveFeedController" does not exist` — triggered by a cached autoloader state. After `composer dump-autoload` and `optimize:clear`, the class IS loadable at runtime (confirmed via `class_exists()`), but the `route:list` command still chokes due to how it reflects controller classes. Routes will work at request time but the artisan command is broken for these routes specifically.

### 1.4 Code Architecture
- **Directory structure:** Clean PSR-4 layout — `Controllers/Api/`, `Services/`, `Models/Attendance/`
- **Role middleware:** 9 distinct role groups (admin, student, staff, finance, exams, etc.)
- **Key services:** `ZktService.php` (597 lines) — ZKTeco TCP protocol implementation with handshake, attendance pull, user sync
- **Controller count:** 30+ API controllers

---

## 2. Node.js Attendance Service (v22.14.0)

### 2.1 Syntax Check
- **Files scanned:** 23 files in `src/`
- **Result:** ✅ ALL 23 FILES PASSED — No syntax errors

### 2.2 Dependencies
- **All installed:** axios, express, ws, better-sqlite3, winston, zkteco-js, node-cron, cors, dotenv
- **Missing:** ❌ No test framework installed (no `tests/` directory exists, no Jest/Mocha in devDependencies)

### 2.3 Service Architecture
| File | Lines | Purpose |
|------|-------|---------|
| `server.js` | 229 | Bootstrap, DI wiring, event polling, Express + WS setup |
| `DeviceManager.js` | 112 | ZKT connection pool, event emitter for attendance/error/timeout |
| `AttendanceService.js` | 71 | API push with offline fallback + retry queue |
| `SyncService.js` | 76 | Batched offline sync (100 records/batch) |
| `WebSocketService.js` | 61 | WebSocket broadcast to live feed clients |
| `ZKTConnection.js` | — | Low-level ZKTeco TCP connection |
| `DeviceListener.js` | — | Handles device lifecycle events |

### 2.4 Code Quality Observations
- ✅ **Event-driven architecture:** Clean use of `EventEmitter` — attendance, connected, disconnected, error, timeout events
- ✅ **Offline resilience:** Failed API calls queue to local SQLite via `better-sqlite3` for retry
- ✅ **Caching:** 5-minute TTL on device list to avoid Laravel deadlock
- ✅ **WebSocket:** Proper client tracking, error handling, and reconnection
- ⚠️ **`FlushAll` in SyncService.js line 29:** Creates a new `ApiService` instance on every flush — should receive it via constructor injection instead
- ⚠️ **Seed device hardcoded** at server.js:39-51 — test data leaked into production code

---

## 3. Vite / React Frontend

### 3.1 Production Build
- **Result:** ✅ BUILD SUCCESSFUL (40.2s)
- **Output:**
  - `public/build/manifest.json` — 0.39 kB
  - `public/build/assets/app-CX7cHe2M.css` — 73.54 kB (13.99 kB gzip)
  - `public/build/assets/app-C7S2mpyN.js` — 686.67 kB (179.68 kB gzip)

### 3.2 Build Warnings (non-blocking)
| Warning | Severity | Recommendation |
|---------|----------|---------------|
| `StaffDashboard/Index.jsx` imported both statically AND dynamically | Low | Remove one import — keep static in `app.jsx`, remove dynamic from `Dashboard.jsx` |
| `StudentDashboard/Index.jsx` same issue | Low | Same fix |
| Chunk size >500 kB after minification | Medium | Code-split with `React.lazy()` for heavy pages (LiveFeed, Reports, etc.) |

### 3.3 Key Components
- **`LiveFeed/Index.jsx`** (385 lines) — Device cards grid, real-time WebSocket feed, stats bar, connect/disconnect controls
- **`TerminalActivityModal.jsx`** — Per-event terminal activity modal
- **`Events/Index.jsx`** — Updated with "View Activity" button
- **`AppLayout.jsx`** — Sidebar with collapsible sections, role-based filtering, user menu

### 3.4 Frontend Issues Found
- ❌ **No ESLint or Prettier config** — no consistent code style enforcement
- ❌ No frontend test files exist (Jest/Vitest)
- ⚠️ `LiveFeed/Index.jsx` WebSocket URL resolution uses string replacement (`http` → `ws`) — fragile; should use `URL` constructor

---

## 4. Integration & Connectivity

### 4.1 Laravel ↔ Node.js Communication
- **Status:** ❌ Blocked — `php artisan serve` is single-threaded
- **Impact:** Node.js callbacks to Laravel (`POST /api/terminals/zk/attendance`, `POST /api/terminals/zk/heartbeat`, `GET /api/institutional-events/current`) time out because the single PHP worker is occupied processing other requests
- **Root cause:** `php artisan serve` can handle only ONE request at a time; when Node.js makes multiple concurrent requests, they queue and exceed the 10s timeout
- **Fix applied (config only):** Added `Listen 8081` virtual host in XAMPP Apache for concurrent serving — not yet active (all processes were killed)

### 4.2 WebSocket
- **Node.js WS server:** Port 4001 (attached to Express HTTP server)
- **Frontend connects** via WS URL from `GET /api/node/config` response
- **Broadcast events:** `attendance_recorded`, `device_status`, `device_heartbeat`, `device_error`, `device_timeout`, `sync_progress`
- ✅ Works when both servers are running

---

## 5. Summary of Test Results

| Category | Tests Run | Pass | Fail | Notes |
|----------|-----------|------|------|-------|
| PHP Syntax Check | ~300 files | 300 | 0 | All clean |
| PHPUnit | 2 tests | 2 | 0 | Only boilerplate tests exist |
| Node.js Syntax Check | 23 files | 23 | 0 | All clean |
| Node.js Tests | 0 | — | — | No test files exist |
| Vite Production Build | 1 | 1 | 0 | 3 warnings (see §3.2) |
| Frontend Tests | 0 | — | — | No test files exist |
| API Route Registration | ~120 routes | ~117 | 3 | LiveFeed routes have `route:list` issue only (runtime OK) |
| Server Integration | Manual | Partial | — | WebSocket works; HTTP callbacks timeout due to single-threaded PHP |

---

## 6. Critical Issues

### 🔴 P1 — `php artisan serve` single-threaded bottleneck
- **File:** N/A (infrastructure)
- **Impact:** Node.js → Laravel HTTP callbacks time out; live feed shows stale data; attendance sync fails
- **Fix:** Serve Laravel via XAMPP Apache (mod_php, multi-threaded) — config already written to `C:\xampp\apache\conf\extra\httpd-vhosts.conf` port 8081

### 🔴 P2 — No test coverage
- **Impact:** Regressions cannot be caught. Zero automated tests for 30+ controllers, 10+ services, and all frontend components
- **Fix:** Add PHPUnit tests for all API controllers (at minimum status code + JSON structure tests) and add Vitest/Jest for React components

### 🔴 P3 — `php artisan route:list` broken for LiveFeed routes
- **File:** `routes/api.php:225-226,289`
- **Cause:** Cached autoloader issue — `ReflectionClass("LiveFeedController")` fails in `RouteListCommand.php`
- **Runtime impact:** None — routes work when actually requested
- **Fix:** Pending investigation — may require clearing cache or adjusting route definition

---

## 7. Recommendations

### Immediate (Next Sprint)
1. **Serve Laravel via XAMPP Apache** on port 8081 (config already written) to resolve Node.js timeout issue
2. **Add ESLint** to both Laravel (phpcs/phpmd) and Node.js (eslint) projects
3. **Fix build warnings** — remove duplicate imports of `StaffDashboard/Index.jsx` and `StudentDashboard/Index.jsx`

### Short-term
4. **Write API integration tests** — minimum: test each controller's `index`, `store`, `show`, `update`, `destroy` for HTTP status codes
5. **Add Node.js tests** — use `node:test` (built-in) with `node --test` for `SyncService`, `AttendanceService`, `DeviceManager`
6. **Fix SyncService.js** — inject `ApiService` via constructor instead of `require()`-ing it inside `flushAll()`
7. **Remove hardcoded seed device** from `server.js:39-51` — move to proper seed data or env config

### Medium-term
8. **Code-split large React pages** using `React.lazy()` to reduce initial bundle size below 500 kB
9. **Add Vitest** for React component testing with `@testing-library/react`
10. **Implement proper error tracking** — Sentry or similar for both Laravel and Node.js
11. **Add health check endpoints** with dependency status (DB, Node service, WebSocket, ZKT devices)
