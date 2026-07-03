<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceStaffRole;
use App\Models\Portal\Staff;
use App\Models\Portal\Student;
use App\Models\Portal\StudentAcademic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|max:255',
            'password' => 'required|string|min:1',
        ]);

        $credential = $request->input('email');

        // Check student login
        $student = Student::where(function ($q) use ($credential) {
            $q->where('email', $credential);
            if (!str_contains($credential, '@')) {
                $q->orWhere('email', 'like', $credential . '@%');
            }
        })->first(['id', 'fname', 'mname', 'lname', 'email', 'password', 'passport', 'phone', 'status']);

        if ($student) {
            if ((int) $student->status !== 1) {
                return response()->json(['message' => 'Account is inactive. Contact administration.'], 403);
            }
            if (Hash::check($request->password, $student->password)) {
                $student->tokens()->delete();
                $token = $student->createToken('attendance-api', ['student'])->plainTextToken;
                $academic = StudentAcademic::where('student_id', $student->id)->latest()->first();
                return response()->json([
                    'token' => $token,
                    'user' => [
                        'id' => $student->id,
                        'type' => 'student',
                        'fname' => $student->fname,
                        'mname' => $student->mname,
                        'lname' => $student->lname,
                        'email' => $student->email,
                        'matric_no' => $academic?->matric_no,
                        'passport' => $student->passport,
                    ],
                ]);
            }
        }

        // Check staff login
        $staff = Staff::where('email', $credential)
            ->first(['id', 'fname', 'mname', 'lname', 'email', 'password', 'phone', 'passport', 'status']);

        if ($staff) {
            if ((int) $staff->status !== 1) {
                return response()->json(['message' => 'Account is inactive. Contact administration.'], 403);
            }
            if (Hash::check($request->password, $staff->password)) {
                $staff->tokens()->delete();
                $token = $staff->createToken('attendance-api', ['staff'])->plainTextToken;
                $roleNames = AttendanceStaffRole::where('staff_id', $staff->id)
                    ->with('role')
                    ->get()
                    ->pluck('role.name')
                    ->filter()
                    ->values()
                    ->toArray();
                return response()->json([
                    'token' => $token,
                    'user' => [
                        'id' => $staff->id,
                        'type' => 'staff',
                        'fname' => $staff->fname,
                        'mname' => $staff->mname,
                        'lname' => $staff->lname,
                        'email' => $staff->email,
                        'passport' => $staff->passport,
                        'roles' => $roleNames,
                    ],
                ]);
            }
        }

        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $base = [
            'id' => $user->id,
            'fname' => $user->fname,
            'mname' => $user->mname ?? '',
            'lname' => $user->lname,
            'email' => $user->email ?? '',
            'phone' => $user->phone ?? '',
        ];

        if ($user instanceof Student) {
            $base['type'] = 'student';
            $base['passport'] = $user->passport;
            $academic = StudentAcademic::where('student_id', $user->id)->latest()->first();
            $base['matric_no'] = $academic?->matric_no;
        } else {
            $base['type'] = 'staff';
            $base['passport'] = $user->passport ?? null;
            $base['roles'] = AttendanceStaffRole::where('staff_id', $user->id)
                ->with('role')
                ->get()
                ->pluck('role.name')
                ->filter()
                ->values()
                ->toArray();
        }

        return response()->json(['user' => $base]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
