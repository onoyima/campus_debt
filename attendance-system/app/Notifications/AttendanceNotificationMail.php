<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AttendanceNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $title;
    public string $message;
    public ?string $actionUrl;
    public string $priority;

    public function __construct(string $title, string $message, ?string $actionUrl = null, string $priority = 'medium')
    {
        $this->title = $title;
        $this->message = $message;
        $this->actionUrl = $actionUrl;
        $this->priority = $priority;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.attendance-notification',
            with: [
                'title' => $this->title,
                'message' => $this->message,
                'actionUrl' => $this->actionUrl,
                'priority' => $this->priority,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
