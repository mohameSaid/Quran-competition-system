import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc,
  addDoc, deleteDoc, getDocs,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CompetitionCategory, PreviousParticipation, CATEGORY_RANK } from '../models';
import { previousLevelToCategory } from '../validators/egypt.validators';

export interface PreviousLookupResult {
  record: PreviousParticipation;
  /** أعلى مستوى أتمّه سابقاً (فئة المسابقة) */
  level: CompetitionCategory | null;
  /** ترتيب المستوى (0 إذا تعذّر التعرّف) — يُستخدم كحدّ أدنى "floor" */
  rank: number;
}

/** توحيد الاسم للمقارنة: إزالة الفراغات الزائدة والتطويل */
function normalizeName(name: string): string {
  return (name ?? '')
    .replace(/ـ/g, '')        // tatweel
    .replace(/\s+/g, ' ')
    .trim();
}

/** استخراج YYYY-MM-DD من قيمة تاريخ (Date | Timestamp | string) للمقارنة */
function toIsoDay(v: unknown): string {
  if (!v) return '';
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === 'string') { const p = new Date(v); d = isNaN(p.getTime()) ? null : p; }
  else if (typeof v === 'object') {
    const t = v as { toDate?: () => Date; seconds?: number };
    if (typeof t.toDate === 'function') d = t.toDate();
    else if (typeof t.seconds === 'number') d = new Date(t.seconds * 1000);
  }
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * بيانات المسابقات السابقة (/previousParticipations).
 * القراءة محصورة بالأدمن (تحوي أرقام هواتف)؛ الربط يجري في شاشة الإدارة.
 */
@Injectable({ providedIn: 'root' })
export class PreviousParticipationService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'previousParticipations');

  getAll(): Observable<PreviousParticipation[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<PreviousParticipation[]>;
  }

  /**
   * البحث عن مشاركة سابقة بمطابقة الاسم + تاريخ الميلاد (يوم/شهر/سنة).
   * يقرأ المجموعة كاملة ويصفّي محلياً ليتحمّل اختلاف صيغ تخزين التاريخ.
   * يُعيد null إذا لم يُعثر على مطابقة أو إذا مُنعت القراءة (مستخدم عام).
   */
  async lookup(name: string, birthDate: Date | null): Promise<PreviousLookupResult | null> {
    const target = normalizeName(name);
    const day = toIsoDay(birthDate);
    try {
      const snap = await getDocs(this.col);
      const matches = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PreviousParticipation))
        .filter(r => {
          const nameOk = normalizeName(r.name) === target;
          const dateOk = !day || !toIsoDay(r.birthDate) || toIsoDay(r.birthDate) === day;
          return nameOk && dateOk;
        });
      if (!matches.length) return null;
      // أعلى مستوى بين المشاركات المطابقة
      let best: PreviousLookupResult | null = null;
      for (const record of matches) {
        const level = previousLevelToCategory(record.level);
        const rank = level ? CATEGORY_RANK[level] : 0;
        if (!best || rank > best.rank) best = { record, level, rank };
      }
      return best;
    } catch {
      // قراءة مرفوضة (مستخدم عام) أو خطأ شبكة — نتجاهل الربط بدون كسر التسجيل
      return null;
    }
  }

  async add(data: Omit<PreviousParticipation, 'id'>): Promise<string> {
    const ref = await addDoc(this.col, data as Record<string, unknown>);
    return ref.id;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.fs, `previousParticipations/${id}`));
  }

  /** استيراد دفعة من صفوف (من ملف Excel) — يطابق أسماء أعمدة الشكل المتفق عليه */
  async bulkImport(rows: Record<string, unknown>[]): Promise<number> {
    let n = 0;
    for (const r of rows) {
      const name = String(r['name'] ?? r['الاسم'] ?? '').trim();
      if (!name) continue;
      const mobiles = String(r['mobileNumbers'] ?? r['الهواتف'] ?? '')
        .split(/[,،]/).map(s => s.trim()).filter(Boolean);
      await this.add({
        name,
        birthDate: r['birthDate'] ? new Date(String(r['birthDate'])) : null,
        mobileNumbers: mobiles,
        studyGrade: String(r['studyGrade'] ?? r['الصف'] ?? ''),
        memorizerName: String(r['memorizerName'] ?? r['المحفظ'] ?? ''),
        memorizedParts: String(r['memorizedParts'] ?? r['الأجزاء'] ?? ''),
        level: String(r['level'] ?? r['المستوى'] ?? ''),
        notes: r['notes'] != null ? String(r['notes']) : null,
      });
      n++;
    }
    return n;
  }
}
