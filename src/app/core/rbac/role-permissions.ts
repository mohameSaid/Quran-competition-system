// ─────────────────────────────────────────────────────────────
// PLATFORM · RBAC default policy (Configuration over Code)
// ─────────────────────────────────────────────────────────────
// The default mapping of Role → Permissions. This is the *seed* policy;
// at runtime it can be overridden by a `rolePolicies/{role}` document in
// Firestore, so administrators re-map capabilities without a deploy.
// Feature code checks PERMISSIONS, never roles.

import {
  Permission,
  PermissionAction,
  PermissionGrant,
  PermissionResource,
  WILDCARD_PERMISSION,
  permission,
} from '../models/platform/permission.model';
import { RoleType } from '../models/platform/role.model';

const P = permission;
const R = PermissionResource;
const A = PermissionAction;

/** Read-only across the whole platform (Viewer / auditors). */
const READ_ALL: readonly Permission[] = Object.values(PermissionResource).map((r) =>
  P(r, A.Read),
);

export const DEFAULT_ROLE_POLICY: Readonly<Record<RoleType, readonly PermissionGrant[]>> = {
  // Full access — the only role that gets the wildcard.
  [RoleType.SuperAdmin]: [WILDCARD_PERMISSION],

  [RoleType.CompetitionAdmin]: [
    P(R.Program, A.Manage),
    P(R.Competition, A.Manage),
    P(R.Enrollment, A.Manage),
    P(R.Exam, A.Manage),
    P(R.Evaluation, A.Manage),
    P(R.Certificate, A.Manage),
    P(R.Award, A.Manage),
    P(R.Person, A.Read),
    P(R.Person, A.Create),
    P(R.Person, A.Update),
    P(R.Report, A.Read),
    P(R.Report, A.Export),
    P(R.MasterData, A.Read),
  ],

  [RoleType.CenterAdmin]: [
    P(R.Circle, A.Manage),
    P(R.Mosque, A.Manage),
    P(R.Attendance, A.Manage),
    P(R.Enrollment, A.Manage),
    P(R.Person, A.Read),
    P(R.Person, A.Create),
    P(R.Person, A.Update),
    P(R.Report, A.Read),
    P(R.MasterData, A.Read),
  ],

  [RoleType.Supervisor]: [
    P(R.Program, A.Read),
    P(R.Program, A.Update),
    P(R.Enrollment, A.Read),
    P(R.Enrollment, A.Approve),
    P(R.Attendance, A.Manage),
    P(R.Report, A.Read),
    P(R.Person, A.Read),
  ],

  [RoleType.Evaluator]: [
    P(R.Evaluation, A.Create),
    P(R.Evaluation, A.Read),
    P(R.Exam, A.Read),
    P(R.Person, A.Read),
  ],

  [RoleType.Memorizer]: [
    P(R.Circle, A.Read),
    P(R.Circle, A.Update),
    P(R.Attendance, A.Create),
    P(R.Attendance, A.Read),
    P(R.Attendance, A.Update),
    P(R.Evaluation, A.Create),
    P(R.Person, A.Read),
  ],

  [RoleType.Teacher]: [
    P(R.Circle, A.Read),
    P(R.Attendance, A.Create),
    P(R.Attendance, A.Read),
    P(R.Evaluation, A.Create),
    P(R.Person, A.Read),
  ],

  [RoleType.Student]: [
    P(R.Program, A.Read),
    P(R.Enrollment, A.Create),
    P(R.Enrollment, A.Read),
    P(R.Exam, A.Read),
    P(R.Certificate, A.Read),
    P(R.Award, A.Read),
  ],

  [RoleType.Parent]: [
    P(R.Program, A.Read),
    P(R.Enrollment, A.Read),
    P(R.Exam, A.Read),
    P(R.Certificate, A.Read),
    P(R.Attendance, A.Read),
  ],

  [RoleType.Volunteer]: [
    P(R.Program, A.Read),
    P(R.Enrollment, A.Create),
    P(R.Attendance, A.Read),
  ],

  [RoleType.Viewer]: READ_ALL,
};
