import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryConstraint,
  QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { firestoreToDate } from '../utils/firestore-date.util';
import { Page } from '../models/platform/common.model';
import { Person, PersonCreate, PersonStatus } from '../models/platform/person.model';

const DEFAULT_TENANT = 'default';

/**
 * Access to the unified `persons` collection. Reads are cursor-paginated
 * (never "load all") to stay cheap and scalable as the person count grows
 * into the tens of thousands. Prefix search uses a pre-computed
 * `searchTokens` array so it can be served by a single index.
 */
@Injectable({ providedIn: 'root' })
export class PersonService {
  private readonly fs = inject(Firestore);
  private readonly auth = inject(AuthService);

  private col() {
    return collection(this.fs, 'persons');
  }

  private toModel(raw: Record<string, unknown>): Person {
    return {
      ...(raw as unknown as Person),
      createdAt: firestoreToDate(raw['createdAt']) ?? new Date(0),
      updatedAt: firestoreToDate(raw['updatedAt']) ?? new Date(0),
      birthDate: firestoreToDate(raw['birthDate']) ?? undefined,
    };
  }

  /** Live document stream for a single person (detail screens). */
  getById(id: string): Observable<Person | undefined> {
    return (docData(doc(this.fs, 'persons', id), { idField: 'id' }) as Observable<
      Record<string, unknown> | undefined
    >).pipe(map((raw) => (raw ? this.toModel(raw) : undefined)));
  }

  /**
   * One page of persons ordered by creation time (newest first),
   * optionally filtered by status. Pass the previous page's `cursor`
   * to fetch the next page.
   */
  async getPage(opts: {
    pageSize: number;
    cursor?: unknown | null;
    status?: PersonStatus;
  }): Promise<Page<Person>> {
    const constraints: QueryConstraint[] = [];
    if (opts.status) constraints.push(where('status', '==', opts.status));
    constraints.push(orderBy('createdAt', 'desc'));
    if (opts.cursor) constraints.push(startAfter(opts.cursor as QueryDocumentSnapshot));
    constraints.push(limit(opts.pageSize));

    const snap = await getDocs(query(this.col(), ...constraints));
    const items = snap.docs.map((d) => this.toModel({ id: d.id, ...d.data() }));
    const last = snap.docs.at(-1) ?? null;
    return {
      items,
      cursor: last,
      hasMore: snap.docs.length === opts.pageSize,
    };
  }

  /** Prefix search by name token (lowercased). Bounded result set. */
  search(token: string, max = 20): Observable<Person[]> {
    return (
      collectionData(
        query(this.col(), where('searchTokens', 'array-contains', token.toLowerCase()), limit(max)),
        { idField: 'id' },
      ) as Observable<Record<string, unknown>[]>
    ).pipe(map((rows) => rows.map((r) => this.toModel(r))));
  }

  /** Builds prefix-search tokens from the full name (words + prefixes). */
  static buildSearchTokens(fullName: string): string[] {
    const words = fullName.toLowerCase().split(/\s+/).filter(Boolean);
    const tokens = new Set<string>();
    for (const word of words) {
      tokens.add(word);
      for (let i = 2; i < word.length; i++) tokens.add(word.slice(0, i));
    }
    return [...tokens];
  }

  async create(input: PersonCreate): Promise<string> {
    const uid = this.auth.currentUser()?.uid ?? 'system';
    const ref = await addDoc(this.col(), {
      ...input,
      organizationId: input.organizationId || DEFAULT_TENANT,
      roles: [],
      searchTokens: PersonService.buildSearchTokens(input.fullName),
      status: input.status ?? PersonStatus.Active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
    });
    return ref.id;
  }

  async update(id: string, patch: Partial<Person>): Promise<void> {
    const uid = this.auth.currentUser()?.uid ?? 'system';
    const extra = patch.fullName
      ? { searchTokens: PersonService.buildSearchTokens(patch.fullName) }
      : {};
    await updateDoc(doc(this.fs, 'persons', id), {
      ...patch,
      ...extra,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  }
}
