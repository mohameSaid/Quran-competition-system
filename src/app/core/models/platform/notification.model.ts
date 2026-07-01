// ─────────────────────────────────────────────────────────────
// PLATFORM · Notifications (multi-channel, provider-agnostic)
// ─────────────────────────────────────────────────────────────
// A channel abstraction so Email / SMS / Push / WhatsApp share one
// domain shape. Delivery adapters (future) implement `NotificationSender`.

import { AuditableEntity, TenantScoped } from './common.model';

export enum NotificationChannel {
  InApp = 'inApp',
  Email = 'email',
  Sms = 'sms',
  Push = 'push',
  WhatsApp = 'whatsApp',
}

export enum NotificationStatus {
  Queued = 'queued',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
  Read = 'read',
}

export interface Notification extends AuditableEntity, TenantScoped {
  readonly recipientPersonId: string;
  readonly channels: readonly NotificationChannel[];
  readonly title: string;
  readonly body: string;
  readonly status: NotificationStatus;
  /** Deep-link the client can route to when the notification is tapped. */
  readonly actionUrl?: string;
  readonly data?: Readonly<Record<string, string>>;
}

/** Delivery adapter contract (implemented by future channel senders). */
export interface NotificationSender {
  readonly channel: NotificationChannel;
  send(notification: Notification): Promise<NotificationStatus>;
}
