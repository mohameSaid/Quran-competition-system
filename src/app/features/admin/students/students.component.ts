import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { ExportService } from '../../../core/services/export.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CategoryLabelPipe } from '../../../shared/pipes/category-label.pipe';
import { Student, CATEGORY_LABELS, JUZ_OPTIONS, CompetitionCategory } from '../../../core/models';
import {
  requiredEgyptMobileValidator,
  optionalEgyptMobileValidator,
  categoryFromJuz,
  PREVIOUS_LEVEL_OPTIONS,
  formatEgyptDate,
} from '../../../core/validators/egypt.validators';
import { firestoreToDate } from '../../../core/utils/firestore-date.util';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatProgressSpinnerModule, MatCardModule, MatDatepickerModule,
    LoadingSpinnerComponent, EmptyStateComponent, CategoryLabelPipe,
  ],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">المتسابقون ({{ filtered().length }})</div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="exportExcel()" [disabled]="filtered().length === 0 || exporting()">
            <mat-icon>file_download</mat-icon> Excel
          </button>
          <button mat-flat-button class="btn-gold" (click)="openForm()">
            <mat-icon>person_add</mat-icon> إضافة متسابق
          </button>
        </div>
      </div>

      <div class="filters">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [(ngModel)]="searchQ" (ngModelChange)="applyFilter()"
                 aria-label="بحث">
        </div>
        <select class="filter-sel" [(ngModel)]="catFilter" (ngModelChange)="applyFilter()">
          <option value="">كل الفئات</option>
          @for (c of categoryOptions; track c.key) {
            <option [value]="c.key">{{ c.label }}</option>
          }
        </select>
        <select class="filter-sel" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
          <option value="">كل الحالات</option>
          <option value="pending">انتظار</option>
          <option value="scheduled">مجدول</option>
          <option value="evaluated">مُقيَّم</option>
          <option value="published">منشور</option>
        </select>
      </div>

      @if (loading()) {
        <app-loading-spinner message="جاري تحميل المتسابقين..." />
      } @else if (all().length === 0) {
        <app-empty-state icon="group" message="لا يوجد متسابقون بعد. أضف أول متسابق." />
      } @else {
        <div class="student-cards">
          @for (s of filtered(); track s.id; let i = $index) {
            <mat-card class="student-card">
              <div class="student-card__head">
                <span class="student-num">{{ i + 1 }}</span>
                <div class="student-card__info">
                  <strong>{{ s.fullName }}</strong>
                  <span class="student-meta">{{ displayMemorizer(s) }} · {{ s.juzCount }} جزء</span>
                </div>
                <span class="badge badge--gold">{{ s.category | categoryLabel }}</span>
              </div>
              <div class="student-card__details">
                <span dir="ltr">{{ s.parentPhone }}</span>
                <span>{{ formatDate(s.birthDate) }}</span>
                <span>{{ s.birthPlace || '—' }}</span>
              </div>
              <div class="student-card__foot">
                @switch (s.status) {
                  @case ('evaluated') { <span class="badge badge--green">مُقيَّم</span> }
                  @case ('scheduled') { <span class="badge badge--blue">مجدول</span> }
                  @case ('published') { <span class="badge badge--purple">منشور</span> }
                  @default { <span class="badge badge--gray">انتظار</span> }
                }
                <div class="student-card__actions">
                  <button mat-icon-button title="تعديل" (click)="openForm(s)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button style="color:var(--red)" title="حذف" (click)="delete(s)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }
          @if (filtered().length === 0) {
            <p class="no-results">لا توجد نتائج مطابقة</p>
          }
        </div>
      }

      @if (showForm()) {
        <div class="form-overlay" (click)="closeForm()">
          <div class="form-sheet" (click)="$event.stopPropagation()">
            <div class="form-sheet__header">
              <h3>{{ editingId() ? 'تعديل بيانات متسابق' : 'إضافة متسابق جديد' }}</h3>
              <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
              <p class="section-label">البيانات الشخصية</p>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>اسم المتسابق *</mat-label>
                <input matInput formControlName="fullName">
                @if (form.get('fullName')?.invalid && form.get('fullName')?.touched) {
                  <mat-error>هذا الحقل مطلوب</mat-error>
                }
              </mat-form-field>
              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>تاريخ الميلاد *</mat-label>
                  <input matInput [matDatepicker]="adminBirthPicker" formControlName="birthDate">
                  <mat-datepicker-toggle matIconSuffix [for]="adminBirthPicker" />
                  <mat-datepicker #adminBirthPicker />
                  @if (form.get('birthDate')?.invalid && form.get('birthDate')?.touched) {
                    <mat-error>يجب اختيار تاريخ الميلاد</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>محل الميلاد الحالي *</mat-label>
                  <input matInput formControlName="birthPlace">
                  @if (form.get('birthPlace')?.invalid && form.get('birthPlace')?.touched) {
                    <mat-error>هذا الحقل مطلوب</mat-error>
                  }
                </mat-form-field>
              </div>

              <p class="section-label">بيانات التواصل</p>
              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>رقم هاتف ولي الأمر *</mat-label>
                  <input matInput formControlName="parentPhone" type="tel" dir="ltr" maxlength="11">
                  @if (form.get('parentPhone')?.hasError('required') && form.get('parentPhone')?.touched) {
                    <mat-error>هذا الحقل مطلوب</mat-error>
                  } @else if (form.get('parentPhone')?.hasError('egyptMobile') && form.get('parentPhone')?.touched) {
                    <mat-error>رقم الهاتف غير صحيح</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>رقم هاتف آخر</mat-label>
                  <input matInput formControlName="alternatePhone" type="tel" dir="ltr" maxlength="11">
                  @if (form.get('alternatePhone')?.hasError('egyptMobile') && form.get('alternatePhone')?.touched) {
                    <mat-error>رقم الهاتف غير صحيح</mat-error>
                  }
                </mat-form-field>
              </div>

              <p class="section-label">بيانات الحفظ</p>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>اسم المحفّظ *</mat-label>
                <input matInput formControlName="memorizerName" placeholder="اكتب اسم المحفّظ">
                <mat-hint>حقل نصي حر — لا يلزم اختيار من قائمة، ومستقل عن اختيار الشيخ</mat-hint>
                @if (form.get('memorizerName')?.invalid && form.get('memorizerName')?.touched) {
                  <mat-error>هذا الحقل مطلوب</mat-error>
                }
              </mat-form-field>
              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>عدد الأجزاء المحفوظة *</mat-label>
                  <mat-select formControlName="juzCount">
                    @for (j of juzOptions; track j) {
                      <mat-option [value]="j">{{ j }} جزء</mat-option>
                    }
                  </mat-select>
                  @if (form.get('juzCount')?.invalid && form.get('juzCount')?.touched) {
                    <mat-error>يجب اختيار قيمة</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>المستوى السابق في آخر مسابقة *</mat-label>
                  <mat-select formControlName="previousLevel">
                    @for (lvl of previousLevels; track lvl) {
                      <mat-option [value]="lvl">{{ lvl }}</mat-option>
                    }
                  </mat-select>
                  @if (form.get('previousLevel')?.invalid && form.get('previousLevel')?.touched) {
                    <mat-error>يجب اختيار قيمة</mat-error>
                  }
                </mat-form-field>
              </div>

              @if (formError()) {
                <div class="error-box"><mat-icon>error_outline</mat-icon> {{ formError() }}</div>
              }
              <button mat-flat-button type="submit" class="btn-gold submit-full"
                      [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="18" /> }
                {{ editingId() ? 'حفظ التعديلات' : 'تسجيل المتسابق' }}
              </button>
              <button mat-stroked-button type="button" (click)="closeForm()" class="cancel-full">إلغاء</button>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .filters { display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap; }
    .search-box { position:relative;flex:1;min-width:200px; }
    .search-icon { position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:18px; }
    .search-input { width:100%;padding:9px 40px 9px 14px;background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:30px;color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;outline:none;&:focus{border-color:var(--gold);} }
    .filter-sel { padding:9px 14px;background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:var(--r-sm);color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;outline:none;cursor:pointer; }
    .student-cards { display:flex;flex-direction:column;gap:10px; }
    .student-card { padding:14px 16px; }
    .student-card__head { display:flex;align-items:flex-start;gap:10px;margin-bottom:8px; }
    .student-num { font-size:12px;color:var(--text-muted);min-width:20px; }
    .student-card__info { flex:1;display:flex;flex-direction:column;gap:2px; strong{font-size:14px;} }
    .student-meta { font-size:12px;color:var(--text-muted); }
    .student-card__details { display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-secondary);margin-bottom:10px; }
    .student-card__foot { display:flex;align-items:center;justify-content:space-between; }
    .student-card__actions { display:flex;gap:2px; }
    .no-results { text-align:center;padding:36px;color:var(--text-muted); }
    .section-label { font-size:13px;font-weight:700;color:var(--primary);margin:12px 0 8px;&:first-of-type{margin-top:0;} }
    .error-box { display:flex;align-items:center;gap:7px;padding:9px 13px;background:rgba(232,85,85,.12);border:1px solid rgba(232,85,85,.3);border-radius:var(--r-sm);color:var(--red);font-size:13px;margin:8px 0; }
    .form-overlay { position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
    .form-sheet { background:var(--bg-card);border:1px solid var(--border-accent);border-radius:var(--r-xl);padding:28px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto; }
    .form-sheet__header { display:flex;align-items:center;justify-content:space-between;margin-bottom:18px; h3{font-size:17px;font-weight:700;color:var(--gold-light);} }
    .submit-full { width:100%;height:44px;font-size:14px;margin-top:8px; }
    .cancel-full { width:100%;height:44px;margin-top:8px; }
  `]
})
export class StudentsComponent implements OnInit {
  private studentSvc     = inject(StudentService);
  private competitionSvc = inject(CompetitionService);
  private exportSvc      = inject(ExportService);
  private auth           = inject(AuthService);
  private dialog         = inject(MatDialog);
  private snack          = inject(MatSnackBar);
  private fb             = inject(FormBuilder);

  all        = signal<Student[]>([]);
  filtered   = signal<Student[]>([]);
  loading    = signal(true);
  exporting  = signal(false);
  showForm   = signal(false);
  editingId  = signal<string | null>(null);
  saving     = signal(false);
  formError  = signal('');

  searchQ      = '';
  catFilter    = '';
  statusFilter = '';

  categoryOptions = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }));
  juzOptions      = JUZ_OPTIONS;
  previousLevels  = PREVIOUS_LEVEL_OPTIONS;
  formatDate      = formatEgyptDate;

  form = this.fb.group({
    fullName:       ['', [Validators.required, Validators.minLength(4)]],
    birthPlace:     ['', Validators.required],
    birthDate:      [null as Date | null, Validators.required],
    parentPhone:    ['', requiredEgyptMobileValidator()],
    alternatePhone: ['', optionalEgyptMobileValidator()],
    // Free text, same as the public register form — see register.component.ts
    memorizerName:  ['', [Validators.required, Validators.minLength(2)]],
    juzCount:       [null as number | null, Validators.required],
    previousLevel:  ['', Validators.required],
  });

  get compId(): string {
    try { return this.competitionSvc.requireActiveCompetition(); }
    catch { return 'default'; }
  }

  ngOnInit(): void {
    this.studentSvc.getAll(this.compId).subscribe(list => {
      this.all.set(list); this.applyFilter(); this.loading.set(false);
    });
  }

  displayMemorizer(s: Student): string {
    return s.memorizerName ?? s.sheikhName ?? '—';
  }

  applyFilter(): void {
    const q = this.searchQ.trim();
    this.filtered.set(this.all().filter(s => {
      const haystack = [
        s.fullName, s.parentPhone, s.alternatePhone, s.birthPlace,
        this.displayMemorizer(s),
      ].join(' ');
      return (!q || haystack.includes(q)) &&
        (!this.catFilter || s.category === this.catFilter) &&
        (!this.statusFilter || s.status === this.statusFilter);
    }));
  }

  openForm(s?: Student): void {
    this.formError.set('');
    if (s) {
      this.editingId.set(s.id);
      this.form.patchValue({
        fullName: s.fullName,
        birthPlace: s.birthPlace ?? '',
        birthDate: firestoreToDate(s.birthDate),
        parentPhone: s.parentPhone,
        alternatePhone: s.alternatePhone ?? '',
        memorizerName: s.memorizerName ?? s.sheikhName ?? '',
        juzCount: s.juzCount,
        previousLevel: s.previousLevel ?? '',
      });
    } else {
      this.editingId.set(null);
      this.form.reset();
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); this.form.reset(); }

  private buildPayload() {
    const v = this.form.value;
    // memorizerId mirrors the typed name (slug-equivalent identity) —
    // it is NOT a foreign key into any predefined list. See register.component.ts
    // for the same rationale on the public side.
    const memorizerName = v.memorizerName!.trim();
    return {
      fullName: v.fullName!,
      birthPlace: v.birthPlace!,
      birthDate: v.birthDate!,
      parentPhone: v.parentPhone!,
      alternatePhone: v.alternatePhone ?? '',
      memorizerId: memorizerName,
      memorizerName: memorizerName,
      juzCount: v.juzCount!,
      previousLevel: v.previousLevel!,
      category: categoryFromJuz(v.juzCount!) as CompetitionCategory,
    };
  }

  async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    try {
      const payload = this.buildPayload();
      if (this.editingId()) {
        await this.studentSvc.update(this.compId, this.editingId()!, payload);
        this.snack.open('تم تحديث بيانات المتسابق', '', { duration: 3000 });
      } else {
        await this.studentSvc.add(this.compId, {
          ...payload,
          registeredBy: this.auth.currentUser()?.uid ?? 'admin',
        }, this.auth.currentUser()?.uid ?? 'admin');
        this.snack.open('تمت إضافة المتسابق بنجاح', '', { duration: 3000 });
      }
      this.closeForm();
    } catch (e: unknown) {
      this.formError.set(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      this.saving.set(false);
    }
  }

  async delete(s: Student): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'حذف متسابق', message: `هل تريد حذف ${s.fullName}؟`, danger: true }
    });
    ref.afterClosed().subscribe(async ok => {
      if (!ok) return;
      await this.studentSvc.delete(this.compId, s.id);
      this.snack.open(`تم حذف ${s.fullName}`, '', { duration: 3000 });
    });
  }

  async exportExcel(): Promise<void> {
    if (!this.filtered().length) {
      this.snack.open('لا توجد بيانات للتصدير', '', { duration: 3000 });
      return;
    }
    this.exporting.set(true);
    try {
      await this.exportSvc.exportStudents(this.filtered(), 'students');
      this.snack.open('تم تنزيل الملف', '', { duration: 3000 });
    } catch (e: unknown) {
      this.snack.open(e instanceof Error ? e.message : 'فشل التصدير', '', { duration: 4000 });
    } finally {
      this.exporting.set(false);
    }
  }
}
