# سجل تقدم الباك إند

هذا الملف هو المرجع الوحيد لأي agent يستكمل العمل على الباك إند. يجب قراءته قبل البدء وتحديث سجل التقدم بعد كل Phase.

## 1. نظرة عامة

المشروع Next.js باستخدام JavaScript، مع Prisma 7 وPostgreSQL، لموقع حزب الجبهة الوطنية. قاعدة البيانات كانت موجودة قبل المشروع ومصممة بناءً على ERD؛ لا تُنشأ أو تُعاد تهيئتها.

المهمة الحالية هي بناء باك إند فورم طلب الانضمام اعتمادًا على جدول `membership_applications`، مع توفير المحافظات للفورم. نطاق العمل الحالي Backend فقط.

## 2. قواعد ثابتة (لا تُكسر)

- ممنوع تغيير الـschema إلا بتغيير إضافي (additive) وبعد موافقة صريحة من المستخدم.
- ممنوع تشغيل:
  - `prisma migrate reset`
  - `prisma db push --force-reset`
  - `prisma db push --accept-data-loss`
  - `npm audit fix --force`
- المشروع JavaScript وليس TypeScript، واتصال قاعدة البيانات في `lib/db.js`.
- كل التحقق من البيانات يتم على الخادم، ومنطق الأعمال في طبقة `services` وليس داخل route handlers.
- ممنوع تسجيل الرقم القومي أو رقم الموبايل في logs.
- ممنوع لمس الفرونت (الصفحات، المكونات، layouts، styles أو سلوكها) إلا بطلب صريح من المستخدم.
- حافظ على البيانات الموجودة. اعرض SQL وأثره على البيانات قبل أي migration، ولا تنفذه دون موافقة صريحة.

## 3. قرارات متفق عليها

- `application_type` نوعه enum باسم `application_kind` وقيمه `member`, `volunteer`, `follower`؛ الحقل `NOT NULL` ومن دون default. التغيير مطبق في قاعدة البيانات.
- أُضيفت أعمدة دخول الموظفين إلى قاعدة البيانات: `password_hash`, `must_change_password`, `last_login_at`, `failed_login_count`, `locked_until`. لم يُبنَ منطق تسجيل الدخول أو الصلاحيات عليها بعد.
- حالة الطلب الأولى `new`، ومسار الحالات: `new` ← `under_review` ← `accepted` أو `rejected`.
- إعادة التقديم مسموحة فقط إذا كان الطلب السابق للشخص نفسه `rejected`؛ وجود طلب سابق بحالة أخرى يعني أن التقديم مكرر. يُستخدم الرقم القومي للمطابقة ولا يُسجل في logs.
- `gender` المخزن هو `male` أو `female`.
- تاريخ الميلاد والنوع يُستخرجان من الرقم القومي، بعد التحقق من صحته.
- `source` للطلبات القادمة من الموقع هو `website`.

## 3.1 عقد API Phase 6

`POST /api/applications` يستقبل JSON بالشكل التالي؛ `website` و`turnstileToken` اختياريان:

```json
{
  "type": "member",
  "full_name": "<الاسم الرباعي>",
  "phone": "<رقم موبايل مصري>",
  "national_id": "<رقم قومي من 14 رقمًا>",
  "governorate_id": 1,
  "terms_accepted": true,
  "website": "",
  "turnstileToken": ""
}
```

الأرقام العربية في `phone` و`national_id` تُحوّل إلى إنجليزية، والاسم يُقصّ، و`governorate_id` يُحوّل إلى عدد. الاستجابات:

- `201`: `{ "application_no": "<النص>" }`
- `400`: `{ "error": "VALIDATION" }` لJSON المكسور، أو `{ "error": "VALIDATION", "issues": { "<field>": ["<رسالة>"] } }` لرفض schema.
- `400`: `{ "error": "INVALID_NATIONAL_ID" }` أو `{ "error": "INVALID_GOVERNORATE" }`.
- `409`: `{ "error": "DUPLICATE" }`.
- `500`: `{ "error": "SERVER_ERROR" }` دون stack trace.

`GET /api/governorates` يرجع `{ "governorates": [{ "id": 1, "name_ar": "القاهرة" }] }` للمحافظات النشطة مرتبة حسب `sort_order`، مع `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. الطرق غير المصدّرة ترجع `405` من Next.js.

## 4. جدول المراحل

| Phase | العمل | الحالة |
|---|---|---|
| 1 | إنشاء/تهيئة المشروع | مكتمل |
| 2 | اتصال Prisma بقاعدة البيانات (`lib/db.js`) | مكتمل |
| 3 | التأكد من `application_type` في `prisma/schema.prisma` | لسه — التعريف موجود حاليًا؛ التحقق المخصص للفورم لم يُغلق بعد |
| 4 | التحقق من البيانات (Zod + الرقم القومي) | مكتمل |
| 5 | دالة الحفظ في service | مكتمل |
| 5.5 | تعبئة جدول المحافظات الـ27 | مكتمل |
| 6 | API: `POST /api/applications` و`GET /api/governorates` | مكتمل |
| 7 | الحماية (rate limit, honeypot, Turnstile) | لسه |
| 8 | ربط الفورم الحالي بالـAPI | لسه — ممنوع لمس الفرونت حتى يطلب المستخدم ذلك صراحةً |

## 5. سجل التحديثات

| التاريخ | Phase | اللي اتعمل | الملفات اللي اتعدلت | ملاحظات |
|---|---|---|---|---|
| 2026-11-17 | 1 | مراجعة ERD v9 وقاعدة البيانات القائمة؛ توحيد `application_type` في Prisma، واستعادة ملف migration المطبق، وإضافة أعمدة staff auth إلى schema وmigration إضافي ثم تطبيقه بعد موافقة المستخدم. | `prisma/schema.prisma`؛ `prisma/migrations/20261117084049_add_application_type/migration.sql`؛ `prisma/migrations/20261117091714_add_staff_auth_fields/migration.sql` | لم يُنفذ reset أو إعادة إنشاء للقاعدة. migration الخاصة بـstaff auth أضافت أعمدة فقط. |
| 2026-11-17 | 2 | إعداد Prisma 7 باستخدام PostgreSQL adapter `@prisma/adapter-pg` و`pg`؛ نقل `@prisma/client` إلى `dependencies`؛ إنشاء singleton و`connectToDatabase()` في `lib/db.js`؛ توليد Prisma Client والتحقق من اتصال حي عبر `SELECT 1`. | `lib/db.js`؛ `package.json`؛ `package-lock.json`؛ `generated/prisma/**`؛ `AGENTS.md` | Route الاختبار المؤقت حُذف بعد نجاحه. `next dev` أضاف block مُدارًا تلقائيًا إلى `AGENTS.md`. تحذير Prisma عن whitespace في الملفات المولّدة متوقع ويُتجاهل. أبلغ `npm install` عن 7 vulnerabilities متوسطة ولم تُعالج. |
| 2026-11-17 | 4 | تثبيت Zod فقط؛ إضافة تطبيع الأرقام العربية وتحليل الرقم القومي كتاريخ UTC ونوع؛ إضافة `applicationSchema` برسائل التحقق المطلوبة ورفض الحقول الزائدة؛ إضافة اختبارات `node:test` (11 ناجحة). | `package.json`؛ `package-lock.json`؛ `lib/national-id.js`؛ `lib/national-id.test.js`؛ `lib/validation/application.js`؛ `lib/validation/application.test.js` | التحقق نقي ولا يتصل بقاعدة البيانات. Node 24 يعرض تحذير `MODULE_TYPELESS_PACKAGE_JSON` بسبب عدم تحديد نوع module على مستوى الحزمة؛ الاختبارات ناجحة ولم يتغير إعداد module العام. |
| 2026-11-17 | 5 | إضافة `createApplication` للتحقق من المحافظة ومنع التكرار وإنشاء الطلب وسجل حالته داخل transaction؛ إضافة اختبارات mock. نجح اختبار PostgreSQL حقيقي للتحقق من الطلب والسجل ثم rollback؛ إجمالي الاختبارات 19 ناجحًا. | `lib/services/applications.js`؛ `lib/services/applications.test.js`؛ `docs/BACKEND_PROGRESS.md`؛ `verify-application-rollback.mjs` (مؤقت، ثم حُذف) | قبل وبعد الاختبار: 0 طلبات، 0 سجلات حالات، 0 محافظات. أُنشئت محافظة مؤقتة داخل المعاملة فقط ورُدّت. rollback لا يعيد identity sequences: استُهلكت القيمة 1 من sequence الطلب وسجل الحالة، والقيمة التالية 2. |
| 2026-11-17 | 5.5 | تعبئة المحافظات الـ27 باستخدام سكريبت idempotent يعتمد `upsert` حسب `code` داخل transaction واحدة؛ شُغّل مرتين بنجاح. | `scripts/seed-governorates.js`؛ `package.json`؛ `docs/BACKEND_PROGRESS.md` | العدد بعد التشغيلين بقي 27، وكل الصفوف بالقيم المطلوبة و`is_active = true`. لا تعديل على schema أو migrations. |
| 2026-11-17 | 6 | إضافة API الطلبات والمحافظات، مع تحويل أخطاء التحقق والخدمة إلى JSON، واختبار route POST مباشرة واختبارات curl للـGET والطلبات غير الصالحة. اختبار حقيقي بموافقة المستخدم أعاد 201 ثم 409؛ حُذف الطلب وسجل الحالة بعد موافقة منفصلة، وعادت أعدادهما إلى صفر. | `app/api/applications/route.js`؛ `app/api/applications/route.test.js`؛ `app/api/governorates/route.js`؛ `lib/services/governorates.js`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 22 ناجحًا. GET أعاد 27 محافظة مرتبة؛ JSON المكسور والاسم غير الرباعي والتاريخ المستحيل والمحافظة غير الموجودة والنوع/الحقل الزائد أعادت 400؛ الطرق غير المدعومة أعادت 405. صفوف الطلب والسجل محذوفة، لكن sequences لا تتراجع: آخر قيمة مستهلكة 2، والقيمة التالية 3. لا schema أو frontend أو dependency changes. |

## 6. نقاط مفتوحة

- تحديد ما إذا كان مطلوبًا التحقق من رمز المحافظة أو رقم التحقق بالرقم القومي، وأي قيود عمرية للانضمام؛ التحقق الحالي يفحص الصيغة والتاريخ وعدم وقوعه في المستقبل.
- منع التكرار حاليًا فحص داخل transaction فقط، ومن دون unique index حسب القرار؛ قد تتسابق طلبات متزامنة قبل أن ترى إحداها الأخرى.
- توفير إعدادات Turnstile لاحقًا عبر environment variables، من دون وضع أسرار في الكود أو المستودع.
- ERD v9 لا يحدد nullability/defaults لأعمدة دخول الموظفين. `password_hash` اختياري حاليًا لتجنب اختلاق بيانات اعتماد للحسابات الموجودة؛ يجب حسم سياسة تهيئة الحسابات قبل تنفيذ كود المصادقة.
- Phase 8 متوقفة حتى يطلب المستخدم صراحةً تعديل الفرونت.
