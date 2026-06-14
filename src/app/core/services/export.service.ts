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
    const rows = scores.map((s, i) => ({
      'الترتيب':         i + 1,
      'الاسم':           s.studentName,
      'الحفظ /40':       s.breakdown.hifz,
      'التجويد /30':     s.breakdown.tajweed,
      'الأداء /20':      s.breakdown.ada,
      'الوقف /10':       s.breakdown.waqf,
      'المجموع /100':    s.total,
      'الملاحظات':       s.notes,
    }));
    this.write(XLSX, rows, filename);
  }

  private write(XLSX: typeof import('xlsx'), rows: Record<string, unknown>[], name: string): void {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
}
