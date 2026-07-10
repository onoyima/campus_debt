<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceBiometricTemplate;
use App\Models\Attendance\AttendanceBiometricVerificationLog;
use App\Services\BiometricService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BiometricTemplateController extends Controller
{
    private BiometricService $biometricService;

    public function __construct(BiometricService $biometricService)
    {
        $this->biometricService = $biometricService;
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceBiometricTemplate::query();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('user_type')) {
            $query->where('user_type', $request->user_type);
        }
        if ($request->filled('template_type')) {
            $query->where('template_type', $request->template_type);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json(['data' => $records->items(), 'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()]]);
    }

    public function store(Request $request): JsonResponse
    {
        $userId = $request->student?->id ?? $request->staff?->id ?? auth()->id();
        $userType = $request->student ? 'student' : ($request->staff ? 'staff' : 'student');
        $validator = Validator::make($request->all(), [
            'template_type' => 'required|string|in:face,fingerprint',
            'template_data' => 'required|string',
            'enrolled_by' => 'nullable|integer',
            'enrolled_terminal_id' => 'nullable|integer|exists:attendance_terminals,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $template = $this->biometricService->enroll(
                $userId,
                $userType,
                $request->template_type,
                $request->template_data,
                $request->enrolled_by ?? $userId,
                $request->enrolled_terminal_id
            );

            return response()->json(['data' => $template, 'message' => 'Biometric template enrolled successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Enrollment failed.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceBiometricTemplate::find($id);
        if (! $record) {
            return response()->json(['message' => 'Template not found.'], 404);
        }
        $record->makeHidden('encrypted_template');

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendanceBiometricTemplate::find($id);
        if (! $record) {
            return response()->json(['message' => 'Template not found.'], 404);
        }
        $validator = Validator::make($request->all(), ['is_active' => 'required|boolean']);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        try {
            $record->update($validator->validated());

            return response()->json(['data' => $record, 'message' => 'Template updated.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Update failed.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $record = AttendanceBiometricTemplate::find($id);
        if (! $record) {
            return response()->json(['message' => 'Template not found.'], 404);
        }
        try {
            $record->delete();

            return response()->json(['message' => 'Deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Delete failed.', 'error' => $e->getMessage()], 500);
        }
    }

    public function searchVerify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'captured_data' => 'required|string',
            'terminal_id' => 'nullable|integer|exists:attendance_terminals,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->biometricService->verifyFaceBySearch(
                $request->captured_data,
                $request->terminal_id
            );

            $statusCode = $result['success'] ? 200 : 401;

            return response()->json(['data' => $result], $statusCode);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Verification failed.', 'error' => $e->getMessage()], 500);
        }
    }

    public function verify(Request $request): JsonResponse
    {
        $userId = $request->student?->id ?? $request->staff?->id ?? auth()->id();
        $userType = $request->student ? 'student' : ($request->staff ? 'staff' : 'student');
        $validator = Validator::make($request->all(), [
            'method' => 'required|string|in:face,fingerprint',
            'captured_data' => 'required|string',
            'terminal_id' => 'nullable|integer|exists:attendance_terminals,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $request->input('method') === 'face'
                ? $this->biometricService->verifyFace($userId, $userType, $request->captured_data, $request->terminal_id)
                : $this->biometricService->verifyFingerprint($userId, $userType, $request->captured_data, $request->terminal_id);

            $statusCode = $result['success'] ? 200 : 401;

            return response()->json(['data' => $result], $statusCode);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Verification failed.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceBiometricTemplate::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceBiometricTemplate::withTrashed()->findOrFail($id);
        $model->forceDelete();

        return response()->json(['message' => 'Permanently deleted.']);
    }

    public function logs(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceBiometricVerificationLog::query();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('result')) {
            $query->where('result', $request->result);
        }
        if ($request->filled('method')) {
            $query->where('method', $request->method);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json(['data' => $records->items(), 'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()]]);
    }
}
