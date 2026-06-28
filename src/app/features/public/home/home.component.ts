import {
  Component,
  inject,
  AfterViewInit,
  OnDestroy,
  computed,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompetitionService } from '../../../core/services/competition.service';
import { HomeContentService, DEFAULT_HOME_CONTENT } from '../../../core/services/home-content.service';
import { CATEGORY_LABELS, CompetitionCategory } from '../../../core/models';
import { formatEgyptDate } from '../../../core/validators/egypt.validators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private competitionSvc = inject(CompetitionService);
  private homeContentSvc = inject(HomeContentService);
  private observer?: IntersectionObserver;

  readonly competition = this.competitionSvc.active;
  readonly currentYear = new Date().getFullYear();

  /** محتوى الصفحة الرئيسية القابل للتعديل (يبدأ بالقيم الافتراضية ثم يُحدّث من Firestore) */
  readonly content = toSignal(this.homeContentSvc.watch(), { initialValue: DEFAULT_HOME_CONTENT });

  readonly fmtDate = formatEgyptDate;

  constructor() {
    // بعد كل تحديث للمحتوى، أعد مراقبة البطاقات الجديدة في الدورة التالية
    effect(() => {
      this.content();
      setTimeout(() => this.observeReveals());
    });
  }

  readonly registrationEndLabel = computed(() => {
    const c = this.competition();
    return c?.registrationEnd ? formatEgyptDate(c.registrationEnd) : '—';
  });

  readonly prizesSummary = computed(() => {
    const prizes = this.competition()?.prizes;
    if (!prizes) return 'جوائز قيمة لجميع الفئات';
    const vals = Object.values(prizes).filter(v => v > 0);
    if (!vals.length) return 'جوائز قيمة لجميع الفئات';
    const max = Math.max(...vals);
    return `حتى ${max.toLocaleString('ar-EG')} جنيه`;
  });

  readonly categoriesSummary = computed(() => {
    const keys = Object.keys(CATEGORY_LABELS) as CompetitionCategory[];
    return keys.map(k => CATEGORY_LABELS[k].replace(/\s*\(.*\)/, '')).join(' | ');
  });

  ngAfterViewInit(): void {
    this.observeReveals();

    const heroBg = document.getElementById('hero-bg');
    if (heroBg) {
      window.addEventListener('scroll', this.onParallax, { passive: true });
    }
  }

  /**
   * يراقب عناصر الكشف التدريجي. يُعاد استدعاؤه بعد تحميل المحتوى من Firestore
   * (الذي قد يُنشئ بطاقات جديدة) حتى لا تبقى مخفية.
   */
  private observeReveals(): void {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              this.observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
      );
    }
    document.querySelectorAll('.reveal:not(.visible), .reveal-card:not(.visible)').forEach(el => {
      this.observer?.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    window.removeEventListener('scroll', this.onParallax);
  }

  private onParallax = (): void => {
    const heroBg = document.getElementById('hero-bg');
    if (heroBg) {
      heroBg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    }
  };

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
