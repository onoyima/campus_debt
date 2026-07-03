<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private string $apiKey;
    private string $senderId;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.sms.api_key', env('SMS_API_KEY', ''));
        $this->senderId = config('services.sms.sender_id', env('SMS_SENDER_ID', 'Attendance'));
        $this->baseUrl = config('services.sms.base_url', env('SMS_BASE_URL', 'https://api.termii.com/api'));
    }

    public function send(string $phone, string $message): bool
    {
        if (empty($this->apiKey)) {
            Log::info("SMS not sent (no API key): to={$phone}, msg=" . substr($message, 0, 50));
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/sms/send", [
                'api_key' => $this->apiKey,
                'to' => $phone,
                'from' => $this->senderId,
                'sms' => $message,
                'type' => 'plain',
                'channel' => 'generic',
            ]);

            if ($response->successful()) {
                Log::info("SMS sent to {$phone}");
                return true;
            }

            Log::error("SMS failed to {$phone}", ['response' => $response->body()]);
            return false;
        } catch (\Exception $e) {
            Log::error("SMS exception to {$phone}: {$e->getMessage()}");
            return false;
        }
    }

    public function sendBulk(array $phones, string $message): int
    {
        $sent = 0;
        foreach ($phones as $phone) {
            if ($this->send($phone, $message)) $sent++;
        }
        return $sent;
    }
}
