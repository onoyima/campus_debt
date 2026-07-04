<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_terminals', function (Blueprint $table) {
            $table->string('ip_address', 45)->nullable()->after('device_id');
            $table->integer('port')->unsigned()->default(4370)->after('ip_address');
            $table->string('comm_key', 64)->nullable()->after('port');
            $table->string('push_url', 255)->nullable()->after('comm_key');
            $table->string('api_key', 128)->nullable()->after('push_url');
            $table->timestamp('last_heartbeat_at')->nullable()->after('api_key');
            $table->string('firmware', 100)->nullable()->after('metadata');
            $table->string('serial_number', 100)->nullable()->after('firmware');
            $table->string('device_model', 100)->nullable()->after('serial_number');
            $table->integer('user_count')->unsigned()->default(0)->after('device_model');
            $table->integer('fingerprint_count')->unsigned()->default(0)->after('user_count');
            $table->integer('face_count')->unsigned()->default(0)->after('fingerprint_count');
            $table->integer('transaction_count')->unsigned()->default(0)->after('face_count');
            $table->string('connection_status', 20)->default('offline')->after('transaction_count');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_terminals', function (Blueprint $table) {
            $table->dropColumn([
                'ip_address', 'port', 'comm_key', 'push_url', 'api_key',
                'last_heartbeat_at', 'firmware', 'serial_number', 'device_model',
                'user_count', 'fingerprint_count', 'face_count', 'transaction_count',
                'connection_status',
            ]);
        });
    }
};
