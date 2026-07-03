<?php

namespace App\Services;

use App\Models\Attendance\AttendanceAuditTrail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(
        string $event,
        Model $model,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): AttendanceAuditTrail {
        $user = Auth::user();
        $request ??= request();

        return AttendanceAuditTrail::create([
            'auditable_type' => get_class($model),
            'auditable_id' => $model->getKey(),
            'event' => $event,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'user_id' => $user?->getKey(),
            'user_type' => $user instanceof \App\Models\Portal\Student ? 'student' : ($user instanceof \App\Models\Portal\Staff ? 'staff' : null),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    public static function logCreate(Model $model, ?Request $request = null): ?AttendanceAuditTrail
    {
        if (GhostAdminService::isGhostAdmin()) return null;
        return self::log('created', $model, null, self::extractValues($model), $request);
    }

    public static function logUpdate(Model $model, array $oldValues, ?Request $request = null): ?AttendanceAuditTrail
    {
        if (GhostAdminService::isGhostAdmin()) return null;
        return self::log('updated', $model, $oldValues, self::extractValues($model), $request);
    }

    public static function logDelete(Model $model, ?Request $request = null): ?AttendanceAuditTrail
    {
        if (GhostAdminService::isGhostAdmin()) return null;
        return self::log('deleted', $model, self::extractValues($model), null, $request);
    }

    public static function logRestore(Model $model, ?Request $request = null): ?AttendanceAuditTrail
    {
        if (GhostAdminService::isGhostAdmin()) return null;
        return self::log('restored', $model, null, self::extractValues($model), $request);
    }

    private static function extractValues(Model $model): array
    {
        $visible = $model->getAttributes();
        $hidden = $model->getHidden();
        return array_diff_key($visible, array_flip($hidden));
    }
}
