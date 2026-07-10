<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceExamEligibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EligibilityEngineController extends Controller
{
    public function evaluateAll(): JsonResponse
    {
        try {
            $eligibilities = AttendanceExamEligibility::all();
            $updated = 0;
            foreach ($eligibilities as $eligibility) {
                $eligibility->update(['last_evaluated_at' => now()]);
                $updated++;
            }

            return response()->json(['message' => "Eligibility evaluated for {$updated} records."]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to evaluate eligibility.', 'error' => $e->getMessage()], 500);
        }
    }

    public function evaluateStudent(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $eligibilities = AttendanceExamEligibility::where('student_id', $request->student_id)->get();
            $updated = 0;
            foreach ($eligibilities as $eligibility) {
                $eligibility->update(['last_evaluated_at' => now()]);
                $updated++;
            }

            return response()->json(['message' => "Eligibility evaluated for student {$request->student_id} ({$updated} records)."]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to evaluate student eligibility.', 'error' => $e->getMessage()], 500);
        }
    }

    public function evaluateCourse(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'course_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $eligibility = AttendanceExamEligibility::updateOrCreate(
                [
                    'student_id' => $request->student_id,
                    'course_id' => $request->course_id,
                ],
                ['last_evaluated_at' => now()]
            );

            return response()->json(['data' => $eligibility, 'message' => 'Eligibility evaluated for course.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to evaluate course eligibility.', 'error' => $e->getMessage()], 500);
        }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (! $request->filled('include')) {
            return [];
        }

        return array_intersect(explode(',', $request->include), $allowed);
    }
}
