import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SessionService } from '../../../core/services/session.service';
import { SheikhService } from '../../../core/services/sheikh.service';
import { StudentService } from '../../../core/services/student.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CategoryLabelPipe } from '../../../shared/pipes/category-label.pipe';
import { ExamSession, Sheikh, Student, CATEGORY_LABELS, CompetitionCategory, SessionStatus } from '../../../core/models';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatProgressSpinnerModule, LoadingSpinnerComponent,
    EmptyStateComponent, CategoryLabelPipe,
  ],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">جلسات التقييم</div>
        <button mat-flat-button class="btn-gold" (click)="openForm()">
          <mat-icon>add</mat-icon> جلسة جديدة
        </button>
      </div>

      <!-- Status tabs -->
      <div class="status-tabs">
        @for (tab of tabs; track tab.key) {
          <button class="stab" [class.active]="activeTab === tab.key" (click)="activeTab = tab.key">
            {{ tab.label }}
            <span class="stab__count">{{ countByStatus(tab.key) }}</span>
          </button>
        }
      </div>

      @if (loading()) {
        <app-loading-spinner message="جاري تحميل الجلسات..." />
      } @else if (sessions().length === 0) {
        <app-empty-state icon="event_note" message="لا توجد جلسات بعد. أنشئ أول جلسة." />
      } @else {
        <div class="sessions-grid">
          @for (s of filteredSessions(); track s.id) {
            <div class="session-card" [ngClass]="'session-card--' + s.status">
              <div class="session-card__head">
                <div>
                  <div class="session-name">{{ s.name }}</div>
                  <div class="session-date">{{ s.date | date:'EEEE d MMMM':'':'ar' }}</div>
                </div>
                <span class="badge" [ngClass]="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
              </div>

              <div class="session-meta">
                <div class="meta-row"><mat-icon>person</mat-icon>{{ s.sheikhName }}</div>
                <div class="meta-row"><mat-icon>schedule</mat-icon>{{ s.startTime }} — {{ s.endTime }}</div>
                <div class="meta-row"><mat-icon>category</mat-icon>{{ s.category | categoryLabel }}</div>
              </div>

              <div class="session-progress">
                <div class="prog-lbl">
                  <span>المتسابقون</span>
                  <strong>{{ s.studentIds.length }} / {{ s.capacity }}</strong>
                </div>
                <div class="prog-track">
                  <div class="prog-fill" [style.width.%]="s.studentIds.length / s.capacity * 100"
                       [ngClass]="'prog-fill--' + s.status"></div>
                </div>
              </div>

              <div class="session-card__actions">
                <button mat-stroked-button style="flex:1;font-size:12px" (click)="openAssign(s)">
                  <mat-icon style="font-size:15px">group_add</mat-icon> المتسابقون
                </button>
                <button mat-stroked-button style="flex:1;font-size:12px" (click)="openForm(s)">
                  <mat-icon style="font-size:15px">edit</mat-icon> تعديل
                </button>
                @if (s.status === 'scheduled') {
                  <button mat-stroked-button style="font-size:12px;color:var(--green)" (click)="setStatus(s,'active')">
                    <mat-icon style="font-size:15px">play_arrow</mat-icon> بدء
                  </button>
                }
                @if (s.status === 'active') {
                  <button mat-stroked-button style="font-size:12px;color:var(--purple)" (click)="setStatus(s,'completed')">
                    <mat-icon style="font-size:15px">check</mat-icon> إتمام
                  </button>
                }
                <button mat-icon-button style="color:var(--red)" (click)="delete(s)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
          @if (filteredSessions().length === 0) {
            <app-empty-state icon="event_busy" message="لا توجد جلسات في هذه الحالة" />
          }
        </div>
      }

      <!-- Form overlay -->
      @if (showForm()) {
        <div class="form-overlay" (click)="closeForm()">
          <div class="form-sheet" (click)="$event.stopPropagation()">
            <div class="form-sheet__header">
              <h3>{{ editingId() ? 'تعديل الجلسة' : 'جلسة تقييم جديدة' }}</h3>
              <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>اسم الجلسة *</mat-label>
                <input matInput formControlName="name" placeholder="الجلسة الصباحية الأولى">
                @if (form.get('name')?.invalid && form.get('name')?.touched) {
                  <mat-error>اسم الجلسة مطلوب</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>المحكّم *</mat-label>
                <mat-select formControlName="sheikhId" (selectionChange)="onSheikhChange($event.value)">
                  @for (sh of sheikhs(); track sh.id) {
                    <mat-option [value]="sh.id">{{ sh.name }}</mat-option>
                  }
                </mat-select>
                @if (form.get('sheikhId')?.invalid && form.get('sheikhId')?.touched) {
                  <mat-error>اختر المحكّم</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>الفئة *</mat-label>
                <mat-select formControlName="category">
                  @for (c of categoryOptions; track c.key) {
                    <mat-option [value]="c.key">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>التاريخ *</mat-label>
                  <input matInput formControlName="date" type="date">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>الحد الأقصى للمتسابقين *</mat-label>
                  <input matInput formControlName="capacity" type="number" min="1" max="50">
                </mat-form-field>
              </div>

              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>وقت البدء *</mat-label>
                  <input matInput formControlName="startTime" type="time">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>وقت الانتهاء *</mat-label>
                  <input matInput formControlName="endTime" type="time">
                </mat-form-field>
              </div>

              @if (formError()) {
                <div class="error-box"><mat-icon>error_outline</mat-icon> {{ formError() }}</div>
              }

              <div style="display:flex;gap:10px;margin-top:8px">
                <button mat-flat-button type="submit" class="btn-gold" style="flex:1;height:44px;font-size:14px"
                        [disabled]="form.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
                  {{ editingId() ? 'حفظ التعديلات' : 'إنشاء الجلسة' }}
                </button>
                <button mat-stroked-button type="button" (click)="closeForm()" style="height:44px">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Assign students overlay -->
      @if (showAssign()) {
        <div class="form-overlay" (click)="closeAssign()">
          <div class="form-sheet assign-sheet" (click)="$event.stopPropagation()">
            <div class="form-sheet__header">
              <h3>متسابقو: {{ assigningSession()?.name }}</h3>
              <button mat-icon-button (click)="closeAssign()"><mat-icon>close</mat-icon></button>
            </div>

            @if (assignError()) {
              <div class="error-box"><mat-icon>error_outline</mat-icon> {{ assignError() }}</div>
            }

            <div class="assign-cols">
              <!-- Currently assigned -->
              <div class="assign-col">
                <div class="assign-col__head">
                  مُسجَّلون في الجلسة
                  <span class="assign-count">{{ assignedStudents().length }} / {{ assigningSession()?.capacity }}</span>
                </div>
                <div class="assign-list">
                  @if (assignLoading()) {
                    <app-loading-spinner [diameter]="28" />
                  } @else if (assignedStudents().length === 0) {
                    <p class="assign-empty">لا يوجد متسابقون مُسندون بعد</p>
                  }
                  @for (s of assignedStudents(); track s.id) {
                    <div class="assign-row">
                      <div style="flex:1">
                        <div class="assign-row__name">{{ s.fullName }}</div>
                        <div class="assign-row__sub">{{ s.category | categoryLabel }} • {{ s.juzCount }} جزء</div>
                      </div>
                      <button mat-icon-button style="color:var(--red)" title="إزالة من الجلسة"
                              (click)="unassign(s)" [disabled]="assignBusy()">
                        <mat-icon>remove_circle_outline</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Unassigned pool -->
              <div class="assign-col">
                <div class="assign-col__head">
                  متسابقون غير مُسندين
                  <span class="assign-count">{{ unassignedStudents().length }}</span>
                </div>
                <div class="assign-list">
                  @if (assignLoading()) {
                    <app-loading-spinner [diameter]="28" />
                  } @else if (unassignedStudents().length === 0) {
                    <p class="assign-empty">لا يوجد متسابقون متاحون لهذه الفئة</p>
                  }
                  @for (s of unassignedStudents(); track s.id) {
                    <div class="assign-row">
                      <div style="flex:1">
                        <div class="assign-row__name">{{ s.fullName }}</div>
                        <div class="assign-row__sub">{{ s.category | categoryLabel }} • {{ s.juzCount }} جزء</div>
                      </div>
                      <button mat-icon-button style="color:var(--green)" title="إسناد للجلسة"
                              (click)="assignOne(s)"
                              [disabled]="assignBusy() || isSessionFull()">
                        <mat-icon>add_circle_outline</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>

            @if (isSessionFull()) {
              <div class="full-notice"><mat-icon>info</mat-icon> الجلسة وصلت للحد الأقصى من المتسابقين</div>
            }

            <div style="display:flex;justify-content:flex-end;margin-top:14px">
              <button mat-flat-button class="btn-gold" (click)="closeAssign()">تم</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .status-tabs { display:flex;gap:4px;margin-bottom:20px;background:var(--bg-card);border-radius:30px;padding:4px;width:fit-content; }
    .stab { display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:26px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:none;color:var(--text-secondary);transition:all .18s;font-family:'Cairo',sans-serif;
      &.active{background:var(--gold);color:#0a0f1a;font-weight:700;}
      &:hover:not(.active){background:var(--bg-tertiary);color:var(--text-primary);}
      &__count{background:rgba(255,255,255,.15);border-radius:10px;padding:1px 7px;font-size:11px;}
    }
    .sessions-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px; }
    .session-card { background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-md);padding:18px;display:flex;flex-direction:column;gap:13px;transition:border-color .2s;
      &:hover{border-color:var(--border-accent);}
      &--active   {border-color:rgba(45,212,160,.35);}
      &--scheduled{border-color:rgba(74,159,245,.25);}
      &--completed{border-color:rgba(139,108,245,.25);}
      &--cancelled{opacity:.6;}
    }
    .session-card__head{display:flex;align-items:flex-start;justify-content:space-between;}
    .session-name{font-size:15px;font-weight:700;}
    .session-date{font-size:12px;color:var(--text-muted);margin-top:2px;}
    .session-meta{display:flex;flex-direction:column;gap:6px;}
    .meta-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary);mat-icon{font-size:15px;width:15px;height:15px;color:var(--text-muted);}}
    .prog-lbl{display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:5px;}
    .prog-track{height:5px;background:var(--border-primary);border-radius:3px;overflow:hidden;}
    .prog-fill{height:100%;border-radius:3px;transition:width .4s ease;
      &--active   {background:var(--green);}
      &--scheduled{background:var(--blue);}
      &--completed{background:var(--purple);}
      &--draft    {background:var(--text-muted);}
    }
    .session-card__actions{display:flex;gap:7px;align-items:center;}
    .error-box{display:flex;align-items:center;gap:7px;padding:9px 13px;background:rgba(232,85,85,.12);border:1px solid rgba(232,85,85,.3);border-radius:var(--r-sm);color:var(--red);font-size:13px;margin-bottom:6px;}
    .form-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
    .form-sheet{background:var(--bg-card);border:1px solid var(--border-accent);border-radius:var(--r-xl);padding:28px;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;}
    .form-sheet__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;h3{font-size:17px;font-weight:700;color:var(--gold-light);}}
    .assign-sheet{max-width:760px;}
    .assign-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .assign-col{display:flex;flex-direction:column;gap:8px;min-width:0;}
    .assign-col__head{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:var(--text-secondary);padding:0 2px;}
    .assign-count{font-size:11px;font-weight:600;color:var(--text-muted);background:var(--bg-secondary);padding:2px 8px;border-radius:10px;}
    .assign-list{display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto;background:var(--bg-secondary);border-radius:var(--r-sm);padding:8px;min-height:80px;}
    .assign-empty{font-size:12px;color:var(--text-muted);text-align:center;padding:20px 8px;}
    .assign-row{display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:8px;padding:8px 10px;}
    .assign-row__name{font-size:13px;font-weight:600;}
    .assign-row__sub{font-size:11px;color:var(--text-muted);margin-top:2px;}
    .full-notice{display:flex;align-items:center;gap:7px;margin-top:12px;padding:9px 13px;background:rgba(240,160,48,.12);border:1px solid rgba(240,160,48,.3);border-radius:var(--r-sm);color:var(--amber);font-size:12px;}
    @media(max-width:640px){.assign-cols{grid-template-columns:1fr;}}
  `]
})
export class SessionsComponent implements OnInit {
  private sessionSvc     = inject(SessionService);
  private sheikhSvc      = inject(SheikhService);
  private studentSvc     = inject(StudentService);
  private competitionSvc = inject(CompetitionService);
  private auth           = inject(AuthService);
  private dialog         = inject(MatDialog);
  private snack          = inject(MatSnackBar);
  private fb             = inject(FormBuilder);

  sessions   = signal<ExamSession[]>([]);
  sheikhs    = signal<Sheikh[]>([]);
  loading    = signal(true);
  showForm   = signal(false);
  editingId  = signal<string | null>(null);
  saving     = signal(false);
  formError  = signal('');
  activeTab  = 'all';

  // ── Student assignment state ─────────────────────────────────
  showAssign        = signal(false);
  assigningSession  = signal<ExamSession | null>(null);
  assignedStudents  = signal<Student[]>([]);
  unassignedStudents = signal<Student[]>([]);
  assignLoading     = signal(true);
  assignBusy        = signal(false);
  assignError       = signal('');

  tabs = [
    { key:'all',       label:'الكل'      },
    { key:'scheduled', label:'مجدولة'   },
    { key:'active',    label:'جارية'     },
    { key:'completed', label:'مكتملة'   },
    { key:'cancelled', label:'ملغاة'    },
  ];

  categoryOptions = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }));

  form = this.fb.group({
    name:      ['', Validators.required],
    sheikhId:  ['', Validators.required],
    sheikhName:[''],
    category:  ['full30' as CompetitionCategory, Validators.required],
    date:      ['', Validators.required],
    startTime: ['08:00', Validators.required],
    endTime:   ['12:00', Validators.required],
    capacity:  [10, [Validators.required, Validators.min(1)]],
  });

  get compId() {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    this.sessionSvc.getAll(this.compId).subscribe(list => {
      this.sessions.set(list); this.loading.set(false);
    });
    this.sheikhSvc.getActive().subscribe(s => this.sheikhs.set(s));
  }

  filteredSessions(): ExamSession[] {
    return this.activeTab === 'all' ? this.sessions() : this.sessions().filter(s => s.status === this.activeTab);
  }

  countByStatus(key: string): number {
    return key === 'all' ? this.sessions().length : this.sessions().filter(s => s.status === key).length;
  }

  statusLabel(s: SessionStatus): string {
    return { draft:'مسودة', scheduled:'مجدولة', active:'جارٍ الآن', completed:'مكتملة', cancelled:'ملغاة' }[s] ?? s;
  }

  statusBadge(s: SessionStatus): string {
    return { draft:'badge--gray', scheduled:'badge--blue', active:'badge--green', completed:'badge--purple', cancelled:'badge--red' }[s] ?? 'badge--gray';
  }

  onSheikhChange(id: string): void {
    const s = this.sheikhs().find(x => x.id === id);
    if (s) this.form.patchValue({ sheikhName: s.name });
  }

  openForm(s?: ExamSession): void {
    this.formError.set('');
    if (s) {
      this.editingId.set(s.id);
      const d = s.date instanceof Date ? s.date : (s.date as any).toDate?.() ?? new Date(s.date);
      this.form.patchValue({
        name: s.name, sheikhId: s.sheikhId, sheikhName: s.sheikhName,
        category: s.category, date: d.toISOString().split('T')[0],
        startTime: s.startTime, endTime: s.endTime, capacity: s.capacity,
      });
    } else {
      this.editingId.set(null);
      this.form.reset({ category: 'full30', capacity: 10, startTime: '08:00', endTime: '12:00' });
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); this.form.reset(); }

  async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    try {
      const v = this.form.value;
      const data = {
        name: v.name!, sheikhId: v.sheikhId!, sheikhName: v.sheikhName!,
        category: v.category as CompetitionCategory, competitionId: this.compId,
        date: new Date(v.date!), startTime: v.startTime!, endTime: v.endTime!,
        capacity: v.capacity!, status: 'scheduled' as SessionStatus,
        createdBy: this.auth.currentUser()?.uid ?? '',
      };
      if (this.editingId()) {
        await this.sessionSvc.update(this.compId, this.editingId()!, data);
        this.snack.open('✅ تم تحديث الجلسة', '', { duration: 3000 });
      } else {
        await this.sessionSvc.create(this.compId, data, this.auth.currentUser()?.uid ?? '');
        this.snack.open('✅ تم إنشاء الجلسة', '', { duration: 3000 });
      }
      this.closeForm();
    } catch (e: any) {
      this.formError.set(e?.message ?? 'حدث خطأ');
    } finally {
      this.saving.set(false);
    }
  }

  async setStatus(s: ExamSession, status: SessionStatus): Promise<void> {
    await this.sessionSvc.updateStatus(this.compId, s.id, status);
    this.snack.open(`تم تغيير حالة الجلسة إلى: ${this.statusLabel(status)}`, '', { duration: 2500 });
  }

  async delete(s: ExamSession): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'حذف الجلسة', message: `هل تريد حذف "${s.name}"؟`, danger: true }
    });
    ref.afterClosed().subscribe(async ok => {
      if (!ok) return;
      await this.sessionSvc.delete(this.compId, s.id);
      this.snack.open('تم حذف الجلسة', '', { duration: 3000 });
    });
  }

  // ── Student assignment ────────────────────────────────────────
  // This is the missing piece of the session lifecycle: it's the
  // only place an admin can actually move a student from "registered"
  // into a specific sheikh's session. Without this screen, sessionId
  // never gets set and the sheikh's queue stays empty forever.

  openAssign(s: ExamSession): void {
    this.assigningSession.set(s);
    this.assignError.set('');
    this.assignLoading.set(true);
    this.showAssign.set(true);

    // Students already in THIS session
    this.studentSvc.getBySession(this.compId, s.id).subscribe(list => {
      this.assignedStudents.set(list);
      this.assignLoading.set(false);
    });

    // Students with no session yet, matching this session's category
    this.studentSvc.getUnassigned(this.compId, s.category).subscribe(list => {
      this.unassignedStudents.set(list);
    });
  }

  closeAssign(): void {
    this.showAssign.set(false);
    this.assigningSession.set(null);
    this.assignedStudents.set([]);
    this.unassignedStudents.set([]);
  }

  isSessionFull(): boolean {
    const s = this.assigningSession();
    if (!s) return false;
    return this.assignedStudents().length >= s.capacity;
  }

  async assignOne(student: Student): Promise<void> {
    const s = this.assigningSession();
    if (!s || this.assignBusy()) return;
    if (this.isSessionFull()) {
      this.assignError.set('الجلسة وصلت للحد الأقصى من المتسابقين');
      return;
    }
    this.assignBusy.set(true);
    this.assignError.set('');
    try {
      await this.sessionSvc.assignStudent(this.compId, s.id, student.id);
      // Optimistic local update so the UI feels instant; the
      // subscriptions above will reconcile shortly after anyway.
      this.assignedStudents.set([...this.assignedStudents(), student]);
      this.unassignedStudents.set(this.unassignedStudents().filter(x => x.id !== student.id));
      this.snack.open(`تم إسناد ${student.fullName} للجلسة`, '', { duration: 2000 });
    } catch (e: any) {
      this.assignError.set(e?.message ?? 'فشل إسناد المتسابق');
    } finally {
      this.assignBusy.set(false);
    }
  }

  async unassign(student: Student): Promise<void> {
    const s = this.assigningSession();
    if (!s || this.assignBusy()) return;
    this.assignBusy.set(true);
    this.assignError.set('');
    try {
      await this.sessionSvc.removeStudent(this.compId, s.id, student.id);
      this.assignedStudents.set(this.assignedStudents().filter(x => x.id !== student.id));
      this.unassignedStudents.set([...this.unassignedStudents(), student]);
      this.snack.open(`تمت إزالة ${student.fullName} من الجلسة`, '', { duration: 2000 });
    } catch (e: any) {
      this.assignError.set(e?.message ?? 'فشل إزالة المتسابق');
    } finally {
      this.assignBusy.set(false);
    }
  }
}
