<?php

namespace App\Services;

use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportService
{
    public function toCsv(array $headers, Collection $data, string $filename = 'export.csv'): StreamedResponse
    {
        $callback = function () use ($headers, $data) {
            $file = fopen('php://output', 'w');

            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, $headers);

            foreach ($data as $row) {
                $values = [];
                foreach ($headers as $header) {
                    $key = $this->headerToKey($header);
                    $values[] = $row[$key] ?? $row->$key ?? '';
                }
                fputcsv($file, $values);
            }

            fclose($file);
        };

        return new StreamedResponse($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function toExcel(array $headers, Collection $data, string $filename = 'export.xlsx'): StreamedResponse
    {
        $callback = function () use ($headers, $data) {
            $file = fopen('php://output', 'w');

            echo '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
            echo '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
            echo '<body><table>';

            echo '<tr>';
            foreach ($headers as $header) {
                echo '<th style="background-color:#004f40;color:#ffffff;padding:8px;font-weight:bold;">' . htmlspecialchars($header) . '</th>';
            }
            echo '</tr>';

            foreach ($data as $index => $row) {
                $bgColor = $index % 2 === 0 ? '#ffffff' : '#f5f5f5';
                echo '<tr>';
                foreach ($headers as $header) {
                    $key = $this->headerToKey($header);
                    $value = is_array($row) ? ($row[$key] ?? '') : ($row->$key ?? '');
                    echo '<td style="background-color:' . $bgColor . ';padding:6px;">' . htmlspecialchars((string) $value) . '</td>';
                }
                echo '</tr>';
            }

            echo '</table></body></html>';
        };

        return new StreamedResponse($callback, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function toPdf(string $title, array $headers, Collection $data, string $filename = 'export.pdf'): Response
    {
        $html = $this->buildHtmlTable($title, $headers, $data);

        return response()->make($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
        ]);
    }

    public function toPdfDownload(string $title, array $headers, Collection $data, string $filename = 'export.pdf'): Response
    {
        $html = $this->buildHtmlTable($title, $headers, $data);

        return response()->make($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    protected function buildHtmlTable(string $title, array $headers, Collection $data): string
    {
        $headerCells = '';
        foreach ($headers as $header) {
            $headerCells .= "<th style=\"background-color:#004f40;color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;border:1px solid #00382e;\">" . htmlspecialchars($header) . "</th>";
        }

        $rows = '';
        foreach ($data as $index => $row) {
            $bg = $index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            $cells = '';
            foreach ($headers as $header) {
                $key = $this->headerToKey($header);
                $value = is_array($row) ? ($row[$key] ?? '') : ($row->$key ?? '');
                $cells .= "<td style=\"padding:8px 12px;border:1px solid #dee2e6;font-size:11px;background-color:{$bg};\">" . htmlspecialchars((string) $value) . "</td>";
            }
            $rows .= "<tr>{$cells}</tr>";
        }

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{$title}</title>
    <style>
        @page { margin: 20mm 15mm; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        h1 { color: #004f40; font-size: 20px; margin-bottom: 5px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <h1>{$title}</h1>
    <p class="subtitle">Generated: {$this->now()} | Veritas University Attendance System</p>
    <table><thead>{$headerCells}</thead><tbody>{$rows}</tbody></table>
    <p class="footer">Veritas University Attendance Management System &bull; {$this->now()}</p>
</body>
</html>
HTML;
    }

    protected function headerToKey(string $header): string
    {
        return strtolower(str_replace([' ', '_', '-'], '_', preg_replace('/[^a-zA-Z0-9_ ]/', '', $header)));
    }

    protected function now(): string
    {
        return now()->format('M d, Y \a\t h:i A');
    }
}
