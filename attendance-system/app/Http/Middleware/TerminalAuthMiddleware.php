<?php

namespace App\Http\Middleware;

use App\Models\Attendance\AttendanceTerminal;
use Closure;
use Illuminate\Http\Request;

class TerminalAuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken()
            ?? $request->header('X-Terminal-Key')
            ?? $request->header('X-API-Key')
            ?? $request->input('api_key');

        if (!$token) {
            return response()->json(['message' => 'Missing terminal API key'], 401);
        }

        $serviceApiKey = config('app.terminal_service_api_key');

        if ($serviceApiKey && hash_equals($serviceApiKey, $token)) {
            $terminalId = $request->input('terminal_id')
                ?? $request->route('id')
                ?? $request->route('terminal');

            if ($terminalId) {
                $terminal = AttendanceTerminal::where('is_active', true)->find($terminalId);
                if ($terminal) {
                    $request->attributes->set('authenticated_terminal', $terminal);
                }
            }

            return $next($request);
        }

        $terminal = AttendanceTerminal::where('api_key', $token)
            ->where('is_active', true)
            ->first();

        if (!$terminal) {
            return response()->json(['message' => 'Invalid or inactive terminal'], 401);
        }

        $request->merge(['authenticated_terminal' => $terminal]);
        $request->attributes->set('authenticated_terminal', $terminal);
        $request->setUserResolver(function () use ($terminal) {
            return $terminal;
        });

        return $next($request);
    }
}
