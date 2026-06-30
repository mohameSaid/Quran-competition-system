import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentService } from '../../../core/services/student.service';
import { SessionService } from '../../../core/services/session.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CategoryLabelPipe } from '../../../shared/pipes/category-label.pipe';
import { Student, ExamSession, StudentStatusEnum } from '../../../core/models';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, LoadingSpinnerComponent, EmptyStateComponent, CategoryLabelPipe],
  template: `
    <div class="page-wrap">
      <!-- Welcome -->
      <div class="welcome-bar">
        <div class="w-av">{{ auth.currentUser()?.displayName?.charAt(0) ?? 'ش' }}</div>
        <div>
          <div style="font-size:16px;font-weight:700">مرحباً، {{ auth.currentUser()?.displayName ?? 'الشيخ' }}</div>
          <div style="font-size:12px;color:var(--text-muted)">{{ todaySession()?.name ?? 'لا توجد جلسة اليوم' }} — {{ today }}</div>
        </div>
        <span class="ready-chip"><mat-icon style="font-size:14px">check_circle</mat-icon> جاهز</span>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card stat-card--gold"><div class="stat-card__label">في الانتظار</div><div class="stat-card__value">{{ waiting().length }}</div></div>
        <div class="stat-card stat-card--green"><div class="stat-card__label">مكتملون اليوم</div><div class="stat-card__value">{{ done().length }}</div></div>
        <div class="stat-card stat-card--blue"><div class="stat-card__label">إجمالي الجلسة</div><div class="stat-card__value">{{ students().length }}</div></div>
      </div>

      <!-- اختيار مباشر بالرقم القومي -->
      <div class="nid-search">
        <mat-icon>badge</mat-icon>
        <input class="nid-input" [(ngModel)]="searchNid" dir="ltr" maxlength="14" inputmode="numeric"
               placeholder="بحث مباشر بالرقم القومي (14 رقماً)" (keyup.enter)="lookupByNid()" />
        <button mat-flat-button class="btn-gold" (click)="lookupByNid()" [disabled]="searching()">
          <mat-icon>search</mat-icon> فتح التقييم
        </button>
      </div>

        <!-- ── الحارس: متسابق مُقيَّم بالفعل — لا يُعاد تقييمه ── -->
      @if (evaluatedFound  ) {
        <div class="qc-card already-scored-card">
          <mat-icon style="font-size:48px;color:var(--green)">verified</mat-icon>
          <div class="s-name" style="margin-top:10px">{{evaluatedFound!.fullName }}</div>
          <p style="color:var(--text-muted);margin-top:6px">
            تم تقييم هذا المتسابق مسبقاً ولا يمكن إعادة رصد الدرجة له.
          </p>
        
          <button mat-stroked-button style="margin-top:16px" (click)="evaluatedFound=undefined">
            <mat-icon>person_search</mat-icon> البحث عن متسابق آخر
          </button>
        </div>
      }

      <div class="queue-layout">
        <!-- Queue list -->
        <div class="qc-card">
          <div class="section-header">
            <div class="section-title">قائمة الانتظار</div>
            <span style="font-size:12px;color:var(--text-muted)">اضغط لاستدعاء المتسابق</span>
          </div>
          @if (loading()) { <app-loading-spinner message="جاري التحميل..." /> }
          @else if (waiting().length === 0 && done().length === 0) {
            <app-empty-state icon="people_outline" message="لا يوجد متسابقون في هذه الجلسة" />
          } @else if (waiting().length === 0) {
            <div style="text-align:center;padding:32px;color:var(--green)">
              <mat-icon style="font-size:48px;display:block;margin-bottom:10px">done_all</mat-icon>
              تم الانتهاء من جميع المتسابقين 🎉
            </div>
          } @else {
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (s of waiting(); track s.id; let i = $index) {
                <div class="q-item" [class.active]="calledId() === s.id" (click)="call(s)">
                  <div class="q-num">{{ i + 1 }}</div>
                  <div class="q-av">{{ s.fullName.charAt(0) }}</div>
                  <div style="flex:1">
                    <div style="font-size:14px;font-weight:600">{{ s.fullName }}</div>
                    <div style="font-size:11px;color:var(--text-muted)">{{ s.category | categoryLabel }} • {{ s.juzCount }} جزء</div>
                  </div>
                  @if (calledId() === s.id) {
                    <span class="called-chip">مُستدعى ▶</span>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Action panel -->
        <div style="display:flex;flex-direction:column;gap:14px">
          <!-- Called student card -->
          @if (calledStudent()) {
            <div class="called-card">
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.5px;margin-bottom:14px">المتسابق الحالي</div>
              <div class="called-av">{{ calledStudent()!.fullName.charAt(0) }}</div>
              <div class="called-name">{{ calledStudent()!.fullName }}</div>
              <div class="called-cat">{{ calledStudent()!.category | categoryLabel }}</div>
              <div class="called-juz">{{ calledStudent()!.juzCount }} جزء محفوظ</div>
              <div style="display:flex;flex-direction:column;gap:8px;width:100%">
                <button mat-flat-button class="btn-gold" style="height:44px;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px" (click)="startScoring()">
                  <mat-icon>grading</mat-icon> بدء التقييم
                </button>
                <button mat-stroked-button style="height:38px;font-size:13px;font-family:Cairo,sans-serif" (click)="skip()">
                  <mat-icon>skip_next</mat-icon> تأجيل لنهاية القائمة
                </button>
              </div>
            </div>
          } @else if (waiting().length > 0) {
            <div class="no-call-card">
              <mat-icon style="font-size:40px;opacity:.2">touch_app</mat-icon>
              <p>اختر متسابقاً من القائمة للبدء</p>
            </div>
          }

          <!-- Done list -->
          <div class="qc-card">
            <div class="section-header"><div class="section-title">مكتملو التقييم</div></div>
            @if (done().length === 0) {
              <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:16px">لا يوجد بعد</p>
            }
            @for (s of done(); track s.id) {
              <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(42,54,80,.4)">
                <div style="width:22px;height:22px;border-radius:50%;background:var(--green-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <mat-icon style="font-size:13px;color:#fff;width:13px;height:13px">check</mat-icon>
                </div>
                <div style="flex:1;font-size:13px">{{ s.fullName }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-bar { display:flex;align-items:center;gap:13px;padding:15px 18px;background:var(--bg-card);border:1px solid rgba(212,168,67,.3);border-radius:var(--r-md);margin-bottom:20px; }
    .nid-search { display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-md);margin-bottom:16px;
      mat-icon{color:var(--text-muted);} }
    .nid-input { flex:1;background:var(--bg-secondary);border:1.5px solid var(--border-primary);border-radius:30px;padding:9px 16px;color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:14px;outline:none;&:focus{border-color:var(--gold);} }
    .w-av        { width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#0a0f1a;flex-shrink:0; }
    .ready-chip  { display:flex;align-items:center;gap:6px;margin-right:auto;padding:6px 13px;background:rgba(45,212,160,.1);border:1px solid rgba(45,212,160,.25);border-radius:20px;font-size:12px;font-weight:600;color:var(--green); }
    .queue-layout{ display:grid;grid-template-columns:1fr 340px;gap:16px; }
    .q-item      { display:flex;align-items:center;gap:10px;padding:12px 13px;background:var(--bg-secondary);border:1.5px solid var(--border-primary);border-radius:var(--r-sm);cursor:pointer;transition:all .18s;
      &:hover,&.active{border-color:var(--gold);background:rgba(212,168,67,.05);}
    }
    .q-num  { width:26px;height:26px;border-radius:50%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text-muted);flex-shrink:0; }
    .q-av   { width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--blue-dark),var(--purple));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0; }
    .called-chip { font-size:11px;font-weight:600;color:var(--gold-light);background:rgba(212,168,67,.12);padding:4px 10px;border-radius:20px;white-space:nowrap; }
    .called-card { background:var(--bg-card);border:1px solid rgba(212,168,67,.3);border-radius:var(--r-md);padding:22px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .called-av   { width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#0a0f1a;margin-bottom:4px; }
    .called-name { font-size:17px;font-weight:700;color:var(--gold-light); }
    .called-cat  { font-size:13px;color:var(--text-muted); }
    .called-juz  { font-size:12px;color:var(--text-secondary);margin-bottom:10px; }
    .no-call-card{ background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-md);padding:40px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:10px; }
    @media(max-width:900px){.queue-layout{grid-template-columns:1fr;}}
  `]
})
export class QueueComponent implements OnInit {
  private studentSvc     = inject(StudentService);
  private sessionSvc     = inject(SessionService);
  private competitionSvc = inject(CompetitionService);
  auth                   = inject(AuthService);
  private router         = inject(Router);
  private snack          = inject(MatSnackBar);

  students     = signal<Student[]>([]);
  loading      = signal(true);
  calledId     = signal<string | null>(null);
  todaySession = signal<ExamSession | null>(null);
  searchNid    = '';
  searching    = signal(false);
  today        = new Date().toLocaleDateString('ar-SA', { weekday:'long', day:'numeric', month:'long' });
  evaluatedFound!:Student| undefined
  waiting() { return this.students().filter(s => s.status !== 'evaluated' && s.status !== 'published'); }
  done()    { return this.students().filter(s => s.status === 'evaluated' || s.status === 'published'); }
  calledStudent() { return this.students().find(s => s.id === this.calledId()) ?? null; }

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    const sheikhId = this.auth.currentUser()?.sheikhId ?? '';
    // Load today's session for this sheikh
    this.sessionSvc.getForSheikh(this.compId, sheikhId).subscribe(sessions => {
      const todayStr = new Date().toDateString();
      const session  = sessions.find(s => {
        const d = s.date instanceof Date ? s.date : (s.date as any).toDate?.() ?? new Date(s.date);
        return d.toDateString() === todayStr && (s.status === 'scheduled' || s.status === 'active');
      }) ?? null;
      this.todaySession.set(session);

      if (session) {
        // Load students assigned to this session
        this.studentSvc.getBySession(this.compId, session.id).subscribe(list => {
          this.students.set(list); this.loading.set(false);
        });
      } else {
        this.loading.set(false);
      }
    });
  }

  call(s: Student): void { this.calledId.set(s.id); }

  /** فتح تقييم متسابق مباشرةً بالرقم القومي (للمحكّم) — يتجاوز قائمة الجلسة */
  lookupByNid(): void {
    const id = this.searchNid.trim();
    if (!/^\d{14}$/.test(id)) {
      this.snack.open('أدخل رقماً قومياً صحيحاً (14 رقماً)', '', { duration: 3000 });
      return;
    }
    this.searching.set(true);
    this.studentSvc.getByNationalId(this.compId, id).pipe(take(1)).subscribe({
      next: (list) => {
        this.searching.set(false);
        const found = list[0];

        if (found.status== StudentStatusEnum.Evaluated) {
          this.evaluatedFound=found
           this.snack.open('تم تقييم هذا المتسابق بالفعل', '', { duration: 5000 });
          return;
        }

        if (!found) {
          this.snack.open('لم يُعثر على متسابق بهذا الرقم القومي', '', { duration: 3500 });
          return;
        }
        this.router.navigate(['/sheikh/scoring', found.id]);
      },
      error: () => {
        this.searching.set(false);
        this.snack.open('تعذّر البحث، حاول مرة أخرى', '', { duration: 3500 });
      },
    });
  }

  startScoring(): void {
    if (this.calledId()) this.router.navigate(['/sheikh/scoring', this.calledId()]);
  }

  skip(): void {
    const s = this.calledStudent();
    if (!s) return;
    const list = [...this.students()];
    const idx  = list.findIndex(x => x.id === s.id);
    list.splice(idx, 1);
    list.push(s);
    this.students.set(list);
    this.calledId.set(null);
    this.snack.open(`تم تأجيل ${s.fullName}`, '', { duration: 2000 });
  }
}
