import { Injectable, inject } from '@angular/core';
import {
  CompetitionCategory,
  DEFAULT_COMPETITION_SETTINGS,
  EvaluationConfig,
  EvaluationCriterion,
  EvaluationSystem,
} from '../models';
import { CompetitionService } from './competition.service';

/**
 * المصدر الوحيد لنظام التقييم الفعّال.
 * يشتق EvaluationConfig من إعدادات المسابقة (الوثيقة الفعّالة) + مستوى المتسابق،
 * فلا تُبرمَج معايير التقييم بشكل ثابت داخل المكوّنات.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationConfigService {
  private competitionSvc = inject(CompetitionService);

  /** نظام التقييم الفعّال (مع القيمة الافتراضية عند غياب الإعداد) */
  activeSystem(): EvaluationSystem {
    return this.competitionSvc.active()?.evaluationSystem
      ?? DEFAULT_COMPETITION_SETTINGS.evaluationSystem;
  }

  /**
   * يبني إعدادات التقييم لمتسابق بمستوى معيّن.
   * التجويد إجباري فقط في ختم القرآن (full30) عند تفعيل tajweedRequiredAtKhatm.
   */
  buildConfig(category?: CompetitionCategory): EvaluationConfig {
    const c = this.competitionSvc.active();
    const system  = c?.evaluationSystem ?? DEFAULT_COMPETITION_SETTINGS.evaluationSystem;
    const tajEnabled = c?.tajweedEnabled ?? DEFAULT_COMPETITION_SETTINGS.tajweedEnabled;
    const tajReqKhatm = c?.tajweedRequiredAtKhatm ?? DEFAULT_COMPETITION_SETTINGS.tajweedRequiredAtKhatm;
    const isKhatm = category === 'full30';
    const tajRequired = tajEnabled && tajReqKhatm && isKhatm;

    if (system === 'questions10') {
      const criteria: EvaluationCriterion[] = Array.from({ length: 10 }, (_, i) => ({
        key:   `q${i + 1}`,
        label: `السؤال ${i + 1}`,
        max:   10,
        color: 'var(--gold)',
      }));
      return {
        system: 'questions10',
        criteria,
        maxTotal: 100,
        tajweed: { enabled: tajEnabled, required: tajRequired, max: 10 },
        waqfEnabled: false,
      };
    }

    // legacy — النظام القديم (الحفظ/التجويد/الأداء/الوقف)
    const criteria: EvaluationCriterion[] = [
      { key: 'hifz',    label: 'الحفظ والاسترسال',  max: 40, desc: 'مستوى الحفظ والطلاقة وعدم التوقف', color: 'var(--gold)' },
      { key: 'tajweed', label: 'أحكام التجويد',     max: 30, desc: 'تطبيق أحكام التجويد والمخارج',     color: 'var(--blue)' },
      { key: 'ada',     label: 'جمال الصوت والأداء', max: 20, desc: 'حسن الصوت وجودة الأداء',           color: 'var(--green)' },
      { key: 'waqf',    label: 'الوقف والابتداء',   max: 10, desc: 'صحة مواضع الوقف والابتداء',        color: 'var(--purple)' },
    ];
    return {
      system: 'legacy',
      criteria,
      maxTotal: 100,
      // في النظام القديم التجويد جزء من المجموع؛ نُبقي الحقل المنفصل معطّلاً
      tajweed: { enabled: false, required: false, max: 30 },
      waqfEnabled: true,
    };
  }
}
