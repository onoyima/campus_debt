<?php

namespace App\Services;

use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceTerminal;
use App\Models\Attendance\AttendanceBiometricTemplate;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceOfflinePendingSync;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ZktService
{
    const COMMAND_CONNECT = 1000;
    const COMMAND_DISCONNECT = 1001;
    const COMMAND_GET_USER = 1008;
    const COMMAND_SET_USER = 1009;
    const COMMAND_GET_ATTENDANCE = 1012;
    const COMMAND_GET_REAL_TIME = 1013;
    const COMMAND_CLEAR_DATA = 1014;
    const COMMAND_RESTART = 1015;
    const COMMAND_GET_FIRMWARE = 1020;
    const COMMAND_GET_DEVICE_INFO = 1021;
    const COMMAND_ENABLE_DEVICE = 1022;
    const COMMAND_DISABLE_DEVICE = 1023;

    protected array $sockets = [];

    /**
     * Connect to a ZKT terminal via TCP
     */
    public function connect(AttendanceTerminal $terminal): bool
    {
        if (!$terminal->ip_address || !$terminal->port) {
            Log::warning("ZKT: No IP/port configured for terminal {$terminal->device_id}");
            return false;
        }

        $key = "zkt_conn_{$terminal->id}";
        if (isset($this->sockets[$key]) && is_resource($this->sockets[$key])) {
            return true;
        }

        try {
            $socket = @fsockopen($terminal->ip_address, $terminal->port, $errno, $errstr, 5);
            if (!$socket) {
                Log::error("ZKT: Failed to connect to {$terminal->ip_address}:{$terminal->port} - {$errstr}");
                $terminal->update(['connection_status' => 'offline']);
                return false;
            }

            stream_set_timeout($socket, 5);
            $this->sockets[$key] = $socket;

            if ($this->handshake($socket, $terminal)) {
                $terminal->update([
                    'connection_status' => 'online',
                    'last_heartbeat_at' => now(),
                ]);
                return true;
            }

            $this->disconnect($terminal);
            return false;
        } catch (\Exception $e) {
            Log::error("ZKT: Connection error for {$terminal->device_id}: " . $e->getMessage());
            $terminal->update(['connection_status' => 'offline']);
            return false;
        }
    }

    /**
     * ZK3 handshake protocol
     */
    protected function handshake($socket, AttendanceTerminal $terminal): bool
    {
        try {
            $command = self::COMMAND_CONNECT;
            $data = pack('V', $command);
            fwrite($socket, $data);

            $response = fread($socket, 1024);
            if ($response === false || strlen($response) === 0) {
                return false;
            }

            return true;
        } catch (\Exception $e) {
            Log::error("ZKT: Handshake failed for {$terminal->device_id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Disconnect from a ZKT terminal
     */
    public function disconnect(AttendanceTerminal $terminal): void
    {
        $key = "zkt_conn_{$terminal->id}";
        if (isset($this->sockets[$key]) && is_resource($this->sockets[$key])) {
            try {
                $command = self::COMMAND_DISCONNECT;
                fwrite($this->sockets[$key], pack('V', $command));
                fclose($this->sockets[$key]);
            } catch (\Exception $e) {
                // Ignore close errors
            }
            unset($this->sockets[$key]);
        }
    }

    /**
     * Pull attendance logs from a ZKT terminal
     * @return array<int, array{user_id: string, timestamp: string, method: string, status: int}>
     */
    public function pullAttendance(AttendanceTerminal $terminal): array
    {
        $records = [];

        if (!$this->connect($terminal)) {
            return $records;
        }

        try {
            $key = "zkt_conn_{$terminal->id}";
            $socket = $this->sockets[$key] ?? null;
            if (!$socket) return $records;

            $command = self::COMMAND_GET_ATTENDANCE;
            fwrite($socket, pack('V', $command));

            $buffer = '';
            while (!feof($socket)) {
                $chunk = fread($socket, 4096);
                if ($chunk === false || strlen($chunk) === 0) break;
                $buffer .= $chunk;
                if (strlen($chunk) < 4096) break;
            }

            if (strlen($buffer) > 0) {
                $records = $this->parseAttendanceBuffer($buffer, $terminal);
            }

            Log::info("ZKT: Pulled " . count($records) . " attendance records from {$terminal->device_id}");
            $terminal->update(['transaction_count' => $terminal->transaction_count + count($records)]);
        } catch (\Exception $e) {
            Log::error("ZKT: Pull attendance failed for {$terminal->device_id}: " . $e->getMessage());
        }

        return $records;
    }

    /**
     * Parse raw attendance buffer from ZKT device
     */
    protected function parseAttendanceBuffer(string $buffer, AttendanceTerminal $terminal): array
    {
        $records = [];
        $recordSize = 36;

        for ($i = 0; $i + $recordSize <= strlen($buffer); $i += $recordSize) {
            $record = substr($buffer, $i, $recordSize);

            $userId = trim(substr($record, 0, 9));
            $timestamp = substr($record, 9, 7);
            $method = ord($record[16] ?? 0);
            $status = ord($record[17] ?? 0);

            $dateTime = $this->convertZkTimestamp($timestamp);

            if ($dateTime && $userId !== '') {
                $methodMap = [
                    0 => 'fingerprint',
                    1 => 'face',
                    2 => 'pin',
                    3 => 'card',
                    15 => 'password',
                ];

                $records[] = [
                    'user_id' => $userId,
                    'timestamp' => $dateTime,
                    'method' => $methodMap[$method] ?? 'unknown',
                    'status' => $status,
                    'terminal_id' => $terminal->id,
                ];
            }
        }

        return $records;
    }

    /**
     * Convert ZK timestamp format to Y-m-d H:i:s
     */
    protected function convertZkTimestamp(string $zkTimestamp): ?string
    {
        if (strlen($zkTimestamp) < 7) return null;

        $bytes = unpack('C7', $zkTimestamp);
        if (!$bytes) return null;

        try {
            $year = $bytes[1] + 2000;
            $month = $bytes[2];
            $day = $bytes[3];
            $hour = $bytes[4];
            $minute = $bytes[5];
            $second = $bytes[6];

            return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $hour, $minute, $second);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Push user templates to a ZKT terminal
     */
    public function syncUsers(AttendanceTerminal $terminal, array $userIds = []): int
    {
        $synced = 0;

        if (!$this->connect($terminal)) return 0;

        try {
            $query = AttendanceBiometricTemplate::where('is_active', true);
            if (!empty($userIds)) {
                $query->whereIn('user_id', $userIds);
            }
            $templates = $query->get();

            foreach ($templates as $template) {
                if ($this->sendUserToTerminal($terminal, $template)) {
                    $synced++;
                }
            }

            $terminal->update(['user_count' => $synced]);
            Log::info("ZKT: Synced {$synced} users to {$terminal->device_id}");
        } catch (\Exception $e) {
            Log::error("ZKT: Sync users failed for {$terminal->device_id}: " . $e->getMessage());
        }

        return $synced;
    }

    /**
     * Send a single user template to the terminal
     */
    protected function sendUserToTerminal(AttendanceTerminal $terminal, AttendanceBiometricTemplate $template): bool
    {
        $key = "zkt_conn_{$terminal->id}";
        $socket = $this->sockets[$key] ?? null;
        if (!$socket) return false;

        try {
            $userId = str_pad($template->user_id, 9, '0', STR_PAD_LEFT);
            $name = $template->user_type === 'staff' ? "Staff_{$template->user_id}" : "Student_{$template->user_id}";
            $password = '';
            $privilege = 0;

            $userData = $userId . str_pad($name, 24, ' ') . $password . pack('V', $privilege);

            fwrite($socket, pack('V', self::COMMAND_SET_USER) . $userData);

            $response = fread($socket, 1024);
            return $response !== false;
        } catch (\Exception $e) {
            Log::error("ZKT: Failed to send user {$template->user_id} to {$terminal->device_id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get device info from ZKT terminal
     */
    public function getDeviceInfo(AttendanceTerminal $terminal): ?array
    {
        if (!$this->connect($terminal)) return null;

        try {
            $key = "zkt_conn_{$terminal->id}";
            $socket = $this->sockets[$key] ?? null;
            if (!$socket) return null;

            fwrite($socket, pack('V', self::COMMAND_GET_DEVICE_INFO));
            $response = fread($socket, 1024);

            if ($response && strlen($response) > 0) {
                return [
                    'firmware' => trim(substr($response, 0, 50)),
                    'serial' => trim(substr($response, 50, 50)),
                    'user_count' => unpack('V', substr($response, 100, 4))[1] ?? 0,
                    'fp_count' => unpack('V', substr($response, 104, 4))[1] ?? 0,
                    'face_count' => unpack('V', substr($response, 108, 4))[1] ?? 0,
                    'transaction_count' => unpack('V', substr($response, 112, 4))[1] ?? 0,
                ];
            }
        } catch (\Exception $e) {
            Log::error("ZKT: Get device info failed for {$terminal->device_id}: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Send a command to restart the terminal
     */
    public function restart(AttendanceTerminal $terminal): bool
    {
        if (!$this->connect($terminal)) return false;

        try {
            $key = "zkt_conn_{$terminal->id}";
            $socket = $this->sockets[$key] ?? null;
            if (!$socket) return false;

            fwrite($socket, pack('V', self::COMMAND_RESTART));
            $this->disconnect($terminal);
            return true;
        } catch (\Exception $e) {
            Log::error("ZKT: Restart failed for {$terminal->device_id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Process attendance events pushed from a ZKT terminal via HTTP
     */
    public function processPushAttendance(array $payload): array
    {
        $results = [];

        $terminalId = $payload['terminal_id'] ?? null;
        $records = $payload['records'] ?? [];

        if (!$terminalId || empty($records)) {
            return ['success' => false, 'message' => 'Invalid payload'];
        }

        $terminal = AttendanceTerminal::find($terminalId);
        if (!$terminal) {
            return ['success' => false, 'message' => 'Terminal not found'];
        }

        $terminal->update(['last_heartbeat_at' => now(), 'connection_status' => 'online']);

        foreach ($records as $record) {
            try {
                $result = $this->processSingleAttendance($terminal, $record);
                $results[] = $result;
            } catch (\Exception $e) {
                Log::error("ZKT: Failed to process push record: " . $e->getMessage());
                $results[] = ['user_id' => $record['user_id'] ?? 'unknown', 'success' => false, 'error' => $e->getMessage()];
            }
        }

        return ['success' => true, 'processed' => count($results), 'records' => $results];
    }

    /**
     * Check if a participant is registered for an event
     */
    protected function isParticipantInEvent(AttendanceInstitutionalEvent $event, int $participantId, string $participantType): bool
    {
        return AttendanceEventParticipant::where('institutional_event_id', $event->id)
            ->where('participant_id', $participantId)
            ->where('participant_type', $participantType)
            ->exists();
    }

    /**
     * Check if this person already has an attendance record for this event
     * with the same clock_type (prevents duplicate clock-in/out)
     */
    protected function hasExistingAttendanceForEvent(AttendanceInstitutionalEvent $event, int $participantId, string $participantType, string $clockType): bool
    {
        return AttendanceEventAttendance::where('institutional_event_id', $event->id)
            ->where('participant_id', $participantId)
            ->where('participant_type', $participantType)
            ->where('clock_type', $clockType)
            ->exists();
    }

    /**
     * Record event attendance directly in the DB and create offline sync record
     */
    protected function recordEventAttendance(AttendanceTerminal $terminal, AttendanceInstitutionalEvent $event, array $record, string $participantType, string $clockType, bool $isVisitor): array
    {
        $userId = (int) ($record['user_id'] ?? 0);
        $timestamp = $record['timestamp'] ?? now();
        $method = $record['method'] ?? 'fingerprint';

        // Prepare payload for direct DB write
        $attendanceData = [
            'institutional_event_id' => $event->id,
            'participant_id' => $userId,
            'participant_type' => $participantType,
            'status_id' => 1, // Present
            'clock_type' => $clockType,
            'is_visitor' => $isVisitor,
            'timestamp' => $timestamp,
            'venue_id' => $terminal->venue_id,
            'verified_by_terminal_id' => $terminal->id,
            'attendance_method' => $method,
            'sync_status' => 'synced',
        ];

        // 1. Write directly to attendance_event_attendance (real-time)
        $attendance = AttendanceEventAttendance::create($attendanceData);

        // 2. Also create offline sync record for resilience
        $syncRecord = AttendanceOfflinePendingSync::create([
            'terminal_id' => $terminal->id,
            'table_name' => 'attendance_event_attendance',
            'record_id' => $attendance->id,
            'action' => 'create',
            'payload' => json_encode($attendanceData),
            'status' => 'processed',
            'synced_at' => now(),
        ]);

        $this->logActivity($terminal, 'event_attendance', 'info',
            ($isVisitor ? 'Visitor' : 'Participant') . " {$participantType}:{$userId} clocked {$clockType} for event #{$event->id}"
        );

        return [
            'user_id' => (string) $userId,
            'success' => true,
            'attendance_id' => $attendance->id,
            'sync_id' => $syncRecord->id,
            'table' => 'attendance_event_attendance',
            'clock_type' => $clockType,
            'is_visitor' => $isVisitor,
        ];
    }

    /**
     * Process a single attendance record (route to the appropriate handler)
     */
    protected function processSingleAttendance(AttendanceTerminal $terminal, array $record): array
    {
        $userId = $record['user_id'] ?? null;
        $timestamp = $record['timestamp'] ?? now();
        $method = $record['method'] ?? 'fingerprint';
        $clockingType = $record['clocking_type'] ?? null;

        if (!$userId) {
            return ['success' => false, 'error' => 'Missing user_id'];
        }

        $clockingService = app(TerminalClockingService::class);

        if (!$clockingService->canClockFor($terminal, $clockingType ?? 'any')) {
            return ['success' => false, 'error' => "Terminal not permitted for '{$clockingType}' clocking"];
        }

        $targetTable = 'attendance_records';
        $payload = [];

        // If the terminal is class_only, find the active session at its venue
        $session = null;
        if ($terminal->clocking_mode === TerminalClockingService::MODE_CLASS || $clockingType === 'class') {
            $session = $clockingService->findActiveSessionForTerminal($terminal);
            if (!$session) {
                return ['success' => false, 'error' => 'No active session found for this terminal'];
            }
            $targetTable = 'attendance_records';
            $payload = [
                'student_id' => (int) $userId,
                'session_id' => $session->id,
                'venue_id' => $session->venue_id,
                'verified_by_terminal_id' => $terminal->id,
                'timestamp' => $timestamp,
                'attendance_method' => $method,
                'sync_status' => 'pending',
            ];
        } elseif ($terminal->clocking_mode === TerminalClockingService::MODE_STAFF || $clockingType === 'staff') {
            $targetTable = 'attendance_staff_clocking';
            $payload = [
                'staff_id' => (int) $userId,
                'clock_type' => 'in',
                'timestamp' => $timestamp,
                'venue_id' => $terminal->venue_id,
                'verified_by_terminal_id' => $terminal->id,
                'attendance_method' => $method,
                'sync_status' => 'pending',
            ];
        } elseif ($terminal->clocking_mode === TerminalClockingService::MODE_EVENT || $clockingType === 'event') {
            $activeEvent = $this->findActiveEventForTerminal($terminal);
            if (!$activeEvent) {
                return ['success' => false, 'error' => 'No active event found for this terminal'];
            }
            $participantType = $this->resolveParticipantType($userId);
            $clockType = $this->resolveClockType($activeEvent);
            $participantId = (int) $userId;

            // Dedup: skip if this person already has a scan for this clock_type
            if ($this->hasExistingAttendanceForEvent($activeEvent, $participantId, $participantType, $clockType)) {
                return [
                    'user_id' => $userId,
                    'success' => true,
                    'message' => "Duplicate {$clockType} scan for event #{$activeEvent->id} — skipped",
                    'deduplicated' => true,
                ];
            }

            // Visitor check
            $isVisitor = !$this->isParticipantInEvent($activeEvent, $participantId, $participantType);

            // Directly record attendance
            return $this->recordEventAttendance($terminal, $activeEvent, $record, $participantType, $clockType, $isVisitor);
        } else {
            // any mode — try active event first, then session, then fallback
            $activeEvent = $this->findActiveEventForTerminal($terminal);
            if ($activeEvent) {
                $participantType = $this->resolveParticipantType($userId);
                $clockType = $this->resolveClockType($activeEvent);
                $participantId = (int) $userId;

                // Dedup: skip if this person already has a scan for this clock_type
                if ($this->hasExistingAttendanceForEvent($activeEvent, $participantId, $participantType, $clockType)) {
                    return [
                        'user_id' => $userId,
                        'success' => true,
                        'message' => "Duplicate {$clockType} scan for event #{$activeEvent->id} — skipped",
                        'deduplicated' => true,
                    ];
                }

                // Visitor check
                $isVisitor = !$this->isParticipantInEvent($activeEvent, $participantId, $participantType);

                // Directly record attendance
                return $this->recordEventAttendance($terminal, $activeEvent, $record, $participantType, $clockType, $isVisitor);
            } else {
                $session = $clockingService->findActiveSessionForTerminal($terminal);
                if ($session) {
                    $targetTable = 'attendance_records';
                    $payload = [
                        'student_id' => (int) $userId,
                        'session_id' => $session->id,
                        'venue_id' => $session->venue_id,
                        'verified_by_terminal_id' => $terminal->id,
                        'timestamp' => $timestamp,
                        'attendance_method' => $method,
                        'sync_status' => 'pending',
                    ];
                } else {
                    // fallback: generic attendance record
                    $payload = [
                        'student_id' => (int) $userId,
                        'timestamp' => $timestamp,
                        'attendance_method' => $method,
                        'venue_id' => $terminal->venue_id,
                        'verified_by_terminal_id' => $terminal->id,
                        'sync_status' => 'pending',
                    ];
                }
            }
        }

        $syncRecord = \App\Models\Attendance\AttendanceOfflinePendingSync::create([
            'terminal_id' => $terminal->id,
            'table_name' => $targetTable,
            'record_id' => null,
            'action' => 'create',
            'payload' => json_encode($payload),
            'status' => 'pending',
        ]);

        return [
            'user_id' => $userId,
            'success' => true,
            'sync_id' => $syncRecord->id,
            'table' => $targetTable,
        ];
    }

    /**
     * Find the currently active institutional event at the terminal's venue
     * or explicitly assigned to this terminal
     */
    protected function findActiveEventForTerminal(AttendanceTerminal $terminal): ?AttendanceInstitutionalEvent
    {
        $now = now();
        $today = $now->format('Y-m-d');
        $currentTime = $now->format('H:i:s');

        return AttendanceInstitutionalEvent::where('is_active', true)
            ->where('status', 'active')
            ->where('start_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')
                   ->orWhere('end_date', '>=', $today);
            })
            ->where(function ($q) use ($currentTime) {
                $q->where(function ($q2) use ($currentTime) {
                    $q2->where('attendance_open_time', '<=', $currentTime)
                       ->where('attendance_close_time', '>=', $currentTime);
                })->orWhere(function ($q2) use ($currentTime) {
                    $q2->whereNotNull('clock_out_open_time')
                       ->whereNotNull('clock_out_close_time')
                       ->where('clock_out_open_time', '<=', $currentTime)
                       ->where('clock_out_close_time', '>=', $currentTime);
                });
            })
            ->where(function ($q) use ($terminal) {
                // Match by venue OR by explicit terminal assignment
                $q->where('venue_id', $terminal->venue_id)
                  ->orWhereHas('assignedTerminals', function ($q2) use ($terminal) {
                      $q2->where('attendance_terminals.id', $terminal->id);
                  });
            })
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Resolve participant type (staff or student) from a user ID
     */
    protected function resolveParticipantType(string $userId): string
    {
        // Check biometric templates first (most reliable)
        $template = \App\Models\Attendance\AttendanceBiometricTemplate::where('user_id', $userId)
            ->where('is_active', true)
            ->first();

        if ($template && in_array($template->user_type, ['staff', 'student'])) {
            return $template->user_type;
        }

        // Check staff_work_profiles by staff_no first (device registers the numeric part, e.g. "SAT 979" → "979")
        try {
            $profile = DB::connection('mysql_remote')
                ->table('staff_work_profiles')
                ->where('staff_no', 'REGEXP', "{$userId}$")
                ->orderBy('staff_id')
                ->first();
            if ($profile) {
                $staffExists = \App\Models\Portal\Staff::where('id', $profile->staff_id)->exists();
                if ($staffExists) {
                    return 'staff';
                }
            }
        } catch (\Exception $e) {
            Log::warning("staff_work_profiles lookup failed: {$e->getMessage()}");
        }

        // Check students table by direct ID (device registers student.id as-is)
        try {
            $studentExists = \App\Models\Portal\Student::where('id', (int) $userId)->exists();
            if ($studentExists) {
                return 'student';
            }
        } catch (\Exception $e) {
            // Table or connection may not be available
        }

        return 'student';
    }

    /**
     * Determine clock type (in/out) based on the event's time windows
     */
    protected function resolveClockType(\App\Models\Attendance\AttendanceInstitutionalEvent $event): string
    {
        $now = now();
        $currentTime = $now->format('H:i:s');

        if ($event->clock_out_open_time && $event->clock_out_close_time) {
            if ($currentTime >= $event->clock_out_open_time && $currentTime <= $event->clock_out_close_time) {
                return 'out';
            }
        }

        return 'in';
    }

    /**
     * Log activity from the terminal
     */
    public function logActivity(AttendanceTerminal $terminal, string $event, string $level = 'info', ?string $message = null): void
    {
        \App\Models\Attendance\AttendanceVenueTerminalLog::create([
            'terminal_id' => $terminal->id,
            'event' => $event,
            'payload' => ['level' => $level, 'message' => $message],
            'ip_address' => request()->ip(),
        ]);
    }
}
