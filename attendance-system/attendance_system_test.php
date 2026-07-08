<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$rows = DB::table('attendance_status_types')->get();
foreach ($rows as $r) { echo $r->id.' => '.$r->code.' ('.$r->display_name.')'.PHP_EOL; }
