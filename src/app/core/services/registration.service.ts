import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from '@angular/fire/firestore';
import { PersonService } from './person.service';
import { Gender, PersonStatus } from '../models/platform/person.model';
import {
  RoleAssignmentStatus,
  RoleType,
} from '../models/platform/role.model';

const DEFAULT_TENANT = 'default';

/** Input captured by the unified Registration Wizard. */
export interface RegistrationInput {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly gender: Gender;
  readonly phone: string;
  readonly nationalId?: string;
  readonly motherName?: string;
  readonly roles: readonly RoleType[];
}

/**
 * Orchestrates the "Registration First" flow: one path for everyone,
 * then role selection. Creates the Auth account, the unified Person
 * record and one RoleAssignment per selected role (pending approval),
 * atomically for the Firestore writes.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly auth = inject(Auth);
  private readonly fs = inject(Firestore);

  async register(input: RegistrationInput): Promise<{ uid: string; personId: string }> {
    const cred = await createUserWithEmailAndPassword(this.auth, input.email, input.password);
    const uid = cred.user.uid;
    await updateProfile(cred.user, { displayName: input.fullName });

    const personRef = doc(this.fs, 'persons', uid); // person id == auth uid for self-registrants
    const batch = writeBatch(this.fs);

    batch.set(personRef, {
      organizationId: DEFAULT_TENANT,
      fullName: input.fullName,
      gender: input.gender,
      status: PersonStatus.Active,
      accountUid: uid,
      nationalId: input.nationalId ?? null,
      motherName: input.motherName ?? null,
      contacts: [{ type: 'mobile', value: input.phone, isPrimary: true, isVerified: false }],
      roles: input.roles,
      searchTokens: PersonService.buildSearchTokens(input.fullName),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
    });

    for (const role of input.roles) {
      const roleRef = doc(this.fs, `persons/${uid}/roles/${role}`);
      batch.set(roleRef, {
        organizationId: DEFAULT_TENANT,
        personId: uid,
        role,
        status: RoleAssignmentStatus.Pending,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
      });
    }

    // Account/profile doc used by AuthService for legacy role routing.
    batch.set(doc(this.fs, 'users', uid), {
      uid,
      email: input.email,
      displayName: input.fullName,
      role: 'public',
      personId: uid,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { uid, personId: uid };
  }
}
