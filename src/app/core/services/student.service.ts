import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, deleteDoc, query, where,
  orderBy, serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Student, StudentStatus } from '../models';
import { CompetitionService } from './competition.service';

export type StudentCreate = Omit<
  Student,
  'id' | 'status' | 'competitionId' | 'createdAt' | 'updatedAt'
>;

@Injectable({ providedIn: 'root' })
export class StudentService {
  private fs    = inject(Firestore);
  private competitionSvc = inject(CompetitionService);

  private col(compId: string) {
    return collection(this.fs, `competitions/${compId}/students`);
  }

  compId(explicit?: string): string {
    return explicit ?? this.competitionSvc.requireActiveCompetition();
  }

  getAll(compId?: string): Observable<Student[]> {
    const id = this.compId(compId);
    return collectionData(
      query(this.col(id), orderBy('createdAt', 'desc')),
      { idField: 'id' },
    ) as Observable<Student[]>;
  }

  getByStatus(compId: string, status: StudentStatus): Observable<Student[]> {
    return collectionData(
      query(this.col(compId), where('status', '==', status)),
      { idField: 'id' },
    ) as Observable<Student[]>;
  }

  getBySession(compId: string, sessionId: string): Observable<Student[]> {
    return collectionData(
      query(this.col(compId), where('sessionId', '==', sessionId)),
      { idField: 'id' },
    ) as Observable<Student[]>;
  }

  getById(compId: string, studentId: string): Observable<Student | undefined> {
    return docData(
      doc(this.fs, `competitions/${compId}/students/${studentId}`),
      { idField: 'id' },
    ) as Observable<Student | undefined>;
  }

  private withLegacyAliases(data: Partial<Student>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...data };
    if (data.memorizerId) out['sheikhId'] = data.memorizerId;
    if (data.memorizerName) out['sheikhName'] = data.memorizerName;
    return out;
  }

  async add(compId: string, data: StudentCreate, registeredBy: string): Promise<string> {
    const ref = await addDoc(this.col(compId), {
      ...this.withLegacyAliases(data),
      competitionId: compId,
      status: 'pending' as StudentStatus,
      registeredBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(compId: string, studentId: string, data: Partial<Student>): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/students/${studentId}`),
      { ...this.withLegacyAliases(data), updatedAt: serverTimestamp() },
    );
  }

  async updateStatus(compId: string, studentId: string, status: StudentStatus): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/students/${studentId}`),
      { status, updatedAt: serverTimestamp() },
    );
  }

  async delete(compId: string, studentId: string): Promise<void> {
    await deleteDoc(doc(this.fs, `competitions/${compId}/students/${studentId}`));
  }
}
