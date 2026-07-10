<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStaffClocking;
use App\Models\Attendance\AttendanceTerminal;
use App\Models\Attendance\AttendanceVenue;
use App\Services\ExportService;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    protected ExportService $exportService;

    public function __construct(ExportService $exportService)
    {
        $this->exportService = $exportService;
    }

    public function attendanceRecords(Request $request)
    {
        $query = AttendanceRecord::query()->with(['session', 'status']);

        if ($request->filled('session_id')) {
            $query->where('session_id', $request->session_id);
        }
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $records = $query->limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'id' => $r->id,
            'student_id' => $r->student_id,
            'session_title' => $r->session?->title ?? $r->session_id,
            'status' => $r->status?->display_name ?? $r->status_id,
            'method' => $r->attendance_method,
            'timestamp' => $r->timestamp,
            'venue_id' => $r->venue_id,
        ]);

        $format = $request->query('format', 'csv');
        $filename = "attendance_records_{$this->timestamp()}.{$format}";

        $headers = ['ID', 'Student ID', 'Session', 'Status', 'Method', 'Timestamp', 'Venue ID'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Attendance Records Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    public function sessions(Request $request)
    {
        $query = AttendanceSession::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('from')) {
            $query->whereDate('session_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('session_date', '<=', $request->to);
        }

        $query->withCount('records');

        $records = $query->limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'id' => $r->id,
            'title' => $r->title,
            'date' => $r->session_date,
            'status' => $r->status,
            'venue_id' => $r->venue_id,
            'course_assigned_id' => $r->course_assigned_id,
            'records_count' => $r->records_count,
        ]);

        $format = $request->query('format', 'csv');
        $filename = "sessions_{$this->timestamp()}.{$format}";

        $headers = ['ID', 'Title', 'Date', 'Status', 'Venue ID', 'Course ID', 'Records Count'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Sessions Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    public function debts(Request $request)
    {
        $query = AttendanceDebt::query();

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        $records = $query->limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'id' => $r->id,
            'student_id' => $r->student_id,
            'amount' => number_format((float) $r->amount, 2),
            'reason' => $r->reason,
            'status' => $r->payment_status,
            'due_date' => $r->due_date,
            'created_at' => $r->created_at,
        ]);

        $format = $request->query('format', 'csv');
        $filename = "debts_{$this->timestamp()}.{$format}";

        $headers = ['ID', 'Student ID', 'Amount (₦)', 'Reason', 'Status', 'Due Date', 'Created'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Debts Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    public function eligibility(Request $request)
    {
        $query = AttendanceExamEligibility::query()->with('eligibilityStatus');

        if ($request->filled('status_id')) {
            $query->where('eligibility_status_id', $request->status_id);
        }
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        $records = $query->limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'student_id' => $r->student_id,
            'course_id' => $r->course_id,
            'attendance_pct' => $r->attendance_percentage.'%',
            'status' => $r->eligibilityStatus?->display_name ?? $r->eligibility_status_id,
            'fees_cleared' => $r->school_fees_cleared ? 'Yes' : 'No',
            'debts_cleared' => $r->attendance_debts_cleared ? 'Yes' : 'No',
            'evaluated_at' => $r->last_evaluated_at,
        ]);

        $format = $request->query('format', 'csv');
        $filename = "eligibility_{$this->timestamp()}.{$format}";

        $headers = ['Student ID', 'Course ID', 'Attendance %', 'Status', 'Fees Cleared', 'Debts Cleared', 'Evaluated At'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Exam Eligibility Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    public function staffClockings(Request $request)
    {
        $query = AttendanceStaffClocking::query();

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }
        if ($request->filled('clock_type')) {
            $query->where('clock_type', $request->clock_type);
        }
        if ($request->filled('from')) {
            $query->whereDate('timestamp', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('timestamp', '<=', $request->to);
        }

        $records = $query->limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'id' => $r->id,
            'staff_id' => $r->staff_id,
            'type' => $r->clock_type,
            'clocked_at' => $r->timestamp,
            'method' => $r->attendance_method ?? 'manual',
        ]);

        $format = $request->query('format', 'csv');
        $filename = "staff_clockings_{$this->timestamp()}.{$format}";

        $headers = ['ID', 'Staff ID', 'Type', 'Clocked At', 'Method'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Staff Clockings Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    public function venues(Request $request)
    {
        $records = AttendanceVenue::limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'id' => $r->id,
            'name' => $r->name,
            'code' => $r->code,
            'type' => $r->venue_type,
            'capacity' => $r->capacity,
            'status' => $r->is_active ? 'Active' : 'Inactive',
        ]);

        $format = $request->query('format', 'csv');
        $filename = "venues_{$this->timestamp()}.{$format}";

        $headers = ['ID', 'Name', 'Code', 'Type', 'Capacity', 'Status'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Venues Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    public function terminals(Request $request)
    {
        $records = AttendanceTerminal::limit($request->integer('limit', 1000))->get();

        $data = $records->map(fn ($r) => [
            'id' => $r->id,
            'device_id' => $r->device_id,
            'type' => $r->terminal_type,
            'os' => $r->os,
            'firmware' => $r->firmware_version,
            'status' => $r->is_active ? 'Active' : 'Inactive',
            'connection_status' => $r->connection_status ?? 'N/A',
        ]);

        $format = $request->query('format', 'csv');
        $filename = "terminals_{$this->timestamp()}.{$format}";

        $headers = ['ID', 'Device ID', 'Type', 'OS', 'Firmware', 'Status', 'Connection'];

        return match ($format) {
            'xlsx' => $this->exportService->toExcel($headers, $data, $filename),
            'pdf' => $this->exportService->toPdf('Terminals Report', $headers, $data, $filename),
            default => $this->exportService->toCsv($headers, $data, $filename),
        };
    }

    protected function timestamp(): string
    {
        return now()->format('Ymd_His');
    }
}
