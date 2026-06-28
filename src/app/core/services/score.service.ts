import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc,
  addDoc, updateDoc, query, where, orderBy, serverTimestamp, getDocs, writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Score, ScoreBreakdown, SCORE_MAX, EvaluationSystem } from '../models';
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

  /**
   * حفظ تقييم متسابق — يدعم نظامي التقييم:
   *  - legacy: breakdown (حفظ/تجويد/أداء/وقف) ويُجمع في total.
   *  - questions10: 10 أسئلة كل منها 0..10 ويُجمع في total.
   * التجويد المنفصل (tajweedScore) للتكريم فقط وخارج المجموع.
   */
  async submit(input: {
    compId: string;
    studentId: string;
    studentName: string;
    sessionId: string;
    sheikhId: string;
    notes: string;
    submittedBy: string;
    system: EvaluationSystem;
    breakdown?: ScoreBreakdown;
    questions?: number[];
    tajweedScore?: number;
  }): Promise<void> {
    const { compId, studentId, studentName, sessionId, sheikhId, notes, submittedBy, system } = input;

    const data: Record<string, unknown> = {
      studentId, studentName, sessionId, sheikhId, notes, system,
      isPublished: false,
      submittedAt: serverTimestamp(),
      submittedBy,
    };

    let total: number;
    if (system === 'questions10') {
      const q = input.questions ?? [];
      if (q.length !== 10 || q.some(n => !Number.isInteger(n) || n < 0 || n > 10)) {
        throw new Error('يجب إدخال 10 أسئلة، كل سؤال من 0 إلى 10');
      }
      total = q.reduce((a, b) => a + b, 0);
      data['questions'] = q;
    } else {
      const b = input.breakdown!;
      if (b.hifz    > SCORE_MAX.hifz    ||
          b.tajweed > SCORE_MAX.tajweed ||
          b.ada     > SCORE_MAX.ada     ||
          b.waqf    > SCORE_MAX.waqf) {
        throw new Error('الدرجات تتجاوز الحد الأقصى المسموح به');
      }
      total = this.calcTotal(b);
      data['breakdown'] = b;
    }

    if (input.tajweedScore != null) {
      if (input.tajweedScore < 0 || input.tajweedScore > 10) {
        throw new Error('درجة التجويد يجب أن تكون من 0 إلى 10');
      }
      data['tajweedScore'] = input.tajweedScore;
    }

    data['total'] = total;
    await addDoc(this.col(compId), data);

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
