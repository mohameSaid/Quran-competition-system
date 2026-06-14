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
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { SheikhService } from '../../../core/services/sheikh.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { ExportService } from '../../../core/services/export.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CategoryLabelPipe } from '../../../shared/pipes/category-label.pipe';
import { Student, Sheikh, CATEGORY_LABELS, JUZ_OPTIONS, CompetitionCategory } from '../../../core/models';

@Component({
  selector: 'app-students',
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
      <!-- Header -->
      <div class="section-header">
        <div class="section-title">المتسابقون ({{ filtered().length }})</div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="exportExcel()" [disabled]="filtered().length === 0">
            <mat-icon>file_download</mat-icon> Excel
          </button>
          <button mat-flat-button class="btn-gold" (click)="openForm()">
            <mat-icon>person_add</mat-icon> إضافة متسابق
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [(ngModel)]="searchQ" (ngModelChange)="applyFilter()"
                 placeholder="ابحث بالاسم أو رقم الهوية...">
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

      <!-- Table -->
      @if (loading()) {
        <app-loading-spinner message="جاري تحميل المتسابقين..." />
      } @else if (all().length === 0) {
        <app-empty-state icon="group" message="لا يوجد متسابقون بعد. أضف أول متسابق." />
      } @else {
        <div class="qc-table-wrap">
          <table class="qc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم الكامل</th>
                <th>رقم الهوية</th>
                <th>جوال ولي الأمر</th>
                <th>الشيخ</th>
                <th>الأجزاء</th>
                <th>الفئة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              @for (s of filtered(); track s.id; let i = $index) {
                <tr>
                  <td style="color:var(--text-muted)">{{ i + 1 }}</td>
                  <td><strong>{{ s.fullName }}</strong></td>
                  <td dir="ltr" style="font-size:12px;color:var(--text-muted)">{{ s.nationalId }}</td>
                  <td dir="ltr" style="font-size:12px;color:var(--text-muted)">{{ s.parentPhone }}</td>
                  <td style="font-size:12px">{{ s.sheikhName }}</td>
                  <td style="text-align:center;font-weight:600">{{ s.juzCount }}</td>
                  <td><span class="badge badge--gold" style="font-size:10px">{{ s.category | categoryLabel }}</span></td>
                  <td>
                    @switch (s.status) {
                      @case ('evaluated') { <span class="badge badge--green">مُقيَّم</span> }
                      @case ('scheduled') { <span class="badge badge--blue">مجدول</span> }
                      @case ('published') { <span class="badge badge--purple">منشور</span> }
                      @default            { <span class="badge badge--gray">انتظار</span> }
                    }
                  </td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button mat-icon-button style="width:32px;height:32px" title="تعديل" (click)="openForm(s)">
                        <mat-icon style="font-size:17px">edit</mat-icon>
                      </button>
                      <button mat-icon-button style="width:32px;height:32px;color:var(--red)" title="حذف" (click)="delete(s)">
                        <mat-icon style="font-size:17px">delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (filtered().length === 0 && all().length > 0) {
                <tr><td colspan="9" style="text-align:center;padding:36px;color:var(--text-muted)">لا توجد نتائج مطابقة</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Form overlay -->
      @if (showForm()) {
        <div class="form-overlay" (click)="closeForm()">
          <div class="form-sheet" (click)="$event.stopPropagation()">
            <div class="form-sheet__header">
              <h3>{{ editingId() ? 'تعديل بيانات متسابق' : 'إضافة متسابق جديد' }}</h3>
              <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>الاسم الكامل *</mat-label>
                  <input matInput formControlName="fullName">
                  @if (form.get('fullName')?.invalid && form.get('fullName')?.touched) {
                    <mat-error>الاسم مطلوب (8 أحرف+)</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>رقم الهوية *</mat-label>
                  <input matInput formControlName="nationalId" dir="ltr" maxlength="10">
                  @if (form.get('nationalId')?.invalid && form.get('nationalId')?.touched) {
                    <mat-error>يجب أن يبدأ بـ 1 أو 2 ويتكون من 10 أرقام</mat-error>
                  }
                </mat-form-field>
              </div>
              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>جوال ولي الأمر *</mat-label>
                  <input matInput formControlName="parentPhone" dir="ltr" maxlength="10">
                  @if (form.get('parentPhone')?.invalid && form.get('parentPhone')?.touched) {
                    <mat-error>يجب أن يبدأ بـ 05</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>العمر *</mat-label>
                  <input matInput formControlName="age" type="number">
                  @if (form.get('age')?.invalid && form.get('age')?.touched) {
                    <mat-error>العمر مطلوب (5–80)</mat-error>
                  }
                </mat-form-field>
              </div>
              <div class="form-grid-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>الشيخ المشرف *</mat-label>
                  <mat-select formControlName="sheikhId" (selectionChange)="onSheikhChange($event.value)">
                    @for (s of sheikhs(); track s.id) {
                      <mat-option [value]="s.id">{{ s.name }}</mat-option>
                    }
                  </mat-select>
                  @if (form.get('sheikhId')?.invalid && form.get('sheikhId')?.touched) {
                    <mat-error>اختر الشيخ</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>عدد الأجزاء المحفوظة *</mat-label>
                  <mat-select formControlName="juzCount">
                    @for (j of juzOptions; track j) {
                      <mat-option [value]="j">{{ j }} جزء</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>فئة المسابقة *</mat-label>
                <mat-select formControlName="category">
                  @for (c of categoryOptions; track c.key) {
                    <mat-option [value]="c.key">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (formError()) {
                <div class="error-box"><mat-icon>error_outline</mat-icon> {{ formError() }}</div>
              }
              <div style="display:flex;gap:10px;margin-top:8px">
                <button mat-flat-button type="submit" class="btn-gold" style="flex:1;height:44px;font-size:14px"
                        [disabled]="form.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
                  {{ editingId() ? 'حفظ التعديلات' : 'إضافة المتسابق' }}
                </button>
                <button mat-stroked-button type="button" (click)="closeForm()" style="height:44px">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .filters    { display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap; }
    .search-box { position:relative;flex:1;min-width:200px; }
    .search-icon{ position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:18px; }
    .search-input{ width:100%;padding:9px 40px 9px 14px;background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:30px;color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;outline:none;&:focus{border-color:var(--gold);} }
    .filter-sel { padding:9px 14px;background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:var(--r-sm);color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;outline:none;cursor:pointer;&:focus{border-color:var(--gold);} }
    .error-box  { display:flex;align-items:center;gap:7px;padding:9px 13px;background:rgba(232,85,85,.12);border:1px solid rgba(232,85,85,.3);border-radius:var(--r-sm);color:var(--red);font-size:13px;margin-bottom:6px; }
    .form-overlay{ position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
    .form-sheet { background:var(--bg-card);border:1px solid var(--border-accent);border-radius:var(--r-xl);padding:28px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto; }
    .form-sheet__header { display:flex;align-items:center;justify-content:space-between;margin-bottom:18px; h3{font-size:17px;font-weight:700;color:var(--gold-light);} }
  `]
})
export class StudentsComponent implements OnInit {
  private studentSvc     = inject(StudentService);
  private sheikhSvc      = inject(SheikhService);
  private competitionSvc = inject(CompetitionService);
  private exportSvc      = inject(ExportService);
  private auth           = inject(AuthService);
  private dialog         = inject(MatDialog);
  private snack          = inject(MatSnackBar);
  private fb             = inject(FormBuilder);

  all        = signal<Student[]>([]);
  filtered   = signal<Student[]>([]);
  sheikhs    = signal<Sheikh[]>([]);
  loading    = signal(true);
  showForm   = signal(false);
  editingId  = signal<string | null>(null);
  saving     = signal(false);
  formError  = signal('');

  searchQ      = '';
  catFilter    = '';
  statusFilter = '';

  categoryOptions = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }));
  juzOptions      = JUZ_OPTIONS;

  form = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(8)]],
    nationalId:  ['', [Validators.required, Validators.pattern(/^[12]\d{9}$/)]],
    parentPhone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
    age:         [null as number | null, [Validators.required, Validators.min(5), Validators.max(80)]],
    sheikhId:    ['', Validators.required],
    sheikhName:  [''],
    juzCount:    [null as number | null, Validators.required],
    category:    ['', Validators.required],
  });

  get compId(): string { return this.competitionSvc.active()?.id ?? 'default'; }

  ngOnInit(): void {
    this.studentSvc.getAll(this.compId).subscribe(list => {
      this.all.set(list); this.applyFilter(); this.loading.set(false);
    });
    this.sheikhSvc.getActive().subscribe(s => this.sheikhs.set(s));

    // Auto-suggest category from juzCount
    this.form.get('juzCount')!.valueChanges.subscribe(v => {
      if (!v) return;
      const cat: CompetitionCategory =
        v >= 30 ? 'full30' : v >= 15 ? 'half15' : v >= 10 ? 'ten10' : 'five5';
      this.form.patchValue({ category: cat });
    });
  }

  applyFilter(): void {
    this.filtered.set(this.all().filter(s =>
      (!this.searchQ      || s.fullName.includes(this.searchQ)   || s.nationalId.includes(this.searchQ)) &&
      (!this.catFilter    || s.category === this.catFilter) &&
      (!this.statusFilter || s.status   === this.statusFilter)
    ));
  }

  onSheikhChange(id: string): void {
    const s = this.sheikhs().find(x => x.id === id);
    if (s) this.form.patchValue({ sheikhName: s.name });
  }

  openForm(s?: Student): void {
    this.formError.set('');
    if (s) {
      this.editingId.set(s.id);
      this.form.patchValue({ fullName: s.fullName, nationalId: s.nationalId, parentPhone: s.parentPhone, age: s.age, sheikhId: s.sheikhId, sheikhName: s.sheikhName, juzCount: s.juzCount, category: s.category });
    } else {
      this.editingId.set(null);
      this.form.reset();
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); this.form.reset(); }

  async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    try {
      const v = this.form.value;
      if (this.editingId()) {
        await this.studentSvc.update(this.compId, this.editingId()!, {
          fullName: v.fullName!, nationalId: v.nationalId!, parentPhone: v.parentPhone!,
          age: v.age!, sheikhId: v.sheikhId!, sheikhName: v.sheikhName!,
          juzCount: v.juzCount!, category: v.category as CompetitionCategory,
        });
        this.snack.open('✅ تم تحديث بيانات المتسابق', '', { duration: 3000 });
      } else {
        await this.studentSvc.add(this.compId, {
          fullName: v.fullName!, nationalId: v.nationalId!, parentPhone: v.parentPhone!,
          age: v.age!, sheikhId: v.sheikhId!, sheikhName: v.sheikhName!,
          juzCount: v.juzCount!, category: v.category as CompetitionCategory,
          registeredBy: this.auth.currentUser()?.uid ?? 'admin',
        }, this.auth.currentUser()?.uid ?? 'admin');
        this.snack.open('✅ تمت إضافة المتسابق بنجاح', '', { duration: 3000 });
      }
      this.closeForm();
    } catch (e: any) {
      this.formError.set(e?.message ?? 'حدث خطأ');
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

  exportExcel(): void {
    this.exportSvc.exportStudents(this.filtered());
    this.snack.open('📊 جاري تصدير البيانات...', '', { duration: 2000 });
  }
}
