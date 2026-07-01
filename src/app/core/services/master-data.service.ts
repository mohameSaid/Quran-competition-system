import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { firestoreToDate } from '../utils/firestore-date.util';
import {
  MasterDataCreate,
  MasterDataDomain,
  MasterDataItem,
} from '../models/platform/master-data.model';

const DEFAULT_TENANT = 'default';

/**
 * Generic reference-data service. One implementation serves every
 * lookup domain (Configuration over Code): the collection path is
 * derived from the domain, so no per-domain service or model is needed.
 *
 * Layout: `masterData/{domain}/items/{itemId}` — a subcollection per
 * domain keeps reads scoped and indexes small.
 */
@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly fs = inject(Firestore);
  private readonly auth = inject(AuthService);

  private path(domain: MasterDataDomain): string {
    return `masterData/${domain}/items`;
  }

  private toModel(raw: Record<string, unknown>): MasterDataItem {
    return {
      ...(raw as unknown as MasterDataItem),
      createdAt: firestoreToDate(raw['createdAt']) ?? new Date(0),
      updatedAt: firestoreToDate(raw['updatedAt']) ?? new Date(0),
    };
  }

  /** All items in a domain, ordered for deterministic dropdowns. */
  list(domain: MasterDataDomain): Observable<MasterDataItem[]> {
    return (
      collectionData(query(collection(this.fs, this.path(domain)), orderBy('order', 'asc')), {
        idField: 'id',
      }) as Observable<Record<string, unknown>[]>
    ).pipe(map((rows) => rows.map((r) => this.toModel(r))));
  }

  /** Active items only — for end-user facing pickers. */
  listActive(domain: MasterDataDomain): Observable<MasterDataItem[]> {
    return (
      collectionData(
        query(
          collection(this.fs, this.path(domain)),
          where('isActive', '==', true),
          orderBy('order', 'asc'),
        ),
        { idField: 'id' },
      ) as Observable<Record<string, unknown>[]>
    ).pipe(map((rows) => rows.map((r) => this.toModel(r))));
  }

  /** Children of a parent item — for cascading province→city→village. */
  listChildren(domain: MasterDataDomain, parentId: string): Observable<MasterDataItem[]> {
    return (
      collectionData(
        query(
          collection(this.fs, this.path(domain)),
          where('parentId', '==', parentId),
          where('isActive', '==', true),
          orderBy('order', 'asc'),
        ),
        { idField: 'id' },
      ) as Observable<Record<string, unknown>[]>
    ).pipe(map((rows) => rows.map((r) => this.toModel(r))));
  }

  async create(domain: MasterDataDomain, input: Omit<MasterDataCreate, 'domain' | 'organizationId'>): Promise<string> {
    const uid = this.auth.currentUser()?.uid ?? 'system';
    const ref = await addDoc(collection(this.fs, this.path(domain)), {
      ...input,
      domain,
      organizationId: DEFAULT_TENANT,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
    });
    return ref.id;
  }

  async update(
    domain: MasterDataDomain,
    id: string,
    patch: Partial<Omit<MasterDataItem, 'id' | 'domain'>>,
  ): Promise<void> {
    const uid = this.auth.currentUser()?.uid ?? 'system';
    await updateDoc(doc(this.fs, this.path(domain), id), {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  }

  async remove(domain: MasterDataDomain, id: string): Promise<void> {
    await deleteDoc(doc(this.fs, this.path(domain), id));
  }
}
