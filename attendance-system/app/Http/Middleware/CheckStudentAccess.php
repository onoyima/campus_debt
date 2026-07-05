<?php

namespace App\Http\Middleware;

use App\Models\Portal\Student;
use App\Services\GhostAdminService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStudentAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Ghost admins bypass student access check
        if (GhostAdminService::isGhostAdmin($user->id)) {
            return $next($request);
        }

        $student = Student::find($user->id);

        if (!$student) {
            return response()->json(['message' => 'Access denied. Student only.'], 403);
        }

        $request->merge(['student' => $student]);

        return $next($request);
    }
}
