import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuditService } from '../../../core/services/audit.service';
import { StudentService } from '../../../core/services/student.service';
import { ScoreService } from '../../../core/services/score.service';
import { ExportService } from '../../../core/services/export.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AuditLog, Score, Student } from '../../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, LoadingSpinnerComponent],
  template: `
    <div class="page-wrap">
      <div class="section-header"><div class="section-title">التقارير والتصدير</div></div>

      <!-- Report cards -->
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

      <!-- Stats summary (live from Firestore) -->
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

      <!-- Audit log -->
      <div class="qc-card" style="margin-top:16px">
        <div class="section-header">
          <div class="section-title">سجل العمليات (Audit Log)</div>
          <span style="font-size:12px;color:var(--text-muted)">آخر 50 عملية</span>
        </div>
        @if (auditLoading()) { <app-loading-spinner [diameter]="32" /> }
        @else if (auditLogs().length === 0) {
          <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:24px">لا توجد سجلات</p>
        } @else {
          <div class="audit-list">
            @for (log of auditLogs(); track log.id) {
              <div class="audit-item">
                <div class="audit-bullet"></div>
                <div style="flex:1">
                  <div style="font-size:13px">{{ log.action }}</div>
                  <div style="font-size:11px;color:var(--text-muted)">{{ log.userEmail }}</div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);white-space:nowrap">
                  {{ log.timestamp | date:'d/M HH:mm' }}
                </div>
              </div>
            }
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
    .audit-list { display:flex;flex-direction:column; }
    .audit-item { display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(42,54,80,.4);&:last-child{border-bottom:none;} }
    .audit-bullet { width:7px;height:7px;border-radius:50%;background:var(--gold);margin-top:5px;flex-shrink:0; }
  `]
})
export class ReportsComponent implements OnInit {
  private auditSvc       = inject(AuditService);
  private studentSvc     = inject(StudentService);
  private scoreSvc       = inject(ScoreService);
  private exportSvc      = inject(ExportService);
  private competitionSvc = inject(CompetitionService);
  private snack          = inject(MatSnackBar);

  auditLogs    = signal<AuditLog[]>([]);
  auditLoading = signal(true);
  statsLoading = signal(true);
  stats        = signal({ total:0, evaluated:0, highest:0, average:0, lowest:0, passPct:0 });

  reportCards = [
    { id:1, icon:'📊', title:'تقرير النتائج الكامل',   desc:'جميع الدرجات مرتبة', tags:[{label:'Excel',color:'green'}] },
    { id:2, icon:'👥', title:'بيانات المتسابقين',       desc:'الأسماء والهواتف والفئات', tags:[{label:'Excel',color:'blue'}] },
    { id:3, icon:'🏆', title:'قائمة الفائزين',          desc:'أوائل كل فئة للطباعة', tags:[{label:'مميز',color:'gold'}] },
    { id:4, icon:'📋', title:'سجل العمليات',            desc:'Audit log كامل', tags:[{label:'Excel',color:'green'}] },
  ];

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    this.auditSvc.getRecent(50).subscribe(l => { this.auditLogs.set(l); this.auditLoading.set(false); });

    this.scoreSvc.getAll(this.compId).subscribe(scores => {
      const totals = scores.map(s => s.total);
      this.stats.set({
        total:     scores.length,
        evaluated: scores.length,
        highest:   totals.length ? Math.max(...totals) : 0,
        average:   totals.length ? Math.round(totals.reduce((a,b) => a+b, 0) / totals.length) : 0,
        lowest:    totals.length ? Math.min(...totals) : 0,
        passPct:   totals.length ? Math.round(totals.filter(t => t >= 60).length / totals.length * 100) : 0,
      });
      this.statsLoading.set(false);
    });
  }

  generate(r: { title: string }): void {
    this.snack.open(`📥 جاري إنشاء: ${r.title}`, '', { duration: 3000 });
  }
}
