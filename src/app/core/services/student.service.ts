import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, deleteDoc, query, where,
  orderBy, serverTimestamp, getDocs,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Student, StudentStatus } from '../models';
import { AuditService } from './audit.service';
import { CompetitionService } from './competition.service';

export type StudentCreate = Omit<Student, 'id' | 'status' | 'competitionId' | 'createdAt' | 'updatedAt'>;

@Injectable({ providedIn: 'root' })
export class StudentService {
  private fs    = inject(Firestore);
  private audit = inject(AuditService);
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
      { idField: 'id' }
    ) as Observable<Student[]>;
  }

  getByStatus(compId: string, status: StudentStatus): Observable<Student[]> {
    return collectionData(
      query(this.col(compId), where('status', '==', status)),
      { idField: 'id' }
    ) as Observable<Student[]>;
  }

  getBySession(compId: string, sessionId: string): Observable<Student[]> {
    return collectionData(
      query(this.col(compId), where('sessionId', '==', sessionId)),
      { idField: 'id' }
    ) as Observable<Student[]>;
  }

  getById(compId: string, studentId: string): Observable<Student | undefined> {
    return docData(
      doc(this.fs, `competitions/${compId}/students/${studentId}`),
      { idField: 'id' }
    ) as Observable<Student | undefined>;
  }

  async assertUniqueNationalId(compId: string, nationalId: string, excludeId?: string): Promise<void> {
    const snap = await getDocs(
      query(this.col(compId), where('nationalId', '==', nationalId.trim())),
    );
    const dup = snap.docs.find(d => d.id !== excludeId);
    if (dup) throw new Error('الرقم القومي مسجّل مسبقاً في المسابقة');
  }

  async add(compId: string, data: StudentCreate, registeredBy: string): Promise<string> {
    await this.assertUniqueNationalId(compId, data.nationalId);
    const ref = await addDoc(this.col(compId), {
      ...data,
      competitionId: compId,
      status: 'pending' as StudentStatus,
      registeredBy,
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });
    this.audit.log('student.create', ref.id, 'student', { name: data.fullName });
    return ref.id;
  }

  async update(compId: string, studentId: string, data: Partial<Student>): Promise<void> {
    if (data.nationalId) {
      await this.assertUniqueNationalId(compId, data.nationalId, studentId);
    }
    await updateDoc(
      doc(this.fs, `competitions/${compId}/students/${studentId}`),
      { ...data, updatedAt: serverTimestamp() }
    );
    this.audit.log('student.update', studentId, 'student', data as Record<string, unknown>);
  }

  async updateStatus(compId: string, studentId: string, status: StudentStatus): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/students/${studentId}`),
      { status, updatedAt: serverTimestamp() }
    );
    this.audit.log('student.statusUpdate', studentId, 'student', { status });
  }

  async delete(compId: string, studentId: string): Promise<void> {
    await deleteDoc(doc(this.fs, `competitions/${compId}/students/${studentId}`));
    this.audit.log('student.delete', studentId, 'student');
  }
}
