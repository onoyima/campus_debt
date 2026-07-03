<?php

namespace App\Services;

use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceDebtPayment;
use App\Models\Attendance\AttendanceNotification;
use App\Models\Attendance\AttendanceStudentDebtLedger;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    private string $secretKey;
    private string $publicKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.paystack.secret_key', env('PAYSTACK_SECRET_KEY', ''));
        $this->publicKey = config('services.paystack.public_key', env('PAYSTACK_PUBLIC_KEY', ''));
        $this->baseUrl = 'https://api.paystack.co';
    }

    public function initializeTransaction(int $studentId, float $amount, array $debtIds, string $email): array
    {
        $reference = 'ATT-' . strtoupper(uniqid());

        $response = Http::withToken($this->secretKey)
            ->post("{$this->baseUrl}/transaction/initialize", [
                'email' => $email,
                'amount' => (int)($amount * 100),
                'reference' => $reference,
                'callback_url' => url('/api/payments/verify?reference=' . $reference),
                'metadata' => [
                    'student_id' => $studentId,
                    'debt_ids' => $debtIds,
                ],
            ]);

        if ($response->failed()) {
            Log::error('Paystack init failed', ['response' => $response->body()]);
            throw new \Exception('Payment gateway initialization failed: ' . ($response->json('message') ?? 'Unknown error'));
        }

        $data = $response->json('data');

        return [
            'reference' => $data['reference'] ?? $reference,
            'authorization_url' => $data['authorization_url'] ?? null,
            'access_code' => $data['access_code'] ?? null,
            'amount' => $amount,
            'status' => 'pending',
        ];
    }

    public function verifyTransaction(string $reference): array
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/transaction/verify/{$reference}");

        if ($response->failed()) {
            Log::error('Paystack verify failed', ['reference' => $reference, 'response' => $response->body()]);
            throw new \Exception('Payment verification failed: ' . ($response->json('message') ?? 'Unknown error'));
        }

        $data = $response->json('data');
        $status = $data['status'] ?? 'failed';

        if ($status === 'success') {
            $this->processSuccessfulPayment($data);
        }

        return [
            'reference' => $reference,
            'status' => $status,
            'gateway_response' => $data['gateway_response'] ?? null,
            'amount' => ($data['amount'] ?? 0) / 100,
            'paid_at' => $data['paid_at'] ?? null,
            'channel' => $data['channel'] ?? null,
            'metadata' => $data['metadata'] ?? null,
        ];
    }

    public function handleWebhook(array $payload): void
    {
        $event = $payload['event'] ?? '';
        $data = $payload['data'] ?? [];

        if ($event === 'charge.success') {
            $this->processSuccessfulPayment($data);
        }

        Log::info("Paystack webhook received: {$event}");
    }

    private function processSuccessfulPayment(array $data): void
    {
        $reference = $data['reference'] ?? '';
        $metadata = $data['metadata'] ?? [];
        $studentId = $metadata['student_id'] ?? null;
        $debtIds = $metadata['debt_ids'] ?? [];
        $amount = ($data['amount'] ?? 0) / 100;
        $channel = $data['channel'] ?? 'unknown';

        if (!$studentId || empty($debtIds)) {
            Log::warning('Payment webhook missing metadata', ['reference' => $reference]);
            return;
        }

        $existing = AttendanceDebtPayment::where('payment_reference', $reference)->exists();
        if ($existing) {
            Log::info("Payment already processed: {$reference}");
            return;
        }

        foreach ($debtIds as $debtId) {
            $debt = AttendanceDebt::find($debtId);
            if (!$debt || $debt->student_id != $studentId) continue;

            $debt->update(['payment_status' => 'paid']);

            AttendanceDebtPayment::create([
                'attendance_debt_id' => $debt->id,
                'amount' => $amount / count($debtIds),
                'payment_reference' => $reference,
                'payment_method' => $channel,
                'payment_date' => now(),
                'verified_at' => now(),
            ]);
        }

        $this->updateLedger($studentId);

        AttendanceNotification::create([
            'recipient_type' => 'student',
            'recipient_id' => $studentId,
            'notification_type' => 'payment_success',
            'title' => 'Payment Successful',
            'message' => "Payment of ₦{$amount} (ref: {$reference}) was successful.",
            'priority' => 'high',
            'status' => 'pending',
            'action_url' => "/debts?student_id={$studentId}",
        ]);

        Log::info("Payment processed: ref={$reference}, student={$studentId}, amount={$amount}");
    }

    public function listBanks(): array
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/bank", ['country' => 'nigeria']);

        if ($response->failed()) return [];
        return $response->json('data') ?? [];
    }

    public function resolveAccountNumber(string $accountNumber, string $bankCode): array
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/bank/resolve", [
                'account_number' => $accountNumber,
                'bank_code' => $bankCode,
            ]);

        if ($response->failed()) {
            throw new \Exception('Account resolution failed: ' . ($response->json('message') ?? ''));
        }

        return $response->json('data') ?? [];
    }

    private function updateLedger(int $studentId): void
    {
        $ledger = AttendanceStudentDebtLedger::firstOrCreate(
            ['student_id' => $studentId],
            [
                'total_outstanding' => 0,
                'total_paid' => 0,
                'total_cleared' => 0,
                'total_overdue' => 0,
            ]
        );

        $totalOutstanding = AttendanceDebt::where('student_id', $studentId)
            ->whereIn('payment_status', ['unpaid', 'overdue'])->sum('amount');
        $totalPaid = AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', 'paid')->sum('amount');

        $ledger->update([
            'total_outstanding' => $totalOutstanding,
            'total_paid' => $totalPaid,
            'last_calculated_at' => now(),
        ]);
    }
}
