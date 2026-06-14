import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatCardModule } from "@angular/material/card";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MemorizerService } from "../../../core/services/memorizer.service";
import { StudentService } from "../../../core/services/student.service";
import { CompetitionService } from "../../../core/services/competition.service";
import { JUZ_OPTIONS } from "../../../core/models";
import {
  requiredEgyptMobileValidator,
  optionalEgyptMobileValidator,
  categoryFromJuz,
  PREVIOUS_LEVEL_OPTIONS,
} from "../../../core/validators/egypt.validators";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDatepickerModule,
  ],
  template: `
    <div class="reg-page">
      <div class="reg-header">
        <h2>تسجيل متسابق جديد</h2>
        <p>املأ البيانات التالية للتسجيل في المسابقة</p>
      </div>

      @if (registrationClosed()) {
        <mat-card class="state-card">
          <mat-icon>event_busy</mat-icon>
          <h3>التسجيل مغلق حالياً</h3>
          <p>لم يُفتح باب التسجيل بعد، أو انتهت فترة التسجيل.</p>
          <a routerLink="/" mat-flat-button class="btn-gold">العودة للرئيسية</a>
        </mat-card>
      } @else if (success()) {
        <mat-card class="state-card state-card--success">
          <div class="success-icon">✓</div>
          <h3>تم التسجيل بنجاح</h3>
          <p>سيتواصل معك المسؤول لتحديد موعد الاختبار</p>
          <p class="reg-num">
            رقم التسجيل: <strong>{{ regNumber() }}</strong>
          </p>
          <div class="success-actions">
            <button mat-flat-button class="btn-gold" (click)="reset()">
              تسجيل متسابق آخر
            </button>
            <a routerLink="/" mat-stroked-button class="btn-cancel">الرئيسية</a>
          </div>
        </mat-card>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="reg-form">

          <!-- 1. البيانات الشخصية -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>البيانات الشخصية</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="fields">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>اسم المتسابق *</mat-label>
                  <input matInput formControlName="fullName" />
                  @if (f.fullName.invalid && f.fullName.touched) {
                    <mat-error>هذا الحقل مطلوب</mat-error>
                  }
                </mat-form-field>

                <div class="form-grid-2">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>تاريخ الميلاد *</mat-label>
                    <input matInput [matDatepicker]="birthPicker" formControlName="birthDate" />
                    <mat-datepicker-toggle matIconSuffix [for]="birthPicker" />
                    <mat-datepicker #birthPicker />
                    @if (f.birthDate.invalid && f.birthDate.touched) {
                      <mat-error>يجب اختيار تاريخ الميلاد</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>محل الميلاد الحالي *</mat-label>
                    <input matInput formControlName="birthPlace" />
                    @if (f.birthPlace.invalid && f.birthPlace.touched) {
                      <mat-error>هذا الحقل مطلوب</mat-error>
                    }
                  </mat-form-field>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 2. بيانات التواصل -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>بيانات التواصل</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="fields">
                <div class="form-grid-2">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>رقم هاتف ولي الأمر *</mat-label>
                    <input matInput formControlName="parentPhone" type="tel" dir="ltr" maxlength="11" />
                    @if (f.parentPhone.hasError('required') && f.parentPhone.touched) {
                      <mat-error>هذا الحقل مطلوب</mat-error>
                    } @else if (f.parentPhone.hasError('egyptMobile') && f.parentPhone.touched) {
                      <mat-error>رقم الهاتف غير صحيح</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>رقم هاتف آخر</mat-label>
                    <input matInput formControlName="alternatePhone" type="tel" dir="ltr" maxlength="11" />
                    <mat-hint>اختياري</mat-hint>
                    @if (f.alternatePhone.hasError('egyptMobile') && f.alternatePhone.touched) {
                      <mat-error>رقم الهاتف غير صحيح</mat-error>
                    }
                  </mat-form-field>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 3. بيانات الحفظ -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>بيانات الحفظ</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="fields">
                <!-- <mat-form-field appearance="outline" class="full-width">
                  <mat-label>اسم المحفّظ *</mat-label>
                  <mat-select formControlName="memorizerId" (selectionChange)="onMemorizerChange($event.value)">
                    @if (memorizersLoading()) {
                      <mat-option disabled>جاري التحميل...</mat-option>
                    }
                    @for (m of memorizers(); track m.id) {
                      <mat-option [value]="m.id">{{ m.name }}</mat-option>
                    }
                    @if (!memorizersLoading() && memorizers().length === 0) {
                      <mat-option disabled>لا يوجد محفّظون — تواصل مع الإدارة</mat-option>
                    }
                  </mat-select>
                  @if (f.memorizerId.invalid && f.memorizerId.touched) {
                    <mat-error>يجب اختيار قيمة</mat-error>
                  }
                </mat-form-field> -->

                <div class="form-grid-2">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>عدد الأجزاء المحفوظة *</mat-label>
                    <mat-select formControlName="juzCount">
                      @for (j of juzOptions; track j) {
                        <mat-option [value]="j">{{ j }} جزء</mat-option>
                      }
                    </mat-select>
                    @if (f.juzCount.invalid && f.juzCount.touched) {
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
                    @if (f.previousLevel.invalid && f.previousLevel.touched) {
                      <mat-error>يجب اختيار قيمة</mat-error>
                    }
                  </mat-form-field>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          @if (error()) {
            <div class="error-box">
              <mat-icon>error_outline</mat-icon> {{ error() }}
            </div>
          }

          <button
            mat-flat-button
            type="submit"
            class="btn-gold submit-btn"
            [disabled]="form.invalid || loading()"
          >
            @if (loading()) {
              <mat-spinner diameter="18" />
            }
            تسجيل المتسابق
          </button>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .reg-page {
        padding: 6rem 1rem 3rem;
        max-width: 640px;
        margin: 0 auto;
      }
      .reg-header {
        text-align: center;
        margin-bottom: 24px;
        h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 6px;
        }
        p {
          font-size: 14px;
          color: var(--muted-fg);
        }
      }
      .reg-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-section {
        padding: 0;
        overflow: hidden;
        mat-card-header {
          padding: 16px 20px 0;
        }
        mat-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }
        mat-card-content {
          padding: 12px 20px 20px;
        }
      }
      .fields {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .form-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 560px) {
        .form-grid-2 {
          grid-template-columns: 1fr;
        }
      }
      .full-width {
        width: 100%;
      }
      .error-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px;
        background: rgba(232, 85, 85, 0.12);
        border: 1px solid rgba(232, 85, 85, 0.3);
        border-radius: var(--r-sm);
        color: var(--red);
        font-size: 14px;
      }
      .submit-btn {
        width: 100%;
        height: 48px;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .state-card {
        text-align: center;
        padding: 40px 28px;
        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: var(--muted-fg);
          margin-bottom: 12px;
        }
        h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 8px;
        }
        p {
          font-size: 14px;
          color: var(--muted-fg);
        }
        &--success {
          border-color: rgba(46, 125, 50, 0.3);
        }
      }
      .success-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--primary);
        color: #fff;
        font-size: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      }
      .reg-num {
        margin-top: 12px;
        font-size: 15px;
        strong {
          color: var(--accent);
        }
      }
      .success-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 20px;
        @media (min-width: 480px) {
          flex-direction: row;
          justify-content: center;
        }
      }
      .btn-cancel {
        font-family: Cairo, sans-serif;
        height: 44px;
      }
    `,
  ],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private memorizerSvc = inject(MemorizerService);
  private studentSvc = inject(StudentService);
  private competitionSvc = inject(CompetitionService);

  form = this.fb.group({
    fullName: ["", [Validators.required, Validators.minLength(4)]],
    birthPlace: ["", Validators.required],
    birthDate: [null as Date | null, Validators.required],
    parentPhone: ["", requiredEgyptMobileValidator()],
    alternatePhone: ["", optionalEgyptMobileValidator()],
    memorizerId: ["", ],
    memorizerName: [""],
    juzCount: [null as number | null, Validators.required],
    previousLevel: ["", Validators.required],
  });

  get f() {
    return this.form.controls;
  }

  memorizers = signal<{ id: string; name: string }[]>([]);
  memorizersLoading = signal(true);

  juzOptions = JUZ_OPTIONS;
  previousLevels = PREVIOUS_LEVEL_OPTIONS;

  loading = signal(false);
  success = signal(false);
  regNumber = signal("");
  error = signal("");

  registrationClosed = () => {
    const c = this.competitionSvc.active();
    return c != null && c.registrationOpen === false;
  };

  ngOnInit(): void {
    this.memorizerSvc.getActive().subscribe((list) => {
      this.memorizers.set(list);
      this.memorizersLoading.set(false);
    });
  }

  onMemorizerChange(id: string): void {
    const m = this.memorizers().find((x) => x.id === id);
    if (m) this.form.patchValue({ memorizerName: m.name });
  }

  async submit(): Promise<void> {
    if (this.registrationClosed()) {
      this.error.set("التسجيل مغلق حالياً");
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set("");
    try {
      const compId = this.competitionSvc.requireActiveCompetition();
      const v = this.form.value;
      const id = await this.studentSvc.add(
        compId,
        {
          fullName: v.fullName!,
          birthPlace: v.birthPlace!,
          birthDate: v.birthDate!,
          parentPhone: v.parentPhone!,
          alternatePhone: v.alternatePhone ?? "",
          memorizerId: v.memorizerId!,
          memorizerName: v.memorizerName!,
          juzCount: v.juzCount!,
          previousLevel: v.previousLevel!,
          category: categoryFromJuz(v.juzCount!),
          registeredBy: "public",
        },
        "public",
      );
      this.regNumber.set("QC-" + id.substring(0, 8).toUpperCase());
      this.success.set(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ، يرجى المحاولة لاحقاً";
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.form.reset();
    this.success.set(false);
    this.error.set("");
  }
}
