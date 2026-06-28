import { Injectable } from '@angular/core';
import { Student, Score, CATEGORY_LABELS } from '../models';
import { formatEgyptDate } from '../validators/egypt.validators';

@Injectable({ providedIn: 'root' })
export class ExportService {

  async exportStudents(students: Student[], filename = 'students'): Promise<void> {
    if (!students.length) throw new Error('لا توجد بيانات للتصدير');
    const XLSX = await import('xlsx');
    const rows = students.map((s, i) => ({
      '#':                      i + 1,
      'اسم المتسابق':           s.fullName,
      'الرقم القومي':           s.nationalId ?? '—',
      'اسم الأم':               s.motherName ?? '—',
      'محل الميلاد':            s.birthPlace ?? '—',
      'تاريخ الميلاد':          formatEgyptDate(s.birthDate),
      'هاتف ولي الأمر':         s.parentPhone,
      'هاتف آخر':               s.alternatePhone ?? '—',
      'المحفّظ':                 s.memorizerName ?? s.sheikhName ?? '—',
      'عدد الأجزاء':            s.juzCount,
      'المستوى السابق':         s.previousLevel ?? '—',
      'الفئة':                  CATEGORY_LABELS[s.category],
      'الحالة':                 s.status,
    }));
    this.write(XLSX, rows, filename);
  }

  async exportScores(scores: Score[], filename = 'results'): Promise<void> {
    if (!scores.length) throw new Error('لا توجد بيانات للتصدير');
    const XLSX = await import('xlsx');

    // فصل النتائج حسب نظام التقييم لإبقاء الأعمدة واضحة (ورقة لكل نظام)
    const legacy    = scores.filter(s => (s.system ?? 'legacy') === 'legacy');
    const questions = scores.filter(s => s.system === 'questions10');

    const wb = XLSX.utils.book_new();

    if (legacy.length) {
      const rows = legacy.map((s, i) => ({
        'الترتيب':         i + 1,
        'الاسم':           s.studentName,
        'الحفظ /40':       s.breakdown?.hifz ?? '—',
        'التجويد /30':     s.breakdown?.tajweed ?? '—',
        'الأداء /20':      s.breakdown?.ada ?? '—',
        'الوقف /10':       s.breakdown?.waqf ?? '—',
        'المجموع /100':    s.total,
        'الملاحظات':       s.notes,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'النظام التقليدي');
    }

    if (questions.length) {
      const rows = questions.map((s, i) => {
        const q = s.questions ?? [];
        const row: Record<string, unknown> = { 'الترتيب': i + 1, 'الاسم': s.studentName };
        for (let n = 0; n < 10; n++) row[`س${n + 1} /10`] = q[n] ?? '—';
        row['التجويد (تكريم) /10'] = s.tajweedScore ?? '—';
        row['المجموع /100'] = s.total;
        row['الملاحظات'] = s.notes;
        return row;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'نظام الأسئلة العشرة');
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  private write(XLSX: typeof import('xlsx'), rows: Record<string, unknown>[], name: string): void {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
}
