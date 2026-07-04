<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paystack' => [
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
    ],

    'biometrics' => [
        'driver' => env('BIOMETRIC_DRIVER', 'local'),
        'aws_region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        'aws_key' => env('AWS_ACCESS_KEY_ID'),
        'aws_secret' => env('AWS_SECRET_ACCESS_KEY'),
        'aws_collection_id' => env('AWS_REKOGNITION_COLLECTION_ID', 'attendance-faces'),
        'face_threshold' => env('BIOMETRIC_FACE_THRESHOLD', 0.75),
        'fingerprint_threshold' => env('BIOMETRIC_FINGERPRINT_THRESHOLD', 0.80),
        'liveness_threshold' => env('BIOMETRIC_LIVENESS_THRESHOLD', 0.50),
        'algorithm_version' => env('BIOMETRIC_ALGORITHM_VERSION', 'v2.0'),
        'test_liveness' => env('BIOMETRIC_TEST_LIVENESS', 0.95),
        'test_match' => env('BIOMETRIC_TEST_MATCH', 0.85),
    ],

    'sms' => [
        'api_key' => env('SMS_API_KEY'),
        'sender_id' => env('SMS_SENDER_ID', 'Attendance'),
        'base_url' => env('SMS_BASE_URL', 'https://api.termii.com/api'),
    ],

    'zkt' => [
        'connection_timeout' => 5,
        'read_timeout' => 5,
        'poll_interval' => 30,
        'auto_sync_users' => env('ZKT_AUTO_SYNC_USERS', true),
        'auto_pull_attendance' => env('ZKT_AUTO_PULL_ATTENDANCE', true),
    ],

];
