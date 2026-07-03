<?php

namespace App\Http\Middleware;

use App\Models\Portal\Staff;
use App\Services\GhostAdminService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStaffAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Ghost admins bypass staff access check
        if (GhostAdminService::isGhostAdmin($user->id)) {
            return $next($request);
        }

        $staff = Staff::find($user->id);

        if (!$staff) {
            return response()->json(['message' => 'Access denied. Staff only.'], 403);
        }

        $request->merge(['staff' => $staff]);

        return $next($request);
    }
}
