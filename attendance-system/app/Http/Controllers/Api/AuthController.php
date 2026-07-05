<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceStaffRole;
use App\Models\Portal\Staff;
use App\Models\Portal\Student;
use App\Models\Portal\StudentAcademic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function passportUrl(?string $value): ?string
    {
        if (!$value) return null;
        if (str_starts_with($value, 'http')) return $value;
        $mime = match (true) {
            str_starts_with($value, '/9j/') => 'image/jpeg',
            str_starts_with($value, 'iVBOR') => 'image/png',
            str_starts_with($value, 'R0lGOD') => 'image/gif',
            str_starts_with($value, 'UklGR') => 'image/webp',
            default => 'image/jpeg',
        };
        return "data:$mime;base64,$value";
    }

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
                        'passport' => $this->passportUrl($student->passport),
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
                        'passport' => $this->passportUrl($staff->passport),
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
        $remote = DB::connection('mysql_remote');

        $cacheKey = 'profile_' . ($user instanceof Student ? 'student' : 'staff') . '_' . $user->id;

        $base = Cache::remember($cacheKey, 300, function () use ($user, $remote) {
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
                $base['passport'] = $this->passportUrl($user->passport);

                $academic = $remote->table('student_academics')
                    ->where('student_id', $user->id)
                    ->orderBy('id', 'desc')
                    ->first();

                $base['matric_no'] = $academic?->matric_no;
                $base['level'] = $academic?->level;

                if ($academic?->course_study_id) {
                    $cs = $remote->table('course_studies')->where('id', $academic->course_study_id)->first();
                    $base['program'] = $cs?->name;
                }
                if ($academic?->department_id) {
                    $d = $remote->table('departments')->where('id', $academic->department_id)->first();
                    $base['department'] = $d?->name;
                }
                if ($academic?->faculty_id) {
                    $f = $remote->table('faculties')->where('id', $academic->faculty_id)->first();
                    $base['faculty'] = $f?->name;
                }

                $s = $remote->table('students')->where('id', $user->id)->first();
                if ($s) {
                    $base['gender'] = $s->gender;
                    $base['dob'] = $s->dob;
                    $base['address'] = $s->address;
                    $base['city'] = $s->city;
                    $base['religion'] = $s->religion;
                    $base['marital_status'] = $s->marital_status;
                    $base['lga'] = $s->lga_name;
                    if ($s->country_id) {
                        $c = $remote->table('countries')->where('id', $s->country_id)->first();
                        $base['country'] = $c?->name;
                    }
                    if ($s->state_id) {
                        $st = $remote->table('states')->where('id', $s->state_id)->first();
                        $base['state'] = $st?->name;
                    }
                }
            } else {
                $base['type'] = 'staff';
                $base['passport'] = $this->passportUrl($user->passport);
                $base['roles'] = AttendanceStaffRole::where('staff_id', $user->id)
                    ->with('role')
                    ->get()
                    ->pluck('role.name')
                    ->filter()
                    ->values()
                    ->toArray();

                $s = $remote->table('staff')->where('id', $user->id)->first();
                if ($s) {
                    $base['title'] = $s->title;
                    $base['gender'] = $s->gender;
                    $base['dob'] = $s->dob;
                    $base['address'] = $s->address;
                    $base['city'] = $s->city;
                    $base['maiden_name'] = $s->maiden_name;
                    $base['religion'] = $s->religion;
                    $base['marital_status'] = $s->marital_status;
                    $base['p_email'] = $s->p_email;
                    $base['staff_status'] = $s->status;
                    $base['lga'] = $s->lga_name;
                    if ($s->country_id) {
                        $c = $remote->table('countries')->where('id', $s->country_id)->first();
                        $base['country'] = $c?->name;
                    }
                    if ($s->state_id) {
                        $st = $remote->table('states')->where('id', $s->state_id)->first();
                        $base['state'] = $st?->name;
                    }
                }
            }

            return $base;
        });

        return response()->json(['user' => $base]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
