// ─────────────────────────────────────────────────────────────
// PLATFORM · Programs (a competition is just one kind of program)
// ─────────────────────────────────────────────────────────────
// "The competition is merely a Program inside the platform, not the
// axis of the system." Every activity — competition, memorization
// circle, course, event, camp — is a Program with a shared lifecycle
// and a discriminated `type`-specific settings payload.

import { AuditableEntity, Localized, TenantScoped } from './common.model';

export enum ProgramType {
  Competition = 'competition',
  MemorizationCircle = 'memorizationCircle',
  Course = 'course',
  Event = 'event',
  Camp = 'camp',
}

export enum ProgramStatus {
  Draft = 'draft',
  RegistrationOpen = 'registrationOpen',
  RegistrationClosed = 'registrationClosed',
  InProgress = 'inProgress',
  Completed = 'completed',
  Archived = 'archived',
  Cancelled = 'cancelled',
}

export interface ProgramSchedule {
  readonly registrationStart?: Date;
  readonly registrationEnd?: Date;
  readonly start?: Date;
  readonly end?: Date;
}

/** Settings unique to a competition program. */
export interface CompetitionSettings {
  readonly evaluationConfigId?: string;
  readonly categoryIds: readonly string[];
  readonly prizesByCategory?: Readonly<Record<string, number>>;
  readonly resultsPublished: boolean;
}

/** Settings unique to a memorization circle. */
export interface CircleSettings {
  readonly mosqueId?: string;
  readonly memorizerPersonId?: string;
  readonly weeklySchedule?: readonly string[];
  readonly capacity?: number;
}

/** Settings unique to courses / events / camps (kept generic for now). */
export interface GenericProgramSettings {
  readonly location?: string;
  readonly capacity?: number;
}

/**
 * Discriminated union so `program.type` narrows `settings` at compile
 * time — adding a program type is a local, type-checked change.
 */
export type ProgramSettings =
  | { readonly type: ProgramType.Competition; readonly competition: CompetitionSettings }
  | { readonly type: ProgramType.MemorizationCircle; readonly circle: CircleSettings }
  | { readonly type: ProgramType.Course; readonly generic: GenericProgramSettings }
  | { readonly type: ProgramType.Event; readonly generic: GenericProgramSettings }
  | { readonly type: ProgramType.Camp; readonly generic: GenericProgramSettings };

export interface Program extends AuditableEntity, TenantScoped {
  readonly type: ProgramType;
  readonly name: Localized;
  readonly description?: Localized;
  readonly status: ProgramStatus;
  readonly schedule: ProgramSchedule;
  readonly supervisorPersonIds: readonly string[];
  readonly settings: ProgramSettings;
  /** Denormalized counters for cheap dashboard cards. */
  readonly enrollmentCount: number;
}

export type ProgramCreate = Omit<
  Program,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'enrollmentCount'
>;
