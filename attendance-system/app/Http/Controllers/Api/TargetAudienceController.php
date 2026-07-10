<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TargetAudienceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $groups = Cache::remember('event_target_audiences', 600, function () {
            $groups = [];
            $staffTypes = $this->getRemoteTable('staff_work_profiles', 'staff_type_id', 'staff_type_id', null);

            $departments = $this->getRemoteTable('departments', 'id', 'name');
            $faculties = $this->getRemoteTable('faculties', 'id', 'name');
            $roles = $this->getRemoteTable('roles', 'id', 'name');
            $levels = $this->getRemoteTable('levels', 'id', 'level');
            $programmes = $this->getRemoteTable('course_studies', 'id', 'name');

            $groups[] = ['category' => 'All Staff', 'type' => 'predefined', 'options' => [
                ['target_type' => 'all_staff', 'target_id' => null, 'label' => 'All Staff', 'description' => 'Every staff member in the university'],
            ]];

            $staffCategoryOptions = [
                ['target_type' => 'academic_staff', 'target_id' => null, 'label' => 'Academic Staff', 'description' => 'Teaching staff'],
                ['target_type' => 'non_academic_staff', 'target_id' => null, 'label' => 'Non-Academic Staff', 'description' => 'Administrative and support staff'],
                ['target_type' => 'other_staff', 'target_id' => null, 'label' => 'Other Staff Category', 'description' => 'Custom staff group'],
            ];
            $seenStaffTypes = [];
            foreach ($staffTypes as $st) {
                $tid = $st->id;
                if (in_array($tid, $seenStaffTypes)) {
                    continue;
                }
                $seenStaffTypes[] = $tid;
                $staffCategoryOptions[] = ['target_type' => 'contract_staff', 'target_id' => $tid, 'label' => "Contract Staff (Type #{$tid})", 'description' => 'Contract staff'];
                $staffCategoryOptions[] = ['target_type' => 'visiting_staff', 'target_id' => $tid, 'label' => "Visiting Staff (Type #{$tid})", 'description' => 'Visiting/adjunct staff'];
                $staffCategoryOptions[] = ['target_type' => 'casual_staff', 'target_id' => $tid, 'label' => "Casual Staff (Type #{$tid})", 'description' => 'Casual/temporary staff'];
            }
            $groups[] = ['category' => 'Staff Categories', 'type' => 'predefined', 'options' => $staffCategoryOptions];

            $groups[] = ['category' => 'Senate / Management / Officers', 'type' => 'predefined', 'options' => [
                ['target_type' => 'senate_members', 'target_id' => null, 'label' => 'Senate Members', 'description' => 'Members of the university Senate'],
                ['target_type' => 'management', 'target_id' => null, 'label' => 'Management', 'description' => 'University management cadre'],
                ['target_type' => 'principal_officers', 'target_id' => null, 'label' => 'Principal Officers', 'description' => 'Principal officers of the university'],
            ]];

            $deptFacultyOptions = [];
            foreach ($faculties as $f) {
                $deptFacultyOptions[] = ['target_type' => 'deans', 'target_id' => $f->id, 'label' => "Dean - {$f->name}", 'description' => "Dean of {$f->name}"];
                $deptFacultyOptions[] = ['target_type' => 'faculty_officers', 'target_id' => $f->id, 'label' => "Faculty Officer - {$f->name}", 'description' => "Officers in {$f->name}"];
            }
            foreach ($departments as $d) {
                $deptFacultyOptions[] = ['target_type' => 'hods', 'target_id' => $d->id, 'label' => "HOD - {$d->name}", 'description' => "Head of {$d->name}"];
                $deptFacultyOptions[] = ['target_type' => 'directors', 'target_id' => $d->id, 'label' => "Director - {$d->name}", 'description' => "Director of {$d->name}"];
                $deptFacultyOptions[] = ['target_type' => 'departmental_staff', 'target_id' => $d->id, 'label' => "Dept Staff - {$d->name}", 'description' => "Staff in {$d->name}"];
            }
            $groups[] = ['category' => 'By Faculty / Department', 'type' => 'dynamic', 'options' => $deptFacultyOptions];

            if (! empty($roles)) {
                $roleOptions = collect($roles)->map(fn ($r) => [
                    'target_type' => 'role', 'target_id' => $r->id,
                    'label' => $r->name, 'description' => "Staff with role: {$r->name}",
                ])->values()->toArray();
                $groups[] = ['category' => 'By Role', 'type' => 'dynamic', 'options' => $roleOptions];
            }

            $groups[] = ['category' => 'All Students', 'type' => 'predefined', 'options' => [
                ['target_type' => 'all_students', 'target_id' => null, 'label' => 'All Students', 'description' => 'Every student enrolled in the university'],
            ]];

            $groups[] = ['category' => 'Student Categories', 'type' => 'predefined', 'options' => [
                ['target_type' => 'undergraduate', 'target_id' => null, 'label' => 'Undergraduate Students', 'description' => 'All undergraduate students'],
                ['target_type' => 'postgraduate', 'target_id' => null, 'label' => 'Postgraduate Students', 'description' => 'All postgraduate students'],
                ['target_type' => 'diploma', 'target_id' => null, 'label' => 'Diploma Students', 'description' => 'All diploma students'],
                ['target_type' => 'foundation', 'target_id' => null, 'label' => 'Foundation/JUPEB Students', 'description' => 'All foundation/JUPEB students'],
            ]];

            if (! empty($levels)) {
                $levelOptions = collect($levels)->map(fn ($l) => [
                    'target_type' => 'level', 'target_id' => $l->id,
                    'label' => "Level {$l->level}", 'description' => "Students in level {$l->level}",
                ])->values()->toArray();
                $groups[] = ['category' => 'By Level', 'type' => 'dynamic', 'options' => $levelOptions];
            } else {
                $groups[] = ['category' => 'By Level', 'type' => 'predefined', 'options' => [
                    ['target_type' => 'level_100', 'target_id' => null, 'label' => '100 Level', 'description' => 'Students in 100 level'],
                    ['target_type' => 'level_200', 'target_id' => null, 'label' => '200 Level', 'description' => 'Students in 200 level'],
                    ['target_type' => 'level_300', 'target_id' => null, 'label' => '300 Level', 'description' => 'Students in 300 level'],
                    ['target_type' => 'level_400', 'target_id' => null, 'label' => '400 Level', 'description' => 'Students in 400 level'],
                    ['target_type' => 'level_500', 'target_id' => null, 'label' => '500 Level', 'description' => 'Students in 500 level'],
                ]];
            }

            if (! empty($faculties)) {
                $facultyOptions = collect($faculties)->map(fn ($f) => [
                    'target_type' => 'faculty', 'target_id' => $f->id,
                    'label' => $f->name, 'description' => "Students in {$f->name}",
                ])->values()->toArray();
                $groups[] = ['category' => 'By Faculty', 'type' => 'dynamic', 'options' => $facultyOptions];
            }

            if (! empty($departments)) {
                $deptOptions = collect($departments)->map(fn ($d) => [
                    'target_type' => 'department', 'target_id' => $d->id,
                    'label' => $d->name, 'description' => "Students in {$d->name} department",
                ])->values()->toArray();
                $groups[] = ['category' => 'By Department', 'type' => 'dynamic', 'options' => $deptOptions];
            }

            if (! empty($programmes)) {
                $programmeOptions = collect($programmes)->map(fn ($p) => [
                    'target_type' => 'programme', 'target_id' => $p->id,
                    'label' => $p->name, 'description' => "Students in {$p->name} programme",
                ])->values()->toArray();
                $groups[] = ['category' => 'By Programme', 'type' => 'dynamic', 'options' => $programmeOptions];
            }

            $courses = $this->getRemoteTable('courses', 'id', 'code', null);
            if (! empty($courses)) {
                $courseOptions = collect($courses)->map(fn ($c) => [
                    'target_type' => 'course', 'target_id' => $c->id,
                    'label' => $c->name, 'description' => 'Students enrolled in this course',
                ])->values()->toArray();
                $groups[] = ['category' => 'By Course', 'type' => 'dynamic', 'options' => $courseOptions];
            }

            $groups[] = ['category' => 'Other Student Groups', 'type' => 'predefined', 'options' => [
                ['target_type' => 'final_year', 'target_id' => null, 'label' => 'Final Year Students', 'description' => 'Students in their final year'],
                ['target_type' => 'hostel_residents', 'target_id' => null, 'label' => 'Hostel Residents', 'description' => 'Students residing in university hostels'],
                ['target_type' => 'other_students', 'target_id' => null, 'label' => 'Other Student Category', 'description' => 'Custom student group'],
            ]];

            return $groups;
        });

        return response()->json(['data' => $groups]);
    }

    private function getRemoteTable(string $table, string $key, string $label, ?string $statusColumn = 'status'): array
    {
        try {
            $query = DB::connection('mysql_remote')->table($table)->select("{$key} as id", "{$label} as name");
            if ($statusColumn) {
                $query->where($statusColumn, 'active');
            }

            return $query->orderBy('name')->get()->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }
}
