import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc,
  addDoc, updateDoc, query, where, orderBy, serverTimestamp, getDocs, writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Score, ScoreBreakdown, SCORE_MAX } from '../models';
import { StudentService } from './student.service';
import { SheikhService } from './sheikh.service';
import { CompetitionService } from './competition.service';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private fs           = inject(Firestore);
  private studentSvc   = inject(StudentService);
  private sheikhSvc    = inject(SheikhService);
  private competitionSvc = inject(CompetitionService);

  private col(compId: string) {
    return collection(this.fs, `competitions/${compId}/scores`);
  }

  getAll(compId?: string): Observable<Score[]> {
    const id = compId ?? this.competitionSvc.requireActiveCompetition();
    return collectionData(
      query(this.col(id), orderBy('total', 'desc')),
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

    await this.studentSvc.updateStatus(compId, studentId, 'evaluated');
    await this.sheikhSvc.incrementEvaluated(sheikhId);
  }

  async publishAll(compId: string): Promise<void> {
    const scoresSnap = await getDocs(this.col(compId));
    const batch = writeBatch(this.fs);
    scoresSnap.docs.forEach(d => {
      batch.update(d.ref, { isPublished: true });
    });
    batch.update(doc(this.fs, `competitions/${compId}`), { resultsPublished: true });
    await batch.commit();
  }
}
