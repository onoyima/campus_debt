<?php

namespace App\Http\Middleware;

use App\Services\GhostAdminService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckGhostAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! GhostAdminService::isGhostAdmin($user->id)) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        return $next($request);
    }
}
