import { AppShell } from "@/components/layout/app-shell";
import { NotificationsClient } from "@/app/notifications/notifications-client";

export default function NotificationsPage() {
  return (
    <AppShell heading="Notifications" subheading="Centralized updates and reminders">
      <NotificationsClient />
    </AppShell>
  );
}
