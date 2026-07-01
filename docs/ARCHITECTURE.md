# Quran Platform — Architecture (QPA)

> From a single-competition app to an extensible, multi-tenant **Quran Platform**.
> This document explains **why** the platform is shaped the way it is: the decisions,
> the trade-offs, the alternatives considered, and how it scales for years.

The PRD (`Quran Platform Architecture.pdf`) is treated as **business requirements**,
not implementation. Where the PRD is silent, this document records the decision taken.

---

## 1. Vision → Architecture mapping

The PRD's five Core Principles drive every structural choice:

| PRD principle | How the architecture implements it |
|---|---|
| **Person First** | `Person` is the root aggregate. All data references a person, never a competition. Roles are a *subcollection* of a person, so one human = one record with many roles over time. |
| **Registration First** | A single **Registration Wizard** for everyone; role selection is a step, not a separate flow. One `RegistrationService.register()` creates the account, the `Person`, and the requested `RoleAssignment`s. |
| **Configuration over Code** | Every list the PRD calls "manageable" lives in **Master Data** (`masterData/{domain}/items`). One generic service + one generic screen administer all domains. RBAC policy is data too (`rolePolicies/*`). |
| **Modular Architecture** | Feature-based folders (`features/*`), each lazy-loaded and self-contained. Domain models live in `core/models/platform`, isolated from Firebase. |
| **Extensible Architecture** | New role, program type, lookup domain, notification channel or meeting provider = add an enum entry + config, **no core change**. Discriminated unions keep it type-safe. |

---

## 2. Why evolve, not rewrite

The repository already ships a working competition app. Ripping it out would be
risky and wasteful. Instead the platform layer is introduced **additively**:

- The legacy competition (students / sheikhs / sessions / scores) keeps working.
- New platform collections (`persons`, `programs`, `enrollments`, `masterData`, …)
  live beside it. A **competition becomes one `ProgramType`** — the legacy data can be
  migrated into `programs` + `enrollments` incrementally (see §8, Roadmap).

**Trade-off:** temporary duplication (legacy `Student` vs. platform `Person`) during
migration. Accepted because it keeps every commit shippable and reversible.

---

## 3. Folder structure

```
src/app/
├── core/                        # singletons, no UI
│   ├── models/
│   │   └── platform/            # framework-free domain layer (barrel: index.ts)
│   │       ├── common.model.ts      # AuditableEntity, TenantScoped, Page<T>, Result<T>
│   │       ├── person.model.ts      # Person (root aggregate)
│   │       ├── role.model.ts        # RoleType, RoleAssignment, RoleProfile
│   │       ├── permission.model.ts  # resource:action permission tokens
│   │       ├── program.model.ts     # Program + discriminated ProgramSettings
│   │       ├── enrollment.model.ts  # Person ↔ Program join
│   │       ├── master-data.model.ts # MasterDataDomain catalog
│   │       ├── remote-session.model.ts # FUTURE meeting-provider abstraction
│   │       ├── audit.model.ts / notification.model.ts
│   ├── rbac/                    # role → permission policy (config)
│   ├── services/               # Firebase-facing services (person, master-data, authz…)
│   ├── guards/                 # requirePermission(...) factory + legacy guards
│   └── utils / validators / interceptors
├── shared/                     # reusable, dumb UI + directives/pipes
│   └── directives/has-permission.directive.ts
└── features/                   # smart, lazy-loaded feature areas
    ├── public/registration-wizard/
    ├── admin/persons/
    └── admin/master-data/
```

**Smart/Dumb split:** feature components orchestrate (inject services, hold signals);
`shared/*` components are presentational and take inputs only.

---

## 4. Data model (Firestore)

Firestore is document-oriented; the model optimizes for **the reads the UI makes**,
accepting controlled denormalization to keep reads cheap.

### Collections

| Path | Purpose | Notes |
|---|---|---|
| `persons/{personId}` | Unified person record | `personId == authUid` for self-registrants; `searchTokens[]` powers prefix search |
| `persons/{personId}/roles/{roleType}` | Role assignments | Subcollection ⇒ cheap "my roles" read; each governed independently |
| `masterData/{domain}/items/{code}` | Reference data | Doc id = stable `code` ⇒ idempotent seeds & trivial parent refs |
| `programs/{programId}` | Any activity | `type` discriminates competition / circle / course / event / camp |
| `enrollments/{id}` | Person ↔ Program | Denormalized `personName`; queryable per person across all years |
| `rolePolicies/{role}` | Runtime RBAC overrides | Optional; falls back to code policy |
| `notifications/{id}` | Multi-channel outbox | Per-recipient; recipient may only flip `status` |
| `auditLogs/{id}` | Append-only trail | No update/delete, ever |

### Modeling decisions & trade-offs

- **Roles as a subcollection, not an array on `Person`.** Enables per-role approval,
  audit and security rules; avoids unbounded array growth. A denormalized
  `Person.roles: string[]` cache is kept for cheap list badges/filtering.
- **Master Data as `masterData/{domain}/items`** (subcollection per domain) rather than
  one giant `masterData` collection. Keeps queries and indexes scoped per domain and
  lets security rules target a domain path. Hierarchy (province→city→village) uses
  `parentId` instead of extra collections.
- **Cursor pagination everywhere** (`PersonService.getPage`) — never "load all".
  Cost- and latency-bounded regardless of collection size.
- **Discriminated `ProgramSettings` union** — `program.type` narrows the settings
  payload at compile time, so competition-specific fields can't leak into a circle.
- **Multi-tenancy anchor (`organizationId`) on every doc from day one.** Today it's
  `"default"`; when multi-org arrives it's a query filter + rule, not a migration.

**Alternative considered:** per-competition subcollections (as the legacy app does,
`competitions/{id}/students`). Rejected at the platform level because it scatters a
person's history across competitions and breaks "Person First" cross-program queries.

---

## 5. RBAC (flexible, not hardcoded)

Authorization is expressed as `resource:action` **permission tokens** (e.g.
`program:create`). The pipeline:

```
RoleType ──DEFAULT_ROLE_POLICY (code) ⊕ rolePolicies/* (data)──▶ Permission set
        ⊕ per-user extra/denied ──▶ AuthorizationService.can('program:create')
```

- **Components/guards/directives check permissions, never roles.** Re-mapping a role's
  capabilities is a config edit, not a code change.
- `requirePermission('person:read')` guards routes; `*appHasPermission` guards template
  regions (reactive via signals).
- `resource:manage` is a wildcard action implying all actions on that resource;
  `*:*` (Super Admin only) implies everything.

**Trade-off:** Firestore Security Rules enforce a *pragmatic* subset (owner-vs-admin,
append-only, field-level diffs) rather than the full permission matrix, because reading
policy docs on every rule evaluation is costly. Fine-grained checks run app-side; the
rules are the hard security boundary. This is a deliberate defense-in-depth split.

---

## 6. Security

- **Auth:** Firebase Email/Password + password reset (extensible to more providers).
- **Rules** (`firestore.rules`): owner-or-admin reads on `persons`; self-registration
  constrained to `uid == personId` + `pending` role state; append-only `auditLogs`;
  immutable audit fields (`keepsCreator()`); recipients can only flip a notification's
  `status`.
- **Storage** (`storage.rules`): public assets world-readable; per-person files scoped
  to the owner uid with a 5 MB image cap; certificates world-readable for QR verification.
- **Sensitive data:** national IDs kept minimal and access-restricted; nothing sensitive
  is logged.

---

## 7. Performance

OnPush change detection + Signals throughout · route-level lazy loading & code
splitting · cursor pagination + prefix-search index · denormalized counters for
dashboards · `trackBy`/`track` on every list · deferrable-view-ready feature isolation.

---

## 8. Roadmap alignment (PRD §14)

| Phase | PRD scope | Status in this PR |
|---|---|---|
| **1** | Persons, unified registration, Master Data, users/RBAC | **Delivered (foundation):** models, RBAC, Master Data CRUD, Persons registry, Registration Wizard, rules, indexes, seed |
| 2 | Competitions, circles, programs, enrollment | Models + collections + rules in place; UI next |
| 3 | Exams, attendance, evaluation, reports | Domain hooks reserved (unified evaluation engine) |
| 4 | Certificates, awards, notifications, parent portal | `notification.model` (multi-channel) + storage rules for certificates ready |
| 5 | Mobile, AI, analytics, public APIs, **remote memorization** | Framework-free domain layer + `MeetingProvider` abstraction ready |

### Future feature — Remote Memorization (architected, **not** implemented)

`remote-session.model.ts` defines a provider-agnostic `MeetingProvider` interface and
`MeetingCoordinates` / `RecordingMetadata`. A future `ZoomMeetingProvider`,
`GoogleMeetProvider`, `JitsiProvider`, … implement the interface; callers depend only on
the abstraction (Dependency Inversion), so adding a provider never touches domain code.

---

## 9. Seeding

`seed/*.json` hold reference data derived from the legacy system + PRD. Import with
`npm run seed` (see `scripts/seed/import.mjs`). Idempotent: doc IDs are stable `code`s.
