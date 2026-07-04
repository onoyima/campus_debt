<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class QrCodeService
{
    /**
     * Generate a QR code URL for a student's exam clearance
     */
    public function generateClearanceQrCode(int $studentId, int $courseId, ?int $eligibilityId = null): string
    {
        $payload = json_encode([
            'type' => 'exam_clearance',
            'student_id' => $studentId,
            'course_id' => $courseId,
            'eligibility_id' => $eligibilityId,
            'timestamp' => now()->timestamp,
            'hash' => $this->generateHash($studentId, $courseId, $eligibilityId),
        ]);

        $encoded = urlencode($payload);
        return "https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl={$encoded}&choe=UTF-8";
    }

    /**
     * Generate a QR code for a student's identity verification at exam hall
     */
    public function generateStudentIdentityQr(int $studentId, string $matricNo): string
    {
        $payload = json_encode([
            'type' => 'student_identity',
            'student_id' => $studentId,
            'matric_no' => $matricNo,
            'timestamp' => now()->timestamp,
            'hash' => $this->generateHash($studentId, $matricNo),
        ]);

        $encoded = urlencode($payload);
        return "https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl={$encoded}&choe=UTF-8";
    }

    /**
     * Verify a scanned QR code payload
     */
    public function verifyQrCode(string $payload): array
    {
        $data = json_decode($payload, true);

        if (!$data) {
            return ['valid' => false, 'error' => 'Invalid QR code format'];
        }

        // Check timestamp (valid for 5 minutes)
        if (isset($data['timestamp'])) {
            $age = now()->timestamp - $data['timestamp'];
            if ($age > 300) { // 5 minutes
                return ['valid' => false, 'error' => 'QR code expired'];
            }
        }

        // Verify hash
        if ($data['type'] === 'exam_clearance') {
            $expectedHash = $this->generateHash(
                $data['student_id'] ?? 0,
                $data['course_id'] ?? 0,
                $data['eligibility_id'] ?? null
            );

            if (($data['hash'] ?? '') !== $expectedHash) {
                return ['valid' => false, 'error' => 'Invalid QR code signature'];
            }

            return [
                'valid' => true,
                'type' => 'exam_clearance',
                'student_id' => (int) ($data['student_id'] ?? 0),
                'course_id' => (int) ($data['course_id'] ?? 0),
                'eligibility_id' => $data['eligibility_id'] ?? null,
            ];
        }

        if ($data['type'] === 'student_identity') {
            $expectedHash = $this->generateHash(
                $data['student_id'] ?? 0,
                $data['matric_no'] ?? ''
            );

            if (($data['hash'] ?? '') !== $expectedHash) {
                return ['valid' => false, 'error' => 'Invalid QR code signature'];
            }

            return [
                'valid' => true,
                'type' => 'student_identity',
                'student_id' => (int) ($data['student_id'] ?? 0),
                'matric_no' => $data['matric_no'] ?? '',
            ];
        }

        return ['valid' => false, 'error' => 'Unknown QR code type'];
    }

    /**
     * Generate a verification hash for QR code payload
     */
    protected function generateHash(...$params): string
    {
        $secret = config('app.key');
        $data = implode('|', array_map('strval', $params));
        return hash_hmac('sha256', $data, $secret);
    }

    /**
     * Verify a student at exam hall via QR code scan
     */
    public function verifyStudentAtHall(int $studentId, int $courseId): array
    {
        $eligibility = \App\Models\Attendance\AttendanceExamEligibility::where('student_id', $studentId)
            ->where('course_id', $courseId)
            ->with('eligibilityStatus')
            ->first();

        if (!$eligibility) {
            return [
                'verified' => false,
                'error' => 'No eligibility record found for this student/course',
            ];
        }

        $isEligible = $eligibility->eligibilityStatus?->is_eligible ?? false;

        return [
            'verified' => $isEligible,
            'student_id' => $studentId,
            'course_id' => $courseId,
            'eligibility_status' => $eligibility->eligibilityStatus?->display_name ?? 'Unknown',
            'attendance_percentage' => $eligibility->attendance_percentage,
            'school_fees_cleared' => $eligibility->school_fees_cleared,
            'attendance_debts_cleared' => $eligibility->attendance_debts_cleared,
            'reasons' => $eligibility->reasons_json,
        ];
    }
}
