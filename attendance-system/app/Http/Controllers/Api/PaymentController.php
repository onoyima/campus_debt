<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    private PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    public function initialize(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'amount' => 'required|numeric|min:1',
            'debt_ids' => 'required|array|min:1',
            'debt_ids.*' => 'integer|exists:attendance_debts,id',
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->paymentService->initializeTransaction(
                $request->student_id,
                $request->amount,
                $request->debt_ids,
                $request->email
            );

            return response()->json(['data' => $result, 'message' => 'Payment initialized.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function verify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), ['reference' => 'required|string']);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->paymentService->verifyTransaction($request->reference);

            return response()->json(['data' => $result]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function webhook(Request $request): JsonResponse
    {
        $signature = $request->header('x-paystack-signature');
        $payload = $request->getContent();

        if ($signature && $signature !== hash_hmac('sha512', $payload, config('services.paystack.secret_key'))) {
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        try {
            $this->paymentService->handleWebhook($request->all());

            return response()->json(['message' => 'Webhook processed.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Webhook processing failed.', 'error' => $e->getMessage()], 500);
        }
    }

    public function banks(Request $request): JsonResponse
    {
        try {
            $banks = $this->paymentService->listBanks();

            return response()->json(['data' => $banks]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function resolveAccount(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'account_number' => 'required|string|size:10',
            'bank_code' => 'required|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->paymentService->resolveAccountNumber($request->account_number, $request->bank_code);

            return response()->json(['data' => $result]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
