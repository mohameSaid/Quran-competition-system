import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ScoreService } from '../../../core/services/score.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { ExportService } from '../../../core/services/export.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { MedalComponent } from '../../../shared/components/medal/medal.component';
import { GradePipe } from '../../../shared/pipes/grade.pipe';
import { Score } from '../../../core/models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatDialogModule, LoadingSpinnerComponent, EmptyStateComponent,
    MedalComponent, GradePipe,
  ],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">نتائج وترتيب المتسابقين</div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="exportExcel()" [disabled]="allScores().length === 0">
            <mat-icon>file_download</mat-icon> Excel
          </button>
          <button mat-flat-button
            [class.btn-gold]="!isPublished()"
            [class.btn-danger]="isPublished()"
            (click)="togglePublish()">
            <mat-icon>{{ isPublished() ? 'visibility_off' : 'publish' }}</mat-icon>
            {{ isPublished() ? 'إخفاء النتائج' : 'نشر للعموم' }}
          </button>
        </div>
      </div>

      @if (isPublished()) {
        <div class="banner banner--published">
          <mat-icon>check_circle</mat-icon>
          النتائج منشورة وظاهرة للعموم — {{ publishedAt() }}
        </div>
      } @else {
        <div class="banner banner--draft">
          <mat-icon>lock</mat-icon>
          النتائج مسودة — غير مرئية للعموم بعد
        </div>
      }

      @if (loading()) {
        <app-loading-spinner message="جاري تحميل النتائج..." />
      } @else if (allScores().length === 0) {
        <app-empty-state icon="leaderboard" message="لا توجد درجات مسجّلة بعد" />
      } @else {
        <div class="qc-table-wrap">
          <table class="qc-table">
            <thead>
              <tr>
                <th style="width:60px;text-align:center">الترتيب</th>
                <th>اسم المتسابق</th>
                <th style="text-align:center">الحفظ/40</th>
                <th style="text-align:center">التجويد/30</th>
                <th style="text-align:center">الأداء/20</th>
                <th style="text-align:center">الوقف/10</th>
                <th style="text-align:center">تجويد (تكريم)</th>
                <th style="text-align:center">المجموع</th>
                <th>التقدير</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              @for (s of sortedScores(); track s.id; let i = $index) {
                <tr [class.champion-row]="i === 0">
                  <td style="text-align:center">
                    <div style="display:flex;justify-content:center">
                      <app-medal [rank]="i + 1" />
                    </div>
                  </td>
                  <td>
                    <strong>{{ s.studentName }}</strong>
                    @if (s.system === 'questions10') { <span style="font-size:10px;color:var(--text-muted);background:rgba(212,168,67,.12);padding:1px 6px;border-radius:8px;margin-right:5px">10 أسئلة</span> }
                  </td>
                  <td style="text-align:center;font-weight:600">{{ s.breakdown?.hifz ?? '—' }}</td>
                  <td style="text-align:center;font-weight:600">{{ s.breakdown?.tajweed ?? '—' }}</td>
                  <td style="text-align:center;font-weight:600">{{ s.breakdown?.ada ?? '—' }}</td>
                  <td style="text-align:center;font-weight:600">{{ s.breakdown?.waqf ?? '—' }}</td>
                  <td style="text-align:center;font-weight:600;color:var(--blue,#4a90d9)">{{ s.tajweedScore ?? '—' }}</td>
                  <td style="text-align:center">
                    <strong style="font-size:17px;color:var(--gold-light)">{{ s.total }}</strong>
                  </td>
                  <td>
                    <span class="badge"
                      [class.badge--gold]="s.total >= 90"
                      [class.badge--green]="s.total >= 70 && s.total < 90"
                      [class.badge--blue]="s.total >= 60 && s.total < 70"
                      [class.badge--red]="s.total < 60">
                      {{ s.total | grade }}
                    </span>
                  </td>
                  <td>
                    @if (s.isPublished) {
                      <span class="badge badge--green">منشور</span>
                    } @else {
                      <span class="badge badge--gray">مسودة</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .banner { display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:var(--r-sm);margin-bottom:20px;font-weight:600;font-size:14px;
      &--published{background:rgba(45,212,160,.1);border:1px solid rgba(45,212,160,.3);color:var(--green);}
      &--draft    {background:rgba(90,107,138,.12);border:1px solid var(--border-primary);color:var(--text-muted);}
    }
    .champion-row td { background:rgba(212,168,67,.04) !important; }
  `]
})
export class ResultsComponent implements OnInit {
  private scoreSvc       = inject(ScoreService);
  private competitionSvc = inject(CompetitionService);
  private exportSvc      = inject(ExportService);
  private snack          = inject(MatSnackBar);
  private dialog         = inject(MatDialog);

  allScores   = signal<Score[]>([]);
  loading     = signal(true);
  isPublished = signal(false);
  publishedAt = signal('');

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    this.scoreSvc.getAll(this.compId).subscribe(list => {
      this.allScores.set(list);
      this.loading.set(false);
    });
    this.competitionSvc.getById(this.compId).subscribe(c => {
      if (c) this.isPublished.set(c.resultsPublished);
    });
  }

  sortedScores(): Score[] {
    return [...this.allScores()].sort((a, b) => b.total - a.total);
  }

  async togglePublish(): Promise<void> {
    if (this.isPublished()) {
      this.snack.open('لإخفاء النتائج عدّل resultsPublished مباشرة في Firestore', '', { duration: 5000 });
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'نشر النتائج', message: 'سيتمكن الجميع من رؤية النتائج. هل أنت متأكد؟', danger: false }
    });
    ref.afterClosed().subscribe(async ok => {
      if (!ok) return;
      await this.scoreSvc.publishAll(this.compId);
      this.isPublished.set(true);
      this.publishedAt.set(new Date().toLocaleString('ar-SA'));
      this.snack.open('✅ تم نشر النتائج بنجاح!', '', { duration: 4000 });
    });
  }

  exportExcel(): void {
    this.exportSvc.exportScores(this.allScores());
    this.snack.open('📊 جاري التصدير...', '', { duration: 2000 });
  }
}
