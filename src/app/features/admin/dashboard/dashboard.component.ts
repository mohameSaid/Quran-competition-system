import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StudentService } from '../../../core/services/student.service';
import { SessionService } from '../../../core/services/session.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { Student, ExamSession } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="page-wrap">
      <div class="stats-grid">
        <div class="stat-card stat-card--gold">
          <div class="stat-card__label"><mat-icon style="font-size:15px">group</mat-icon> إجمالي المسجلين</div>
          <div class="stat-card__value">{{ students().length }}</div>
          <div class="stat-card__sub">متسابق مسجّل</div>
        </div>
        <div class="stat-card stat-card--green">
          <div class="stat-card__label"><mat-icon style="font-size:15px">check_circle</mat-icon> مكتمل التقييم</div>
          <div class="stat-card__value">{{ evaluated() }}</div>
          <div class="stat-card__sub">{{ evaluatedPct() }}% من المسجلين</div>
        </div>
        <div class="stat-card stat-card--blue">
          <div class="stat-card__label"><mat-icon style="font-size:15px">pending</mat-icon> قيد الانتظار</div>
          <div class="stat-card__value">{{ pending() }}</div>
          <div class="stat-card__sub">لم يُقيَّموا بعد</div>
        </div>
        <div class="stat-card stat-card--purple">
          <div class="stat-card__label"><mat-icon style="font-size:15px">event_note</mat-icon> الجلسات</div>
          <div class="stat-card__value">{{ sessions().length }}</div>
          <div class="stat-card__sub">إجمالي الجلسات</div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="qc-card">
          <div class="section-header"><div class="section-title">إجراءات سريعة</div></div>
          <div class="quick-actions">
            <a routerLink="/admin/students" class="qa qa--gold"><mat-icon>person_add</mat-icon><span>إضافة متسابق</span></a>
            <a routerLink="/admin/sheikhs"  class="qa qa--blue"><mat-icon>record_voice_over</mat-icon><span>إضافة محكّم</span></a>
            <a routerLink="/admin/sessions" class="qa qa--green"><mat-icon>add_circle</mat-icon><span>جلسة جديدة</span></a>
            <a routerLink="/admin/results"  class="qa qa--purple"><mat-icon>publish</mat-icon><span>نشر النتائج</span></a>
          </div>
        </div>

        <div class="qc-card">
          <div class="section-header"><div class="section-title">توزيع الفئات</div></div>
          <div class="cat-dist">
            @for (c of categoryDist(); track c.key) {
              <div class="cat-dist-item">
                <div class="cat-dist-lbl">
                  <span>{{ c.label }}</span><strong>{{ c.count }}</strong>
                </div>
                <div class="cat-dist-track">
                  <div class="cat-dist-fill" [style.width.%]="students().length ? c.count / students().length * 100 : 0" [style.background]="c.color"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="qc-card">
          <div class="section-header">
            <div class="section-title">جلسات اليوم</div>
            <a routerLink="/admin/sessions" style="font-size:12px;color:var(--gold)">عرض الكل</a>
          </div>
          @if (todaySessions().length === 0) {
            <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:24px">لا توجد جلسات اليوم</p>
          }
          @for (s of todaySessions(); track s.id) {
            <div class="session-row">
              <div class="session-dot" [style.background]="s.status === 'active' ? 'var(--green)' : 'var(--blue)'"></div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600">{{ s.name }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ s.sheikhName }} • {{ s.startTime }}</div>
                <div class="progress-bar" style="margin-top:5px">
                  <div class="progress-bar__fill" [style.width.%]="s.studentIds.length / s.capacity * 100"></div>
                </div>
              </div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary)">{{ s.studentIds.length }}/{{ s.capacity }}</div>
            </div>
          }
        </div>

        <div class="qc-card">
          <div class="section-header">
            <div class="section-title">آخر التسجيلات</div>
            <a routerLink="/admin/students" style="font-size:12px;color:var(--gold)">عرض الكل</a>
          </div>
          @if (recentStudents().length === 0) {
            <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:24px">لا يوجد متسابقون بعد</p>
          }
          @for (s of recentStudents(); track s.id) {
            <div class="recent-row">
              <div class="recent-dot"></div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600">{{ s.fullName }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ s.juzCount }} جزء · {{ s.parentPhone }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dash-grid  { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
    .quick-actions { display:flex;flex-direction:column;gap:8px; }
    .qa { display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;font-size:14px;font-weight:500;text-decoration:none;transition:all .18s;
      mat-icon{font-size:20px;}
      &--gold  {background:rgba(212,168,67,.1);color:var(--gold-light);&:hover{background:rgba(212,168,67,.18);}}
      &--blue  {background:rgba(74,159,245,.1);color:var(--blue);&:hover{background:rgba(74,159,245,.18);}}
      &--green {background:rgba(45,212,160,.1);color:var(--green);&:hover{background:rgba(45,212,160,.18);}}
      &--purple{background:rgba(139,108,245,.1);color:var(--purple);&:hover{background:rgba(139,108,245,.18);}}
    }
    .cat-dist      { display:flex;flex-direction:column;gap:12px; }
    .cat-dist-lbl  { display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;color:var(--text-secondary);strong{color:var(--text-primary);} }
    .cat-dist-track{ height:7px;background:var(--bg-secondary);border-radius:4px;overflow:hidden; }
    .cat-dist-fill { height:100%;border-radius:4px;transition:width .5s ease; }
    .session-row   { display:flex;align-items:center;gap:11px;margin-bottom:12px;&:last-child{margin-bottom:0;} }
    .session-dot   { width:9px;height:9px;border-radius:50%;flex-shrink:0; }
    .recent-row    { display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(42,54,80,.4);&:last-child{border-bottom:none;} }
    .recent-dot    { width:7px;height:7px;border-radius:50%;background:var(--primary);margin-top:5px;flex-shrink:0; }
    @media(max-width:900px){.dash-grid{grid-template-columns:1fr;}}
  `]
})
export class DashboardComponent implements OnInit {
  private studentSvc     = inject(StudentService);
  private sessionSvc     = inject(SessionService);
  private competitionSvc = inject(CompetitionService);

  students   = signal<Student[]>([]);
  sessions   = signal<ExamSession[]>([]);

  evaluated    = signal(0);
  pending      = signal(0);
  evaluatedPct = signal(0);

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    this.studentSvc.getAll(this.compId).subscribe(list => {
      this.students.set(list);
      const ev = list.filter(s => s.status === 'evaluated' || s.status === 'published').length;
      this.evaluated.set(ev);
      this.pending.set(list.filter(s => s.status === 'pending').length);
      this.evaluatedPct.set(list.length ? Math.round(ev / list.length * 100) : 0);
    });
    this.sessionSvc.getAll(this.compId).subscribe(s => this.sessions.set(s));
  }

  recentStudents() {
    return this.students().slice(0, 8);
  }

  todaySessions() {
    const today = new Date().toDateString();
    return this.sessions().filter(s => {
      const d = s.date instanceof Date ? s.date : (s.date as { toDate?: () => Date }).toDate?.() ?? new Date(s.date as unknown as string);
      return d.toDateString() === today;
    });
  }

  categoryDist() {
    const counts: Record<string, number> = {};
    this.students().forEach(s => { counts[s.category] = (counts[s.category] ?? 0) + 1; });
    return [
      { key:'full30', label:'الحفظ الكامل', count: counts['full30'] ?? 0, color:'var(--gold)'   },
      { key:'half15', label:'15 جزء',        count: counts['half15'] ?? 0, color:'var(--green)'  },
      { key:'ten10',  label:'10 أجزاء',      count: counts['ten10']  ?? 0, color:'var(--blue)'   },
      { key:'five5',  label:'5 أجزاء',       count: counts['five5']  ?? 0, color:'var(--purple)' },
    ];
  }
}
