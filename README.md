# نظام مسابقة القرآن الكريم v2.0 📖

> Angular 19 + Firebase 11 + Angular Material 19 (M3 API)

---

## 🚀 تشغيل المشروع

```bash
# 1. تثبيت المكتبات
npm install

# 2. ضع بيانات مشروع Firebase في:
#    src/environments/environment.dev.ts

# 3. شغّل محلياً
npm start

# 4. نشر على Firebase
npm run deploy
```

---

## 🔧 إعداد Firebase (خطوة واحدة)

في `src/environments/environment.dev.ts` عدّل:

```typescript
firebase: {
  apiKey:            'xxx',
  authDomain:        'your-project.firebaseapp.com',
  projectId:         'your-project',
  storageBucket:     'your-project.appspot.com',
  messagingSenderId: 'xxx',
  appId:             'xxx'
}
```

---

## 🔒 نشر قواعد Firestore

تأكد أن `.firebaserc` يشير إلى مشروعك (`quran-competition-system`) ثم:

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

### اختبار القواعد (Firebase Console)

1. افتح **Firestore → Rules → Rules Playground**
2. جرّب المسارات التالية:
   - `competitions/default/students/{id}` — **create** بدون مصادقة (يجب أن ينجح)
   - `users/{uid}` — **read** بمستخدم مصادق (يجب أن ينجح)
   - `sheikhs/{id}` — **update** بمحكّم يملك نفس `sheikhId` (حقل `totalEvaluated` فقط)
3. اختبار حي: تسجيل متسابق عام → نجاح؛ دخول مسؤول → قراءة لوحة التحكم

### أسباب شائعة لخطأ Missing or insufficient permissions

| السبب | الحل |
|-------|------|
| القواعد غير منشورة على المشروع الصحيح | `firebase deploy --only firestore:rules` |
| المستخدم بدون مستند `/users/{uid}` | أنشئ المستند يدوياً أو سجّل دخولاً جديداً |
| محكّم بدون `sheikhId` في `/users/{uid}` | أضف `sheikhId` يطابق معرف الشيخ في `/sheikhs` |
| دور `public` يحاول قراءة بيانات محمية | طبيعي — فقط admin/sheikh يقرأون الطلاب |

---

## 👤 إنشاء أول مسؤول

بعد التسجيل في Firebase Auth، ادخل Firestore وأضف:

```
/users/{uid}  →  { role: "admin", displayName: "اسمك" }
```

لإنشاء محكّم:
```
/users/{uid}  →  { role: "sheikh", sheikhId: "sheikh-doc-id" }
```

---

## 📁 هيكل المشروع

```
src/app/
├── core/
│   ├── models/          ← جميع الـ interfaces
│   ├── services/        ← Firebase services
│   │   ├── auth.service.ts
│   │   ├── student.service.ts    ← CRUD كامل
│   │   ├── sheikh.service.ts     ← CRUD كامل
│   │   ├── session.service.ts    ← CRUD كامل
│   │   ├── score.service.ts      ← submit + publish
│   │   ├── competition.service.ts
│   │   ├── audit.service.ts      ← immutable log
│   │   └── export.service.ts     ← Excel lazy-loaded
│   ├── guards/          ← auth / admin / sheikh
│   └── interceptors/    ← error handler
├── shared/
│   ├── components/
│   │   ├── confirm-dialog/   ← reusable confirm
│   │   ├── loading-spinner/
│   │   ├── empty-state/
│   │   ├── medal/
│   │   └── score-badge/
│   └── pipes/           ← grade | categoryLabel
└── features/            ← lazy-loaded modules
    ├── public/          ← home (static) + register
    ├── auth/            ← login
    ├── admin/           ← dashboard, students, sheikhs,
    │                       sessions, results, reports
    └── sheikh/          ← queue + scoring
```

---

## 🗄️ Firestore Schema

```
/competitions/{compId}
  ├── /students/{studentId}
  │     fullName, nationalId, parentPhone,
  │     sheikhId, sheikhName, age, juzCount,
  │     category, status, sessionId, ...
  ├── /scores/{scoreId}        ← immutable
  │     breakdown{hifz,tajweed,ada,waqf},
  │     total, isPublished, ...
  └── /sessions/{sessionId}
        sheikhId, category, date, capacity,
        studentIds[], status, ...

/users/{uid}        ← role, sheikhId
/sheikhs/{id}       ← name, phone, categories, isActive
/auditLogs/{id}     ← append-only, never updated
```

---

## 📊 معايير التقييم (100 درجة)

| المعيار | الدرجة | الوصف |
|---------|--------|-------|
| الحفظ والاسترسال | /40 | مستوى الحفظ والطلاقة |
| أحكام التجويد   | /30 | تطبيق أحكام التجويد |
| جمال الصوت والأداء | /20 | حسن الصوت والترتيل |
| الوقف والابتداء | /10 | صحة مواضع الوقف |

---

## ✅ ما تم إنجازه

- [x] Angular 19 + Material 19 (mat.define-theme — New M3 API)
- [x] لا بيانات مُصطنعة — كل شيء من Firestore
- [x] CRUD كامل: متسابقون / محكّمون / جلسات
- [x] نموذج التسجيل: الاسم، الهوية، جوال ولي الأمر، الشيخ (من Firestore)، العمر، الأجزاء
- [x] صفحة عامة بسيطة: معلومات ثابتة + زر تسجيل فقط
- [x] قائمة انتظار المحكّم — من Firestore (الجلسة اليوم)
- [x] نموذج التقييم مع نسب مئوية سريعة + ضبط دقيق
- [x] نشر النتائج مع تأكيد + سجل audit
- [x] تصدير Excel (lazy loaded)
- [x] Firestore Security Rules كاملة
- [x] فصل كامل: Core / Shared / Features

---

## 🏛️ منصّة القرآن (Platform Layer) — المرحلة الأولى

تطوّر النظام من "تطبيق مسابقة" إلى **منصّة قرآنية** قابلة للتوسّع، حيث المسابقة مجرد
نوع واحد من البرامج. راجع وثيقة المعمارية الكاملة (القرارات، المفاضلات، نموذج البيانات):

📄 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

**ما تمّت إضافته في هذه المرحلة:**

- **Person First** — كيان `Person` موحّد لكل الأشخاص، والأدوار Subcollection لكل شخص.
- **Registration First** — معالج تسجيل موحّد `‎/public/join` (خطوات: الحساب → البيانات → الأدوار → مراجعة).
- **Configuration over Code** — البيانات المرجعية (`‎/admin/master-data`) تُدار من لوحة التحكم لكل النطاقات بواجهة واحدة.
- **RBAC مرن** — صلاحيات `resource:action`؛ الحماية بالصلاحية لا بالدور (`requirePermission`, `*appHasPermission`).
- **سجل الأشخاص** — `‎/admin/persons` مع ترقيم صفحات بالمؤشّر (cursor) وبحث بالبادئة.
- **قواعد أمان + فهارس + قواعد Storage** لكل المجموعات الجديدة.
- **بذور بيانات** — `seed/*.json` + سكربت استيراد.

**استيراد البيانات المرجعية:**

```bash
npm i -D firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
npm run seed          # أو: npm run seed:dry للمعاينة دون كتابة
```

**نشر قواعد Storage:**

```bash
firebase deploy --only storage
```
