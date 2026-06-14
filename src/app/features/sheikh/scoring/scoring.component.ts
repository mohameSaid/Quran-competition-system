import { Component, inject, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ScoreService } from '../../../core/services/score.service';
import { StudentService } from '../../../core/services/student.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { GradePipe } from '../../../shared/pipes/grade.pipe';
import { CategoryLabelPipe } from '../../../shared/pipes/category-label.pipe';
import { Student, ScoreBreakdown, SCORE_MAX } from '../../../core/models';

interface Criterion { key: keyof ScoreBreakdown; label: string; max: number; desc: string; color: string; }

@Component({
  selector: 'app-scoring',
  standalone: true,
  inputs: ['studentId'],
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, LoadingSpinnerComponent, GradePipe, CategoryLabelPipe],
  template: `
    <div class="page-wrap">
      <button mat-button (click)="back()" style="color:var(--text-secondary);margin-bottom:14px">
        <mat-icon>arrow_forward</mat-icon> العودة لقائمة الانتظار
      </button>

      @if (loading()) {
        <app-loading-spinner message="جاري تحميل بيانات المتسابق..." />
      } @else if (!student()) {
        <div style="text-align:center;padding:48px;color:var(--red)">
          <mat-icon style="font-size:48px">error_outline</mat-icon>
          <p style="margin-top:12px">لم يُعثر على بيانات المتسابق</p>
        </div>
      } @else {
        <div class="scoring-layout">
          <!-- Left: student info + total -->
          <div class="qc-card info-card">
            <div class="s-av">{{ student()!.fullName.charAt(0) }}</div>
            <div class="s-name">{{ student()!.fullName }}</div>
            <div class="s-cat">{{ student()!.category | categoryLabel }}</div>
            <div class="s-juz">{{ student()!.juzCount }} جزء محفوظ</div>
            <div class="s-sheikh">المحفّظ: {{ student()!.memorizerName || student()!.sheikhName }}</div>

            <!-- SVG ring -->
            <svg viewBox="0 0 120 120" width="130" height="130" style="margin:12px 0">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-primary)" stroke-width="9"/>
              <circle cx="60" cy="60" r="50" fill="none"
                [attr.stroke]="totalColor()"
                stroke-width="9"
                [attr.stroke-dasharray]="314"
                [attr.stroke-dashoffset]="314 - (total() / 100) * 314"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
                style="transition:stroke-dashoffset .35s ease"/>
              <text x="60" y="57" text-anchor="middle" font-size="27" font-weight="700"
                [attr.fill]="totalColor()" font-family="Cairo">{{ total() }}</text>
              <text x="60" y="73" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-family="Cairo">من 100</text>
            </svg>
            <div class="total-grade" [style.color]="totalColor()">{{ total() | grade }}</div>

            <!-- Mini bars -->
            <div style="width:100%;margin-top:12px;display:flex;flex-direction:column;gap:7px">
              @for (c of criteria; track c.key) {
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:3px">
                    <span>{{ c.label }}</span>
                    <span [style.color]="c.color">{{ scores[c.key] }}/{{ c.max }}</span>
                  </div>
                  <div style="height:4px;background:var(--border-primary);border-radius:2px;overflow:hidden">
                    <div [style.width.%]="scores[c.key]/c.max*100" [style.background]="c.color" style="height:100%;border-radius:2px;transition:width .3s"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right: scoring form -->
          <div style="display:flex;flex-direction:column;gap:14px">
            @for (c of criteria; track c.key) {
              <div class="criterion-card">
                <div class="crit-head">
                  <div>
                    <div class="crit-label">{{ c.label }}</div>
                    <div class="crit-desc">{{ c.desc }}</div>
                  </div>
                  <div class="crit-score" [style.color]="c.color">
                    <span style="font-size:30px;font-weight:700">{{ scores[c.key] }}</span>
                    <span style="font-size:13px;color:var(--text-muted)">/{{ c.max }}</span>
                  </div>
                </div>

                <!-- Percentage quick select -->
                <div class="quick-pct">
                  @for (pct of pcts; track pct) {
                    <button class="pct-btn" [class.active]="isPct(c, pct)" (click)="setPct(c, pct)">{{ pct }}%</button>
                  }
                </div>

                <!-- Fine-tune -->
                <div class="fine-row">
                  <button class="tune" (click)="adj(c, -1)" [disabled]="scores[c.key] <= 0">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <div class="tune-track">
                    <div class="tune-fill" [style.width.%]="scores[c.key]/c.max*100" [style.background]="c.color"></div>
                  </div>
                  <button class="tune" (click)="adj(c, 1)" [disabled]="scores[c.key] >= c.max">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
              </div>
            }

            <!-- Notes -->
            <div class="qc-card">
              <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ملاحظات (اختياري)</div>
              <textarea [(ngModel)]="notes" class="notes-ta" rows="3"
                placeholder="أي ملاحظات على الأداء..."></textarea>
            </div>

            <!-- Error -->
            @if (submitError()) {
              <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(232,85,85,.12);border:1px solid rgba(232,85,85,.3);border-radius:var(--r-sm);color:var(--red);font-size:13px">
                <mat-icon>error_outline</mat-icon> {{ submitError() }}
              </div>
            }

            <!-- Actions -->
            <div style="display:flex;gap:10px">
              <button mat-flat-button class="btn-gold" style="flex:2;height:48px;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px" (click)="submit()" [disabled]="submitting()">
                @if (submitting()) { <mat-icon style="animation:spin 1s linear infinite">autorenew</mat-icon> }
                @else { <mat-icon>check_circle</mat-icon> }
                حفظ التقييم
              </button>
              <button mat-stroked-button style="flex:1;height:48px;font-family:Cairo,sans-serif" (click)="back()">إلغاء</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .scoring-layout { display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start; }
    .info-card      { text-align:center;position:sticky;top:80px;display:flex;flex-direction:column;align-items:center; }
    .s-av     { width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#0a0f1a;margin-bottom:12px; }
    .s-name   { font-size:18px;font-weight:700;color:var(--gold-light); }
    .s-cat    { font-size:13px;color:var(--text-muted);margin-top:3px; }
    .s-juz    { font-size:12px;color:var(--text-secondary);margin-top:2px; }
    .s-sheikh { font-size:12px;color:var(--text-muted);margin-top:2px; }
    .total-grade { font-size:15px;font-weight:700; }
    .criterion-card { background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-md);padding:18px 20px;transition:border-color .2s;&:focus-within{border-color:rgba(212,168,67,.4);} }
    .crit-head  { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:13px; }
    .crit-label { font-size:15px;font-weight:700;margin-bottom:3px; }
    .crit-desc  { font-size:12px;color:var(--text-muted); }
    .crit-score { text-align:center; }
    .quick-pct  { display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap; }
    .pct-btn    { padding:5px 11px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid var(--border-primary);background:none;color:var(--text-secondary);transition:all .15s;font-family:'Cairo',sans-serif;
      &.active{background:rgba(212,168,67,.15);border-color:var(--gold);color:var(--gold-light);}
      &:hover:not(.active){border-color:var(--border-accent);color:var(--text-primary);}
    }
    .fine-row  { display:flex;align-items:center;gap:10px; }
    .tune      { width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border-primary);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);transition:all .18s;flex-shrink:0;
      &:hover:not(:disabled){border-color:var(--gold);color:var(--gold-light);}
      &:disabled{opacity:.3;cursor:not-allowed;}
      mat-icon{font-size:18px;}
    }
    .tune-track { flex:1;height:7px;background:var(--bg-secondary);border-radius:4px;overflow:hidden; }
    .tune-fill  { height:100%;border-radius:4px;transition:width .2s ease; }
    .notes-ta   { width:100%;background:var(--bg-secondary);border:1.5px solid var(--border-primary);border-radius:var(--r-sm);padding:10px 13px;color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;outline:none;resize:vertical;transition:border-color .2s;&:focus{border-color:var(--gold);}&::placeholder{color:var(--text-muted);} }
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    @media(max-width:900px){.scoring-layout{grid-template-columns:1fr;}.info-card{position:static;}}
  `]
})
export class ScoringComponent implements OnInit {
  private scoreSvc       = inject(ScoreService);
  private studentSvc     = inject(StudentService);
  private competitionSvc = inject(CompetitionService);
  private auth           = inject(AuthService);
  private router         = inject(Router);
  private snack          = inject(MatSnackBar);

  studentId   = '';
  student     = signal<Student | null>(null);
  loading     = signal(true);
  submitting  = signal(false);
  submitError = signal('');
  notes       = '';
  pcts        = [0, 25, 50, 60, 70, 80, 90, 100];

  scores: ScoreBreakdown = { hifz: 35, tajweed: 25, ada: 17, waqf: 8 };

  criteria: Criterion[] = [
    { key:'hifz',    label:'الحفظ والاسترسال', max:40, desc:'مستوى الحفظ والطلاقة وعدم التوقف', color:'var(--gold)' },
    { key:'tajweed', label:'أحكام التجويد',    max:30, desc:'تطبيق أحكام التجويد والمخارج',     color:'var(--blue)' },
    { key:'ada',     label:'جمال الصوت والأداء',max:20,desc:'حسن الصوت وجودة الأداء',           color:'var(--green)' },
    { key:'waqf',    label:'الوقف والابتداء',  max:10, desc:'صحة مواضع الوقف والابتداء',        color:'var(--purple)' },
  ];

  total = computed(() => this.scores.hifz + this.scores.tajweed + this.scores.ada + this.scores.waqf);

  totalColor(): string {
    const t = this.total();
    if (t >= 90) return 'var(--gold)';
    if (t >= 70) return 'var(--green)';
    if (t >= 60) return 'var(--blue)';
    return 'var(--red)';
  }

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    if (!this.studentId) { this.loading.set(false); return; }
    this.studentSvc.getById(this.compId, this.studentId).subscribe(s => {
      this.student.set(s ?? null);
      this.loading.set(false);
    });
  }

  isPct(c: Criterion, pct: number): boolean {
    return this.scores[c.key] === Math.round(pct / 100 * c.max);
  }

  setPct(c: Criterion, pct: number): void {
    this.scores = { ...this.scores, [c.key]: Math.round(pct / 100 * c.max) };
  }

  adj(c: Criterion, delta: number): void {
    const newVal = Math.max(0, Math.min(c.max, this.scores[c.key] + delta));
    this.scores = { ...this.scores, [c.key]: newVal };
  }

  async submit(): Promise<void> {
    const s = this.student();
    if (!s) return;
    this.submitting.set(true); this.submitError.set('');
    try {
      await this.scoreSvc.submit(
        this.compId, s.id, s.fullName,
        s.sessionId ?? '',
        this.auth.currentUser()?.sheikhId ?? '',
        this.scores, this.notes,
        this.auth.currentUser()?.uid ?? '',
      );
      this.snack.open(`✅ تم حفظ تقييم ${s.fullName}: ${this.total()}/100`, '', { duration: 4000 });
      this.router.navigate(['/sheikh/queue']);
    } catch (e: any) {
      this.submitError.set(e?.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      this.submitting.set(false);
    }
  }

  back(): void { this.router.navigate(['/sheikh/queue']); }
}
