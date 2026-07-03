<?php

namespace App\Services\Biometrics;

use Illuminate\Support\Facades\Log;

class LocalTestProvider implements BiometricProviderContract
{
    private float $livenessOverride;
    private float $matchOverride;

    public function __construct()
    {
        $this->livenessOverride = (float) config('services.biometrics.test_liveness', 0.95);
        $this->matchOverride = (float) config('services.biometrics.test_match', 0.85);
    }

    public function compareFaces(string $storedTemplate, string $capturedData): float
    {
        $templateHash = md5($storedTemplate);
        $captureHash = md5($capturedData);
        $distance = levenshtein($templateHash, $captureHash);
        $maxLen = max(strlen($templateHash), strlen($captureHash));
        $similarity = $maxLen > 0 ? (1 - $distance / $maxLen) : 0;

        Log::debug('LocalTestProvider::compareFaces', [
            'similarity' => $similarity,
            'override' => $this->matchOverride,
        ]);

        return max($similarity, $this->matchOverride);
    }

    public function compareFingerprints(string $storedTemplate, string $capturedData): float
    {
        $templateHash = md5($storedTemplate);
        $captureHash = md5($capturedData);
        $distance = levenshtein($templateHash, $captureHash);
        $maxLen = max(strlen($templateHash), strlen($captureHash));
        $similarity = $maxLen > 0 ? (1 - $distance / $maxLen) : 0;

        return max($similarity, $this->matchOverride);
    }

    public function detectLiveness(string $capturedData): float
    {
        return $this->livenessOverride;
    }

    public function extractTemplate(string $rawCapture, string $type): string
    {
        return $rawCapture;
    }
}
