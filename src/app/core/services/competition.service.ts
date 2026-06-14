import { Injectable, inject, signal, isDevMode } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  UpdateData,
} from '@angular/fire/firestore';
import { Observable, tap } from 'rxjs';
import { Competition } from '../models';

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'competitions');

  readonly active = signal<Competition | null>(null);

  /** Load competition on app boot — avoids orderBy index; tolerates slow/offline Firestore */
  async initActive(fallbackId = 'default'): Promise<void> {
    try {
      const directSnap = await getDoc(doc(this.fs, `competitions/${fallbackId}`));
      if (directSnap.exists()) {
        this.active.set({ id: directSnap.id, ...directSnap.data() } as Competition);
        return;
      }

      const snap = await getDocs(query(this.col, limit(1)));
      if (!snap.empty) {
        const d = snap.docs[0];
        this.active.set({ id: d.id, ...d.data() } as Competition);
      }
    } catch (err) {
      if (isDevMode()) {
        console.warn('[CompetitionService] Could not load competition from Firestore', err);
      }
    }
  }

  requireActiveCompetition(): string {
    const c = this.active();
    if (!c?.id) throw new Error('لم يتم تحميل بيانات المسابقة');
    return c.id;
  }

  getAll(): Observable<Competition[]> {
    return collectionData(query(this.col, orderBy('createdAt', 'desc')), {
      idField: 'id',
    }) as Observable<Competition[]>;
  }

  getById(id: string): Observable<Competition | undefined> {
    return (
      docData(doc(this.fs, `competitions/${id}`), {
        idField: 'id',
      }) as Observable<Competition>
    ).pipe(tap((c) => { if (c) this.active.set(c); }));
  }

  async create(data: Omit<Competition, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(this.col, {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(id: string, data: Partial<Competition>): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${id}`),
      data as UpdateData<Competition>,
    );
  }

  async toggleRegistration(id: string, open: boolean): Promise<void> {
    await updateDoc(doc(this.fs, `competitions/${id}`), {
      registrationOpen: open,
    });
  }

  async publishResults(id: string): Promise<void> {
    await updateDoc(doc(this.fs, `competitions/${id}`), {
      resultsPublished: true,
    });
  }
}
