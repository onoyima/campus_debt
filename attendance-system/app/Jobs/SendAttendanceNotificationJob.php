<?php

namespace App\Jobs;

use App\Models\Attendance\AttendanceNotification;
use App\Notifications\AttendanceNotificationMail;
use App\Services\SmsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAttendanceNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $notificationId;

    public function __construct(int $notificationId)
    {
        $this->notificationId = $notificationId;
    }

    public function handle(SmsService $smsService): void
    {
        $notification = AttendanceNotification::find($this->notificationId);
        if (! $notification || $notification->status === 'sent' || $notification->status === 'delivered') {
            return;
        }

        try {
            $notification->update(['sent_at' => now(), 'status' => 'sent']);

            $deliveryMethods = $notification->delivery_methods ?? ['database'];

            if (in_array('email', $deliveryMethods)) {
                $this->sendEmail($notification);
            }

            if (in_array('sms', $deliveryMethods)) {
                $this->sendSms($notification, $smsService);
            }

            $notification->update(['status' => 'delivered', 'delivered_at' => now()]);
            Log::info("Notification {$this->notificationId} delivered");
        } catch (\Exception $e) {
            $notification->increment('retry_count');
            Log::error("Notification {$this->notificationId} failed: {$e->getMessage()}");
            if ($notification->retry_count >= 3) {
                $notification->update(['status' => 'failed']);
            } else {
                $this->release(30 * ($notification->retry_count + 1));
            }
        }
    }

    private function sendEmail(AttendanceNotification $notification): void
    {
        $email = $this->getRecipientEmail($notification);
        if (! $email) {
            return;
        }

        Mail::to($email)->send(new AttendanceNotificationMail(
            $notification->title,
            $notification->message,
            $notification->action_url,
            $notification->priority
        ));
    }

    private function sendSms(AttendanceNotification $notification, SmsService $smsService): void
    {
        $phone = $this->getRecipientPhone($notification);
        if (! $phone) {
            return;
        }

        $smsMessage = strip_tags($notification->title).': '.strip_tags($notification->message);
        $smsService->send($phone, $smsMessage);
    }

    private function getRecipientEmail(AttendanceNotification $notification): ?string
    {
        if ($notification->recipient_type === 'student') {
            return DB::connection('mysql_remote')
                ->table('students')
                ->where('id', $notification->recipient_id)
                ->value('email');
        }

        return DB::connection('mysql_remote')
            ->table('staff')
            ->where('id', $notification->recipient_id)
            ->value('email');
    }

    private function getRecipientPhone(AttendanceNotification $notification): ?string
    {
        if ($notification->recipient_type === 'student') {
            return DB::connection('mysql_remote')
                ->table('students')
                ->where('id', $notification->recipient_id)
                ->value('phone');
        }

        return DB::connection('mysql_remote')
            ->table('staff')
            ->where('id', $notification->recipient_id)
            ->value('phone');
    }
}
