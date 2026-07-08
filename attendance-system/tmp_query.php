<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$queries = [
    "SELECT status, COUNT(*) as count FROM course_assigneds GROUP BY status ORDER BY status",
    "SELECT status, hod_approval, sbc_approval, COUNT(*) as count FROM assigned_courses WHERE status = 1 GROUP BY status, hod_approval, sbc_approval ORDER BY count DESC LIMIT 20",
    "SELECT ca.id as ca_id, ca.staff_id, ca.course_id, ca.status as ca_status, ca.academic_session_id, ac.id as ac_id, ac.staff_id as ac_staff, ac.course_id as ac_course, ac.status as ac_status, ac.hod_approval, ac.sbc_approval, ac.dean_approval, ac.title FROM course_assigneds ca LEFT JOIN assigned_courses ac ON ca.course_id = ac.course_id AND ca.staff_id = ac.staff_id AND ca.academic_session_id = ac.academic_session_id WHERE ca.staff_id = 183 AND ca.academic_session_id = 103 LIMIT 10",
    "SELECT academic_session_id, COUNT(*) as count FROM course_assigneds GROUP BY academic_session_id ORDER BY academic_session_id DESC LIMIT 10",
    "SELECT hod_approval, sbc_approval, dean_approval, COUNT(*) as count FROM assigned_courses WHERE status = 1 GROUP BY hod_approval, sbc_approval, dean_approval ORDER BY count DESC LIMIT 10",
];

foreach ($queries as $sql) {
    echo "\n=== QUERY ===\n$sql\n---\n";
    $rows = DB::connection('mysql_remote')->select($sql);
    foreach ($rows as $row) {
        echo json_encode($row) . "\n";
    }
}
