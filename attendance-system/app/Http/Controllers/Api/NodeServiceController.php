<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NodeServiceController extends Controller
{
    private function getBaseUrl(): string
    {
        return config('app.node_service_url', env('NODE_SERVICE_URL', 'http://localhost:4000'));
    }

    private function getApiKey(): string
    {
        return config('app.node_service_api_key', env('NODE_SERVICE_API_KEY', ''));
    }

    private function proxyGet(string $path): JsonResponse
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders($this->getApiKey() ? ['X-API-Key' => $this->getApiKey()] : [])
                ->get($this->getBaseUrl() . $path);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Node service unreachable: ' . $e->getMessage()], 502);
        }
    }

    private function proxyPost(string $path, array $data = []): JsonResponse
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders($this->getApiKey() ? ['X-API-Key' => $this->getApiKey()] : [])
                ->post($this->getBaseUrl() . $path, $data);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Node service unreachable: ' . $e->getMessage()], 502);
        }
    }

    public function health(): JsonResponse
    {
        return $this->proxyGet('/health');
    }

    public function devices(): JsonResponse
    {
        return $this->proxyGet('/api/devices');
    }

    public function connectedDevices(): JsonResponse
    {
        return $this->proxyGet('/api/devices/connected');
    }

    public function connect(Request $request): JsonResponse
    {
        return $this->proxyPost('/api/devices/connect', $request->only('device_id'));
    }

    public function disconnect(Request $request): JsonResponse
    {
        return $this->proxyPost('/api/devices/disconnect', $request->only('device_id'));
    }

    public function cacheStats(): JsonResponse
    {
        return $this->proxyGet('/api/cache/stats');
    }

    public function testDevice(Request $request): JsonResponse
    {
        return $this->proxyPost('/devices/test', $request->only('ip_address', 'port'));
    }

    public function pullAttendance(Request $request): JsonResponse
    {
        return $this->proxyPost('/devices/pull', $request->only('ip_address', 'port', 'id'));
    }

    public function config(): JsonResponse
    {
        return response()->json([
            'data' => [
                'node_service_url' => $this->getBaseUrl(),
                'node_service_connected' => $this->checkConnection(),
                'ws_url' => $this->getBaseUrl(),
            ],
        ]);
    }

    private function checkConnection(): bool
    {
        try {
            $response = Http::timeout(3)->get($this->getBaseUrl() . '/health');
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }
}
