import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';

import { RegistrationService } from '../../../core/services/registration.service';
import { Gender } from '../../../core/models/platform/person.model';
import { ROLE_LABELS, RoleType, SELF_REGISTERABLE_ROLES } from '../../../core/models/platform/role.model';
import {
  minWordsValidator,
  requiredEgyptMobileValidator,
  EGYPT_NATIONAL_ID_PATTERN,
} from '../../../core/validators/egypt.validators';

/** Group-level validator: password confirmation must match. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
}

/** Optional national id — validate format only when a value is present. */
function optionalNationalId(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').toString().trim();
  return !v || EGYPT_NATIONAL_ID_PATTERN.test(v) ? null : { nationalId: true };
}

interface RoleOption {
  readonly role: RoleType;
  readonly label: string;
  readonly icon: string;
  readonly desc: string;
}

const ROLE_META: Readonly<Record<RoleType, { icon: string; desc: string }>> = {
  [RoleType.Student]: { icon: 'school', desc: 'المشاركة في البرامج والحلقات والمسابقات' },
  [RoleType.Memorizer]: { icon: 'menu_book', desc: 'إدارة الحلقات ومتابعة الطلاب' },
  [RoleType.Teacher]: { icon: 'cast_for_education', desc: 'تدريس ومتابعة الطلاب' },
  [RoleType.Parent]: { icon: 'family_restroom', desc: 'متابعة تقدّم الأبناء' },
  [RoleType.Volunteer]: { icon: 'volunteer_activism', desc: 'المشاركة في الفعاليات والتطوّع' },
  [RoleType.SuperAdmin]: { icon: 'shield', desc: '' },
  [RoleType.CompetitionAdmin]: { icon: 'emoji_events', desc: '' },
  [RoleType.CenterAdmin]: { icon: 'apartment', desc: '' },
  [RoleType.Supervisor]: { icon: 'supervisor_account', desc: '' },
  [RoleType.Evaluator]: { icon: 'grading', desc: '' },
  [RoleType.Viewer]: { icon: 'visibility', desc: '' },
};

/**
 * Unified Registration Wizard ("Registration First"): one flow for
 * everyone, then role selection. Each step is its own reactive form so
 * validation is isolated and the stepper can gate progression.
 */
@Component({
  selector: 'app-registration-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
  ],
  template: `
    <div class="wiz">
      <header class="wiz__head">
        <h1>التسجيل في المنصّة</h1>
        <p>سجّل مرّة واحدة، ثم اختر دورك — طالب، محفّظ، معلّم، ولي أمر أو متطوّع.</p>
      </header>

      <mat-stepper [linear]="true" #stepper class="wiz__stepper" labelPosition="bottom">
        <!-- Step 1 · account -->
        <mat-step [stepControl]="account" label="الحساب">
          <form [formGroup]="account" class="step">
            <mat-form-field appearance="outline">
              <mat-label>البريد الإلكتروني</mat-label>
              <input matInput type="email" formControlName="email" dir="ltr" autocomplete="email" />
              @if (account.controls.email.hasError('email') && account.controls.email.touched) {
                <mat-error>صيغة بريد غير صحيحة</mat-error>
              }
            </mat-form-field>
            <div class="step__row">
              <mat-form-field appearance="outline">
                <mat-label>كلمة المرور</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password" />
                @if (account.controls.password.hasError('minlength')) {
                  <mat-error>٦ أحرف على الأقل</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>تأكيد كلمة المرور</mat-label>
                <input matInput type="password" formControlName="confirm" autocomplete="new-password" />
              </mat-form-field>
            </div>
            @if (account.hasError('passwordMismatch') && account.controls.confirm.touched) {
              <p class="hint hint--error">كلمتا المرور غير متطابقتين</p>
            }
            <div class="step__nav">
              <button mat-flat-button class="btn-gold" matStepperNext [disabled]="account.invalid">التالي</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 2 · personal data -->
        <mat-step [stepControl]="personal" label="البيانات الشخصية">
          <form [formGroup]="personal" class="step">
            <mat-form-field appearance="outline">
              <mat-label>الاسم الكامل (رباعي)</mat-label>
              <input matInput formControlName="fullName" />
              @if (personal.controls.fullName.hasError('minWords')) {
                <mat-error>أدخل الاسم رباعياً على الأقل</mat-error>
              }
            </mat-form-field>
            <div class="step__row">
              <mat-form-field appearance="outline">
                <mat-label>رقم الجوال</mat-label>
                <input matInput formControlName="phone" dir="ltr" inputmode="numeric" />
                @if (personal.controls.phone.hasError('egyptMobile')) {
                  <mat-error>رقم جوال غير صحيح (01XXXXXXXXX)</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>الرقم القومي (اختياري)</mat-label>
                <input matInput formControlName="nationalId" dir="ltr" inputmode="numeric" />
                @if (personal.controls.nationalId.hasError('nationalId')) {
                  <mat-error>رقم قومي غير صحيح</mat-error>
                }
              </mat-form-field>
            </div>
            <div class="genders">
              <span class="genders__label">النوع</span>
              <mat-radio-group formControlName="gender" class="genders__group">
                <mat-radio-button [value]="genders.Male">ذكر</mat-radio-button>
                <mat-radio-button [value]="genders.Female">أنثى</mat-radio-button>
              </mat-radio-group>
            </div>
            <div class="step__nav">
              <button mat-stroked-button matStepperPrevious>السابق</button>
              <button mat-flat-button class="btn-gold" matStepperNext [disabled]="personal.invalid">التالي</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 3 · roles -->
        <mat-step [stepControl]="roleForm" label="الأدوار">
          <div class="step">
            <p class="hint">اختر دوراً واحداً أو أكثر — يمكنك إضافة أدوار لاحقاً.</p>
            <div class="roles-grid">
              @for (opt of roleOptions; track opt.role) {
                <button type="button" class="role-card"
                  [class.selected]="isRoleSelected(opt.role)"
                  (click)="toggleRole(opt.role)"
                  [attr.aria-pressed]="isRoleSelected(opt.role)">
                  <mat-icon>{{ opt.icon }}</mat-icon>
                  <span class="role-card__title">{{ opt.label }}</span>
                  <span class="role-card__desc">{{ opt.desc }}</span>
                  @if (isRoleSelected(opt.role)) { <mat-icon class="tick">check_circle</mat-icon> }
                </button>
              }
            </div>
            <div class="step__nav">
              <button mat-stroked-button matStepperPrevious>السابق</button>
              <button mat-flat-button class="btn-gold" matStepperNext [disabled]="selectedRoles().length === 0">التالي</button>
            </div>
          </div>
        </mat-step>

        <!-- Step 4 · review -->
        <mat-step label="مراجعة">
          <div class="step">
            <div class="review">
              <div class="review__row"><span>الاسم</span><b>{{ personal.controls.fullName.value }}</b></div>
              <div class="review__row"><span>البريد</span><b dir="ltr">{{ account.controls.email.value }}</b></div>
              <div class="review__row"><span>الجوال</span><b dir="ltr">{{ personal.controls.phone.value }}</b></div>
              <div class="review__row"><span>الأدوار</span>
                <b>{{ selectedRoleLabels() }}</b>
              </div>
            </div>
            <div class="step__nav">
              <button mat-stroked-button matStepperPrevious [disabled]="submitting()">السابق</button>
              <button mat-flat-button class="btn-gold" (click)="submit()" [disabled]="submitting()">
                {{ submitting() ? 'جارٍ التسجيل…' : 'إتمام التسجيل' }}
              </button>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: [`
    .wiz { max-width: 720px; margin: 32px auto; padding: 0 16px; }
    .wiz__head { text-align: center; margin-bottom: 8px; }
    .wiz__head h1 { font-size: 24px; font-weight: 800; color: var(--primary); }
    .wiz__head p { color: var(--text-secondary); font-size: 14px; margin-top: 6px; }
    .wiz__stepper { background: transparent; }
    .step { display: flex; flex-direction: column; gap: 10px; padding: 20px 4px; }
    .step__row { display: flex; gap: 12px; flex-wrap: wrap; }
    .step__row mat-form-field { flex: 1; min-width: 200px; }
    .step mat-form-field { width: 100%; }
    .step__nav { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; }
    .step__nav button:only-child { margin-inline-start: auto; }
    .hint { color: var(--text-secondary); font-size: 13px; }
    .hint--error { color: var(--red); font-weight: 600; }
    .genders { display: flex; align-items: center; gap: 16px; margin: 6px 0; }
    .genders__label { color: var(--text-secondary); font-size: 14px; }
    .genders__group { display: flex; gap: 20px; }
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin: 10px 0; }
    .role-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
      text-align: start; padding: 16px; border: 2px solid var(--border); border-radius: var(--r-lg);
      background: var(--card); cursor: pointer; transition: .18s; font: inherit; }
    .role-card:hover { border-color: var(--primary-light); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
    .role-card.selected { border-color: var(--primary); background: var(--secondary); }
    .role-card > mat-icon { color: var(--primary); font-size: 28px; width: 28px; height: 28px; }
    .role-card__title { font-weight: 700; font-size: 15px; }
    .role-card__desc { font-size: 12px; color: var(--text-muted); }
    .role-card .tick { position: absolute; inset-inline-end: 10px; inset-block-start: 10px; color: var(--primary); font-size: 20px; width: 20px; height: 20px; }
    .review { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 8px 16px; }
    .review__row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
    .review__row:last-child { border-bottom: none; }
    .review__row span { color: var(--text-secondary); }
  `],
})
export class RegistrationWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reg = inject(RegistrationService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly genders = Gender;
  readonly submitting = signal(false);
  readonly selectedRoles = signal<readonly RoleType[]>([]);

  readonly roleOptions: readonly RoleOption[] = SELF_REGISTERABLE_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    icon: ROLE_META[role].icon,
    desc: ROLE_META[role].desc,
  }));

  readonly account = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly personal = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, minWordsValidator(4)]],
    phone: ['', [requiredEgyptMobileValidator()]],
    nationalId: ['', [optionalNationalId]],
    gender: [Gender.Male, [Validators.required]],
  });

  // A control the stepper can gate on: valid only when ≥1 role picked.
  readonly roleForm = this.fb.group({ picked: [false, Validators.requiredTrue] });

  readonly selectedRoleLabels = computed(() =>
    this.selectedRoles().map((r) => ROLE_LABELS[r]).join('، '),
  );

  isRoleSelected(role: RoleType): boolean {
    return this.selectedRoles().includes(role);
  }

  toggleRole(role: RoleType): void {
    this.selectedRoles.update((roles) =>
      roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role],
    );
    this.roleForm.controls.picked.setValue(this.selectedRoles().length > 0);
  }

  async submit(): Promise<void> {
    if (this.account.invalid || this.personal.invalid || this.selectedRoles().length === 0) return;
    this.submitting.set(true);
    const a = this.account.getRawValue();
    const p = this.personal.getRawValue();
    try {
      await this.reg.register({
        email: a.email.trim(),
        password: a.password,
        fullName: p.fullName.trim(),
        gender: p.gender,
        phone: p.phone.trim(),
        nationalId: p.nationalId.trim() || undefined,
        roles: this.selectedRoles(),
      });
      this.snack.open('تم التسجيل بنجاح! بانتظار اعتماد الدور.', 'حسناً', { duration: 5000 });
      this.router.navigate(['/login']);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      const msg =
        code === 'auth/email-already-in-use'
          ? 'هذا البريد مسجّل بالفعل'
          : 'تعذّر إكمال التسجيل — حاول مجدداً';
      this.snack.open(msg, 'إغلاق', { duration: 5000 });
    } finally {
      this.submitting.set(false);
    }
  }
}
