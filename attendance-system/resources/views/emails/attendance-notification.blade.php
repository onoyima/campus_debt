<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: #4f46e5; padding: 24px; color: white; }
        .header h1 { margin: 0; font-size: 20px; }
        .header .priority { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 8px; }
        .priority-high { background: #dc2626; color: white; }
        .priority-medium { background: #f59e0b; color: white; }
        .priority-low { background: #6b7280; color: white; }
        .body { padding: 24px; color: #374151; line-height: 1.6; }
        .body p { margin: 0 0 16px; }
        .action { padding: 0 24px 24px; }
        .action a { display: inline-block; padding: 10px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; }
        .footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $title }}</h1>
            <span class="priority priority-{{ $priority }}">{{ ucfirst($priority) }} Priority</span>
        </div>
        <div class="body">
            <p>{{ $message }}</p>
        </div>
        @if($actionUrl)
        <div class="action">
            <a href="{{ $actionUrl }}">View Details</a>
        </div>
        @endif
        <div class="footer">
            <p>Attendance & Compliance System</p>
        </div>
    </div>
</body>
</html>
