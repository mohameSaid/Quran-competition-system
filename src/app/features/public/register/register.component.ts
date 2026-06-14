import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { SheikhService } from '../../../core/services/sheikh.service';
import { StudentService } from '../../../core/services/student.service';
import { CompetitionService } from '../../../core/services/competition.service';
import { AuthService } from '../../../core/services/auth.service';
import { CATEGORY_LABELS, JUZ_OPTIONS } from '../../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="reg-page">
      <div class="reg-header">
        <h2>📝 تسجيل متسابق جديد</h2>
        <p>أكمل جميع الحقول المطلوبة للتسجيل في المسابقة</p>
      </div>

      @if (success()) {
        <div class="success-card">
          <div style="font-size:60px;margin-bottom:16px">🎉</div>
          <h3>تم التسجيل بنجاح!</h3>
          <p>سيتواصل معك المسؤول لتحديد موعد الاختبار</p>
          <p class="reg-num">رقم التسجيل: <strong>{{ regNumber() }}</strong></p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
            <button mat-flat-button class="btn-gold" (click)="reset()">تسجيل آخر</button>
            <a routerLink="/" mat-stroked-button style="font-family:Cairo,sans-serif">الرئيسية</a>
          </div>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="reg-form">

          <div class="form-grid-2">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>الاسم الكامل (رباعي) *</mat-label>
              <input matInput formControlName="fullName" placeholder="محمد أحمد علي السيد">
              @if (f['fullName'].invalid && f['fullName'].touched) {
                <mat-error>الاسم الكامل مطلوب (4 كلمات على الأقل)</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>رقم الهوية الوطنية *</mat-label>
              <input matInput formControlName="nationalId" dir="ltr" placeholder="1xxxxxxxxx" maxlength="10">
              @if (f['nationalId'].invalid && f['nationalId'].touched) {
                <mat-error>رقم الهوية يجب أن يبدأ بـ 1 أو 2 ويتكون من 10 أرقام</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="form-grid-2">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>رقم جوال ولي الأمر *</mat-label>
              <input matInput formControlName="parentPhone" dir="ltr" placeholder="05xxxxxxxx" maxlength="10">
              @if (f['parentPhone'].invalid && f['parentPhone'].touched) {
                <mat-error>رقم الجوال يجب أن يبدأ بـ 05</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>العمر *</mat-label>
              <input matInput formControlName="age" type="number" placeholder="12" min="5" max="80">
              @if (f['age'].invalid && f['age'].touched) {
                <mat-error>العمر مطلوب (5–80)</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="form-grid-2">
            <!-- Sheikh from Firestore -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>اسم الشيخ المشرف *</mat-label>
              <mat-select formControlName="sheikhId" (selectionChange)="onSheikhChange($event.value)">
                @if (sheikhsLoading()) {
                  <mat-option disabled>جاري التحميل...</mat-option>
                }
                @for (s of sheikhs(); track s.id) {
                  <mat-option [value]="s.id">{{ s.name }}</mat-option>
                }
                @if (!sheikhsLoading() && sheikhs().length === 0) {
                  <mat-option disabled>لا يوجد محكّمون مفعّلون</mat-option>
                }
              </mat-select>
              @if (f['sheikhId'].invalid && f['sheikhId'].touched) {
                <mat-error>يرجى اختيار الشيخ</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>عدد الأجزاء المحفوظة *</mat-label>
              <mat-select formControlName="juzCount">
                @for (j of juzOptions; track j) {
                  <mat-option [value]="j">{{ j }} جزء</mat-option>
                }
              </mat-select>
              @if (f['juzCount'].invalid && f['juzCount'].touched) {
                <mat-error>يرجى تحديد عدد الأجزاء</mat-error>
              }
            </mat-form-field>
          </div>

          <!-- Category auto-suggested based on juz count -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>فئة المسابقة *</mat-label>
            <mat-select formControlName="category">
              @for (cat of categoryOptions; track cat.key) {
                <mat-option [value]="cat.key">{{ cat.label }}</mat-option>
              }
            </mat-select>
            @if (f['category'].invalid && f['category'].touched) {
              <mat-error>يرجى اختيار الفئة</mat-error>
            }
          </mat-form-field>

          @if (error()) {
            <div class="error-box"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
          }

          <div style="display:flex;gap:10px;justify-content:center;margin-top:8px">
            <button mat-flat-button type="submit" class="btn-gold submit-btn" [disabled]="form.invalid || loading()">
              @if (loading()) { <mat-spinner diameter="18" /> }
              @else { <mat-icon>how_to_reg</mat-icon> }
              تسجيل الآن
            </button>
            <a routerLink="/" mat-stroked-button style="font-family:Cairo,sans-serif;height:46px;display:flex;align-items:center">إلغاء</a>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .reg-page    { padding:32px 0;max-width:660px;margin:0 auto; }
    .reg-header  { text-align:center;margin-bottom:28px; h2{font-size:22px;font-weight:700;color:var(--gold-light);margin-bottom:6px;} p{font-size:13px;color:var(--text-muted);} }
    .reg-form    { background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--r-lg);padding:28px; }
    .error-box   { display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(232,85,85,.12);border:1px solid rgba(232,85,85,.3);border-radius:var(--r-sm);color:var(--red);font-size:13px;margin-bottom:10px; }
    .submit-btn  { height:46px;padding:0 36px;font-size:15px;display:flex;align-items:center;gap:8px; }
    .success-card{ background:var(--bg-card);border:1px solid rgba(45,212,160,.3);border-radius:var(--r-lg);padding:48px 28px;text-align:center;
      h3{font-size:22px;font-weight:700;color:var(--green);margin-bottom:8px;} p{font-size:14px;color:var(--text-muted);}
      .reg-num{margin-top:12px;font-size:15px;strong{color:var(--gold-light);}}
    }
  `]
})
export class RegisterComponent implements OnInit {
  private fb           = inject(FormBuilder);
  private sheikhSvc    = inject(SheikhService);
  private studentSvc   = inject(StudentService);
  private competitionSvc = inject(CompetitionService);
  private auth         = inject(AuthService);

  form = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(8)]],
    nationalId:  ['', [Validators.required, Validators.pattern(/^[12]\d{9}$/)]],
    parentPhone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
    age:         [null as number | null, [Validators.required, Validators.min(5), Validators.max(80)]],
    sheikhId:    ['', Validators.required],
    sheikhName:  [''],   // set programmatically
    juzCount:    [null as number | null, Validators.required],
    category:    ['', Validators.required],
  });

  get f() { return this.form.controls; }

  // Real-time from Firestore
  sheikhs        = signal<{ id: string; name: string }[]>([]);
  sheikhsLoading = signal(true);

  juzOptions = JUZ_OPTIONS;
  categoryOptions = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }));

  loading   = signal(false);
  success   = signal(false);
  regNumber = signal('');
  error     = signal('');

  ngOnInit(): void {
    this.sheikhSvc.getActive().subscribe(list => {
      this.sheikhs.set(list);
      this.sheikhsLoading.set(false);
    });

    // Auto-suggest category when juzCount changes
    this.form.get('juzCount')!.valueChanges.subscribe(v => {
      if (!v) return;
      if      (v >= 30) this.form.patchValue({ category: 'full30' });
      else if (v >= 15) this.form.patchValue({ category: 'half15' });
      else if (v >= 10) this.form.patchValue({ category: 'ten10'  });
      else              this.form.patchValue({ category: 'five5'  });
    });
  }

  onSheikhChange(id: string): void {
    const s = this.sheikhs().find(x => x.id === id);
    if (s) this.form.patchValue({ sheikhName: s.name });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    try {
      const compId = this.competitionSvc.active()?.id ?? 'default';
      const { fullName, nationalId, parentPhone, age, sheikhId, sheikhName, juzCount, category } = this.form.value;
      const id = await this.studentSvc.add(compId, {
        fullName:    fullName!,
        nationalId:  nationalId!,
        parentPhone: parentPhone!,
        age:         age!,
        sheikhId:    sheikhId!,
        sheikhName:  sheikhName!,
        juzCount:    juzCount!,
        category:    category as any,
        registeredBy:'public',
      }, 'public');
      this.regNumber.set('QC-' + id.substring(0, 8).toUpperCase());
      this.success.set(true);
    } catch (e: any) {
      this.error.set(e?.message ?? 'حدث خطأ، يرجى المحاولة لاحقاً');
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void { this.form.reset(); this.success.set(false); this.error.set(''); }
}
