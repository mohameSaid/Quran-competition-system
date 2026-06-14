import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SheikhService } from '../../../core/services/sheikh.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';
import { egyptMobileValidator } from '../../../core/validators/egypt.validators';
import { Sheikh, CompetitionCategory, CATEGORY_LABELS } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

function slugifyName(name: string): string {
  return name.trim().replace(/\s+/g, '.').replace(/[^\w.\-]/g, '').toLowerCase() || 'judge';
}

function randomPassword(len = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let p = '';
  for (let i = 0; i < len; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

@Component({
  selector: 'app-sheikhs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, LoadingSpinnerComponent, EmptyStateComponent
  ],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">المحكّمون</div>
        <button mat-flat-button class="btn-gold" (click)="openForm()">
          <mat-icon>person_add</mat-icon> إضافة محكّم جديد
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner message="جاري تحميل المحكّمين..." />
      } @else if (sheikhs().length === 0) {
        <app-empty-state icon="record_voice_over" message="لا يوجد محكّمون بعد. أضف أول محكّم." />
      } @else {
        <div class="sheikhs-grid">
          @for (s of sheikhs(); track s.id) {
            <div class="sheikh-card">
              <div class="sheikh-card__head">
                <div class="sheikh-av">{{ s.name.charAt(0) }}</div>
                <div style="flex:1">
                  <div class="sheikh-name">{{ s.name }}</div>
                  <div class="sheikh-phone" dir="ltr">{{ s.phone }}</div>
                  @if (s.email) {
                    <div class="sheikh-email" dir="ltr">{{ s.email }}</div>
                  }
                </div>
                <div class="active-dot" [class.active]="s.isActive" [title]="s.isActive ? 'نشط' : 'معطّل'"></div>
              </div>

              <div class="sheikh-cats">
                @for (cat of s.categories; track cat) {
                  <span class="badge badge--gold" style="font-size:11px">{{ catLabel(cat) }}</span>
                }
              </div>

              <div class="sheikh-stat-row">
                <div class="sheikh-stat">
                  <div class="sheikh-stat__val">{{ s.totalEvaluated }}</div>
                  <div class="sheikh-stat__lbl">تقييم</div>
                </div>
                <div class="sheikh-stat-sep"></div>
                <div class="sheikh-stat">
                  <div class="sheikh-stat__val" [style.color]="s.isActive ? 'var(--green)' : 'var(--red)'">
                    {{ s.isActive ? 'نشط' : 'معطّل' }}
                  </div>
                  <div class="sheikh-stat__lbl">الحالة</div>
                </div>
              </div>

              <div class="sheikh-card__actions">
                <button mat-stroked-button style="flex:1;font-size:12px" (click)="openForm(s)">
                  <mat-icon style="font-size:16px">edit</mat-icon> تعديل
                </button>
                <button mat-stroked-button [style.color]="s.isActive ? 'var(--amber)' : 'var(--green)'"
                        style="font-size:12px" (click)="toggleActive(s)">
                  <mat-icon style="font-size:16px">{{ s.isActive ? 'block' : 'check_circle' }}</mat-icon>
                  {{ s.isActive ? 'تعطيل' : 'تفعيل' }}
                </button>
                <button mat-icon-button style="color:var(--red)" (click)="delete(s)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (showForm()) {
        <div class="form-overlay" (click)="closeForm()">
          <div class="form-sheet" (click)="$event.stopPropagation()">
            <div class="form-sheet__header">
              <h3>{{ editingId() ? 'تعديل بيانات المحكّم' : 'إضافة محكّم جديد' }}</h3>
              <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
            </div>

            <form [formGroup]="form" (ngSubmit)="save()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>الاسم الكامل *</mat-label>
                <input matInput formControlName="name">
                @if (form.get('name')?.invalid && form.get('name')?.touched) {
                  <mat-error>الاسم مطلوب</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>رقم الجوال *</mat-label>
                <input matInput formControlName="phone" type="tel" dir="ltr" maxlength="11">
                @if (form.get('phone')?.hasError('required') && form.get('phone')?.touched) {
                  <mat-error>هذا الحقل مطلوب</mat-error>
                } @else if (form.get('phone')?.hasError('egyptMobile') && form.get('phone')?.touched) {
                  <mat-error>رقم الهاتف غير صحيح</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>الفئات المختصة *</mat-label>
                <mat-select formControlName="categories" multiple>
                  @for (cat of categoryOptions; track cat.key) {
                    <mat-option [value]="cat.key">{{ cat.label }}</mat-option>
                  }
                </mat-select>
                @if (form.get('categories')?.invalid && form.get('categories')?.touched) {
                  <mat-error>اختر فئة واحدة على الأقل</mat-error>
                }
              </mat-form-field>

              @if (!editingId()) {
                <p class="auth-note">سيتم إنشاء حساب دخول للمحكّم تلقائياً</p>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>البريد الإلكتروني *</mat-label>
                  <input matInput formControlName="email" type="email" dir="ltr">
                  @if (form.get('email')?.invalid && form.get('email')?.touched) {
                    <mat-error>البريد الإلكتروني مطلوب</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>كلمة المرور *</mat-label>
                  <input matInput formControlName="password" type="text" dir="ltr">
                  @if (form.get('password')?.invalid && form.get('password')?.touched) {
                    <mat-error>كلمة المرور مطلوبة (6 أحرف على الأقل)</mat-error>
                  }
                </mat-form-field>
                <button mat-stroked-button type="button" class="gen-btn" (click)="generateCredentials()">
                  <mat-icon>autorenew</mat-icon> توليد بريد وكلمة مرور
                </button>
              }

              @if (formError()) {
                <div class="error-box"><mat-icon>error_outline</mat-icon> {{ formError() }}</div>
              }
              @if (createdCredentials()) {
                <div class="success-box">
                  <strong>بيانات الدخول:</strong><br>
                  البريد: <span dir="ltr">{{ createdCredentials()!.email }}</span><br>
                  كلمة المرور: <span dir="ltr">{{ createdCredentials()!.password }}</span>
                </div>
              }

              <div style="display:flex;gap:10px;margin-top:8px">
                <button mat-flat-button type="submit" class="btn-gold" style="flex:1;height:44px;font-size:14px"
                        [disabled]="form.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> }
                  @else { <mat-icon>save</mat-icon> }
                  {{ editingId() ? 'حفظ التعديلات' : 'إضافة المحكّم' }}
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
    .sheikhs-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px; }
    .sheikh-card  { background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-md);padding:18px;display:flex;flex-direction:column;gap:13px; }
    .sheikh-card__head { display:flex;align-items:center;gap:11px; }
    .sheikh-av    { width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#0a0f1a;flex-shrink:0; }
    .sheikh-name  { font-size:15px;font-weight:700; }
    .sheikh-phone, .sheikh-email { font-size:12px;color:var(--text-muted);margin-top:2px; }
    .active-dot   { width:10px;height:10px;border-radius:50%;background:var(--border-accent);&.active{background:var(--green);} }
    .sheikh-cats  { display:flex;flex-wrap:wrap;gap:6px; }
    .sheikh-stat-row { display:flex;align-items:center;background:var(--bg-secondary);border-radius:9px;padding:11px; }
    .sheikh-stat  { flex:1;text-align:center;&__val{font-size:18px;font-weight:700;}&__lbl{font-size:10px;color:var(--text-muted);} }
    .sheikh-stat-sep { width:1px;height:32px;background:var(--border-primary); }
    .sheikh-card__actions { display:flex;gap:7px;align-items:center; }
    .auth-note { font-size:13px;color:var(--text-muted);margin:8px 0; }
    .gen-btn { width:100%;margin-bottom:12px;font-family:Cairo,sans-serif; }
    .error-box { display:flex;align-items:center;gap:7px;padding:9px 13px;background:rgba(232,85,85,.12);border-radius:var(--r-sm);color:var(--red);font-size:13px;margin-bottom:6px; }
    .success-box { padding:12px;background:rgba(45,212,160,.12);border-radius:var(--r-sm);font-size:13px;margin-bottom:8px;line-height:1.6; }
    .form-overlay { position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
    .form-sheet   { background:var(--bg-card);border:1px solid var(--border-accent);border-radius:var(--r-xl);padding:28px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto; }
    .form-sheet__header { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; h3{font-size:17px;font-weight:700;} }
  `]
})
export class SheikhsComponent implements OnInit {
  private sheikhSvc = inject(SheikhService);
  private auth      = inject(AuthService);
  private dialog    = inject(MatDialog);
  private snack     = inject(MatSnackBar);
  private fb        = inject(FormBuilder);

  sheikhs   = signal<Sheikh[]>([]);
  loading   = signal(true);
  showForm  = signal(false);
  editingId = signal<string | null>(null);
  saving    = signal(false);
  formError = signal('');
  createdCredentials = signal<{ email: string; password: string } | null>(null);

  categoryOptions = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }));

  form = this.fb.group({
    name:       ['', [Validators.required, Validators.minLength(4)]],
    phone:      ['', [Validators.required, egyptMobileValidator()]],
    categories: [[] as CompetitionCategory[], [Validators.required, Validators.minLength(1)]],
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(6)]],
  });

  catLabel(cat: CompetitionCategory): string { return CATEGORY_LABELS[cat] ?? cat; }

  ngOnInit(): void {
    this.sheikhSvc.getAll().subscribe(list => {
      this.sheikhs.set(list);
      this.loading.set(false);
    });
  }

  openForm(s?: Sheikh): void {
    this.formError.set('');
    this.createdCredentials.set(null);
    if (s) {
      this.editingId.set(s.id);
      this.form.patchValue({ name: s.name, phone: s.phone, categories: s.categories });
      this.form.get('email')?.clearValidators();
      this.form.get('password')?.clearValidators();
    } else {
      this.editingId.set(null);
      this.form.reset({ categories: [] });
      this.form.get('email')?.setValidators([Validators.required, Validators.email]);
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.generateCredentials();
    }
    this.form.get('email')?.updateValueAndValidity();
    this.form.get('password')?.updateValueAndValidity();
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.form.reset({ categories: [] });
    this.createdCredentials.set(null);
  }

  generateCredentials(): void {
    const name = this.form.get('name')?.value?.trim() || 'judge';
    const email = `${slugifyName(name)}.${Date.now().toString(36).slice(-4)}@quran-comp.local`;
    const password = randomPassword();
    this.form.patchValue({ email, password });
  }

  async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    try {
      const { name, phone, categories, email, password } = this.form.value;
      if (this.editingId()) {
        await this.sheikhSvc.update(this.editingId()!, { name: name!, phone: phone!, categories: categories! });
        this.snack.open('تم تحديث بيانات المحكّم', '', { duration: 3000 });
      } else {
        await this.sheikhSvc.addWithAuth(
          {
            name: name!,
            phone: phone!,
            categories: categories!,
            isActive: true,
            createdBy: this.auth.currentUser()?.uid ?? '',
          },
          email!,
          password!,
        );
        this.createdCredentials.set({ email: email!, password: password! });
        this.snack.open('تم إنشاء المحكّم وحساب الدخول', '', { duration: 4000 });
      }
      if (this.editingId()) this.closeForm();
    } catch (e: unknown) {
      this.formError.set(e instanceof Error ? e.message : 'حدث خطأ، يرجى المحاولة');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(s: Sheikh): Promise<void> {
    await this.sheikhSvc.toggleActive(s.id, !s.isActive);
    this.snack.open(`${s.name}: ${!s.isActive ? 'تم التفعيل' : 'تم التعطيل'}`, '', { duration: 2500 });
  }

  async delete(s: Sheikh): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'حذف المحكّم', message: `هل تريد حذف ${s.name}؟`, danger: true }
    });
    ref.afterClosed().subscribe(async ok => {
      if (!ok) return;
      await this.sheikhSvc.delete(s.id);
      this.snack.open(`تم حذف ${s.name}`, '', { duration: 3000 });
    });
  }
}
