# سجل تقدم الباك إند

هذا الملف هو المرجع الوحيد لأي agent يستكمل العمل على الباك إند. يجب قراءته قبل البدء وتحديث سجل التقدم بعد كل Phase.

## 1. نظرة عامة

المشروع Next.js باستخدام JavaScript، مع Prisma 7 وPostgreSQL، لموقع حزب الجبهة الوطنية. قاعدة البيانات كانت موجودة قبل المشروع ومصممة بناءً على ERD؛ لا تُنشأ أو تُعاد تهيئتها.

المهمة الحالية هي بناء باك إند فورم طلب الانضمام اعتمادًا على جدول `membership_applications`، مع توفير المحافظات وربط الفورم الحالي بالـAPI بعد موافقة المستخدم على Phase 8.

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
- ممنوع لمس الفرونت (الصفحات، المكونات، layouts، styles أو سلوكها) إلا بطلب صريح من المستخدم؛ تمت الموافقة صراحة على تعديلات فورم الانضمام فقط في Phase 8.
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

### سلوك الحماية المضاف في Phase 7

- `POST /api/applications` محدود بـ5 طلبات لكل IP كل 15 دقيقة؛ عند غياب IP يستخدم مفتاحًا مشتركًا بحد 20 طلبًا كل 15 دقيقة.
- `GET /api/governorates` محدود بـ60 طلبًا لكل IP في الدقيقة. تجاوز أي حد يرجع `429 { "error": "RATE_LIMITED" }` مع `Retry-After`.
- يقبل POST نوع المحتوى `application/json` فقط (`415 UNSUPPORTED_MEDIA_TYPE`) وبحد أقصى 10 KB (`413 PAYLOAD_TOO_LARGE`).
- بعد نجاح schema، أي قيمة غير فارغة في `website` ترجع `201` وهميًا من دون إنشاء طلب أو سجل حالة.
- Turnstile اختياري: عند ضبط `TURNSTILE_SECRET_KEY` يصبح `turnstileToken` مطلوبًا؛ غيابه يرجع `400 CAPTCHA_REQUIRED` وفشل التحقق يرجع `400 CAPTCHA_FAILED`. دون المفتاح يُتخطى التحقق. المفتاح غير موجود في المستودع، و`.env.example` يحتوي مدخلًا فارغًا اختياريًا.
- مخزن rate limit داخل الذاكرة؛ لا يضمن حدًا موحدًا عبر أكثر من instance أو serverless worker، ويمكن استبداله بـRedis/Upstash مع الحفاظ على الواجهة.

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
| 7 | الحماية (rate limit, honeypot, Turnstile) | مكتمل |
| 8 | ربط الفورم الحالي بالـAPI | مكتمل |
| 9 | قبول طلب العضوية وإنشاء سجل `members` | مكتمل — service فقط |

## 5. سجل التحديثات

| التاريخ | Phase | اللي اتعمل | الملفات اللي اتعدلت | ملاحظات |
|---|---|---|---|---|
| 2026-11-17 | 1 | مراجعة ERD v9 وقاعدة البيانات القائمة؛ توحيد `application_type` في Prisma، واستعادة ملف migration المطبق، وإضافة أعمدة staff auth إلى schema وmigration إضافي ثم تطبيقه بعد موافقة المستخدم. | `prisma/schema.prisma`؛ `prisma/migrations/20261117084049_add_application_type/migration.sql`؛ `prisma/migrations/20261117091714_add_staff_auth_fields/migration.sql` | لم يُنفذ reset أو إعادة إنشاء للقاعدة. migration الخاصة بـstaff auth أضافت أعمدة فقط. |
| 2026-11-17 | 2 | إعداد Prisma 7 باستخدام PostgreSQL adapter `@prisma/adapter-pg` و`pg`؛ نقل `@prisma/client` إلى `dependencies`؛ إنشاء singleton و`connectToDatabase()` في `lib/db.js`؛ توليد Prisma Client والتحقق من اتصال حي عبر `SELECT 1`. | `lib/db.js`؛ `package.json`؛ `package-lock.json`؛ `generated/prisma/**`؛ `AGENTS.md` | Route الاختبار المؤقت حُذف بعد نجاحه. `next dev` أضاف block مُدارًا تلقائيًا إلى `AGENTS.md`. تحذير Prisma عن whitespace في الملفات المولّدة متوقع ويُتجاهل. أبلغ `npm install` عن 7 vulnerabilities متوسطة ولم تُعالج. |
| 2026-11-17 | 4 | تثبيت Zod فقط؛ إضافة تطبيع الأرقام العربية وتحليل الرقم القومي كتاريخ UTC ونوع؛ إضافة `applicationSchema` برسائل التحقق المطلوبة ورفض الحقول الزائدة؛ إضافة اختبارات `node:test` (11 ناجحة). | `package.json`؛ `package-lock.json`؛ `lib/national-id.js`؛ `lib/national-id.test.js`؛ `lib/validation/application.js`؛ `lib/validation/application.test.js` | التحقق نقي ولا يتصل بقاعدة البيانات. Node 24 يعرض تحذير `MODULE_TYPELESS_PACKAGE_JSON` بسبب عدم تحديد نوع module على مستوى الحزمة؛ الاختبارات ناجحة ولم يتغير إعداد module العام. |
| 2026-11-17 | 5 | إضافة `createApplication` للتحقق من المحافظة ومنع التكرار وإنشاء الطلب وسجل حالته داخل transaction؛ إضافة اختبارات mock. نجح اختبار PostgreSQL حقيقي للتحقق من الطلب والسجل ثم rollback؛ إجمالي الاختبارات 19 ناجحًا. | `lib/services/applications.js`؛ `lib/services/applications.test.js`؛ `docs/BACKEND_PROGRESS.md`؛ `verify-application-rollback.mjs` (مؤقت، ثم حُذف) | قبل وبعد الاختبار: 0 طلبات، 0 سجلات حالات، 0 محافظات. أُنشئت محافظة مؤقتة داخل المعاملة فقط ورُدّت. rollback لا يعيد identity sequences: استُهلكت القيمة 1 من sequence الطلب وسجل الحالة، والقيمة التالية 2. |
| 2026-11-17 | 5.5 | تعبئة المحافظات الـ27 باستخدام سكريبت idempotent يعتمد `upsert` حسب `code` داخل transaction واحدة؛ شُغّل مرتين بنجاح. | `scripts/seed-governorates.js`؛ `package.json`؛ `docs/BACKEND_PROGRESS.md` | العدد بعد التشغيلين بقي 27، وكل الصفوف بالقيم المطلوبة و`is_active = true`. لا تعديل على schema أو migrations. |
| 2026-11-17 | 5.5 recovery | استعادة صفوف المحافظات بعد تأكيد أن الجدول أصبح فارغًا؛ تشغيل seed الحالي مرتين. | `scripts/seed-governorates.js`؛ `docs/BACKEND_PROGRESS.md` | `prisma migrate status` قبل الاستعادة أفاد أن قاعدة البيانات محدثة ولا توجد migrations معلّقة. أعاد seed العدد إلى 27 مع `is_active = true`، وبقي 27 بعد التشغيل الثاني. لم تُشغّل migration لأن المطلوب استعادة بيانات فقط ولا يوجد تغيير schema؛ لم يُنفذ reset أو أي migration. |
| 2026-11-17 | 6 | إضافة API الطلبات والمحافظات، مع تحويل أخطاء التحقق والخدمة إلى JSON، واختبار route POST مباشرة واختبارات curl للـGET والطلبات غير الصالحة. اختبار حقيقي بموافقة المستخدم أعاد 201 ثم 409؛ حُذف الطلب وسجل الحالة بعد موافقة منفصلة، وعادت أعدادهما إلى صفر. | `app/api/applications/route.js`؛ `app/api/applications/route.test.js`؛ `app/api/governorates/route.js`؛ `lib/services/governorates.js`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 22 ناجحًا. GET أعاد 27 محافظة مرتبة؛ JSON المكسور والاسم غير الرباعي والتاريخ المستحيل والمحافظة غير الموجودة والنوع/الحقل الزائد أعادت 400؛ الطرق غير المدعومة أعادت 405. صفوف الطلب والسجل محذوفة، لكن sequences لا تتراجع: آخر قيمة مستهلكة 2، والقيمة التالية 3. لا schema أو frontend أو dependency changes. |
| 2026-11-17 | 7 | إضافة rate limiter مستقل للمحافظات وطلبات الانضمام، حد محتوى 10 KB، فحص Content-Type، honeypot، وتحقق Turnstile اختياري مع timeout؛ إضافة اختبارات Node وcurl غير كاتبة. | `app/api/applications/route.js`؛ `app/api/applications/route.test.js`؛ `app/api/governorates/route.js`؛ `lib/rate-limit.js`؛ `lib/rate-limit.test.js`؛ `lib/turnstile.js`؛ `lib/turnstile.test.js`؛ `lib/services/api-dependencies.js`؛ `.env.example`؛ `.gitignore`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 37 ناجحًا؛ ESLint و`git diff --check` ناجحان. curl: GET أعاد 27 محافظة؛ POST أعاد 400 لأول 5 طلبات غير صالحة ثم 429 مع `Retry-After: 900`؛ Content-Type خاطئ 415؛ جسم 10,241 بايت 413؛ honeypot أعاد 201 وهميًا. أعداد الطلبات/سجلات الحالة قبل وبعد honeypot بقيت 0/0، والمحافظات 27. لا schema أو migration أو frontend أو package changes. Turnstile اختُبر بـfetch وهمي، والخادم أُوقف. |
| 2026-11-17 | 8 | ربط نافذة الانضمام بـ`GET /api/governorates` و`POST /api/applications`؛ إضافة تحميل المحافظات مع إعادة المحاولة، التحقق المحلي، موافقة الشروط وhoneypot، وعرض رسائل API والرقم عند النجاح؛ إزالة قائمة المحافظات الوهمية التي لم يكن لها مستهلك آخر؛ إضافة اختبارات تحويل ردود API. | `components/Home/ui/JoinModal.jsx`؛ `components/Home/ui/application-response.js`؛ `components/Home/ui/application-response.test.js`؛ `components/JoinButton.jsx`؛ `data/mock/membership.js`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 41 ناجحًا؛ ESLint و`git diff --check` ناجحان. في المتصفح: GET الحقيقي حمّل 27 محافظة مرتبة؛ فشل التحميل المعترض أظهر إعادة المحاولة ثم حمّل القائمة بعد نجاح المحاولة؛ إرسال النموذج الناقص أظهر أخطاء الحقول وركّز الاسم ومنع POST؛ POST المعترض أرسل الحقول المطلوبة، `governorate_id` كرقم و`website` فارغًا بلا `turnstileToken`، وعرض خطأ الحقل. حقل honeypot خارج الشاشة، `display` ليس `none`، قيمته بقيت فارغة ولم يظهر autofill. بعد موافقة منفصلة، POST حقيقي أعاد 201 ورقم الطلب `3`؛ تم التحقق من صف الطلب وسجل الحالة ثم حُذفا بعد موافقة منفصلة، وعادت الأعداد إلى 0 طلبات و0 سجلات و27 محافظة. لم تتغير schema أو API routes. استُعيدت حزم موجودة في lockfile ومستخدمة بالمشروع من `node_modules` دون تعديل manifests. |
| 2026-11-17 | 9 | إضافة `acceptApplication` بمعاملة واحدة: يقبل الطلب من `under_review` فقط، يحدّث مراجع وتاريخ المراجعة، وينشئ سجل `members` عند `application_type = member`، ثم يسجل انتقال الحالة؛ الأنواع الأخرى تُقبل دون إنشاء عضو. | `lib/services/applications.js`؛ `lib/services/applications.test.js`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 48 ناجحًا؛ ESLint و`git diff --check` ناجحان. أضيفت اختبارات للحالة المقبولة، الأنواع غير العضوية، الطلب المفقود، الحالة غير المسموحة، تعارض التحديث المتزامن، وغياب المراجع وفشل إنشاء العضو. لم تُعدّل schema أو قاعدة البيانات أو migrations أو الواجهة. لا يوجد endpoint قبول لأن مصادقة الموظفين وإدارة الطلبات لم تُنفّذ بعد؛ يجب استدعاء الخدمة من endpoint محمي عند تنفيذ تلك المرحلة. |

## 6. نقاط مفتوحة

- تحديد ما إذا كان مطلوبًا التحقق من رمز المحافظة أو رقم التحقق بالرقم القومي، وأي قيود عمرية للانضمام؛ التحقق الحالي يفحص الصيغة والتاريخ وعدم وقوعه في المستقبل.
- منع التكرار حاليًا فحص داخل transaction فقط، ومن دون unique index حسب القرار؛ قد تتسابق طلبات متزامنة قبل أن ترى إحداها الأخرى.
- إذا تقرر تفعيل Turnstile في بيئة نشر، أضف `TURNSTILE_SECRET_KEY` هناك؛ لا تضع السر في المستودع.
- الفورم لا يرسل `turnstileToken` حسب القرار الحالي؛ إذا تم ضبط `TURNSTILE_SECRET_KEY` قبل إضافة Turnstile إلى الواجهة فسترفض الـAPI الطلب الحقيقي بـ`CAPTCHA_REQUIRED`.
- ERD v9 لا يحدد nullability/defaults لأعمدة دخول الموظفين. `password_hash` اختياري حاليًا لتجنب اختلاق بيانات اعتماد للحسابات الموجودة؛ يجب حسم سياسة تهيئة الحسابات قبل تنفيذ كود المصادقة.
- تم حذف صف الاختبار الحي رقم `3` وسجل حالته بعد موافقة المستخدم؛ آخر تحقق للأعداد: 0 طلبات، 0 سجلات حالات، 27 محافظة.
- خدمة قبول الطلب متاحة في `lib/services/applications.js` فقط: يجب أن يكون الطلب `under_review`، ويُنشأ سجل `members` لطلبات `member` وحدها. لا يوجد حتى الآن endpoint إداري محمي لتشغيلها، لأن مصادقة الموظفين لم تُنفّذ.
