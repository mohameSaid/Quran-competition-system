import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc,
  addDoc, updateDoc, query, where, orderBy, serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Score, ScoreBreakdown, SCORE_MAX } from '../models';
import { AuditService } from './audit.service';
import { StudentService } from './student.service';
import { SheikhService } from './sheikh.service';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private fs           = inject(Firestore);
  private audit        = inject(AuditService);
  private studentSvc   = inject(StudentService);
  private sheikhSvc    = inject(SheikhService);

  private col(compId: string) {
    return collection(this.fs, `competitions/${compId}/scores`);
  }

  getAll(compId: string): Observable<Score[]> {
    return collectionData(
      query(this.col(compId), orderBy('total', 'desc')),
      { idField: 'id' }
    ) as Observable<Score[]>;
  }

  getPublished(compId: string): Observable<Score[]> {
    return collectionData(
      query(this.col(compId), where('isPublished', '==', true), orderBy('total', 'desc')),
      { idField: 'id' }
    ) as Observable<Score[]>;
  }

  getForSession(compId: string, sessionId: string): Observable<Score[]> {
    return collectionData(
      query(this.col(compId), where('sessionId', '==', sessionId)),
      { idField: 'id' }
    ) as Observable<Score[]>;
  }

  calcTotal(b: ScoreBreakdown): number {
    return b.hifz + b.tajweed + b.ada + b.waqf;
  }

  gradeLabel(total: number): string {
    if (total >= 90) return 'ممتاز';
    if (total >= 80) return 'جيد جداً';
    if (total >= 70) return 'جيد';
    if (total >= 60) return 'مقبول';
    return 'ضعيف';
  }

  async submit(
    compId: string,
    studentId:   string,
    studentName: string,
    sessionId:   string,
    sheikhId:    string,
    breakdown:   ScoreBreakdown,
    notes:       string,
    submittedBy: string,
  ): Promise<void> {
    const total = this.calcTotal(breakdown);

    // Validate breakdown doesn't exceed max
    if (breakdown.hifz    > SCORE_MAX.hifz    ||
        breakdown.tajweed > SCORE_MAX.tajweed  ||
        breakdown.ada     > SCORE_MAX.ada      ||
        breakdown.waqf    > SCORE_MAX.waqf) {
      throw new Error('الدرجات تتجاوز الحد الأقصى المسموح به');
    }

    await addDoc(this.col(compId), {
      studentId, studentName, sessionId, sheikhId,
      breakdown, total, notes,
      isPublished: false,
      submittedAt: serverTimestamp(),
      submittedBy,
    });

    // Side-effects
    await this.studentSvc.updateStatus(compId, studentId, 'evaluated');
    await this.sheikhSvc.incrementEvaluated(sheikhId);
    this.audit.log('score.submit', studentId, 'score', { total });
  }

  async publishAll(compId: string): Promise<void> {
    // In production: Cloud Function is safer for batch writes
    // Here we update the competition flag
    await updateDoc(doc(this.fs, `competitions/${compId}`), { resultsPublished: true });
    this.audit.log('results.publish', compId, 'competition');
  }
}
