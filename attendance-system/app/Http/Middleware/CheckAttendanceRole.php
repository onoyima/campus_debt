<?php

namespace App\Http\Middleware;

use App\Models\Attendance\AttendanceStaffRole;
use App\Services\GhostAdminService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAttendanceRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Ghost admins bypass all role checks
        if (GhostAdminService::isGhostAdmin($user->id)) {
            return $next($request);
        }

        if (in_array('any', $roles)) {
            return $next($request);
        }

        $staffId = $user->id;

        $userRoles = AttendanceStaffRole::where('staff_id', $staffId)
            ->whereHas('role', function ($q) use ($roles) {
                $q->whereIn('name', $roles);
            })
            ->exists();

        if (!$userRoles) {
            return response()->json(['message' => 'Forbidden. Required role: ' . implode(', ', $roles)], 403);
        }

        return $next($request);
    }
}
