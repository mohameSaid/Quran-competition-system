// ─────────────────────────────────────────────────────────────
// PLATFORM · Remote Memorization (FUTURE — architecture only)
// ─────────────────────────────────────────────────────────────
// NOT implemented yet. These abstractions exist so remote sessions can
// later plug into Zoom / Google Meet / Teams / Jitsi without coupling
// the domain to any single provider. Only the provider adapter changes.

import { AuditableEntity, TenantScoped } from './common.model';

export enum MeetingProviderId {
  Zoom = 'zoom',
  GoogleMeet = 'googleMeet',
  MicrosoftTeams = 'microsoftTeams',
  Jitsi = 'jitsi',
  Custom = 'custom',
}

/** Everything a session needs to join a meeting, provider-independent. */
export interface MeetingCoordinates {
  readonly provider: MeetingProviderId;
  readonly joinUrl: string;
  readonly hostUrl?: string;
  readonly meetingId?: string;
  readonly passcode?: string;
}

export interface RecordingMetadata {
  readonly provider: MeetingProviderId;
  readonly url?: string;
  readonly durationSeconds?: number;
  readonly sizeBytes?: number;
  readonly availableUntil?: Date;
}

/**
 * Provider adapter contract. A future `ZoomMeetingProvider`,
 * `GoogleMeetProvider`, etc. implement this; callers depend only on the
 * interface (Dependency Inversion).
 */
export interface MeetingProvider {
  readonly id: MeetingProviderId;
  createMeeting(input: {
    readonly topic: string;
    readonly startAt: Date;
    readonly durationMinutes: number;
    readonly hostEmail?: string;
  }): Promise<MeetingCoordinates>;
  getRecording(meetingId: string): Promise<RecordingMetadata | null>;
}

export enum RemoteSessionStatus {
  Scheduled = 'scheduled',
  Live = 'live',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export interface RemoteSessionInvitation {
  readonly personId: string;
  readonly personName: string;
  readonly attended?: boolean;
}

export interface RemoteSession extends AuditableEntity, TenantScoped {
  readonly programId: string;
  readonly teacherPersonId: string;
  readonly invitations: readonly RemoteSessionInvitation[];
  readonly scheduledStart: Date;
  readonly durationMinutes: number;
  readonly status: RemoteSessionStatus;
  readonly meeting?: MeetingCoordinates;
  readonly recording?: RecordingMetadata;
  /** Links to the unified evaluation produced after the session. */
  readonly evaluationId?: string;
}
