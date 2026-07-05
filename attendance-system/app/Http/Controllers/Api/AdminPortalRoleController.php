<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminPortalRoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search');
        $perPage = $request->integer('per_page', 20);

        // Always cache the full dataset; filter from cache in memory
        $result = Cache::remember('portal_roles_all', 3600, function () {
            return DB::connection('mysql_remote')
                ->table('staff_assigned_roles')
                ->join('roles', 'staff_assigned_roles.role_id', '=', 'roles.id')
                ->join('staff', 'staff_assigned_roles.staff_id', '=', 'staff.id')
                ->where('staff_assigned_roles.status', 1)
                ->select(
                    'staff_assigned_roles.id',
                    'staff_assigned_roles.staff_id',
                    'staff.fname',
                    'staff.mname',
                    'staff.lname',
                    'staff.email',
                    'roles.id as role_id',
                    'roles.name as role_name',
                    'staff_assigned_roles.assigned_date'
                )
                ->orderBy('staff.lname')
                ->orderBy('staff.fname')
                ->get();
        });

        // Filter from cache in memory
        if ($search) {
            $needle = strtolower($search);
            $result = $result->filter(function ($r) use ($needle) {
                if (mb_strpos(mb_strtolower($r->fname), $needle) !== false) return true;
                if (mb_strpos(mb_strtolower($r->lname), $needle) !== false) return true;
                if (mb_strpos(mb_strtolower($r->mname), $needle) !== false) return true;
                if ($r->email && mb_strpos(mb_strtolower($r->email), $needle) !== false) return true;
                if (mb_strpos(mb_strtolower($r->role_name), $needle) !== false) return true;
                return false;
            })->values();
        }

        // Manual pagination on cached/filtered collection
        $total = $result->count();
        $page = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $perPage;
        $pageItems = $result->slice($offset, $perPage);

        $data = collect($pageItems)->groupBy('staff_id')->map(function ($items, $staffId) {
            $first = $items->first();
            return [
                'staff_id' => $staffId,
                'full_name' => trim("{$first->fname} {$first->mname} {$first->lname}"),
                'email' => $first->email,
                'total_roles' => $items->count(),
                'roles' => $items->map(fn($i) => [
                    'assignment_id' => $i->id,
                    'role_id' => $i->role_id,
                    'role_name' => $i->role_name,
                    'assigned_date' => $i->assigned_date,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int)ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }
}
