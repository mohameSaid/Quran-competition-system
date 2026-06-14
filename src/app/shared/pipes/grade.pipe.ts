import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'grade', standalone: true })
export class GradePipe implements PipeTransform {
  transform(v: number): string {
    if (v >= 90) return 'ممتاز';
    if (v >= 80) return 'جيد جداً';
    if (v >= 70) return 'جيد';
    if (v >= 60) return 'مقبول';
    return 'ضعيف';
  }
}
