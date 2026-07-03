<?php

namespace App\Services\Biometrics;

interface BiometricProviderContract
{
    public function compareFaces(string $storedTemplate, string $capturedData): float;

    public function compareFingerprints(string $storedTemplate, string $capturedData): float;

    public function detectLiveness(string $capturedData): float;

    public function extractTemplate(string $rawCapture, string $type): string;
}
