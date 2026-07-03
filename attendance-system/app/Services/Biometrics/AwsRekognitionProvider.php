<?php

namespace App\Services\Biometrics;

use Aws\Rekognition\RekognitionClient;
use Illuminate\Support\Facades\Log;

class AwsRekognitionProvider implements BiometricProviderContract
{
    private RekognitionClient $client;
    private string $collectionId;

    public function __construct()
    {
        $this->client = new RekognitionClient([
            'version' => 'latest',
            'region' => config('services.biometrics.aws_region', 'us-east-1'),
            'credentials' => [
                'key' => config('services.biometrics.aws_key', env('AWS_ACCESS_KEY_ID')),
                'secret' => config('services.biometrics.aws_secret', env('AWS_SECRET_ACCESS_KEY')),
            ],
        ]);
        $this->collectionId = config('services.biometrics.aws_collection_id', 'attendance-faces');
    }

    public function compareFaces(string $storedTemplate, string $capturedData): float
    {
        try {
            $result = $this->client->compareFaces([
                'SourceImage' => ['Bytes' => base64_decode($storedTemplate)],
                'TargetImage' => ['Bytes' => base64_decode($capturedData)],
                'SimilarityThreshold' => 0,
            ]);

            $matches = $result->get('FaceMatches', []);
            if (empty($matches)) return 0.0;

            return $matches[0]['Similarity'] / 100;
        } catch (\Exception $e) {
            Log::error('AWS Rekognition compareFaces failed: ' . $e->getMessage());
            return 0.0;
        }
    }

    public function compareFingerprints(string $storedTemplate, string $capturedData): float
    {
        Log::warning('AWS Rekognition does not support fingerprint comparison. Use a dedicated fingerprint SDK.');
        return 0.0;
    }

    public function detectLiveness(string $capturedData): float
    {
        try {
            $result = $this->client->detectFaces([
                'Image' => ['Bytes' => base64_decode($capturedData)],
                'Attributes' => ['ALL'],
            ]);

            $faces = $result->get('FaceDetails', []);
            if (empty($faces)) return 0.0;

            $face = $faces[0];
            $confidence = ($face['Confidence'] ?? 0) / 100;
            $eyesOpen = $face['EyesOpen']['Value'] ?? false;
            $mouthOpen = $face['MouthOpen']['Value'] ?? false;
            $smile = $face['Smile']['Value'] ?? false;

            $livenessScore = $confidence;
            if ($eyesOpen) $livenessScore *= 1.1;
            if ($mouthOpen || $smile) $livenessScore *= 1.05;

            return min($livenessScore, 1.0);
        } catch (\Exception $e) {
            Log::error('AWS Rekognition detectLiveness failed: ' . $e->getMessage());
            return 0.0;
        }
    }

    public function extractTemplate(string $rawCapture, string $type): string
    {
        return $rawCapture;
    }

    public function indexFaces(string $imageBase64, string $externalImageId): array
    {
        try {
            $result = $this->client->indexFaces([
                'CollectionId' => $this->collectionId,
                'Image' => ['Bytes' => base64_decode($imageBase64)],
                'ExternalImageId' => $externalImageId,
                'DetectionAttributes' => ['ALL'],
            ]);

            return $result->get('FaceRecords', []);
        } catch (\Exception $e) {
            Log::error('AWS Rekognition indexFaces failed: ' . $e->getMessage());
            return [];
        }
    }

    public function searchFacesByImage(string $imageBase64): array
    {
        try {
            $result = $this->client->searchFacesByImage([
                'CollectionId' => $this->collectionId,
                'Image' => ['Bytes' => base64_decode($imageBase64)],
                'FaceMatchThreshold' => 80,
                'MaxFaces' => 5,
            ]);

            return $result->get('FaceMatches', []);
        } catch (\Exception $e) {
            Log::error('AWS Rekognition searchFacesByImage failed: ' . $e->getMessage());
            return [];
        }
    }
}
