<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class DebtController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceDebt::query();

        $includes = $this->parseIncludes($request, ['debtPayments']);
        $query->with($includes);

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('participant_type')) {
            $query->where('participant_type', $request->participant_type);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('clearance_status')) {
            $query->where('clearance_status', $request->clearance_status);
        }

        $debts = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $studentId = $request->integer('student_id');
        if ($studentId) {
            $totalOutstanding = AttendanceDebt::where('student_id', $studentId)
                ->where('payment_status', '!=', 'paid')
                ->sum('amount');

            return response()->json([
                'data' => $debts->items(),
                'meta' => [
                    'current_page' => $debts->currentPage(),
                    'last_page' => $debts->lastPage(),
                    'per_page' => $debts->perPage(),
                    'total' => $debts->total(),
                    'total_outstanding' => $totalOutstanding,
                ],
            ]);
        }

        return response()->json([
            'data' => $debts->items(),
            'meta' => [
                'current_page' => $debts->currentPage(),
                'last_page' => $debts->lastPage(),
                'per_page' => $debts->perPage(),
                'total' => $debts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'amount' => 'required|numeric|min:0',
            'reason' => 'required|string|max:500',
            'due_date' => 'required|date',
            'institutional_event_id' => 'nullable|integer|exists:attendance_institutional_events,id',
            'attendance_record_id' => 'nullable|integer|exists:attendance_records,id',
            'payment_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $data['payment_status'] = $data['payment_status'] ?? 'pending';
            $debt = AttendanceDebt::create($data);
            $debt->load('debtPayments');

            return response()->json(['data' => $debt, 'message' => 'Debt recorded successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to record debt.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['debtPayments']);
        $debt = AttendanceDebt::with($includes)->find($id);

        if (! $debt) {
            return response()->json(['message' => 'Debt not found.'], 404);
        }

        return response()->json(['data' => $debt]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $debt = AttendanceDebt::find($id);

        if (! $debt) {
            return response()->json(['message' => 'Debt not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'payment_status' => 'sometimes|required|string|max:50',
            'clearance_status' => 'nullable|string|max:50',
            'blocks_eligibility' => 'nullable|boolean',
            'cleared_by' => 'nullable|integer',
            'cleared_at' => 'nullable|date',
            'waiver_reason' => 'nullable|string|max:500',
            'waiver_approved_by' => 'nullable|integer',
            'amount' => 'sometimes|required|numeric|min:0',
            'due_date' => 'sometimes|required|date',
            'reason' => 'sometimes|required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $debt->update($validator->validated());
            $debt->load('debtPayments');

            return response()->json(['data' => $debt, 'message' => 'Debt updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update debt.', 'error' => $e->getMessage()], 500);
        }
    }

    public function toggleEligibility($id): JsonResponse
    {
        $debt = AttendanceDebt::find($id);

        if (! $debt) {
            return response()->json(['message' => 'Debt not found.'], 404);
        }

        try {
            $debt->update(['blocks_eligibility' => ! $debt->blocks_eligibility]);

            return response()->json([
                'data' => $debt->fresh(),
                'message' => $debt->blocks_eligibility
                    ? 'This debt will now block exam eligibility.'
                    : 'This debt will no longer block exam eligibility.',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to toggle eligibility flag.', 'error' => $e->getMessage()], 500);
        }
    }

    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="debt_upload_template.csv"',
        ];

        $columns = ['student_id', 'amount', 'reason', 'due_date', 'blocks_eligibility'];
        $callback = function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            fputcsv($handle, ['12345', '5000', 'Property damage - broken window', '2026-08-01', '0']);
            fputcsv($handle, ['67890', '2500', 'Manual event attendance penalty', '2026-08-15', '1']);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function bulkUpload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'institutional_event_id' => 'nullable|integer|exists:attendance_institutional_events,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            $rows = [];

            if (in_array($extension, ['csv', 'txt'])) {
                $handle = fopen($file->getRealPath(), 'r');
                $header = fgetcsv($handle);
                while (($row = fgetcsv($handle)) !== false) {
                    $rows[] = array_combine($header, $row);
                }
                fclose($handle);
            } else {
                $spreadsheet = IOFactory::load($file->getRealPath());
                $worksheet = $spreadsheet->getActiveSheet();
                $data = $worksheet->toArray();
                $header = array_shift($data);
                foreach ($data as $row) {
                    if (array_filter($row)) {
                        $rows[] = array_combine($header, $row);
                    }
                }
            }

            if (empty($rows)) {
                return response()->json(['message' => 'File is empty.'], 422);
            }

            $created = 0;
            $failed = [];
            $eventId = $request->institutional_event_id;

            foreach ($rows as $i => $row) {
                $rowErrors = [];

                $studentId = trim($row['student_id'] ?? '');
                $amount = trim($row['amount'] ?? '');
                $reason = trim($row['reason'] ?? '');
                $dueDate = trim($row['due_date'] ?? '');
                $blocksEligibility = filter_var(trim($row['blocks_eligibility'] ?? '0'), FILTER_VALIDATE_BOOLEAN);

                if (! $studentId || ! is_numeric($studentId)) {
                    $failed[] = 'Row '.($i + 2).': invalid or missing student_id';

                    continue;
                }
                if (! $amount || ! is_numeric($amount) || $amount < 0) {
                    $failed[] = 'Row '.($i + 2)." (student {$studentId}): invalid amount";

                    continue;
                }
                if (! $reason) {
                    $failed[] = 'Row '.($i + 2)." (student {$studentId}): missing reason";

                    continue;
                }
                if (! $dueDate) {
                    $failed[] = 'Row '.($i + 2)." (student {$studentId}): missing due_date";

                    continue;
                }

                try {
                    AttendanceDebt::create([
                        'student_id' => (int) $studentId,
                        'amount' => (float) $amount,
                        'reason' => $reason,
                        'due_date' => $dueDate,
                        'payment_status' => 'pending',
                        'blocks_eligibility' => $blocksEligibility,
                        'institutional_event_id' => $eventId,
                    ]);
                    $created++;
                } catch (\Exception $e) {
                    $failed[] = 'Row '.($i + 2)." (student {$studentId}): ".$e->getMessage();
                }
            }

            return response()->json([
                'message' => "{$created} debt(s) created. ".count($failed).' row(s) failed.',
                'created' => $created,
                'failed' => $failed,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to process file.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceDebt::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceDebt::withTrashed()->findOrFail($id);
        $model->forceDelete();

        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (! $request->filled('include')) {
            return [];
        }

        $includes = explode(',', $request->include);

        return array_intersect($includes, $allowed);
    }
}
