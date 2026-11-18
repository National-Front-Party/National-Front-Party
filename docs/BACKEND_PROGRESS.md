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
- أُضيفت أعمدة دخول الموظفين إلى قاعدة البيانات: `password_hash`, `must_change_password`, `last_login_at`, `failed_login_count`, `locked_until`. منطق مصادقة الموظفين عبر API موثق في Phase 9-Auth، وأُصلحت ذرية قفل الدخول في Phase 9.1.
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

## 3.2 قرارات مصادقة الموظفين (Phase 9)

- الجلسة JWT موقعة بـHS256، تحمل `staffId` في `sub` فقط، وتنتهي بعد 8 ساعات. سر `SESSION_SECRET` لا يقل عن 32 بايت. كوكي الجلسة `staff_session`: `HttpOnly` و`SameSite=Lax` و`Path=/` و`Secure` في الإنتاج.
- كلمات المرور تُخزن بـ`scrypt` مع salt عشوائي ومعاملات الخوارزمية داخل قيمة hash؛ الطول 10–128 حرفًا مع حرف ورقم. كلمة المرور المؤقتة تُجبر على التغيير بعد الدخول الأول.
- خمس محاولات فاشلة تقفل الحساب 15 دقيقة. حد الدخول 10 محاولات لكل IP و5 لكل بريد خلال 15 دقيقة باستخدام limiter الموجود في الذاكرة؛ لا يضمن حدًا مشتركًا بين workers أو instances.
- زيادة `failed_login_count` وتفعيل `locked_until` يجريان في تحديث PostgreSQL ذري واحد؛ شرط التحديث لا يطابق حسابًا غير نشط أو مقفولًا أو بلغ الحد. تحديث الدخول الناجح مشروط بحساب نشط، وعدّاد أقل من 5، وقفل منتهٍ أو غير موجود، ولا يصدر JWT إلا إذا أثّر التحديث على صف واحد.
- أولوية الدخول ثابتة: استهلاك/فحص محددي IP والبريد يسبق قرار الخطأ؛ إذا تجاوز أي منهما الحد فالرد `429 RATE_LIMITED`. وإلا فالحساب المقفول لا يرجع `423 ACCOUNT_LOCKED` إلا بعد تطابق كلمة المرور. كلمة المرور الخاطئة، بما فيها المحاولة الخامسة التي تفعّل القفل، والحساب غير الموجود أو غير المؤهل، ترجع جميعًا `INVALID_CREDENTIALS` لتجنب كشف وجود الحساب. المحاولات اللاحقة قد ترجع `429` إذا كان محدد البريد أو IP قد بلغ حده.
- اختبارات التزامن في Phase 9.1 محاكاة وحدية فقط؛ لم يُنفذ اختبار PostgreSQL concurrency فعلي.
- الـguard يتحقق من JWT ثم يعيد قراءة `is_active` والدور من قاعدة البيانات في كل طلب، ويرفض الحساب الموقوف أو الدور غير المعروف، ويتحقق من الصلاحية وOrigin للطلبات المعدِّلة. `proxy.js` بوابة أولية بوجود الكوكي فقط، وليس بديلًا عن guard.
- ينشأ أول `super_admin` يدويًا بأمر `npm run create:super-admin -- <email> "<full name>"`، مع `CREATE_ADMIN_PASSWORD` في البيئة فقط؛ تُحذف قيمة كلمة المرور المؤقتة من البيئة بعد الإنشاء ويُغيّرها الموظف عند أول دخول. لم يُشغّل الأمر ولم يُكتب في قاعدة البيانات ضمن هذه المرحلة.

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
| 9-Auth | تسجيل دخول الموظفين ومصادقتهم عبر API فقط (دون واجهة) | مكتمل — لم يُنشأ حساب موظف في قاعدة البيانات؛ إصلاح السباق في Phase 9.1 |
| 10.0 | سجل تدقيق الموظفين: schema وmigration مستقلة | مكتمل — migration مطبقة |
| 10.1 | تطبيق Migration سجل التدقيق والتحضير لإدارة الموظفين | مكتمل — migration مطبقة |
| 10.2 | إنشاء أول `super_admin` (Bootstrap) | مكتمل بعد موافقة المستخدم؛ مستثنى من حدث `staff_created` |
| 10.3 | Staff Management APIs (Backend فقط) | مكتمل — لا توجد واجهة أمامية ضمن المرحلة |
| 11.0 | استكشاف إدارة طلبات الانضمام | مكتمل — قراءة فقط |
| 11.1 | APIs قراءة طلبات الانضمام | مكتمل — قائمة وتفاصيل فقط؛ لا تعديل أو تصدير |
| 13 | إدارة المحتوى التنظيمي (Popups, القيادة, الأمانات المركزية/المحافظات, الأمانة البرلمانية) | منفّذ كـBackend/Schema/Tests — Migration وSeed منشآن ولم يُطبّقا/يُنفذا |
| 14.1 | الأخبار والمقالات: طبقة التحقق والخدمات الأساسية (Validation + Services) | مكتمل — خدمات وتحقق واختبارات فقط؛ لا مسارات API أو واجهة أمامية |
| 14.2 | الأخبار والمقالات: مسارات الإدارة (News Admin APIs) | مكتمل — 14 مسارًا إداريًا للمقالات والمصادر ومصانع Handlers واختبارات كاملة |
| 14.3 | الأخبار والمقالات: مسارات العرض العامة (News Public APIs) | مكتمل — مسارا القائمة والتفاصيل بالـ slug، وتنسيق التواريخ والفقرات، وتحديد المعدل والكاش، واختبارات كاملة |
| 17 | برنامج الحزب: جدول وميجريشن مستقلة (`party_programs`) ومسار عام | مكتمل — إنشاء جدول `party_programs` مع تريجر التحديث، ميجريشن مطبقة، مسار عام `/api/content/party-program`، وربط المكون |

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
| 2026-11-18 | تحسين بصري للواجهة | توحيد زر السهم في بطاقة أمانات المحافظات مع تذييل الأمانات المركزية، وضبط امتداد البطاقة حتى أسفل صف الشبكة على الشاشات الكبيرة. | `components/Home/sections/GovernoratesSecretariats.jsx`؛ `components/Home/sections/GovernoratesSecretariats.css`؛ `components/Home/HomeSections.jsx`؛ `docs/BACKEND_PROGRESS.md` | ESLint و`git diff --check` ناجحان. قياس المتصفح أكد تساوي ارتفاع بطاقة المحافظات والأمانات المركزية عند 1440px، وبقاء بطاقة الهاتف بمحتواها الطبيعي عند 390px دون تجاوز أفقي. تعديل واجهة فقط؛ لا تغييرات على قاعدة البيانات أو الباك إند أو API. |
| 2026-11-18 | تحسين ظل hover | مطابقة ظل وحركة بطاقة أمانات المحافظات مع نمط بطاقات الصفحة الأخرى. | `components/Home/sections/GovernoratesSecretariats.css`؛ `docs/BACKEND_PROGRESS.md` | تحديث CSS فقط؛ إعداد تقليل الحركة الحالي ما زال يعطل حركة البطاقة. لا تغييرات على قاعدة البيانات أو الباك إند أو API. |

| 2026-11-17 | إصلاح schema | إزالة التكرار الثاني للحقل `application_type` من `membership_applications` بعد التحقق من تطابق التعريفين مع العمود الفعلي في PostgreSQL. أظهر `git blame` أن Commit `edfdf61` أضاف التكرار خلال تغييرات phase-3/4؛ لم يظهر سبب مقصود له. | `prisma/schema.prisma`؛ `generated/prisma/**`؛ `docs/BACKEND_PROGRESS.md` | `prisma validate` و`prisma generate` نجحا؛ `migrate diff` فارغ؛ `npm test`: 48 ناجحًا. لم تُنفذ أي كتابة على قاعدة البيانات. |

| 2026-11-17 | news review workflow | أضيف enum `article_status` وحقول المراجعة وعلاقتا الموظفين إلى `news_articles`، وأُنشئ migration بـ`--create-only` ثم طُبق بعد موافقة المستخدم. | `prisma/schema.prisma`؛ `prisma/migrations/20261117145339_add_news_review_workflow/migration.sql`؛ `docs/BACKEND_PROGRESS.md` | الجدول كان فارغًا. SQL يضيف enum وأعمدة وقيود FK فقط؛ طُبق بنجاح؛ تحقق قراءة فقط من الأعمدة وقيود FK وقيم enum، وبقي عدد الصفوف 0. المسار: `draft` ← `pending_review` ← `published` أو `changes_requested` (ترجع للمحرر وتُرسل للمراجعة مجددًا). الموقع العام يقرأ `is_published = true` فقط، ويجب أن يتطابق مع `status = 'published'`. |

| 2026-11-17 | مرجع الأدوار والصلاحيات | إنشاء مرجع ثابت لأدوار الموظفين والصلاحيات وقواعد التحقق، وإضافة إحالة إليه في تعليمات الوكلاء. | `docs/ROLES.md`؛ `AGENTS.md`؛ `docs/BACKEND_PROGRESS.md` | توثيق فقط؛ لم يتغير أي كود. |

| 2026-11-17 | 9-Auth | إضافة دخول الموظفين بـAPI: `scrypt` وتحقق قوة كلمة المرور، JWT cookie لمدة 8 ساعات، قفل بعد 5 محاولات لمدة 15 دقيقة، rate limit بحسب IP والبريد، صلاحيات من `docs/ROLES.md`، guard يعيد التحقق من الموظف النشط والصلاحية وOrigin، وProxy أولي، ونقاط login/logout/change-password/me، وأمر إنشاء أول super admin. | `lib/auth/**`؛ `lib/services/auth.js`؛ `lib/validation/auth.js`؛ `app/api/admin/auth/**`؛ `proxy.js`؛ `scripts/create-super-admin.js`؛ `.env.example`؛ `package.json`؛ `package-lock.json`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 74 ناجحًا؛ `npm run lint` ناجح؛ `npm run build` ناجح. ظهر أثناء توليد الصفحات سطرا خطأ عام مصدرهما logger الموجود في `app/api/governorates/route.js`؛ لم يتغير ذلك المسار. عدد `staff_users` قبل وبعد الفحوص 0؛ لا اختبار كتابة حي ولا إنشاء حساب ضمن هذه المرحلة. |
| 2026-11-17 | 9-Auth | إضافة دخول الموظفين بـAPI: `scrypt` وتحقق قوة كلمة المرور، JWT cookie لمدة 8 ساعات، قفل بعد 5 محاولات لمدة 15 دقيقة، rate limit بحسب IP والبريد، صلاحيات من `docs/ROLES.md`، guard يعيد التحقق من الموظف النشط والصلاحية وOrigin، وProxy أولي، ونقاط login/logout/change-password/me، وأمر إنشاء أول super admin. | `lib/auth/**`؛ `lib/services/auth.js`؛ `lib/validation/auth.js`؛ `app/api/admin/auth/**`؛ `proxy.js`؛ `scripts/create-super-admin.js`؛ `.env.example`؛ `package.json`؛ `package-lock.json`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 74 ناجحًا؛ `npm run lint` ناجح؛ `npm run build` ناجح. ظهر أثناء توليد الصفحات سطرا خطأ عام مصدرهما logger الموجود في `app/api/governorates/route.js`؛ لم يتغير ذلك المسار. عدد `staff_users` قبل وبعد الفحوص 0؛ لا اختبار كتابة حي ولا إنشاء حساب ضمن هذه المرحلة. |
| 2026-11-17 | 9.1 | جعل تحديث المحاولات الفاشلة وتفعيل القفل تحديث PostgreSQL ذريًا واحدًا، وتقييد تصفير القفل عند الدخول الناجح، وتوحيد أولوية rate limit وأخطاء القفل، وإضافة محاكاة وحدية للتزامن. | `lib/services/auth.js`؛ `lib/services/auth.test.js`؛ `docs/BACKEND_PROGRESS.md` | `npm test`: 78 ناجحًا؛ `npm run lint` و`npm run build` ناجحان. اختبارات المحاكاة لا تثبت التزامن الفعلي في PostgreSQL؛ لم يُتصل بقاعدة بيانات المشروع أو يُكتب فيها، ولم يُنفذ اختبار PostgreSQL concurrency. استُخدم عنوان PostgreSQL محلي غير قابل للاتصال أثناء build لمنع استخدام إعداد `.env`؛ ظهرت رسالتا الخطأ العام المعروفتان من governorates أثناء prerender. |
| 2026-11-17 | 10.0 | إضافة `staff_audit_action` و`staff_audit_log` بعلاقات الموظفين الاختيارية، لقطات الهوية التاريخية، قيد مفاتيح `details`، وفهارس المنفذ/المستهدف/التاريخ؛ إنشاء migration مستقلة دون تطبيقها. | `prisma/schema.prisma`؛ `generated/prisma/**`؛ `prisma/migrations/20261117170000_add_staff_audit_log/migration.sql`؛ `docs/BACKEND_PROGRESS.md` | `prisma validate` و`prisma generate` نجحا؛ `npm test`: 78 ناجحًا؛ `npm run lint` ناجح. لم يُتصل بقاعدة البيانات ولم تُطبق migration أو تُكتب بيانات. المرحلة التالية 10.1: Staff Management APIs، بعد موافقة المستخدم. |
| 2026-11-17 | 10.1 | تطبيق migration سجل تدقيق الموظفين بعد موافقة المستخدم باستخدام `prisma migrate deploy`. | `docs/BACKEND_PROGRESS.md` | قبل التطبيق كانت migration الوحيدة المعلقة `20261117170000_add_staff_audit_log`؛ بعده `prisma migrate status` أكد أن schema محدثة. تحقق قراءة فقط من الجدول والـenum والقيم والقيود والفهارس. لم تُطبق migrations أخرى ولم تُنشأ أو تُعدل بيانات موظفين. إنشاء أول Super Admin ينتظر موافقة منفصلة. |
| 2026-11-17 | 10.2 | إنشاء أول حساب `super_admin` بعد موافقة المستخدم باستخدام السكريبت المعتمد. | `scripts/create-super-admin.js`؛ `docs/BACKEND_PROGRESS.md` | انتهى السكريبت بنجاح. طُبق استثناء Bootstrap؛ لم يُسجل حدث `staff_created`. لم تُطبع كلمة المرور أو الـhash. |
| 2026-11-17 | 10.3 | إضافة APIs لإدارة الموظفين، والتحقق من المدخلات، وخدمات المعاملات وسجل التدقيق، وPagination لقراءة سجل التدقيق، وحماية ذرية لآخر `super_admin` نشط. | `lib/validation/staff.js`؛ `lib/validation/staff.test.js`؛ `lib/services/staff.js`؛ `lib/services/staff.test.js`؛ `lib/staff/handlers.js`؛ `lib/staff/handlers.test.js`؛ `app/api/admin/staff/**`؛ `docs/BACKEND_PROGRESS.md` | أضيفت مسارات القائمة والتفاصيل والإنشاء والتعديل والتفعيل/الإيقاف وإعادة تعيين كلمة المرور وقراءة سجل التدقيق. جميع التغييرات وسجلاتها تُنفذ داخل Transaction؛ حماية المدير الأخير تستخدم PostgreSQL transaction-level advisory lock موحدًا لكل تغييرات الدور/الحالة وإنشاء مدير جديد. `npm test`: 92 ناجحًا؛ `npm run lint` ناجح؛ `git diff --check` ناجح. اختبار التزامن محاكاة وحدية ولا يثبت سلوك PostgreSQL الفعلي؛ لم يُتصل بقاعدة البيانات ولم تُجرَ كتابة عليها. لا تغييرات Schema أو Migrations أو Frontend أو Packages. |
| 2026-11-17 | 11.0 | مراجعة Read Only لجداول طلبات الانضمام وسجل الحالات والمسارات العامة والخدمات والتحقق والصلاحيات والاختبارات. | لا توجد تعديلات ملفات ضمن الاستكشاف. | لا توجد APIs إدارية للطلبات قبل Phase 11.1؛ `acceptApplication` خدمة فقط. لم يتم الاتصال بقاعدة البيانات أو تعديل ملفات. |
| 2026-11-17 | 11.1 | إضافة `GET /api/admin/applications` للقائمة والبحث والفلترة وPagination، و`GET /api/admin/applications/[id]` للتفاصيل وسجل الحالات. | `app/api/admin/applications/route.js`؛ `app/api/admin/applications/[id]/route.js`؛ `lib/applications/read-handlers.js`؛ `lib/applications/read-handlers.test.js`؛ `lib/services/application-queries.js`؛ `lib/services/application-queries.test.js`؛ `lib/validation/application-query.js`؛ `lib/validation/application-query.test.js`؛ `docs/BACKEND_PROGRESS.md` | تستخدم المسارات `requireStaff` بصلاحية `applications:read`. تدعم الفلاتر الاسم والهاتف الجزئيين والرقم القومي ورقم الطلب المطابقين تمامًا، النوع والحالة والمحافظة والمسؤول ونطاق الإنشاء. القائمة تستبعد الهاتف والرقم القومي والملاحظات وIP؛ التفاصيل تعرض البيانات اللازمة للمستخدم المخول وسجل الحالات. الترتيب الأحدث أولًا مع `application_no` ككاسر تعادل. `npm test`: 102 ناجحًا؛ `npm run lint` و`git diff --check` ناجحان. الاختبارات تستخدم mocks؛ لم يتم الاتصال بقاعدة البيانات أو تنفيذ كتابة. لا تغييرات Schema أو Migrations أو Packages. |
| 2026-11-18 | 13 | تنفيذ Backend/Validation/Services/Handlers/Routes للمحتوى التنظيمي (Popups، القيادة Panels/Leaders/Contents، الأمانات المركزية/المحافظات، الأمانة البرلمانية)، مع تدقيق داخل نفس المعاملة، وإنشاء migration وseed popups (دون تطبيق/تشغيل)، وتوليد Prisma Client، وإجراء الإصلاحات المستهدفة بعد المراجعة المستقلة (F-01 إلى F-05 وFINDING-02 قفل الأمانة الأب FOR UPDATE لمنع تضارب التزامن عند الحذف)، وإضافة اختبارات شاملة. | `prisma/schema.prisma`؛ `prisma/migrations/20261118000000_phase13_organizational_content/migration.sql`؛ `scripts/seed-popups.js`؛ `lib/content/**`؛ `lib/validation/content/**`؛ `lib/services/content-*.js`؛ `lib/services/content-phase13.test.js`؛ `app/api/admin/content/**`؛ `app/api/content/**`؛ `lib/validation/staff.js`؛ `generated/prisma/**`؛ `docs/BACKEND_PROGRESS.md` | تم إصلاح CHECK Constraint في الـ Migration بإزالة الـ Subquery وإضافة حقول حذف الـ Cascade (F-01, F-05)، وربط بارامترات الأمانة والشخص في المسارات المتداخلة لمنع التعديل المتبادل (F-02)، ومعالجة خطأ P2003 كـ 400 INVALID_REFERENCE (F-03)، والتحقق من صحة التقويم لـ decision_date (F-04)، وقفل صف الأمانة الأب عبر `SELECT ... FOR UPDATE` قبل عد الأشخاص عند الحذف (FINDING-02). لا تزال Migration و`seed-popups.js` بانتظار موافقة صريحة. Phase 13 tests: 27/27؛ `npm test`: 211/211؛ `npm run lint`: ناجح. لا تغييرات Frontend أو DB writes حقيقية أو commit. |
| 2026-11-18 | 14.1 | تنفيذ طبقة التحقق والخدمات لمنظومة الأخبار والمصادر (`lib/validation/news.js`, `lib/services/news-articles.js`, `lib/services/news-sources.js`) مع اختبارات شاملة وإصلاحات المراجعة المستقلة (F-01 إلى F-07). | `lib/validation/news.js`؛ `lib/validation/news.test.js`؛ `lib/services/news-sources.js`؛ `lib/services/news-sources.test.js`؛ `lib/services/news-articles.js`؛ `lib/services/news-articles.test.js`؛ `docs/BACKEND_PROGRESS.md` | شمل التنفيذ: التحقق الصارم من مدخلات المقالات والمصادر وتوافقها مع schema (`published_on`, `source_id`, إلخ دون حقول وهمية) وتقويم التواريخ؛ دعم العناوين العربية في الـ slug وتفادي التصادم؛ حصر إدارة المصادر بـ `super_admin`؛ تقييد قراءة المقالات الإدارية على أدوار الأخبار المعتمدة ورفض الأدوار غير المصرح لها؛ منع النشر الذاتي للمراجعين والسماح به للـ super_admin؛ حصر الحذف بالـ super_admin؛ قفل صف المصدر بـ `FOR SHARE` أثناء إنشاء المقال وقفل صف المقال بـ `FOR UPDATE`؛ الاحتفاظ بملاحظة المراجعة داخلياً؛ تنفيذ المعاملات مع سجل التدقيق في نفس المعاملة؛ `npm test` بلغ 232/232 ناجحاً، و`npm run lint` ناجح و`prisma validate` ناجح. لم يتم إنشاء مسارات API أو لمس الفرونت أو إجراء أي كتابة على قاعدة البيانات. |
| 2026-11-18 | 14.2 | تنفيذ مسارات الإدارة لمنظومة الأخبار والمصادر (14 Admin Endpoints)، ومصانع Handlers المعتمدة على الحقن، ومساعدات التحقق والتفويض، واختبارات شاملة. | `lib/news/http.js`؛ `lib/news/handlers/articles.js`؛ `lib/news/handlers/sources.js`؛ `lib/news/handlers.test.js`؛ `app/api/admin/news/**`؛ `docs/BACKEND_PROGRESS.md` | شمل التنفيذ: 14 مسارًا إداريًا بالكامل (9 للمقالات وسير العمل والحذف، و5 للمصادر) كـ Thin Wrappers؛ Handler Factories مع Dependency Injection؛ فرض نموذج الأدوار الصارم (`news_editor` للإنشاء والتعديل والإرسال لمقالاته وقراءة مقالاته، و`news_reviewer` للقراءة والمراجعة والنشر وإلغاء النشر دون تأليف أو تعديل محتوى أو نشر ذاتي، و`super_admin` للإدارة الكاملة والحذف والمصادر)؛ دعم حجم جسم حتى 256KB للمقالات و10KB للإجراءات والمصادر؛ اشتراط `{ confirm: true }` للحذف النهائي؛ معالجة P2002 كـ 409 DUPLICATE_SLUG وتحويل سائر أخطاء الخدمات والـ Prisma إلى Status Codes دقيقة؛ اجتياز جميع الاختبارات: `npm test` بلغ 251/251 ناجحاً، و`npm run lint` 0 أخطاء و0 تحذيرات، و`prisma validate` ناجح. لا تغييرات Schema أو Migrations أو Frontend أو DB Writes أو Git Commits. |
| 2026-11-18 | 14.3 | تنفيذ مسارات العرض العامة للأخبار والمقالات (`GET /api/content/news` و`GET /api/content/news/[slug]`)، وتنسيق التواريخ العربية الذكي، وتفكيك الفقرات، وقائمة الحقول المسموحة، وتحديد معدل الطلبات، وترويسات الكاش، واختبارات شاملة وإغلاق فجوات التغطية. | `lib/news/formatting.js`؛ `lib/validation/news.js`؛ `lib/services/news-articles.js`؛ `lib/news/handlers/public.js`؛ `app/api/content/news/**`؛ `lib/news/public.test.js`؛ `docs/BACKEND_PROGRESS.md` | شمل التنفيذ: جلب الأخبار المنشورة فقط (`status = 'published'` و`is_published = true`)؛ عدم تأثر ظهور المقالات بتعطيل المصدر؛ حجب كافة الحقول الإدارية وسجلات المراجعة والملاحظات الداخلية تمامًا؛ إرجاع `body` وتفكيك `paragraphs`؛ تنسيق التواريخ بالعربية بدون سنة لدقة اليوم ومع السنة لدقة الشهر وإلحاق اسم المصدر؛ دعم الفلترة والصفحات وترتيب المميز ثم الأحدث؛ دعم الـ slug العربي واللاتيني في التفاصيل؛ كاش `s-maxage=120, stale-while-revalidate=300` للنجاح و`no-store` للأخطاء والـ 404؛ محدد معدل 120 طلبًا في الدقيقة لكل IP؛ اجتياز جميع الاختبارات: `npm test` بلغ 266/266 ناجحاً، و`npm run lint` 0 أخطاء و0 تحذيرات، و`prisma validate` ناجح. لا تغييرات Schema أو Migrations أو Frontend أو DB Writes أو Git Commits. |

## 6. نقاط مفتوحة

- تحديد ما إذا كان مطلوبًا التحقق من رمز المحافظة أو رقم التحقق بالرقم القومي، وأي قيود عمرية للانضمام؛ التحقق الحالي يفحص الصيغة والتاريخ وعدم وقوعه في المستقبل.
- منع التكرار حاليًا فحص داخل transaction فقط، ومن دون unique index حسب القرار؛ قد تتسابق طلبات متزامنة قبل أن ترى إحداها الأخرى.
- إذا تقرر تفعيل Turnstile في بيئة نشر، أضف `TURNSTILE_SECRET_KEY` هناك؛ لا تضع السر في المستودع.
- الفورم لا يرسل `turnstileToken` حسب القرار الحالي؛ إذا تم ضبط `TURNSTILE_SECRET_KEY` قبل إضافة Turnstile إلى الواجهة فسترفض الـAPI الطلب الحقيقي بـ`CAPTCHA_REQUIRED`.
- ERD v9 لا يحدد nullability/defaults لأعمدة دخول الموظفين. `password_hash` اختياري حاليًا لتجنب اختلاق بيانات اعتماد للحسابات الموجودة؛ تظل سياسة تهيئة حسابات الموظفين قرارًا تشغيليًا مفتوحًا.
- تم حذف صف الاختبار الحي رقم `3` وسجل حالته بعد موافقة المستخدم؛ آخر تحقق للأعداد: 0 طلبات، 0 سجلات حالات، 27 محافظة.
- خدمة قبول الطلب متاحة في `lib/services/applications.js` فقط: يجب أن يكون الطلب `under_review`، ويُنشأ سجل `members` لطلبات `member` وحدها. لا يوجد حتى الآن endpoint إداري محمي لتشغيلها؛ واجهات إدارة الطلبات خارج نطاق Phase 9-Auth.
## Phase 11.2 — Application Management Actions

Implemented backend-only application actions using the existing schema: transition to review, accept, reject with a required reason, append internal notes, assign or unassign an eligible active staff member. Status changes and their history entries (including member creation on member acceptance) run in one transaction; conditional status updates prevent duplicate transitions. Note appends serialize with a row lock. All action routes require applications:update and validate inputs; no history entry is added for notes or assignment. Added validation, service, and handler tests.

npm test: 128 passed; npm run lint and git diff --check passed. Tests use mocks and do not prove PostgreSQL concurrency behavior. No schema, migration, package, frontend, or database changes were made.

## Phase 11.3 — Applications Export

Implemented `GET /api/admin/applications/export`, protected by `requireStaff` with `applications:export` (super_admin only). Export validation shares the exact filter shape and date-range rules with the applications list, without pagination parameters. Results use the shared Prisma filter builder and stable newest-first ordering, read in batches of 500 within a repeatable-read transaction. Each row is serialized immediately into a fixed-capacity 10 MB buffer; byte limits are checked before writing each row and stop the service before it fetches another batch. No collection of all result rows or CSV chunks is retained. CSV output is UTF-8 with BOM, has a fixed nine-column allowlist, escapes CSV fields, protects formula-like prefixes, and excludes personal and internal fields. Responses are no-store, dated downloads; exports over 10,000 rows or 10 MB return 413 before any file body is sent. No suitable application-export action exists in the staff-only audit enum, so this endpoint does not write an audit record; no schema change was made.

Added CSV serializer, handler, shared-query, batching, privacy, row/size limit, and validation coverage. Tests use mocks and do not connect to PostgreSQL. No database access or writes, schema/migration/package/frontend changes, or commits were made.

## Phase 12.1 — Service Requests Read APIs

Implemented read-only `GET /api/admin/service-requests` and `GET /api/admin/service-requests/[id]`. Both use `requireStaff` with the existing `services:manage` permission. The list supports name/phone partial search, exact request number, status, ministry, sector, assigned staff, validated creation-date range, and bounded pagination (page up to 10,000; page size up to 100), sorted by newest creation time with request number as a stable tie-breaker. Detail and list responses use explicit allowlists and omit `submitted_ip`; BigInt request numbers are serialized as strings. Invalid, duplicate, unknown query parameters and malformed UUIDs are rejected. No management actions, export, schema/migration, frontend, or database changes were made.

Added validation, service-query, and handler tests, including real `requireStaff` checks with an isolated mock staff lookup for super_admin/service_officer, unauthenticated and inactive staff, query validation, pagination, dates, ordering, missing records, and IP omission. Tests do not connect to PostgreSQL.

## Phase 12.3 — Ministries & Request Sectors Admin APIs

Implemented authenticated administration APIs for listing, creating, viewing, updating, activating, and deactivating the independent `ministries` and `request_sectors` catalogs. All routes use `requireStaff` with the existing `services:manage` permission; no deletion endpoints are exposed. Validation rejects unknown fields, validates SmallInt IDs and `sort_order`, and applies bounded pagination. Prisma selections are allowlisted, and unique conflicts return safe catalog-specific 409 errors. Deactivation updates only `is_active`, preserving service request foreign-key references. No schema, migration, frontend, public service submission, or workflow changes were made.

Added validation, service, and handler tests for both catalogs, pagination, authorized and unauthorized roles, inactive staff, CRUD operations, status changes, invalid inputs, duplicate unique values, and no deletion. Tests use isolated mocks and do not connect to the database. `npm test`, `npm run lint`, and `git diff --check` results are recorded with the implementation report.

## Phase 12.4 — Public Service Request Options & Submission

Implemented public `GET /api/ministries`, `GET /api/request-sectors`, and `POST /api/service-requests`. Catalog responses include active records only, with the form fields `id`, `name_ar`, and `sort_order` in stable order. Submission validates a trimmed name, an Egyptian local mobile number in the exact 11-digit `010`/`011`/`012`/`015` formats, and positive SmallInt ministry/sector IDs; it rejects unknown fields and does not accept status, assignment, or internal notes. Active ministry and sector checks plus request creation run in one transaction. The service locks both selected catalog rows with PostgreSQL `FOR SHARE` locks while checking activity and creating the request, so concurrent deactivation is serialized with submission. Successful responses contain only `{ success: true }`; every valid submission creates a separate request. Public routes use the existing in-memory rate limiter; no schema, migration, frontend, history, or workflow changes were made.

Added validation, service, and route tests for active-only catalog queries, stable ordering, allowed mobile prefixes and invalid formats, input constraints, selected-field persistence, independent submissions, invalid/inactive selections, safe errors, and rate limiting. Tests use mocks and assert the transaction/row-lock query shape; no PostgreSQL concurrency test or real database connection was performed.

## Phase 13 — Organizational Content Management

Implemented backend-only organizational content management for Popups, Leadership (panels/leaders/leadership contents), Central Secretariats (with multiple people), Governorate Secretariats (with multiple people), and Parliamentary Unit. No frontend changes, no database writes, no migration applied, no seed executed, and no commits.

### APIs implemented
- **Admin (authenticated, `content:manage`)**: Popups CRUD + `PATCH /status`; Leadership panels/leaders/contents CRUD + `PATCH /status`; Central Secretariats CRUD + `PATCH /status` + people create/list/update/delete/publish-unpublish; Governorate Secretariats CRUD + `PATCH /status`; Parliamentary Unit CRUD + `PATCH /status`.
  - Hard delete requires `records:delete` and JSON body `{ "confirm": true }` (super_admin per roles/permissions).
  - `super_admin` has full access via permission grants; `content_editor` has `content:manage` (manage/publish directly) but not `records:delete`.
- **Public (published-only)**: `GET /api/content/popups`, `GET /api/content/popups/[id]`; `GET /api/content/leadership` (published aggregate: published panels with published leaders and published leadership contents); `GET /api/content/central-secretariats`, `GET /api/content/central-secretariats/[id]` (published secretariat with published people only); `GET /api/content/governorate-secretariats`, `GET /api/content/governorate-secretariats/[id]` (active published records with published people only); `GET /api/content/parliamentary-unit`, `GET /api/content/parliamentary-unit/[id]`.

### Design/implementation notes
- Leadership button/speech content stored in `info_items` with `kind="leadership_content"` (`button_label`, `title`, `person_name`, `person_role_title`, `body`, `decision_number`, `decision_date`, ordering/publish fields). `central_secretariats.info_item_id` required by create API. `leaders` retained for panel-related leaders (3A/3D).
- Multiple people supported for central secretariats via `central_secretariat_people` (optional `image_url`, `details`, order/publish) and governorate secretariats; public endpoints expose only published nested people/records.
- Panel deletion blocked in service/API when leaders exist (`PANEL_HAS_LEADERS`); no FK behavior change (4B).
- Images handled as URL fields.
- Audit entries written to `staff_audit_log` in the same transaction as the content mutation via `lib/content/audit.js` (`content_created|content_updated|content_published|content_unpublished|content_deleted`, target snapshots/details). `lib/validation/staff.js` audit query `target_id` relaxed to text for content/staff compatibility.
- `npx prisma generate` completed successfully (`generated/prisma/**` updated).

### Migration and seed (created, reviewed, **not applied/run**)
- `prisma/migrations/20261118000000_phase13_organizational_content/migration.sql`: additive-only (enum `ADD VALUE IF NOT EXISTS`, `staff_audit_log.target_id` UUID→TEXT via `USING target_id::text` preserving existing values, `target_email` DROP NOT NULL, extended `details` CHECK, `info_items` additive columns, new `central_secretariat_people` table/indexes/FKs with `ON DELETE CASCADE` from secretariat, trigger). No destructive drops/resets; preserves existing `staff_audit_log` rows. `set_updated_at()` function exists in prior migrations.
- `scripts/seed-popups.js`: idempotent rerunnable seed for initial 5 popups (`من نحن؟`, `هدفنا`, `رؤيتنا`, `رسالتنا`, `لماذا نحن؟`) with fixed slugs, `kind="popup"`, `is_published:false`, existence check inside transaction. **Not executed**.
- Applying migration and running seed require explicit user approval.

### Tests and verification
- Added Phase 13 tests: `lib/validation/content/content.test.js` (5), `lib/services/content-phase13.test.js` (13), `lib/content/phase13-handlers.test.js` (9) — **27/27 passed**.
- Coverage includes: validation for CRUD/status/id/list/decision/person/publish/delete-confirm inputs; calendar date validation rejecting impossible dates (F-04); admin/public query shapes and ordering; published-only and nested published-only filtering; popups/leadership/central/governorate/parliamentary CRUD+publish flows; multi-person handling and optional image/details; panel delete blocked when leaders exist; permissions (super_admin/content_editor manage, unauthorized rejected, delete requires `records:delete` + `{confirm:true}`); nested person routes verifying parent secretariat membership and returning 404 on mismatch (F-02); P2003 foreign key violation returning 400 INVALID_REFERENCE (F-03); PostgreSQL-compatible migration check constraint syntax validation (F-01); same-transaction audit behavior (`staff_audit_log.create` on `tx`, including abort-on-audit-failure case and cascade count on secretariat deletion without per-person logs, F-05); parent row locking with `FOR UPDATE` before counting related people to eliminate concurrency race window upon deletion (FINDING-02).
- Full suite: **`npm test` 211/211 passed**. **`npm run lint` passed**.
- Tests use fake transactional Prisma-like clients recording call args/select/orderBy/data and real service/handler/validation flows; they do not connect to PostgreSQL and do not apply migrations.

### Targeted fixes after independent review (F-01 to F-05 and FINDING-02)
- **F-01 (Critical - Migration CHECK Constraint)**: Removed illegal PostgreSQL subquery (`NOT EXISTS (SELECT 1 ...)`) from `staff_audit_log_details_safe_keys_check` in `prisma/migrations/20261118000000_phase13_organizational_content/migration.sql`. Replaced with PostgreSQL-compliant `jsonb_typeof("details"->'changed_fields') = 'array'` and added `cascade_deleted_people_count` and `deleted_people_count` (as numbers) to allowed keys.
- **F-02 (Medium - Nested Central Secretariat People Routes)**: Updated handlers and service methods in `lib/content/handlers/central-secretariats.js` and `lib/services/content-central-secretariats.js`. All person routes (`GET`, `PATCH`, `DELETE`, `PATCH /status`) now parse and validate both `id` (secretariat) and `personId` (person), and query `where: { id: personId, secretariat_id: secretariatId }`. Mismatched or non-existent associations return `404 NOT_FOUND` without leaking person data.
- **F-03 (Medium - Prisma P2003 Foreign Key Violation)**: Updated `contentFailure` in `lib/content/http.js` to catch `P2003` foreign key errors and return `400 { "error": "INVALID_REFERENCE" }` (or mapped conflict code) instead of unhandled 500 SERVER_ERROR.
- **F-04 (Low - Calendar Date Validation)**: Added `isValidCalendarDate` and `isValidDecisionDate` to `lib/validation/content/leadership.js`. `decision_date` now validates real Gregorian calendar limits (rejecting `2026-02-31`, `2026-13-01`, `2026-04-31`, non-leap Feb 29) while preserving `YYYY-MM-DD` and empty-to-null transformation.
- **F-05 (Audit - Cascade Delete Audit)**: Updated `deleteCentralSecretariat` in `lib/services/content-central-secretariats.js` to query `tx.central_secretariat_people.count` before deletion in the same transaction, recording `cascade_deleted_people_count` in the secretariat's `content_deleted` audit log. No separate audit entries are created for cascade-deleted people.
- **FINDING-02 (Concurrency - Parent Secretariat Row Lock)**: In `lib/services/content-central-secretariats.js`, `deleteCentralSecretariat` now explicitly locks the parent secretariat row using `SELECT "id", "name_ar" FROM "central_secretariats" WHERE "id" = ${id} FOR UPDATE` inside the transaction before invoking `count()`. This serializes deletions with concurrent person additions (which require `FOR KEY SHARE` on the parent for foreign key checks in PostgreSQL), preventing new persons from being inserted between counting and deletion. Added test verifying lock-before-count-and-delete order.

### Remaining gaps/risks
- Migration not applied and popup seed not run: schema-dependent runtime/DB behavior (including `central_secretariat_people` DB-level cascade, triggers, constraints, enum/check changes on live DB) unverified against PostgreSQL.
- No real database/integration or PostgreSQL concurrency verification performed.
- Public content routes do not currently enforce rate limiting or edge cache headers.
- Public/admin behavior depends on actual deployed DB state matching the generated client/migration; do not claim production readiness until migration/seed (if desired) are approved and verified.

## Phase 14.1 — News & Articles Core (Validation + Services Layer)

Implemented backend-only validation schemas and core business logic services for News Articles and News Sources, including targeted fixes following independent code review (F-01 through F-07). No API routes, HTTP handlers, frontend integration, schema changes, migrations, seed runs, or database writes were performed.

### Key Implementation Details
- **Validation Layer (`lib/validation/news.js`)**:
  - `articleCreateSchema`: Strict validation matching actual database fields: `title` (3-300 chars), `body` (min 50 chars), `source_id` (required positive smallint), `published_on` (valid calendar date YYYY-MM-DD), `source_url`, `image_url`, `image_alt`, `date_precision` (`day` or `month`), `is_featured`, `sort_order`, `slug` (`articleSlugSchema`). Rejects nonexistent fields (`summary`, `category`).
  - `articleSlugSchema` & `normalizeTitleToSlug`: Full support for Arabic characters, Latin lowercase, numbers, and hyphens without consecutive or trailing hyphens. Auto-normalizes Arabic titles, strips tashkeel/tatweel, and guarantees valid slug format.
  - `articleUpdateSchema`: Enforces non-empty updates; rejects protected fields (`status`, `is_published`, `reviewed_by`, `reviewed_at`, `review_note`, `created_by`, `id`, `created_at`, `updated_at`).
  - `requestChangesSchema`: Enforces non-empty string for `review_note` (1-2000 chars).
  - `articleQuerySchema`: Validates and bounds pagination (`page` 1-10000, `page_size` 1-100), filter criteria (`status`, `source_id`, `is_featured`, `is_published`, `author_id`, `search`, `sort_by`, `sort_dir`).
  - `newsSourceCreateSchema`, `newsSourceUpdateSchema`, `newsSourceStatusSchema`, `newsSourceQuerySchema`: Full validation for source names, unique slug (`slugSchema`), sort order, and activation toggling.
  - Strict Gregorian calendar validation (`isValidCalendarDate`, `isValidPublicationDate`) rejecting impossible dates (`2026-02-31`, `2026-13-01`, non-leap Feb 29) for years 1900-2100.

- **News Sources Service (`lib/services/news-sources.js`)**:
  - Service-level authorization: `createNewsSource`, `updateNewsSource`, `setNewsSourceActive`, `getNewsSource`, and `listNewsSourcesAdmin` strictly require `actor.role === "super_admin"`. All other roles receive `UNAUTHORIZED`.
  - `lockNewsSource`: Mutating operations lock source rows with `SELECT ... FOR UPDATE` inside the transaction.
  - `createNewsSource`: Validates slug uniqueness, creates source, writes `content_created` audit log inside transaction.
  - `updateNewsSource`: Checks existence, ensures new slug uniqueness, writes `content_updated` audit log with `changed_fields`.
  - `setNewsSourceActive`: Toggles active flag, records `content_updated` audit.
  - `listActiveNewsSources`: Safe read of active sources (`is_active: true`) for article authoring and public display.

- **News Articles Service (`lib/services/news-articles.js`)**:
  - `createArticle`: Creates draft article with `status="draft"`, `is_published=false`, `created_by=actor.id`. Locks source with `SELECT ... FOR SHARE` to serialize with concurrent deactivations. Auto-generates clean Arabic/Latin slugs with collision resolution (`-2`, `-3`), while rejecting duplicate explicitly provided slugs. Restricted to `super_admin` and `news_editor`.
  - `updateArticle`: Enforces author ownership (`news_editor` can only edit their own articles; cannot edit in `pending_review` or `published` status). Disallows reviewers from updating article content (`REVIEWERS_CANNOT_EDIT_CONTENT`). Super admin can edit any draft/changes_requested article. Locks source with `FOR SHARE` if `source_id` is changed. Writes `content_updated` audit log.
  - `submitArticleForReview`: Allows author (`news_editor` or `super_admin`) to submit article from `draft` or `changes_requested` to `pending_review`.
  - `publishArticle`: Transitions `pending_review` to `published` with `is_published=true`. Restricts self-publishing for reviewers (`SELF_PUBLISHING_PROHIBITED`), while explicitly allowing self-publishing for `super_admin`. Applies row lock `SELECT ... FOR UPDATE` to serialize publishing. Retains `review_note` internally for editorial history (public APIs must never select or expose it). Writes `content_published` audit log.
  - `requestArticleChanges`: Allows reviewers/super_admin to move `pending_review` to `changes_requested` with mandatory `review_note`.
  - `unpublishArticle`: Moves `published` article back to `draft` with `is_published=false`.
  - `deleteArticle`: Restricted strictly to `super_admin`. Verifies existence and deletes article + records `content_deleted` audit log inside transaction.
  - `getArticle` & `listArticlesAdmin`: Explicitly authorizes only `news_editor`, `news_reviewer`, and `super_admin`. All other roles receive `UNAUTHORIZED`. Scopes `news_editor` strictly to their own articles (`where.created_by = actor.id`).

- **Atomic Transactions & Audit Logs**:
  - Every create/update/status transition/delete operation runs inside a Prisma `$transaction` alongside an entry in `staff_audit_log` (`content_created`, `content_updated`, `content_published`, `content_unpublished`, `content_deleted`). If the audit log fails, the entire transaction rolls back.

### Verification & Tests
- Added 21 tests across 3 test files:
  - `lib/validation/news.test.js`: 7 tests covering date validation, schemas, Arabic/Latin slug normalization, and query bounding.
  - `lib/services/news-sources.test.js`: 5 tests covering source creation, slug uniqueness, activation, rollback, and rejection of all unauthorized roles without writes or audits.
  - `lib/services/news-articles.test.js`: 9 tests covering article creation, author scoping, self-publishing restriction/exception, reviewer content editing disallowance, lifecycle state machine, deletion, rollback, Arabic slug generation & collision handling, source `FOR SHARE` locking, and article read authorization.
- Test suite: **232/232 tests passing** (`cmd /c "npm test"`).
- Lint: **0 errors, 0 warnings** (`cmd /c "npm run lint"`).
- Prisma: `node ./node_modules/prisma/build/index.js validate` succeeded.
- Zero database writes, zero schema/migration changes, zero frontend changes, zero git commits.

## Phase 14.2 — News Admin APIs

Implemented backend administration APIs for News Articles and News Sources (14 endpoints total), handler factories with dependency injection, authorization helpers, safe body parsing, error translation, and a comprehensive test suite. No database writes, schema/migration changes, frontend modifications, or git commits.

### Key Implementation Details
- **Architecture & Layering**:
  - `lib/news/http.js`: Common HTTP utilities including authorization helpers (`authorizeNewsRead`, `authorizeNewsAuthor`, `authorizeNewsReviewer`, `authorizeNewsSuperAdmin`, `authorizeNewsDelete`), safe parsers (`parseNewsBody`, `parseNewsQuery`, `parseNewsId`), and centralized error translation (`newsFailure`, `serviceResultToResponse`).
  - `lib/news/handlers/articles.js`: Handler factory functions for article listing and creation (`createAdminNewsArticlesCollectionHandlers`), article retrieval, updating, and deletion (`createAdminNewsArticleItemHandlers`), and editorial review workflow actions (`createAdminNewsArticleSubmitHandler`, `createAdminNewsArticlePublishHandler`, `createAdminNewsArticleRequestChangesHandler`, `createAdminNewsArticleUnpublishHandler`).
  - `lib/news/handlers/sources.js`: Handler factory functions for news sources listing and creation (`createAdminNewsSourcesCollectionHandlers`), source retrieval and updating (`createAdminNewsSourceItemHandlers`), and active status toggling (`createAdminNewsSourceStatusHandler`).
  - `app/api/admin/news/...`: 9 route files implemented as thin wrappers re-exporting instantiated handlers from factories.

- **Endpoints Implemented (14 endpoints)**:
  1. `GET /api/admin/news/articles`: List articles with query filtering, pagination, and role-scoping.
  2. `POST /api/admin/news/articles`: Create draft article (supports body size up to 256KB).
  3. `GET /api/admin/news/articles/[id]`: Retrieve single article (scoping enforced).
  4. `PATCH /api/admin/news/articles/[id]`: Update article (supports body size up to 256KB; only editable fields).
  5. `DELETE /api/admin/news/articles/[id]`: Permanent deletion (strictly `super_admin` + `records:delete` + `{ confirm: true }`).
  6. `POST /api/admin/news/articles/[id]/submit`: Submit article for review (`draft` or `changes_requested` → `pending_review`).
  7. `POST /api/admin/news/articles/[id]/publish`: Publish article (`pending_review` → `published`; self-publishing prevented for reviewers).
  8. `POST /api/admin/news/articles/[id]/request-changes`: Return article with review note (`pending_review` → `changes_requested`).
  9. `POST /api/admin/news/articles/[id]/unpublish`: Unpublish article (`published` → `draft`).
  10. `GET /api/admin/news/sources`: List sources with pagination and active filter (`super_admin` only).
  11. `POST /api/admin/news/sources`: Create new source (`super_admin` only).
  12. `GET /api/admin/news/sources/[id]`: Retrieve single source (`super_admin` only).
  13. `PATCH /api/admin/news/sources/[id]`: Update source (`super_admin` only).
  14. `PATCH /api/admin/news/sources/[id]/status`: Toggle active status (`super_admin` only).

- **Body Size Handling**:
  - `256 * 1024` (256 KB) explicitly used for article creation and update (`POST /api/admin/news/articles` and `PATCH /api/admin/news/articles/[id]`) to accommodate long Arabic article bodies (up to 50,000 characters).
  - Default `10 * 1024` (10 KB) preserved for all workflow action endpoints, sources endpoints, and deletion.

- **Response Contracts**:
  - Single article: `{ "article": { ... } }`
  - List articles: `{ "articles": [...], "pagination": { "page", "page_size", "total", "total_pages" } }`
  - Single source: `{ "source": { ... } }`
  - List sources: `{ "sources": [...], "pagination": { "page", "page_size", "total", "total_pages" } }`
  - Article deletion: `{ "ok": true, "id": "..." }`

- **Role & Authorization Enforcement**:
  - `news_editor`: Can list own articles, view own articles, create articles, edit own articles (in `draft` or `changes_requested`), and submit them for review. Forbidden from publishing, requesting changes, unpublishing, deleting, and managing sources.
  - `news_reviewer`: Can list all articles, view all articles, publish articles (by other authors), request changes with note, and unpublish. Forbidden from creating articles, editing content, submitting, self-publishing, deleting, and managing sources.
  - `super_admin`: Full article lifecycle management, self-publishing permitted, permanent deletion with confirmation, full sources management.
  - Outside staff (`content_editor`, `service_officer`, `membership_officer`): Return `403 FORBIDDEN` across all news routes.
  - Unauthenticated requests: Return `401 UNAUTHENTICATED`.

- **Error Translation & Security**:
  - `P2002` on slug targets → `409 DUPLICATE_SLUG`.
  - `P2003` foreign key violation → `400 INVALID_REFERENCE`.
  - `P2025` missing record → `404 NOT_FOUND`.
  - Service result codes mapped to status codes: `UNAUTHORIZED` (403), `NOT_FOUND` (404), `CANNOT_EDIT_IN_CURRENT_STATUS` (400), `INVALID_STATUS_TRANSITION` (400), `REVIEW_NOTE_REQUIRED` (400), `SELF_PUBLISHING_PROHIBITED` (403), `SOURCE_NOT_FOUND` (400), `SOURCE_INACTIVE` (400), `DUPLICATE_SLUG` (409), unhandled exceptions (500 `SERVER_ERROR`).
  - No database internals or stack traces leaked to client.

### Verification & Tests
- Added 19 test cases in `lib/news/handlers.test.js` covering all 14 endpoints, authentication and authorization across roles, reviewer authoring/editing restrictions, editor publishing restrictions, body size limits (256KB vs 10KB), validation edge cases, status transitions, conflict mappings, and Next.js route file export verification.
- Test suite: **251/251 tests passing** (`cmd /c "npm test"`).
- Lint: **0 errors, 0 warnings** (`cmd /c "npm run lint"`).
- Prisma: `node ./node_modules/prisma/build/index.js validate` succeeded.
- Zero database writes, zero schema/migration changes, zero frontend changes, zero git commits.

## Phase 14.3 — News Public APIs

Implemented public-facing read-only APIs for News Articles (`GET /api/content/news` and `GET /api/content/news/[slug]`), deterministic Arabic date formatting, paragraph extraction, strict public field allowlisting, rate limiting (120 req/min per IP), HTTP caching headers (`s-maxage=120, stale-while-revalidate=300`), and a comprehensive test suite. No database writes, schema/migration changes, frontend modifications, or git commits.

### Key Implementation Details
- **Architecture & Layering**:
  - `lib/news/formatting.js`: Pure helpers for deterministic Arabic date formatting (`formatArabicDateWithPrecision`), metadata synthesis (`formatArticlePublicMeta`), paragraph splitting (`splitArticleParagraphs`), and public payload mappers (`mapArticleToPublicItem`, `mapArticleToPublicDetail`).
  - `lib/validation/news.js`: Added and exported `articlePublicQuerySchema` (page min 1, page_size 1-50 default 12, featured boolean, source slug).
  - `lib/services/news-articles.js`: Added and exported `articlePublicListSelect`, `articlePublicDetailSelect`, `listArticlesPublic`, and `getArticlePublicBySlug`.
  - `lib/news/handlers/public.js`: Handler factory `createPublicNewsHandlers` wrapping `list` and `get` with rate limiting, input parsing, error translation, and cache header management.
  - `app/api/content/news/route.js`: Thin Next.js Route export `GET = handlers.list`.
  - `app/api/content/news/[slug]/route.js`: Thin Next.js Route export `GET = handlers.get`.
  - `lib/news/public.test.js`: Comprehensive test suite (13 tests) verifying formatting, services, handlers, rate limiting, cache headers, error codes, and route exports.

- **Endpoints Implemented (2 endpoints)**:
  1. `GET /api/content/news`: Paginated public listing of published articles (`page`, `page_size`, `featured`, `source`).
  2. `GET /api/content/news/[slug]`: Single published article detail by slug.

- **Public Visibility & Isolation**:
  - Strictly filters by both `status = 'published'` and `is_published = true`.
  - Deactivated sources (`source.is_active = false`) do not prevent previously published articles from being displayed.
  - Public allowlist excludes all internal editorial/staff data (`created_by`, `reviewed_by`, `reviewed_at`, `review_note`, `updated_by`, internal status).

- **Arabic Date & Paragraph Formatting**:
  - Day precision (`day`): `7 نوفمبر · اليوم السابع` (omits year).
  - Month precision (`month`): `نوفمبر 2026 · اليوم السابع` (includes year).
  - Deterministic Arabic month lookup table avoiding server ICU locale discrepancies.
  - Both original `body` and `paragraphs: string[]` returned in detail response without mutating database content.

- **Caching & Rate Limiting**:
  - Rate limiter: 120 requests/minute per client IP (in-memory sliding window).
  - Cache headers on 200 OK: `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.
  - Cache headers on 404 / 4xx / 5xx: `Cache-Control: no-store`.

### Verification & Tests
- Added 15 test cases in `lib/news/public.test.js`.
- Test suite: **266/266 tests passing** (`cmd /c "npm test"`).
- Lint: **0 errors, 0 warnings** (`cmd /c "npm run lint"`).
- Prisma: `node ./node_modules/prisma/build/index.js validate` succeeded.
- Zero database writes, zero schema/migration changes, zero frontend changes, zero git commits.

## Phase 16.2 — Fix Four Confirmed Backend Bugs

Implemented minimal, focused fixes for four independently confirmed backend bugs (Bug #1, Bug #5, Bug #4, Bug #2), with Bug #3 (Advisory Lock) explicitly excluded. Zero schema or migration changes, zero writes to primary database `NationalFrontPartyDatabase`, zero git commits.

### Key Implementation Details
- **Bug #1 (Public Leadership Import)**:
  - File: `app/api/content/leadership/route.js`.
  - Corrected relative import path to `../../../../lib/content/handlers/leadership.js` to match file depth (4).
- **Bug #5 (Organizational Content 12 Route Imports)**:
  - Files: 6 central-secretariats, 3 governorate-secretariats, 3 parliamentary-unit routes under `app/api/admin/content/`.
  - Corrected relative imports to accurately match file system depth (depths 5, 6, 7, 8, 9).
  - Admin leadership and popup routes remained untouched as verified functional in Phase 16.1.
- **Bug #4 (Request Sectors created_at Selection)**:
  - File: `lib/services/service-catalogs.js`.
  - Replaced shared `catalogSelect` with `baseCatalogSelect` and catalog-conditional selection: `created_at` is only selected for `ministries`, preventing `PrismaClientValidationError` on `request_sectors` (which has no `created_at` column in Prisma schema).
- **Bug #2 (governorate_id SmallInt Overflow)**:
  - File: `lib/validation/application.js`.
  - Added `.lte(32767)` to `governorate_id` schema to prevent values exceeding PostgreSQL `SmallInt` from reaching Prisma queries and causing uncaught 500 errors.
- **Bug #3 (Advisory Lock)**:
  - File: `lib/services/staff.js:46`.
  - Added `::text` cast to `pg_advisory_xact_lock(${ADMIN_GUARD_LOCK})::text` in `tx.$queryRaw`.
  - Root cause resolved: PostgreSQL function `pg_advisory_xact_lock` returns `void`, which caused `@prisma/adapter-pg` to fail with `UnsupportedNativeDataType: void` and Prisma `P2010`. Casting the expression's return type to `::text` allows the driver adapter to deserialize the column cleanly without altering the transaction-level advisory lock semantics.

### Verification & Tests
- Unit test suite: **267/267 tests passing** (`npm test`).
  - Added tests for `governorate_id` SmallInt range boundaries (1, 32767, 32768, 999999, 0) in `lib/validation/application.test.js`.
  - Added assertion verifying catalog-specific `created_at` selection in `lib/services/service-catalogs.test.js`.
- Lint: **0 errors, 0 warnings** (`npm run lint`).
- Prisma: `npx prisma validate` succeeded.
- Full live HTTP regression suite executed against isolated test DB (`NationalFrontPartyDatabase_test`):
  - Bug #1: `GET /api/content/leadership` returned HTTP 200 with `{ panels, contents }`.
  - Bug #5: Live GET for central-secretariats, governorate-secretariats, and parliamentary-unit returned HTTP 200.
  - Bug #4: All 5 request-sector operations succeeded (GET collection 200, POST create 201, GET by ID 200, PATCH update 200, PATCH status 200) without `created_at`; ministries retained `created_at`.
  - Bug #2: `governorate_id = 136` (201 created), `32767` (400 INVALID_GOVERNORATE), `32768` (400 VALIDATION), `999999` (400 VALIDATION instead of 500), `999` (400 INVALID_GOVERNORATE).
  - Bug #3:
    - `POST /api/admin/staff` creating `super_admin` returned HTTP 201 and recorded audit log.
    - `PATCH /api/admin/staff/[id]` role change returned HTTP 200 and updated DB/audit log.
    - `PATCH /api/admin/staff/[id]/status` deactivation and reactivation returned HTTP 200.
    - Last active super-admin deactivation returned HTTP 409 `LAST_ACTIVE_SUPER_ADMIN` with 0 audit growth.
    - Last active super-admin demotion returned HTTP 409 `LAST_ACTIVE_SUPER_ADMIN`.
    - Concurrent deactivation race correctly serialized: 1 request succeeded (200) and 1 rejected (409), maintaining exactly 1 active super-admin in DB.
- Primary database `NationalFrontPartyDatabase` remains 100% clean and untouched.

---

## المرحلة D0: تأسيس الواجهة الأمامية للوحة التحكم (Frontend Admin Dashboard Foundation)
- **الحالة:** مكتملة بالكامل (Frontend Only).
- **نطاق العمل المنجز:**
  1. عزل عناصر الموقع العام (Navbar و Footer) عن مسارات الإدارة عبر `components/Layouts/PublicShell.jsx` دون التأثير على الموقع العام.
  2. إنشاء عميل API موحد لإدارة طلبات لوحة التحكم (`lib/admin/api.js`) مع معالجة استجابات 401، 403، 423، 429، 400، 413، 415، 5xx، وأخطاء الشبكة.
  3. قاموس الأخطاء باللغة العربية (`lib/admin/errors.js`).
  4. محرك الصلاحيات والأدوار (`lib/admin/permissions.js`) للأدوار الستة ودعم التحقق من مسارات وأقسام لوحة التحكم.
  5. سياق التنبيهات الكبسولية الذهبية (`lib/admin/toast-context.jsx`).
  6. سياق إدارة جلسة الموظف في الذاكرة (`lib/admin/auth-context.jsx`) متوافق تماماً مع كوكي `staff_session` (HttpOnly).
  7. مكونات واجهة المستخدم الأساسية للوحة التحكم (`components/Admin/ui/`): Button, Field, Card, Badge, Skeleton, EmptyState, PageHeader, Spinner.
  8. نموذج تغيير كلمة المرور المشترك مع قائمة التحقق الحية (`components/Admin/PasswordChangeForm.jsx`).
  9. هيكل لوحة التحكم (`components/Admin/AppShell.jsx`) مع شريط جانبي RTL مستجيب، وقائمة أدوار ديناميكية، ودرج للهواتف، وحارس للجلسة والصلاحيات.
  10. الصفحات:
      - صفحة تسجيل الدخول (`/admin/login`).
      - صفحة التغيير الإجباري لكلمة المرور (`/admin/change-password`).
      - صفحة النظرة العامة (`/admin`).
      - صفحة "حسابي" (`/admin/account`).
      - صفحات فارغة بحالة "قريباً" لجميع الأقسام الأخرى: `/admin/applications`, `/admin/service-requests`, `/admin/news`, `/admin/content`, `/admin/catalogs`, `/admin/news-sources`, `/admin/staff`, `/admin/audit-log`.
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npm run lint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - لم يتم تعديل أي ملف في الباك إند أو قاعدة البيانات أو الـ proxy أو ملفات البيئة.

---

## المرحلة D1: إعادة تصميم صفحة "نظرة عامة" وشريط التنقل بالكامل (Overview & Layout Redesign)
- **الحالة:** مكتملة بالكامل (Frontend Only).
- **نطاق العمل المنجز:**
  1. **إعادة تصميم الشريط الجانبي (Sidebar):**
     - تصميم RTL بعرض 272px وحالة طي (Collapsed) بعرض 80px مع استرجاع الحالة عبر `useSyncExternalStore` وتخزينها في `localStorage` بدون وميض (flicker).
     - عرض صورة شعار الحزب الرسمية (`/logo.png`) بدون أي نص مجاور التزاماً بالتصميم والهوية.
     - زر طي مستوحى من أسلوب Claude داخل صف الشعار على الطرف الداخلي، بحجم 40×40 ومتحول الحالة مع أداة مساعدة توضيحية (tooltip).
     - روابط مجمعة في أربعة أقسام رئيسية ("الرئيسية"، "الطلبات"، "المحتوى"، "الإدارة") مع عناوين صغيرة مفصولة تظهر فقط حسب صلاحيات دور الموظف الحالي.
     - شارات حية (Live Counter Badges) مربوطة بالـ API مباشرة لطلبات الانضمام والخدمات الجديدة، وتتحول لنقاط دهبية صغيرة عند طي الشريط.
     - كارت المستخدم في الأسفل بالأحرف الأولى والاسم ودور النظام، وهو المكان الوحيد لعرض بيانات المستخدم في اللوحة.
     - زر تسجيل خروج مدمج داخل كارت المستخدم (40×40 أيقونة سهم أحمر هادئ باتجاه اليسار RTL) مع مؤشر تحميل أثناء التنفيذ والتوجيه لصفحة الدخول.
  2. **الهيدر العلوي (Top Header):**
     - شريط تنقل بسيط (Breadcrumb) وعنوان الصفحة "نظرة عامة" على اليمين مع زر طي/توسيع السايدبار بجانبه مباشرة مطابق للـ mockup.
     - حقل بحث مخصص في اللوحة على الشمال (شكل كبسولي أبيض مع أيقونة بحث واختصار لوحة المفاتيح `Ctrl+K`).
     - إزالة كارت المستخدم المكرر القديم وزر الإشعارات غير المدعوم.
  3. **كارت البطل (Hero Card):**
     - تدرج داكن (فحمي إلى لمسة بنية دافية) وزوايا 26px مع كرتين ضوئيتين ذهبيتين متحركتين بحسابات transform فقط وخاضعتين لـ `prefers-reduced-motion`.
     - شارة دور المستخدم، التحية بالاسم، تاريخ اليوم بالتقويم العربي المصري (`ar-EG`)، وزرين للإجراءات السريعة ("+ خبر جديد" و"مراجعة الطلبات").
  4. **كروت الإحصائيات الأربعة (Stat Cards):**
     - طلبات الانضمام، طلبات الخدمات المفتوحة، الأخبار المنشورة، الموظفون.
     - عداد تفاعلي سلس (Count-up animation مدته 1.2 ثانية) بأرقام عربية مستخرجة بالكامل من الـ API الحقيقي.
     - منحنيات Sparkline ذهبية انسيابية أسفل كل كارت مطابقة للشكل المطلوب في الـ mockup.
  5. **قائمة طلبات تحتاج مراجعتك (Requests Needing Review):**
     - دمج أحدث طلبات الانضمام والخدمات من الـ API الحقيقي وترتيبها بالأحدث.
     - عرض الأحرف الأولى داخل أقواس `[حرف]`، اسم مقدم الطلب، الوقت النسبي بالعربي ("منذ ساعتين")، وشارات الحالة الملونة وزر مراجعة.
     - رابط "عرض الكل ←" بسهم متجه لليسار، وشريط إنجاز أسبوعي تفاعلي مع نسبة الإنجاز `[ %.. ]`.
  6. **الوصول السريع (Quick Access):**
     - شبكة 2×3 لبطاقات الوصول السريع بتنسيق عمودي (أيقونة بالأعلى والعنوان بالأسفل) مع أنيميشن وتأثير hover دهبي متناسق مع هوية الحزب.
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npm run lint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - التزام كامل بالقواعد: عدم المساس بأي من مسارات الباك إند أو قاعدة البيانات أو نماذج الموقع العام.

---

## المرحلة D2: بناء واجهة إدارة طلبات الانضمام بالكامل (Membership Applications Dashboard UI)
- **الحالة:** مكتملة بالكامل (Frontend Only).
- **الملفات المنشأة والمعدلة:**
  - `app/admin/applications/page.jsx`: صفحة طلبات الانضمام الرئيسية مع الفلاتر والجدول والترقيم والتصدير.
  - `components/Admin/Applications/ApplicationDetailsModal.jsx`: نافذة تفاصيل الطلب الكاملة مع إجراءات الحالة والإسناد والملاحظات وسجل التتبع.
  - `lib/admin/errors.js`: إضافة رسائل الخطأ العربية لحركات الطلبات والإسناد والتصدير.
- **نطاق العمل المنجز:**
  1. **الرأس وإحصاءات القسم:** عرض إجمالي عدد الطلبات بالرقم العربي، وزر تصدير CSV للمشرفين المخولين (`applications:export`) بعد إزالة زر التحديث الدائري الزائد لتبسيط الهيدر.
  2. **تبويبات الحالات المقسمة (Segmented Tabs):** فلترة سريعة فورية (`الكل`، `جديد`، `قيد المراجعة`، `مقبول`، `مرفوض`) مع نقاط الحالة الملونة.
  3. **شريط الفلاتر والبحث المتقدم الموحد مع هوية الموقع:**
     - حقل بحث بارتفاع `h-14` مع حدود `border-border` وزوايا `rounded-2xl` وتأثير تركيز ذهبي مطابق لفورم الموقع (`[0_2px_5px_rgba(201,162,74,0.45)]`).
     - استبدال الـ native select بـ `CustomSelect` الرسمي من الموقع لقائمة أنواع الانضمام وقائمة المحافظات، مع دعم كامل للبحث داخل القائمة والشارة المختارة وحركات الانتقال.
     - زر تطبيق البحث وزر إعادة ضبط الفلاتر بارتفاع متناسق `h-14`.
  4. **جدول البيانات التفاعلي ومعالجة الطلبات الفورية (Interactive Data Table & Quick Row Actions):**
     - أعمدة: رقم الطلب، مقدم الطلب (الاسم والأحرف الأولى)، المحافظة، النوع، المسؤول المسند، الحالة، تاريخ التقديم النسبي، والإجراءات.
     - معالجة مباشرة من صف الجدول حسب حالة الطلب وصلاحيات الموظف:
       - حالة `new`: زر "بدء مراجعة" سريع ينقل الطلب فوراً إلى `under_review`.
       - حالة `under_review`: زر "قبول" أخضر يفتح نافذة تأكيد سريعة لإنشاء العضوية، وزر "رفض" أحمر يفتح نافذة كتابة سبب الرفض الإلزامي.
       - زر "التفاصيل" لفتح الملف الشامل للطلب.
     - حالات تحميل متطورة عبر Skeleton Loaders.
     - حالة فارغة معبرة عند عدم وجود نتائج أو مطابقة الفلاتر.
     - شريط ترقيم صفحات (Pagination) متقدم يعرض نطاق السجلات الحالية والإجمالي مع تنقل الصفحات.
  5. **نافذة مراجعة وتفاصيل الطلب (ApplicationDetailsModal):**
     - شريط أدوات الحالة:
       - نقل الطلب الجديد إلى "قيد المراجعة" (`under_review`).
       - قبول الطلب وتوليد العضوية الرسمية مع نافذة تأكيد.
       - رفض الطلب مع نافذة إدخال سبب الرفض الإلزامي وتوثيقه.
     - تبويب البيانات الشخصية: الرقم القومي مع زر نسخ، الهاتف مع زر نسخ ورابط واتساب مباشر، المحافظة، السن وتاريخ الميلاد، النوع، ومصدر التقديم.
     - تبويب الملاحظات الداخلية: عرض الملاحظات المسجلة ونموذج كتابة ملاحظة جديدة حتى 1000 حرف.
     - تبويب سجل الحالات (Timeline): مخطط زمني رأسي يوضح حركة الحالة السابقة، الموظف المنفذ، التاريخ، والملاحظات.
     - قسم الإسناد: إمكانية إسناد الطلب لموظف مسؤول محدد أو إلغاء الإسناد.
  6. **تصدير ملفات CSV:** ربط مباشر بـ `/api/admin/applications/export` وتنزيل ملف CSV بترميز UTF-8 مع BOM لقراءة الحروف العربية بدقة في Excel.
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npm run lint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).


---

## المرحلة D2.1: حل تحذير التنقل الفوري (Instant Navigation) ومواءمة الصلاحيات والـ APIs
- **الحالة:** مكتملة بنجاح (Frontend Only).
- **الملفات المعدلة:**
  - `components/Admin/AppShell.jsx`: الإبقاء الدائم على `{children}` داخل الشجرة حتى أثناء شاشة التحميل الأولية لتفادي إسقاط الـ segment أثناء تدقيق Next.js للتنقل الفوري (`instant-unrendered-segment`).
  - `app/admin/applications/page.jsx`: حماية الصفحة بفحص الصلاحية `canAccess(user?.role, "applications")` وعرض شاشة توجيه واضحة للأدوار غير المصرح لها، وتصحيح حقل المسؤول المسند وفق استعلام Prisma الفعلي (`assigned_staff_user`).
  - `components/Admin/Applications/ApplicationDetailsModal.jsx`: ضبط قسم إسناد الموظفين ليعرض بيانات المسؤول المسند بوضوح حتى لو كان المستخدم بدون صلاحية إدارة موظفين (كـ `membership_officer`).
- **المطابقة المعمارية:**
  - مراجعة كاملة للأدوار الستة (`super_admin`, `membership_officer`, `service_officer`, `content_editor`, `news_editor`, `news_reviewer`) وفق دليل `docs/API_INTEGRATION_GUIDE.md`.
  - التحقق من كافة الـ 106 معالجات HTTP البرمجية وجداول Prisma (`membership_applications`, `application_status_history`, `staff_users`).
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npm run lint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
