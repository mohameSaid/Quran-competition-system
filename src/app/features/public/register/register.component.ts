import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatCardModule } from "@angular/material/card";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { StudentService } from "../../../core/services/student.service";
import { CompetitionService } from "../../../core/services/competition.service";
import {
  JUZ_OPTIONS,
  CATEGORY_LABELS,
  CompetitionCategory,
  Student,
  CATEGORY_RANK,
} from "../../../core/models";
import { buildStudentForm } from "../../../core/forms/student-form";
import {
  categoryFromJuz,
  parseBirthDateFromNationalId,
  PREVIOUS_LEVEL_OPTIONS,
} from "../../../core/validators/egypt.validators";
import { normalizeArabic } from "@shared/functions";
import { PreviousParticipationService } from "@core/services/previous-participation.service";

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

      @if (compStatus() === "loading") {
        <mat-card class="state-card">
          <mat-spinner diameter="40" style="margin:0 auto 16px" />
          <h3>جاري التحميل...</h3>
          <p>يرجى الانتظار لحظة</p>
        </mat-card>
      } @else if (compStatus() === "error") {
        <mat-card class="state-card">
          <mat-icon>event_busy</mat-icon>
          <h3>التسجيل غير متاح حالياً</h3>
          <p>
            لم تُفتح المسابقة بعد، أو تعذّر تحميل بياناتها. حاول مرة أخرى
            لاحقاً.
          </p>
          <button
            mat-flat-button
            class="btn-gold"
            (click)="retryLoad()"
            [disabled]="retrying()"
          >
            @if (retrying()) {
              <mat-spinner diameter="18" />
            }
            إعادة المحاولة
          </button>
        </mat-card>
      } @else if (registrationClosed()) {
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
                  <mat-label>اسم المتسابق (رباعي) *</mat-label>
                  <input
                    matInput
                    formControlName="fullName"
                    placeholder="الاسم كما في شهادة الميلاد / الرقم القومي"
                  />
                  <mat-hint>اكتب الاسم رباعياً على الأقل</mat-hint>
                  @if (f.fullName.hasError("required") && f.fullName.touched) {
                    <mat-error>هذا الحقل مطلوب</mat-error>
                  } @else if (
                    f.fullName.hasError("minWords") && f.fullName.touched
                  ) {
                    <mat-error>يجب إدخال الاسم رباعياً على الأقل</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>الرقم القومي *</mat-label>
                  <input
                    matInput
                    formControlName="nationalId"
                    type="tel"
                    dir="ltr"
                    maxlength="14"
                    inputmode="numeric"
                    placeholder="14 رقماً"
                  />
                  <mat-hint
                    >يُستخرج تاريخ الميلاد تلقائياً من الرقم القومي</mat-hint
                  >
                  @if (
                    f.nationalId.hasError("required") && f.nationalId.touched
                  ) {
                    <mat-error>هذا الحقل مطلوب</mat-error>
                  } @else if (
                    f.nationalId.hasError("nationalId") && f.nationalId.touched
                  ) {
                    <mat-error>الرقم القومي غير صحيح</mat-error>
                  }
                </mat-form-field>

                @if (derivedBirthDate()) {
                  <p class="derived-birth">
                    <mat-icon>cake</mat-icon>
                    تاريخ الميلاد المستخرج:
                    <strong>{{
                      derivedBirthDate() | date: "longDate" : "" : "ar-EG"
                    }}</strong>
                  </p>
                }

                <div class="form-grid-2">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>اسم الأم *</mat-label>
                    <input matInput formControlName="motherName" />
                    @if (f.motherName.invalid && f.motherName.touched) {
                      <mat-error>هذا الحقل مطلوب</mat-error>
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
                    <input
                      matInput
                      formControlName="parentPhone"
                      type="tel"
                      dir="ltr"
                      maxlength="11"
                    />
                    @if (
                      f.parentPhone.hasError("required") &&
                      f.parentPhone.touched
                    ) {
                      <mat-error>هذا الحقل مطلوب</mat-error>
                    } @else if (
                      f.parentPhone.hasError("egyptMobile") &&
                      f.parentPhone.touched
                    ) {
                      <mat-error>رقم الهاتف غير صحيح</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>رقم هاتف آخر</mat-label>
                    <input
                      matInput
                      formControlName="alternatePhone"
                      type="tel"
                      dir="ltr"
                      maxlength="11"
                    />
                    <mat-hint>اختياري</mat-hint>
                    @if (
                      f.alternatePhone.hasError("egyptMobile") &&
                      f.alternatePhone.touched
                    ) {
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
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>اسم المحفّظ *</mat-label>
                  <input
                    matInput
                    formControlName="memorizerName"
                    placeholder="اكتب اسم المحفّظ"
                  />
                  <mat-hint
                    >حقل نصي حر — اكتب الاسم كما تريد، لا يلزم اختيار من
                    قائمة</mat-hint
                  >
                  @if (f.memorizerName.invalid && f.memorizerName.touched) {
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
                    @if (f.juzCount.invalid && f.juzCount.touched) {
                      <mat-error>يجب اختيار قيمة</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>المستوى المتقدَّم له *</mat-label>
                    <mat-select formControlName="category">
                      @for (k of categoryKeys; track k) {
                        <mat-option [value]="k">{{
                          categoryLabels[k]
                        }}</mat-option>
                      }
                    </mat-select>
                    @if (f.category.invalid && f.category.touched) {
                      <mat-error>يجب اختيار المستوى</mat-error>
                    }
                  </mat-form-field>
                </div>

                @if (form.hasError("levelTooLow") && f.category.touched) {
                  <p class="level-warn">
                    <mat-icon>warning</mat-icon> المستوى المختار أقل من المسموح
                    به وفقاً لعدد الأجزاء أو لمستواك السابق.
                  </p>
                } @else if (
                  form.hasError("levelTooHigh") && f.category.touched
                ) {
                  <p class="level-warn">
                    <mat-icon>warning</mat-icon> المستوى المختار أعلى من المسموح
                    به وفقاً لعدد الأجزاء المحفوظة.
                  </p>
                }

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
      .derived-birth {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--accent, #2e7d32);
        margin: 0 0 8px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      .level-warn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--red, #e85555);
        margin: 0 0 8px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
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
  private studentSvc = inject(StudentService);
  private competitionSvc = inject(CompetitionService);
  private previousParticipationService = inject(PreviousParticipationService);

  form = buildStudentForm(this.fb);

  get f() {
    return this.form.controls;
  }

  juzOptions = JUZ_OPTIONS;
  previousLevels = PREVIOUS_LEVEL_OPTIONS;
  categoryLabels = CATEGORY_LABELS;
  categoryKeys: CompetitionCategory[] = ["five5", "ten10", "half15", "full30"];

  loading = signal(false);
  success = signal(false);
  regNumber = signal("");
  error = signal("");
  retrying = signal(false);

  /** تاريخ الميلاد المُستخرج من الرقم القومي — يُعرض للتأكيد فقط */
  derivedBirthDate = signal<Date | null>(null);

  /** Mirrors CompetitionService.status so the template can gate the whole form on it. */
  compStatus = this.competitionSvc.status;

  registrationClosed = () => {
    const c = this.competitionSvc.active();
    return c != null && c.registrationOpen === false;
  };

  ngOnInit(): void {
    // If the app-level APP_INITIALIZER hasn't resolved yet (slow network,
    // anonymous user landing directly on /register before anything else
    // warmed up the connection), retry once on our own so the visitor
    // isn't stuck on a permanent "loading" card.
    if (this.compStatus() === "loading") {
      this.competitionSvc.initActive().catch(() => void 0);
    }

    // استخراج تاريخ الميلاد تلقائياً من الرقم القومي عند تغييره
    this.f.nationalId.valueChanges.subscribe((id) => {
      this.derivedBirthDate.set(parseBirthDateFromNationalId(id ?? ""));
    });

    // اقتراح المستوى الافتراضي من عدد الأجزاء (قابل للتعديل من المستخدم)
    this.f.juzCount.valueChanges.subscribe((j) => {
      if (j) this.f.category.setValue(categoryFromJuz(j));
    });
  }

  async retryLoad(): Promise<void> {
    this.retrying.set(true);
    try {
      await this.competitionSvc.retry();
    } finally {
      this.retrying.set(false);
    }
  }

  async submit(): Promise<void> {
    // Guard on the readiness signal FIRST. requireActiveCompetition()
    // throwing was the original bug: an anonymous visitor would hit a
    // raw, unhandled "لم يتم تحميل بيانات المسابقة" exception with no
    // recovery path. Now the UI itself prevents reaching this point
    // unless compStatus() === 'ready', and this check is a defensive
    // second line in case state changes between render and submit.
    if (this.compStatus() !== "ready") {
      this.error.set("تعذّر تحميل بيانات المسابقة، يرجى إعادة المحاولة");
      return;
    }
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
      // memorizerId is no longer a separate FK selection — it's free text.
      // We keep the field populated only so existing reports/filters that
      // group by memorizerId keep working; memorizerName is the source of truth.
      const memorizerName = v.memorizerName!.trim();
      // تاريخ الميلاد يُشتق من الرقم القومي (التحقق يضمن صحته)
      const birthDate = parseBirthDateFromNationalId(v.nationalId!)!;

      // Check previous competitions
      const previous = await this.previousParticipationService.lookup(
        v.fullName!,
        birthDate,
      );

      const selectedCategory =
        (v.category as CompetitionCategory) || categoryFromJuz(v.juzCount!);

      if (previous && previous.level) {
        const selectedRank = CATEGORY_RANK[selectedCategory];

        if (selectedRank < previous.rank) {
          this.error.set(
            `سبق للمتسابق الاشتراك في مستوى (${previous.level}) ولا يمكن التسجيل في مستوى أقل.`,
          );
          return;
        }
      }

      const id = await this.studentSvc.add(
        compId,
        {
          fullName: v.fullName!,
          nationalId: v.nationalId!,
          motherName: v.motherName!,
          birthPlace: v.birthPlace!,
          birthDate,
          parentPhone: v.parentPhone!,
          alternatePhone: v.alternatePhone ?? "",
          memorizerId: memorizerName,
          memorizerName: memorizerName,
          juzCount: v.juzCount!,
          previousLevel: v.previousLevel!,
          category:
            (v.category as CompetitionCategory) || categoryFromJuz(v.juzCount!),
          registeredBy: "public",
        },
        "public",
      );
      this.regNumber.set("QC-" + id.substring(0, 8).toUpperCase());
      this.success.set(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "حدث خطأ، يرجى المحاولة لاحقاً";
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
