// ─────────────────────────────────────────────────────────────
// PLATFORM · shared primitives
// ─────────────────────────────────────────────────────────────
// These types are intentionally provider-agnostic and free of any
// Firestore import so the domain layer can be reused (e.g. by a
// future mobile app or Cloud Functions) without pulling the SDK.

/** A localized string. Arabic is mandatory; English is optional (i18n-ready). */
export interface Localized {
  readonly ar: string;
  readonly en?: string;
}

/** Fields every stored document carries. */
export interface AuditableEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** uid of the account that created the document. */
  readonly createdBy: string;
  /** uid of the account that last modified the document. */
  readonly updatedBy?: string;
}

/**
 * Multi-tenancy anchor. Every top-level document references the
 * organization that owns it, so the platform can host many mosques,
 * associations or centers on a single database without a migration.
 * A `null`/absent value denotes the default (bootstrap) tenant.
 */
export interface TenantScoped {
  readonly organizationId: string;
}

/** Generic cursor-based pagination envelope (Firestore-friendly). */
export interface Page<T> {
  readonly items: readonly T[];
  /** Opaque cursor to pass back for the next page; `null` ⇒ last page. */
  readonly cursor: unknown | null;
  readonly hasMore: boolean;
}

export interface PageRequest {
  readonly pageSize: number;
  readonly cursor?: unknown | null;
}

/** Result wrapper used to model recoverable errors without throwing. */
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
