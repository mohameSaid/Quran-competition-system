import { FormBuilder, Validators } from '@angular/forms';
import { CompetitionCategory } from '../models';
import {
  requiredEgyptMobileValidator,
  optionalEgyptMobileValidator,
  minWordsValidator,
  nationalIdValidator,
  levelConsistencyValidator,
} from '../validators/egypt.validators';

/**
 * المصدر الموحَّد لنموذج بيانات المتسابق — يُستخدم في صفحة التسجيل العامة
 * وفي شاشة إدارة المتسابقين معاً حتى لا يتفرّع التحقق بينهما.
 *
 * ملاحظات:
 *  - الاسم رباعي على الأقل (minWords 4) مطابقةً لشهادة الميلاد / الرقم القومي.
 *  - الرقم القومي هو المصدر الأساسي؛ يُشتق منه تاريخ الميلاد (لا يُدخل يدوياً).
 *  - المستوى (category) يُختار صراحةً مع التحقق من اتساقه عبر levelConsistencyValidator.
 *    قيمة الـ floor (آخر مستوى سابق) تُحدَّث لاحقاً من الربط بالمسابقات السابقة.
 */
export function buildStudentForm(fb: FormBuilder) {
  return fb.group(
    {
      fullName:       ['', [Validators.required, minWordsValidator(4)]],
      nationalId:     ['', [nationalIdValidator()]],
      motherName:     ['', [Validators.required]],
      birthPlace:     ['', Validators.required],
      parentPhone:    ['', requiredEgyptMobileValidator()],
      alternatePhone: ['', optionalEgyptMobileValidator()],
      // نص حر — اسم المحفّظ كما يُكتب، مستقل عن اختيار الشيخ
      memorizerName:  ['', [Validators.required, Validators.minLength(2)]],
      juzCount:       [null as number | null, Validators.required],
      previousLevel:  ['', Validators.required],
      category:       ['' as CompetitionCategory | '', Validators.required],
    },
    { validators: levelConsistencyValidator(0) },
  );
}

export type StudentForm = ReturnType<typeof buildStudentForm>;
