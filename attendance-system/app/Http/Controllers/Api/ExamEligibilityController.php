<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceExamEligibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamEligibilityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceExamEligibility::query();

        $includes = $this->parseIncludes($request, ['eligibilityStatus']);
        $query->with($includes);

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }

        $records = $query->orderBy('last_evaluated_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['eligibilityStatus']);
        $eligibility = AttendanceExamEligibility::with($includes)->find($id);

        if (!$eligibility) {
            return response()->json(['message' => 'Exam eligibility record not found.'], 404);
        }

        $eligibility->percentage_breakdown = [
            'attendance_percentage' => $eligibility->attendance_percentage,
            'required_attendance_percentage' => $eligibility->required_attendance_percentage,
            'total_classes' => $eligibility->total_classes,
            'attended_classes' => $eligibility->attended_classes,
            'school_fees_cleared' => $eligibility->school_fees_cleared,
            'attendance_debts_cleared' => $eligibility->attendance_debts_cleared,
            'exeat_debts_cleared' => $eligibility->exeat_debts_cleared,
            'course_registered' => $eligibility->course_registered,
        ];

        return response()->json(['data' => $eligibility]);
    }

    public function evaluate(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'course_id' => 'required|integer',
            'academic_session_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $eligibility = AttendanceExamEligibility::updateOrCreate(
                [
                    'student_id' => $request->student_id,
                    'course_id' => $request->course_id,
                    'academic_session_id' => $request->academic_session_id,
                ],
                [
                    'last_evaluated_at' => now(),
                ]
            );

            $eligibility->load('eligibilityStatus');

            return response()->json([
                'data' => $eligibility,
                'message' => 'Exam eligibility re-evaluation triggered successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to evaluate exam eligibility.', 'error' => $e->getMessage()], 500);
        }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) {
            return [];
        }

        $includes = explode(',', $request->include);

        return array_intersect($includes, $allowed);
    }
}
