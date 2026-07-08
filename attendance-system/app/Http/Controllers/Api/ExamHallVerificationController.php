<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ExamHallVerificationController extends Controller
{
    protected QrCodeService $qrCodeService;

    public function __construct(QrCodeService $qrCodeService)
    {
        $this->qrCodeService = $qrCodeService;
    }

    /**
     * Verify a student by ID/matric/name at the exam hall
     */
    public function verifyStudent(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required_without_all:matric_no,full_name|integer',
            'matric_no' => 'required_without_all:student_id,full_name|string',
            'full_name' => 'required_without_all:student_id,matric_no|string',
            'course_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentId = $request->student_id;

        // If searching by matric_no or name, look up the student in the portal DB
        if (!$studentId) {
            try {
                $query = \Illuminate\Support\Facades\DB::connection('mysql_remote')
                    ->table('students')
                    ->leftJoin('student_academics', 'students.id', '=', 'student_academics.student_id');

                if ($request->filled('matric_no')) {
                    $query->where('student_academics.matric_no', $request->matric_no);
                } elseif ($request->filled('full_name')) {
                    $query->where(function ($q) use ($request) {
                        $name = $request->full_name;
                        $q->where('students.fname', 'like', "%{$name}%")
                          ->orWhere('students.lname', 'like', "%{$name}%")
                          ->orWhereRaw("CONCAT(students.fname, ' ', students.lname) LIKE ?", ["%{$name}%"]);
                    });
                }

                $student = $query->select('students.id', 'student_academics.matric_no', 'students.fname', 'students.lname')->first();
                if (!$student) {
                    return response()->json(['verified' => false, 'error' => 'Student not found in portal'], 404);
                }
                $studentId = $student->id;
            } catch (\Exception $e) {
                return response()->json(['verified' => false, 'error' => 'Failed to search student: ' . $e->getMessage()], 500);
            }
        }

        $result = $this->qrCodeService->verifyStudentAtHall((int) $studentId, (int) $request->course_id);

        // Generate QR code for verified students
        if ($result['verified']) {
            $result['qr_code_url'] = $this->qrCodeService->generateClearanceQrCode(
                (int) $studentId,
                (int) $request->course_id,
                $result['eligibility_id'] ?? null
            );
        }

        return response()->json($result);
    }

    /**
     * Verify by QR code scan
     */
    public function verifyByQr(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_payload' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $decoded = json_decode(base64_decode($request->qr_payload), true) 
            ?? json_decode($request->qr_payload, true);

        if (!$decoded) {
            // Try URL-decoded
            $decoded = json_decode(urldecode($request->qr_payload), true);
        }

        if (!$decoded) {
            return response()->json(['valid' => false, 'error' => 'Invalid QR payload'], 400);
        }

        $result = $this->qrCodeService->verifyQrCode(json_encode($decoded));

        if (!$result['valid']) {
            return response()->json($result, 400);
        }

        if ($result['type'] === 'exam_clearance') {
            $hallResult = $this->qrCodeService->verifyStudentAtHall(
                $result['student_id'],
                $result['course_id']
            );

            return response()->json(array_merge($result, [
                'verification' => $hallResult,
            ]));
        }

        if ($result['type'] === 'student_identity') {
            // Lookup student from portal
            try {
                $student = \Illuminate\Support\Facades\DB::connection('mysql_remote')
                    ->table('students')
                    ->leftJoin('student_academics', 'students.id', '=', 'student_academics.student_id')
                    ->where('students.id', $result['student_id'])
                    ->select('students.id', 'student_academics.matric_no', 'students.fname', 'students.lname', 'student_academics.faculty_id', 'student_academics.department_id', 'student_academics.level as current_level')
                    ->first();

                return response()->json(array_merge($result, [
                    'student' => $student,
                ]));
            } catch (\Exception $e) {
                return response()->json(array_merge($result, [
                    'error' => 'Student lookup failed: ' . $e->getMessage(),
                ]), 500);
            }
        }

        return response()->json($result);
    }

    /**
     * Generate a QR code for a student
     */
    public function generateQr(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'type' => 'required|string|in:clearance,identity',
            'course_id' => 'required_if:type,clearance|integer',
            'matric_no' => 'required_if:type,identity|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->type === 'clearance') {
            $url = $this->qrCodeService->generateClearanceQrCode(
                (int) $request->student_id,
                (int) $request->course_id
            );
        } else {
            $url = $this->qrCodeService->generateStudentIdentityQr(
                (int) $request->student_id,
                (string) $request->matric_no
            );
        }

        return response()->json([
            'qr_code_url' => $url,
            'type' => $request->type,
        ]);
    }

    /**
     * View a student's eligibility and generate QR for NFC-like tap
     */
    public function viewEligibilityWithQr($studentId, $courseId): JsonResponse
    {
        $result = $this->qrCodeService->verifyStudentAtHall((int) $studentId, (int) $courseId);

        if ($result['verified']) {
            $result['qr_code_url'] = $this->qrCodeService->generateClearanceQrCode(
                (int) $studentId,
                (int) $courseId
            );
        }

        // Also generate identity QR
        try {
            $student = \Illuminate\Support\Facades\DB::connection('mysql_remote')
                ->table('students')
                ->leftJoin('student_academics', 'students.id', '=', 'student_academics.student_id')
                ->where('students.id', $studentId)
                ->select('students.id', 'student_academics.matric_no', 'students.fname', 'students.lname')
                ->first();

            if ($student) {
                $result['identity_qr_url'] = $this->qrCodeService->generateStudentIdentityQr(
                    (int) $studentId,
                    $student->matric_no
                );
                $result['student_name'] = $student->fname . ' ' . $student->lname;
                $result['matric_no'] = $student->matric_no;
            }
        } catch (\Exception $e) {
            // Non-critical
        }

        return response()->json($result);
    }
}
