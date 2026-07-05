<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
foreach (["countries", "states"] as $table) {
    try {
        $cols = DB::connection("mysql_remote")->select("DESCRIBE $table");
        echo "=== $table ===\n";
        foreach ($cols as $col) {
            $null = $col->Null === "YES" ? "NULL" : "NOT NULL";
            $key = $col->Key ? " key={$col->Key}" : "";
            $def = $col->Default !== null ? " default={$col->Default}" : "";
            echo "  {$col->Field} ({$col->Type}) $null$key$def\n";
        }
        echo "\n";
    } catch (Exception $e) {
        echo "=== $table === ERROR: {$e->getMessage()}\n\n";
    }
}
