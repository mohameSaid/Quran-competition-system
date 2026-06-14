import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentService } from '../../../core/services/student.service';
import { ScoreService } from '../../../core/services/score.service';
import { ExportService } from '../../../core/services/export.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Score, Student } from '../../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-wrap">
      <div class="section-header"><div class="section-title">التقارير والتصدير</div></div>

      <div class="reports-grid">
        @for (r of reportCards; track r.id) {
          <div class="report-card" (click)="generate(r)">
            <div class="report-card__icon">{{ r.icon }}</div>
            <div class="report-card__title">{{ r.title }}</div>
            <div class="report-card__desc">{{ r.desc }}</div>
            <div class="report-card__tags">
              @for (t of r.tags; track t) {
                <span class="badge badge--{{ t.color }}" style="font-size:10px">{{ t.label }}</span>
              }
            </div>
            <button mat-stroked-button style="width:100%;margin-top:auto;font-family:Cairo,sans-serif;font-size:13px" (click)="$event.stopPropagation();generate(r)">
              <mat-icon>download</mat-icon> تنزيل
            </button>
          </div>
        }
      </div>

      <div class="qc-card" style="margin-top:24px">
        <div class="section-header"><div class="section-title">ملخص إحصائي</div></div>
        @if (statsLoading()) {
          <app-loading-spinner [diameter]="32" />
        } @else {
          <div class="stats-summary">
            <div class="sum-item"><div class="sum-val">{{ stats().total }}</div><div class="sum-lbl">إجمالي المتسابقين</div></div>
            <div class="sum-item"><div class="sum-val" style="color:var(--green)">{{ stats().evaluated }}</div><div class="sum-lbl">مُقيَّمون</div></div>
            <div class="sum-item"><div class="sum-val" style="color:var(--gold-light)">{{ stats().highest }}</div><div class="sum-lbl">أعلى درجة</div></div>
            <div class="sum-item"><div class="sum-val" style="color:var(--blue)">{{ stats().average }}</div><div class="sum-lbl">المتوسط العام</div></div>
            <div class="sum-item"><div class="sum-val" style="color:var(--red)">{{ stats().lowest }}</div><div class="sum-lbl">أدنى درجة</div></div>
            <div class="sum-item"><div class="sum-val" style="color:var(--purple)">{{ stats().passPct }}%</div><div class="sum-lbl">نسبة النجاح (60+)</div></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .reports-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px; }
    .report-card  { background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-md);padding:20px;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:all .2s;
      &:hover{border-color:rgba(212,168,67,.4);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.3);}
      &__icon { font-size:34px; }
      &__title{ font-size:14px;font-weight:700; }
      &__desc { font-size:12px;color:var(--text-muted);flex:1; }
      &__tags { display:flex;gap:5px;flex-wrap:wrap; }
    }
    .stats-summary { display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px; }
    .sum-item { text-align:center;padding:14px;background:var(--bg-secondary);border-radius:var(--r-sm); }
    .sum-val  { font-size:24px;font-weight:700;color:var(--gold-light); }
    .sum-lbl  { font-size:11px;color:var(--text-muted);margin-top:4px; }
  `]
})
export class ReportsComponent implements OnInit {
  private studentSvc     = inject(StudentService);
  private scoreSvc       = inject(ScoreService);
  private exportSvc      = inject(ExportService);
  private competitionSvc = inject(CompetitionService);
  private snack          = inject(MatSnackBar);

  statsLoading = signal(true);
  stats        = signal({ total:0, evaluated:0, highest:0, average:0, lowest:0, passPct:0 });

  students = signal<Student[]>([]);
  scores   = signal<Score[]>([]);

  reportCards = [
    { id: 1, icon: '📊', title: 'تقرير النتائج الكامل', desc: 'جميع الدرجات مرتبة', tags: [{ label: 'Excel', color: 'green' }] },
    { id: 2, icon: '👥', title: 'بيانات المتسابقين', desc: 'الأسماء والهواتف والفئات', tags: [{ label: 'Excel', color: 'blue' }] },
    { id: 3, icon: '🏆', title: 'قائمة الفائزين', desc: 'أوائل كل فئة', tags: [{ label: 'Excel', color: 'gold' }] },
  ];

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    this.studentSvc.getAll(this.compId).subscribe(s => this.students.set(s));

    this.scoreSvc.getAll(this.compId).subscribe(scores => {
      this.scores.set(scores);
      const totals = scores.map(s => s.total);
      this.stats.set({
        total:     this.students().length || scores.length,
        evaluated: scores.length,
        highest:   totals.length ? Math.max(...totals) : 0,
        average:   totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
        lowest:    totals.length ? Math.min(...totals) : 0,
        passPct:   totals.length ? Math.round(totals.filter(t => t >= 60).length / totals.length * 100) : 0,
      });
      this.statsLoading.set(false);
    });
  }

  async generate(r: { id: number; title: string }): Promise<void> {
    try {
      if (r.id === 1) {
        if (!this.scores().length) throw new Error('لا توجد درجات للتصدير');
        await this.exportSvc.exportScores(this.scores(), 'results');
      } else if (r.id === 2) {
        if (!this.students().length) throw new Error('لا توجد بيانات متسابقين');
        await this.exportSvc.exportStudents(this.students(), 'students');
      } else if (r.id === 3) {
        const top = [...this.scores()].sort((a, b) => b.total - a.total).slice(0, 20);
        if (!top.length) throw new Error('لا توجد نتائج للفائزين');
        await this.exportSvc.exportScores(top, 'winners');
      }
      this.snack.open(`تم تنزيل: ${r.title}`, '', { duration: 3000 });
    } catch (e: unknown) {
      this.snack.open(e instanceof Error ? e.message : 'فشل التصدير', '', { duration: 4000 });
    }
  }
}
