import { AppShell } from "@/components/layout/app-shell";
import { LiveDmChat } from "@/components/messages/live-dm-chat";
import { MessagesInbox } from "@/components/messages/messages-inbox";
import { Card } from "@/components/ui/card";
import styles from "@/app/module-pages.module.scss";

export default function MessagesPage() {
  return (
    <AppShell heading="Messaging & Communication" subheading="Email, SMS, in-app inbox, and team live chat">
      <section className={styles.splitGrid}>
        <Card>
          <h2>Inbox</h2>
          <MessagesInbox />
        </Card>
        <Card>
          <h2>Live chat</h2>
          <LiveDmChat />
        </Card>
      </section>
    </AppShell>
  );
}
