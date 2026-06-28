import { Injectable, inject } from "@angular/core";
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
} from "@angular/fire/firestore";
import { Observable } from "rxjs";
import {
  CompetitionCategory,
  PreviousParticipation,
  CATEGORY_RANK,
} from "../models";
import { previousLevelToCategory } from "../validators/egypt.validators";

export interface PreviousLookupResult {
  record: PreviousParticipation;
  /** أعلى مستوى أتمّه سابقاً (فئة المسابقة) */
  level: CompetitionCategory | null;
  /** ترتيب المستوى (0 إذا تعذّر التعرّف) — يُستخدم كحدّ أدنى "floor" */
  rank: number;
}

/** توحيد الاسم للمقارنة: إزالة الفراغات الزائدة والتطويل */
function normalizeName(name: string): string {
  return (name ?? "")
    .replace(/ـ/g, "") // tatweel
    .replace(/\s+/g, " ")
    .trim();
}

/** استخراج YYYY-MM-DD من قيمة تاريخ (Date | Timestamp | string) للمقارنة */
function toIsoDay(v: unknown): string {
  if (!v) return "";
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === "string") {
    const p = new Date(v);
    d = isNaN(p.getTime()) ? null : p;
  } else if (typeof v === "object") {
    const t = v as { toDate?: () => Date; seconds?: number };
    if (typeof t.toDate === "function") d = t.toDate();
    else if (typeof t.seconds === "number") d = new Date(t.seconds * 1000);
  }
  if (!d || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * بيانات المسابقات السابقة (/previousParticipations).
 * القراءة محصورة بالأدمن (تحوي أرقام هواتف)؛ الربط يجري في شاشة الإدارة.
 */
@Injectable({ providedIn: "root" })
export class PreviousParticipationService {
  private fs = inject(Firestore);
  private col = collection(this.fs, "previousParticipations");

  getAll(): Observable<PreviousParticipation[]> {
    return collectionData(this.col, { idField: "id" }) as Observable<
      PreviousParticipation[]
    >;
  }

  /**
   * البحث عن مشاركة سابقة بمطابقة الاسم + تاريخ الميلاد (يوم/شهر/سنة).
   * يقرأ المجموعة كاملة ويصفّي محلياً ليتحمّل اختلاف صيغ تخزين التاريخ.
   * يُعيد null إذا لم يُعثر على مطابقة أو إذا مُنعت القراءة (مستخدم عام).
   */
  async lookup(
    name: string,
    birthDate: Date | null,
  ): Promise<PreviousLookupResult | null> {
    const target = normalizeName(name);
    const day = toIsoDay(birthDate);
    try {
      const snap = await getDocs(this.col);
      const matches = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as PreviousParticipation)
        .filter((r) => {
          const nameOk = normalizeName(r.name) === target;
          const dateOk =
            !day || !toIsoDay(r.birthDate) || toIsoDay(r.birthDate) === day;
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

  async add(data: Omit<PreviousParticipation, "id">): Promise<string> {
    const ref = await addDoc(this.col, data as Record<string, unknown>);
    return ref.id;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.fs, `previousParticipations/${id}`));
  }

  async bulkImport(rows: Record<string, unknown>[]): Promise<number> {
    let imported = 0;

    for (const r of rows) {
      try {
        const name = String(r["اسم المتسابق"] ?? r["name"] ?? "").trim();

        if (!name) {
          console.warn("Skipped row: missing name", r);
          continue;
        }

        const mobileNumbers = String(
          r["رقم التليفون"] ?? r["mobileNumbers"] ?? "",
        )
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean);

        let birthDate: Date | null = null;

        const birthValue = r["تاريخ الميلاد"] ?? r["birthDate"];

        if (birthValue) {
          if (birthValue instanceof Date) {
            birthDate = birthValue;
          } else if (typeof birthValue === "number") {
            // Excel serial date
            birthDate = new Date((birthValue - 25569) * 86400 * 1000);
          } else {
            birthDate = new Date(String(birthValue));
          }

          if (birthDate && isNaN(birthDate.getTime())) {
            birthDate = null;
          }
        }

        await this.add({
          name,
          birthDate,
          mobileNumbers,
          studyGrade: String(
            r["السنه الدراسيه"] ?? r["studyGrade"] ?? "",
          ).trim(),
          memorizerName: String(
            r["اسم المحفظ"] ?? r["memorizerName"] ?? "",
          ).trim(),
          memorizedParts: String(
            r["عدد الأجزاء المحفوظة"] ?? r["memorizedParts"] ?? "",
          ).trim(),
          level: String(r["المستوى"] ?? r["level"] ?? "").trim(),
          notes:
            r["ملاحظات"] != null
              ? String(r["ملاحظات"]).trim()
              : r["notes"] != null
                ? String(r["notes"]).trim()
                : null,
        });

        imported++;
      } catch (error) {
        console.error("Failed to import row:", r);
        console.error(error);
      }
    }

    return imported;
  }
}
