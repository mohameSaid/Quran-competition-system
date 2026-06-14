import { Pipe, PipeTransform } from '@angular/core';
import { CompetitionCategory, CATEGORY_LABELS } from '../../core/models';
@Pipe({ name: 'categoryLabel', standalone: true })
export class CategoryLabelPipe implements PipeTransform {
  transform(v: CompetitionCategory): string { return CATEGORY_LABELS[v] ?? v; }
}
