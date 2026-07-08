# Attendance Service

Node.js biometric device integration layer for ZKTeco fingerprint, face, and RFID devices. Part of the Laravel + Vite University Management System.

## Architecture

```
                    Laravel 12 + Vite Web Application
                  (Business Logic & REST API Layer)
                               |
            REST API + WebSockets (Laravel Reverb)
                               |
                     Node.js Attendance Service
                  (Biometric Device Integration Layer)
                               |
          ┌────────────────────┼────────────────────┐
          │                    │                    │
     ZKT Device 1         ZKT Device 2        ZKT Device N
```

## Responsibilities

- Connect to ZKTeco biometric devices via TCP socket
- Listen for real-time fingerprint, face, and RFID scans
- Upload attendance events to Laravel API
- Offline caching with SQLite when Laravel is unreachable
- Automatic retry and sync when connectivity is restored
- Device heartbeat monitoring and auto-reconnection
- Poll and execute device commands from Laravel
- WebSocket broadcasting for real-time dashboards

## Setup

```bash
cp .env.example .env
# Edit .env with your Laravel API URL and key
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LARAVEL_API_URL` | `http://localhost:8000/api` | Laravel API base URL |
| `LARAVEL_API_KEY` | | API key for authentication |
| `PORT` | `4000` | HTTP server port |
| `HOST` | `0.0.0.0` | HTTP server host |
| `DB_PATH` | `./data/cache.sqlite` | SQLite cache path |
| `LOG_LEVEL` | `info` | Winston log level |

## Project Structure

```
src/
├── config/          - Environment configuration
├── controllers/     - Route handler controllers
├── routes/          - Express route definitions
├── middleware/      - Auth and error handling
├── services/        - Core business services
├── devices/         - ZKTeco device integration
├── jobs/            - Scheduled background jobs
├── websocket/       - WebSocket broadcasting
├── cache/           - Offline cache layer
└── server.js        - Application entry point
```

## API Endpoints

- `GET /health` - Service health check
- `GET /api/devices` - List registered devices
- `POST /api/devices/connect` - Connect to a device
- `POST /api/devices/disconnect` - Disconnect a device
- `GET /api/sync/queue` - View pending sync queue
- `POST /api/sync/flush` - Force sync flush
- `POST /devices/test` - Test device connection
- `POST /devices/pull` - Pull attendance logs from device
