<?php

namespace App\Services;

use App\Models\Attendance\AttendanceBiometricTemplate;
use App\Models\Attendance\AttendanceBiometricVerificationLog;
use App\Services\Biometrics\BiometricProviderContract;
use Illuminate\Support\Facades\Log;

class BiometricService
{
    private BiometricProviderContract $provider;

    public function __construct(BiometricProviderContract $provider)
    {
        $this->provider = $provider;
    }

    public function enroll(int $userId, string $userType, string $templateType, string $templateData, ?int $enrolledBy = null, ?int $terminalId = null): AttendanceBiometricTemplate
    {
        AttendanceBiometricTemplate::where('user_id', $userId)
            ->where('user_type', $userType)
            ->where('template_type', $templateType)
            ->update(['is_active' => false]);

        $extracted = $this->provider->extractTemplate($templateData, $templateType);
        $encrypted = $this->encryptTemplate($extracted);
        $hash = hash('sha256', $extracted);

        $template = AttendanceBiometricTemplate::create([
            'user_id' => $userId,
            'user_type' => $userType,
            'template_type' => $templateType,
            'encrypted_template' => base64_encode($encrypted),
            'template_hash' => $hash,
            'algorithm_version' => config('services.biometrics.algorithm_version', 'v2.0'),
            'is_active' => true,
            'enrolled_at' => now(),
            'enrolled_by' => $enrolledBy,
            'enrolled_terminal_id' => $terminalId,
        ]);

        Log::info("Biometric enrolled: user={$userId} type={$templateType} template={$template->id}");

        return $template;
    }

    public function verifyFace(int $userId, string $userType, string $capturedFaceData, ?int $terminalId = null): array
    {
        $startTime = microtime(true) * 1000;
        $template = $this->getActiveTemplate($userId, $userType, 'face');

        if (!$template) {
            return $this->logResult($userId, $userType, 'face', null, $terminalId, 'failed', 0, 0, 'No active face template found', $startTime);
        }

        $storedTemplate = $this->decryptTemplate(base64_decode($template->encrypted_template));

        $livenessScore = $this->provider->detectLiveness($capturedFaceData);

        if ($livenessScore < 0.5) {
            return $this->logResult($userId, $userType, 'face', $template->id, $terminalId, 'spoof_detected', 0, $livenessScore, 'Liveness check failed - possible spoof attack', $startTime);
        }

        $confidenceScore = $this->provider->compareFaces($storedTemplate, $capturedFaceData);
        $threshold = (float) config('services.biometrics.face_threshold', 0.75);
        $result = $confidenceScore >= $threshold ? 'verified' : 'failed';
        $errorMsg = $result === 'failed' ? "Confidence {$confidenceScore} below threshold {$threshold}" : null;

        return $this->logResult($userId, $userType, 'face', $template->id, $terminalId, $result, $confidenceScore, $livenessScore, $errorMsg, $startTime);
    }

    public function verifyFingerprint(int $userId, string $userType, string $capturedFingerprintData, ?int $terminalId = null): array
    {
        $startTime = microtime(true) * 1000;
        $template = $this->getActiveTemplate($userId, $userType, 'fingerprint');

        if (!$template) {
            return $this->logResult($userId, $userType, 'fingerprint', null, $terminalId, 'failed', 0, 0, 'No active fingerprint template found', $startTime);
        }

        $storedTemplate = $this->decryptTemplate(base64_decode($template->encrypted_template));
        $confidenceScore = $this->provider->compareFingerprints($storedTemplate, $capturedFingerprintData);
        $threshold = (float) config('services.biometrics.fingerprint_threshold', 0.80);
        $result = $confidenceScore >= $threshold ? 'verified' : 'failed';
        $errorMsg = $result === 'failed' ? "Match confidence {$confidenceScore} below threshold {$threshold}" : null;

        return $this->logResult($userId, $userType, 'fingerprint', $template->id, $terminalId, $result, $confidenceScore, null, $errorMsg, $startTime);
    }

    public function verifyFaceBySearch(string $capturedFaceData, ?int $terminalId = null): array
    {
        $startTime = microtime(true) * 1000;

        if (!method_exists($this->provider, 'searchFacesByImage')) {
            return $this->logResult(0, 'unknown', 'face', null, $terminalId, 'failed', 0, 0, 'Provider does not support face search', $startTime);
        }

        $livenessScore = $this->provider->detectLiveness($capturedFaceData);

        if ($livenessScore < 0.5) {
            return $this->logResult(0, 'unknown', 'face', null, $terminalId, 'spoof_detected', 0, $livenessScore, 'Liveness check failed - possible spoof attack', $startTime);
        }

        $matches = $this->provider->searchFacesByImage($capturedFaceData);

        if (empty($matches)) {
            return $this->logResult(0, 'unknown', 'face', null, $terminalId, 'failed', 0, $livenessScore, 'No matching face found in collection', $startTime);
        }

        $bestMatch = $matches[0];
        $confidenceScore = ($bestMatch['Similarity'] ?? 0) / 100;
        $externalImageId = $bestMatch['Face']['ExternalImageId'] ?? '';
        $userId = (int) explode('_', $externalImageId)[0] ?? 0;

        $threshold = (float) config('services.biometrics.face_threshold', 0.75);
        $result = $confidenceScore >= $threshold ? 'verified' : 'failed';
        $errorMsg = $result === 'failed' ? "Confidence {$confidenceScore} below threshold {$threshold}" : null;

        return $this->logResult($userId, 'student', 'face', null, $terminalId, $result, $confidenceScore, $livenessScore, $errorMsg, $startTime);
    }

    private function getActiveTemplate(int $userId, string $userType, string $templateType): ?AttendanceBiometricTemplate
    {
        return AttendanceBiometricTemplate::where('user_id', $userId)
            ->where('user_type', $userType)
            ->where('template_type', $templateType)
            ->where('is_active', true)
            ->latest('enrolled_at')
            ->first();
    }

    private function encryptTemplate(string $data): string
    {
        $key = sodium_crypto_secretbox_keygen();
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $encrypted = sodium_crypto_secretbox($data, $nonce, $key);
        return $nonce . $encrypted . $key;
    }

    private function decryptTemplate(string $encryptedWithKey): string
    {
        $nonceLen = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES;
        $keyLen = SODIUM_CRYPTO_SECRETBOX_KEYBYTES;
        $nonce = substr($encryptedWithKey, 0, $nonceLen);
        $key = substr($encryptedWithKey, -$keyLen);
        $encrypted = substr($encryptedWithKey, $nonceLen, -$keyLen);
        $decrypted = sodium_crypto_secretbox_open($encrypted, $nonce, $key);
        return $decrypted !== false ? $decrypted : '';
    }

    private function logResult(int $userId, string $userType, string $method, ?int $templateId, ?int $terminalId, string $result, ?float $confidence, ?float $liveness, ?string $error, float $startTime): array
    {
        $duration = (int)((microtime(true) * 1000) - $startTime);

        AttendanceBiometricVerificationLog::create([
            'user_id' => $userId,
            'user_type' => $userType,
            'method' => $method,
            'template_id' => $templateId,
            'terminal_id' => $terminalId,
            'result' => $result,
            'confidence_score' => $confidence,
            'liveness_score' => $liveness,
            'error_message' => $error,
            'duration_ms' => $duration,
        ]);

        return [
            'success' => $result === 'verified',
            'result' => $result,
            'confidence_score' => $confidence,
            'liveness_score' => $liveness,
            'error_message' => $error,
            'duration_ms' => $duration,
        ];
    }
}
