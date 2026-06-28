import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatSnackBar } from "@angular/material/snack-bar";
import { PreviousParticipationService } from "../../../core/services/previous-participation.service";
import { CompetitionService } from "../../../core/services/competition.service";
import { PreviousParticipation } from "../../../core/models";
import { formatEgyptDate } from "../../../core/validators/egypt.validators";

@Component({
  selector: "app-previous-data",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  template: `
    <div class="page-wrap">
      <div class="section-header">
        <div class="section-title">
          بيانات المسابقات السابقة ({{ records().length }})
        </div>
        <div style="display:flex;gap:8px">
          <input
            #file
            type="file"
            accept=".xlsx,.xls"
            hidden
            (change)="onFile($event)"
          />
          <button
            mat-stroked-button
            (click)="file.click()"
            [disabled]="importing()"
          >
            <mat-icon>upload_file</mat-icon> استيراد Excel
          </button>
          <button
            mat-flat-button
            class="btn-gold"
            (click)="showForm.set(!showForm())"
          >
            <mat-icon>add</mat-icon> إضافة سجل
          </button>
        </div>
      </div>

      @if (!linkingEnabled()) {
        <div class="info-box">
          <mat-icon>info</mat-icon>
          الربط بالمسابقات السابقة غير مُفعّل حالياً. فعّله من إعدادات المسابقة
          لاستخدام هذه البيانات في التحقق.
        </div>
      }

      @if (showForm()) {
        <mat-card class="form-card">
          <form [formGroup]="form" (ngSubmit)="add()">
            <div class="grid-2">
              <mat-form-field appearance="outline"
                ><mat-label>الاسم *</mat-label
                ><input matInput formControlName="name"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>تاريخ الميلاد</mat-label
                ><input matInput type="date" formControlName="birthDate"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>الهواتف (مفصولة بفاصلة)</mat-label
                ><input matInput formControlName="mobileNumbers" dir="ltr"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>الصف الدراسي</mat-label
                ><input matInput formControlName="studyGrade"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>اسم المحفّظ</mat-label
                ><input matInput formControlName="memorizerName"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>الأجزاء المحفوظة</mat-label
                ><input matInput formControlName="memorizedParts"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>المستوى *</mat-label
                ><input
                  matInput
                  formControlName="level"
                  placeholder="مثال: القرآن كاملا، 15 جزءاً"
              /></mat-form-field>
              <mat-form-field appearance="outline"
                ><mat-label>ملاحظات</mat-label
                ><input matInput formControlName="notes"
              /></mat-form-field>
            </div>
            <button
              mat-flat-button
              class="btn-gold"
              type="submit"
              [disabled]="form.invalid"
            >
              حفظ السجل
            </button>
          </form>
        </mat-card>
      }

      @if (records().length === 0) {
        <p class="empty">
          لا توجد بيانات سابقة. أضف سجلاً أو استورد ملف Excel.
        </p>
      } @else {
        <div class="qc-table-wrap">
          <table class="qc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>تاريخ الميلاد</th>
                <th>المحفّظ</th>
                <th>الأجزاء</th>
                <th>المستوى</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of records(); track r.id; let i = $index) {
                <tr>
                  <td>{{ i + 1 }}</td>
                  <td>
                    <strong>{{ r.name }}</strong>
                  </td>
                  <td>{{ formatDate(r.birthDate) }}</td>
                  <td>{{ r.memorizerName || "—" }}</td>
                  <td>{{ r.memorizedParts || "—" }}</td>
                  <td>{{ r.level || "—" }}</td>
                  <td>
                    <button
                      mat-icon-button
                      style="color:var(--red)"
                      (click)="remove(r)"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 8px;
      }
      @media (max-width: 560px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
      .grid-2 mat-form-field {
        width: 100%;
      }
      .form-card {
        padding: 18px;
        margin-bottom: 16px;
      }
      .info-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px;
        margin-bottom: 16px;
        background: var(--secondary);
        border: 1px solid var(--border-primary);
        border-radius: var(--r-sm);
        color: var(--primary);
        font-size: 14px;
      }
      .empty {
        text-align: center;
        padding: 36px;
        color: var(--text-muted);
      }
    `,
  ],
})
export class PreviousDataComponent implements OnInit {
  private prevSvc = inject(PreviousParticipationService);
  private competitionSvc = inject(CompetitionService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  records = signal<PreviousParticipation[]>([]);
  showForm = signal(false);
  importing = signal(false);
  formatDate = formatEgyptDate;

  linkingEnabled = () => !!this.competitionSvc.active()?.previousLinkingEnabled;

  form = this.fb.group({
    name: ["", Validators.required],
    birthDate: [""],
    mobileNumbers: [""],
    studyGrade: [""],
    memorizerName: [""],
    memorizedParts: [""],
    level: ["", Validators.required],
    notes: [""],
  });

  ngOnInit(): void {
    this.prevSvc.getAll().subscribe((list) => this.records.set(list));
  }

  async add(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    try {
      await this.prevSvc.add({
        name: v.name!.trim(),
        birthDate: v.birthDate ? new Date(v.birthDate) : null,
        mobileNumbers: (v.mobileNumbers ?? "")
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        studyGrade: v.studyGrade ?? "",
        memorizerName: v.memorizerName ?? "",
        memorizedParts: v.memorizedParts ?? "",
        level: v.level!.trim(),
        notes: v.notes || null,
      });
      this.snack.open("تم حفظ السجل", "", { duration: 2500 });
      this.form.reset();
      this.showForm.set(false);
    } catch {
      this.snack.open("تعذّر الحفظ", "", { duration: 3000 });
    }
  }

  async remove(r: PreviousParticipation): Promise<void> {
    if (!r.id) return;
    await this.prevSvc.delete(r.id);
    this.snack.open("تم الحذف", "", { duration: 2000 });
  }

async onFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  this.importing.set(true);

  try {
    const XLSX = await import('xlsx');

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
    });

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils
      .sheet_to_json<Record<string, unknown>>(worksheet, {
        raw: false,
        defval: '',
      })
      .map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key.trim().replace(/\s+/g, ' '),
            value,
          ]),
        ) as Record<string, unknown>,
      );

    console.log('Headers:', Object.keys(rows[0] ?? {}));
    console.log('First Row:', rows[0]);

    const imported = await this.prevSvc.bulkImport(rows);

    this.snack.open(`تم استيراد ${imported} سجلاً`, '', {
      duration: 3500,
    });
  } catch (error) {
    console.error('Import Error:', error);

    this.snack.open('تعذر استيراد الملف', '', {
      duration: 4000,
    });
  } finally {
    this.importing.set(false);
    input.value = '';
  }
}
}
