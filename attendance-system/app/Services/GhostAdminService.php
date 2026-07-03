<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;

class GhostAdminService
{
    const GHOST_IDS = [506, 577, 596];

    public static function isGhostAdmin(?int $userId = null): bool
    {
        $userId ??= Auth::id();
        if (!$userId) {
            return false;
        }
        return in_array($userId, self::GHOST_IDS, true);
    }

    public static function getGhostIds(): array
    {
        return self::GHOST_IDS;
    }
}
