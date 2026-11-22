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
| 18 | الهيكل التنظيمي والبحث الجغرافي للوحدات الحزبية | تنفيذ Backend APIs وValidation وServices وPermission على Branch مستقل؛ Migration غير مطبقة، والاختبارات لم تُشغّل بعد |
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


---

## المرحلة D3: بناء واجهة إدارة طلبات خدمات المواطنين بالكامل (Service Requests Dashboard UI)
- **الحالة:** مكتملة بنجاح (Frontend Only).
- **الملفات المنشأة والمعدلة:**
  - `app/admin/service-requests/page.jsx`: صفحة طلبات الخدمات الرئيسية مع البحث المتقدم والفلاتر والجدول والترقيم وتكامل الصلاحيات.
  - `components/Admin/ServiceRequests/ServiceRequestDetailsModal.jsx`: نافذة تفاصيل طلب الخدمة الشاملة (ملف المواطن، التوجيه الحكومي، الوزارة والقطاع، بيانات المتابعة والملاحظات).
- **نطاق العمل المنجز:**
  1. **الرأس وإحصاءات القسم:** عرض إجمالي عدد طلبات الخدمات بالرقم العربي، مع وصف إرشادي للقسم.
  2. **تبويبات الحالات المقسمة (Segmented Tabs):** فلترة فورية (`الكل`، `جديد`، `قيد المتابعة`، `مكتمل`، `مغلق`) بنقاط ملونة متوافقة مع الـ Theme Tokens.
  3. **فلاتر وبحث متقدم موحد مع هوية الموقع:**
     - حقل بحث بارتفاع `h-14` مع حدود `border-border` وزوايا `rounded-2xl` وتأثير تركيز ذهبي مطابق لفورم الموقع (`focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]`).
     - قائمتان منسدلتان باستخدام `CustomSelect` الرسمي من الموقع لاختيار الوزارة المعنية والقطاع الخدمي.
     - زر تطبيق البحث الذهبي وزر إعادة الضبط بارتفاع `h-14`.
  4. **جدول البيانات التفاعلي (Interactive Data Table):**
     - أعمدة: رقم الطلب، المواطن مقدم الطلب (الاسم والأحرف الأولى)، رقم الهاتف (مع أزرار النسخ ورابط واتساب المباشر)، الوزارة المعنية، القطاع الخدمي، شارة الحالة، تاريخ التقديم النسبي، والإجراءات.
     - حالات تحميل متطورة عبر Skeleton Loaders.
     - حالة فارغة معبرة مع زر لإعادة ضبط الفلاتر.
     - شريط ترقيم صفحات (Pagination) متقدم يعرض نطاق السجلات الحالية والإجمالي مع تنقل الصفحات.
  5. **نافذة تفاصيل طلب الخدمة (ServiceRequestDetailsModal):**
     - ملف المواطن: الاسم ورقم الهاتف مع زر النسخ وواتساب.
     - الجهة والتوجيه الحكومي: كروت الوزارة المعنية والقطاع الخدمي المختار.
     - بيانات التقديم والمتابعة: التاريخ والوقت بالتقويم العربي، مصدر الطلب، والمسؤول المسند عن المتابعة.
     - الملاحظات الداخلية المسجلة (إن وجدت).
  6. **الحماية والصلاحيات:** حماية الصفحة بحيث تتاح لـ `super_admin` و `service_officer` فقط مع شاشة توجيه واضحة للأدوار غير المصرح لها وفق `docs/API_INTEGRATION_GUIDE.md`.
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npx eslint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).

---

## المرحلة D4.4: تصحيح مسار استيراد `requireStaff` في مسار رفع صور الأخبار
- **الحالة:** مكتملة بنجاح.
- **التفاصيل:**
  - تم تصحيح عمق مسار الاستيراد النسبي في `app/api/admin/news/upload/route.js` من `../../../../` إلى `../../../../../` للوصول الصحيح إلى `lib/auth/guard.js` و `lib/auth/http.js` و `lib/services/news-storage.js`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات ناجحة بنسبة 100%.

---

## المرحلة D4.5: حل مشاكل رفع صور الأخبار وإنشاء المقالات وتحسين التحقق
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **التعديلات:**
  - `components/Admin/News/ArticleEditorModal.jsx`:
    - إضافة `credentials: "include"` لطلب رفع الصورة `POST /api/admin/news/upload` لضمان إرسال كوكي المصادقة دائماً.
    - دعم التحقق من امتدادات الصور (`.jpg`, `.jpeg`, `.png`, `.webp`) بالإضافة إلى MIME types لمنع أي رفض خاطئ لصور الأجهزة على مختلف المتصفحات.
    - تهيئة رابط المصدر الخارجي تلقائياً بإضافة `https://` إذا كُتب النطاق مباشرة، وتنبيه المستخدم مسبقاً إذا كان النص المدخل غير صالح.
    - تطهير المعرف اللطيف (Slug) تلقائياً بتحويله للأحرف الصغيرة واستبدال المسافات بشرطات.
    - عرض تفاصيل الأخطاء الحقلية المحددة (`err.issues`) للمستخدم في الإشعار بدلاً من الرسائل العامة الغامضة.
  - `app/api/admin/news/upload/route.js`:
    - توسيع فحص الصلاحيات لدعم الموظفين المالكين لصلاحية `news:write` بالإضافة لـ `super_admin` و `news_editor`.
    - تحسين تسجيل الأخطاء بـ `logAuthError`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات (272/272) ناجحة بنسبة 100%.




---

## المرحلة D3.2: توحيد حالات الطلبات وتحديث التبويبات وزر الإغلاق التفاعلي (Unified Statuses & Interactive Micro-Interactions)
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **الملفات المعدلة:**
  - `lib/services/service-request-queries.js`: دعم مطابقة كل من `rejected` و `closed` عند فلترة طلبات الخدمات بحالة «مرفوض» (`where.status = { in: ["rejected", "closed"] }`) لضمان ظهور أي طلبات مرفوضة أو مغلقة سابقة وفورية.
  - `lib/validation/service-request.js`: توسيع `serviceRequestStatusSchema` لتقبل كلاً من `rejected` و `closed`.
  - `app/admin/service-requests/page.jsx`:
    - توحيد تبويبات الحالات المقسمة (Segmented Tabs) وشارات الحالات لتتطابق تماماً مع صفحة طلبات الانضمام: «جميع الحالات»، «جديد»، «قيد المراجعة»، «مقبول»، «مرفوض».
    - ربط كود الحالة `rejected` بتنسيق الشارة الحمراء الرسمية وإتاحة فلترتها المباشرة بنجاح.
    - تطبيق زر الإغلاق التفاعلي الدوّار ذو التدرج والتوهج الذهبي (`hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)]`) على نوافذ التأكيد السريعة والرفض.
    - إضافة تأثيرات حركية فائقة السلاسة عند التمرير والنقر على الأزرار والإجراءات (`hover:scale-105 active:scale-95`).
  - `components/Admin/ServiceRequests/ServiceRequestDetailsModal.jsx`:
    - إضافة زر الإغلاق الدوّار الذهبي أعلى النافذة `(X)`.
    - توحيد مسميات الحالات وفق التبويبات القياسية («قيد المراجعة»، «مقبول»، «مرفوض»).
    - عرض تنبيه واضح ومميز بسبب الرفض المدوّن في تفاصيل الطلب عند رفضه أو إغلاقه.
  - `components/Admin/Applications/ApplicationDetailsModal.jsx`:
    - تبسيط نافذة تفاصيل طلب الانضمام والتخلص من العناصر غير الضرورية والازدحام لتركز على الأساسيات فقط (الاسم، الرقم القومي، الهاتف، المحافظة، نوع العضوية، شارة العضوية للأعضاء المقبولين، أو سبب الرفض للطلبات المرفوضة).
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npx eslint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).

---

## المرحلة D4.4: تصحيح مسار استيراد `requireStaff` في مسار رفع صور الأخبار
- **الحالة:** مكتملة بنجاح.
- **التفاصيل:**
  - تم تصحيح عمق مسار الاستيراد النسبي في `app/api/admin/news/upload/route.js` من `../../../../` إلى `../../../../../` للوصول الصحيح إلى `lib/auth/guard.js` و `lib/auth/http.js` و `lib/services/news-storage.js`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات ناجحة بنسبة 100%.

---

## المرحلة D4.5: حل مشاكل رفع صور الأخبار وإنشاء المقالات وتحسين التحقق
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **التعديلات:**
  - `components/Admin/News/ArticleEditorModal.jsx`:
    - إضافة `credentials: "include"` لطلب رفع الصورة `POST /api/admin/news/upload` لضمان إرسال كوكي المصادقة دائماً.
    - دعم التحقق من امتدادات الصور (`.jpg`, `.jpeg`, `.png`, `.webp`) بالإضافة إلى MIME types لمنع أي رفض خاطئ لصور الأجهزة على مختلف المتصفحات.
    - تهيئة رابط المصدر الخارجي تلقائياً بإضافة `https://` إذا كُتب النطاق مباشرة، وتنبيه المستخدم مسبقاً إذا كان النص المدخل غير صالح.
    - تطهير المعرف اللطيف (Slug) تلقائياً بتحويله للأحرف الصغيرة واستبدال المسافات بشرطات.
    - عرض تفاصيل الأخطاء الحقلية المحددة (`err.issues`) للمستخدم في الإشعار بدلاً من الرسائل العامة الغامضة.
  - `app/api/admin/news/upload/route.js`:
    - توسيع فحص الصلاحيات لدعم الموظفين المالكين لصلاحية `news:write` بالإضافة لـ `super_admin` و `news_editor`.
    - تحسين تسجيل الأخطاء بـ `logAuthError`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات (272/272) ناجحة بنسبة 100%.




---

## المرحلة D3.1: إضافة معالجة وقبول ورفض طلبات الخدمات (Service Requests Actions & Status Handling)
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **الملفات المنشأة والمعدلة:**
  - `lib/validation/service-request.js`: إضافة مخطط التحقق الصارم `serviceRequestStatusSchema` لدعم حالات `new`, `in_progress`, `completed`, `rejected` وملاحظة اختيارية.
  - `lib/services/service-requests.js`: إضافة دالة `updateServiceRequestStatus` لتحديث حالة طلب الخدمة وتعيين الموظف المنفذ وتسجيل الملاحظات وتاريخ التحديث.
  - `lib/service-requests/action-handlers.js`: إنشاء معالج الإجراء `createServiceRequestStatusHandler` المحمي بصلاحية `services:manage`.
  - `app/api/admin/service-requests/[id]/status/route.js`: تصدير المسار البرمجي `PATCH /api/admin/service-requests/[id]/status`.
  - `app/admin/service-requests/page.jsx`:
    - إضافة أزرار معالجة سريعة بكل صف:
      - طلب `جديد`: زر «بدء متابعة» أزرق ينقله لـ `in_progress`.
      - طلب `قيد المتابعة`: زر «قبول» أخضر يفتح نافذة تأكيد الإنجاز + زر «رفض» أحمر يفتح نافذة كتابة سبب الرفض.
      - زر «التفاصيل».
    - نافذة تأكيد القبول السريعة مع عرض بيانات الوزارة والقطاع.
    - نافذة كتابة سبب الرفض المصممة على نفس ستايل فورم الموقع مع التوهج الذهبي.
  - `components/Admin/ServiceRequests/ServiceRequestDetailsModal.jsx`: إضافة شريط إجراءات الحالة العلوي داخل نافذة التفاصيل أيضاً مع تحديث فوري وسلس للجدول عبر `onStatusUpdated`.
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npx eslint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).

---

## المرحلة D4.4: تصحيح مسار استيراد `requireStaff` في مسار رفع صور الأخبار
- **الحالة:** مكتملة بنجاح.
- **التفاصيل:**
  - تم تصحيح عمق مسار الاستيراد النسبي في `app/api/admin/news/upload/route.js` من `../../../../` إلى `../../../../../` للوصول الصحيح إلى `lib/auth/guard.js` و `lib/auth/http.js` و `lib/services/news-storage.js`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات ناجحة بنسبة 100%.

---

## المرحلة D4.5: حل مشاكل رفع صور الأخبار وإنشاء المقالات وتحسين التحقق
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **التعديلات:**
  - `components/Admin/News/ArticleEditorModal.jsx`:
    - إضافة `credentials: "include"` لطلب رفع الصورة `POST /api/admin/news/upload` لضمان إرسال كوكي المصادقة دائماً.
    - دعم التحقق من امتدادات الصور (`.jpg`, `.jpeg`, `.png`, `.webp`) بالإضافة إلى MIME types لمنع أي رفض خاطئ لصور الأجهزة على مختلف المتصفحات.
    - تهيئة رابط المصدر الخارجي تلقائياً بإضافة `https://` إذا كُتب النطاق مباشرة، وتنبيه المستخدم مسبقاً إذا كان النص المدخل غير صالح.
    - تطهير المعرف اللطيف (Slug) تلقائياً بتحويله للأحرف الصغيرة واستبدال المسافات بشرطات.
    - عرض تفاصيل الأخطاء الحقلية المحددة (`err.issues`) للمستخدم في الإشعار بدلاً من الرسائل العامة الغامضة.
  - `app/api/admin/news/upload/route.js`:
    - توسيع فحص الصلاحيات لدعم الموظفين المالكين لصلاحية `news:write` بالإضافة لـ `super_admin` و `news_editor`.
    - تحسين تسجيل الأخطاء بـ `logAuthError`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات (272/272) ناجحة بنسبة 100%.




---

## المرحلة D3.2: توحيد حالات الطلبات وتحديث التبويبات وزر الإغلاق التفاعلي (Unified Statuses & Interactive Micro-Interactions)
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **الملفات المعدلة:**
  - `lib/services/service-request-queries.js`: دعم مطابقة كل من `rejected` و `closed` عند فلترة طلبات الخدمات بحالة «مرفوض» (`where.status = { in: ["rejected", "closed"] }`) لضمان ظهور أي طلبات مرفوضة أو مغلقة سابقة وفورية.
  - `lib/validation/service-request.js`: توسيع `serviceRequestStatusSchema` لتقبل كلاً من `rejected` و `closed`.
  - `app/admin/service-requests/page.jsx`:
    - توحيد تبويبات الحالات المقسمة (Segmented Tabs) وشارات الحالات لتتطابق تماماً مع صفحة طلبات الانضمام: «جميع الحالات»، «جديد»، «قيد المراجعة»، «مقبول»، «مرفوض».
    - ربط كود الحالة `rejected` بتنسيق الشارة الحمراء الرسمية وإتاحة فلترتها المباشرة بنجاح.
    - تطبيق زر الإغلاق التفاعلي الدوّار ذو التدرج والتوهج الذهبي (`hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)]`) على نوافذ التأكيد السريعة والرفض.
    - إضافة تأثيرات حركية فائقة السلاسة عند التمرير والنقر على الأزرار والإجراءات (`hover:scale-105 active:scale-95`).
  - `components/Admin/ServiceRequests/ServiceRequestDetailsModal.jsx`:
    - إضافة زر الإغلاق الدوّار الذهبي أعلى النافذة `(X)`.
    - توحيد مسميات الحالات وفق التبويبات القياسية («قيد المراجعة»، «مقبول»، «مرفوض»).
    - عرض تنبيه واضح ومميز بسبب الرفض المدوّن في تفاصيل الطلب عند رفضه أو إغلاقه.
  - `components/Admin/Applications/ApplicationDetailsModal.jsx`:
    - تبسيط نافذة تفاصيل طلب الانضمام والتخلص من العناصر غير الضرورية والازدحام لتركز على الأساسيات فقط (الاسم، الرقم القومي، الهاتف، المحافظة، نوع العضوية، شارة العضوية للأعضاء المقبولين، أو سبب الرفض للطلبات المرفوضة).
- **التحقق:**
  - `npm test`: جميع الاختبارات (267/267) ناجحة بنسبة 100%.
  - `npx eslint`: خالٍ من أي أخطاء أو تحذيرات (0 errors, 0 warnings).

---

## المرحلة D4.4: تصحيح مسار استيراد `requireStaff` في مسار رفع صور الأخبار
- **الحالة:** مكتملة بنجاح.
- **التفاصيل:**
  - تم تصحيح عمق مسار الاستيراد النسبي في `app/api/admin/news/upload/route.js` من `../../../../` إلى `../../../../../` للوصول الصحيح إلى `lib/auth/guard.js` و `lib/auth/http.js` و `lib/services/news-storage.js`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات ناجحة بنسبة 100%.

---

## المرحلة D4.5: حل مشاكل رفع صور الأخبار وإنشاء المقالات وتحسين التحقق
- **الحالة:** مكتملة بنجاح (Full-Stack).
- **التعديلات:**
  - `components/Admin/News/ArticleEditorModal.jsx`:
    - إضافة `credentials: "include"` لطلب رفع الصورة `POST /api/admin/news/upload` لضمان إرسال كوكي المصادقة دائماً.
    - دعم التحقق من امتدادات الصور (`.jpg`, `.jpeg`, `.png`, `.webp`) بالإضافة إلى MIME types لمنع أي رفض خاطئ لصور الأجهزة على مختلف المتصفحات.
    - تهيئة رابط المصدر الخارجي تلقائياً بإضافة `https://` إذا كُتب النطاق مباشرة، وتنبيه المستخدم مسبقاً إذا كان النص المدخل غير صالح.
    - تطهير المعرف اللطيف (Slug) تلقائياً بتحويله للأحرف الصغيرة واستبدال المسافات بشرطات.
    - عرض تفاصيل الأخطاء الحقلية المحددة (`err.issues`) للمستخدم في الإشعار بدلاً من الرسائل العامة الغامضة.
  - `app/api/admin/news/upload/route.js`:
    - توسيع فحص الصلاحيات لدعم الموظفين المالكين لصلاحية `news:write` بالإضافة لـ `super_admin` و `news_editor`.
    - تحسين تسجيل الأخطاء بـ `logAuthError`.
- **التحقق:**
  - `npm run lint`: خالٍ تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات (272/272) ناجحة بنسبة 100%.



---

## المرحلة D5.0: إعادة تصميم وتطوير واجهات طلبات الانضمام وطلبات الخدمات (UI/UX Redesign, Dynamic Actions & Bulk Deletion)
- **الحالة:** مكتملة بنجاح (Frontend & Dashboard UX).
- **الأهداف المنجزة:**
  1. **إعادة تصميم عمود الإجراءات (Dynamic Actions System):**
     - تم استبدال تشتت الأزرار المتعددة في كل صف بنظام إجراءات موحد ومنظم: زر أساسي مباشر (Primary Action) بحسب حالة الطلب الدقيقة، مع قائمة إجراءات ثانوية منسدلة ثلاثية النقاط (`ActionDropdown`) مدعومة بأيقونات Lucide متناسقة، وتأثيرات hover/active أنيقة، وإغلاق تلقائي عند النقر بالخارج أو الضغط على Escape.
     - في طلبات الانضمام:
       - حالة `new`: الزر الأساسي «بدء مراجعة»، والقائمة الفرعية تضم «عرض التفاصيل»، «نسخ رقم الهاتف»، «مراسلة عبر واتساب»، مع خيار «حذف الطلب نهائياً» للمصرح لهم.
       - حالة `under_review`: الزر الأساسي «قبول»، والقائمة الفرعية تضم «رفض الطلب مع ذكر السبب»، «عرض التفاصيل»، وخيار الحذف.
       - حالة `accepted` أو `rejected`: الزر الأساسي «التفاصيل»، والقائمة الفرعية تضم خيارات التواصل والحذف.
     - في طلبات الخدمات:
       - حالة `new`: الزر الأساسي «بدء المراجعة»، مع القائمة الفرعية.
       - حالة `in_progress`: الزر الأساسي «قبول»، والقائمة الفرعية تضم «رفض الطلب مع ذكر السبب»، «عرض التفاصيل»، وخيارات التواصل والحذف.
       - حالة `completed` أو `rejected`: الزر الأساسي «التفاصيل»، مع القائمة الفرعية.
  2. **زر ونافذة الحذف الجماعي للصفحة الحالية (Bulk Delete Current Page):**
     - إضافة زر بارز في ترويسة الصفحتين «حذف طلبات الصفحة (X طلب)» بصلاحية مشروطة حصراً لمدير النظام (`super_admin` / `records:delete`).
     - نافذة تأكيد حذف جماعي احترافية تعرض بوضوح عدد الطلبات المستهدفة بالصفحة الحالية ورقم الصفحة والتحذير الأمني الصارم.
     - معالجة الحذف المتوازي الآمن للطلبات المعروضة فقط عبر نقاط النهاية المعتمدة `DELETE /api/admin/applications/[id]` و `DELETE /api/admin/service-requests/[id]` مع إشعار Toast فوري بعدد الطلبات المحذوفة بنجاح وتحديث تلقائي لترقيم الصفحات والإجماليات.
  3. **تصميم متجاوب بالكامل بدون تمرير أفقي للجداول (No Table Scrolling):**
     - للشاشات الكبيرة (Desktop `hidden lg:block`): جدول متناسق بأعمدة نسبية مضبوطة (w- percentages) يتسع تماماً داخل الشاشة بنسبة 100% دون أي شريط تمرير أفقي `overflow-x-auto`.
     - للشاشات الصغيرة والمتوسطة (Mobile & Tablet `block lg:hidden`): تحويل كامل لبيانات الطلبات إلى شبكة كروت متجاوبة (Responsive Cards Grid) تعرض الهوية الكاملة لمقدم الطلب، المحافظة/الوزارة، الشارات، تاريخ التقديم النسبي، والزر الأساسي وقائمة الإجراءات في أسفل الكارت.
  4. **مكون `ActionDropdown` مشترك:**
     - تم بناء مكون `components/Admin/ui/ActionDropdown.jsx` ليكون قابلاً لإعادة الاستخدام في لوحة التحكم، متوافقاً مع معايير إمكانية الوصول، ويدعم الحالات والألوان الدلالية والأيقونات والفواصل.
- **الملفات المعدلة والمضافة:**
  - `components/Admin/ui/ActionDropdown.jsx` (جديد)
  - `app/admin/applications/page.jsx` (محدث بالكامل)
  - `app/admin/service-requests/page.jsx` (محدث بالكامل)
  - `docs/BACKEND_PROGRESS.md` (محدث)
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/ui/ActionDropdown.jsx app/admin/applications/page.jsx app/admin/service-requests/page.jsx`: خالي تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 272 ناجحة بنسبة 100% (272 pass, 0 fail).

---

## تحديث إضافي للمرحلة D5.0: ضبط البادنج الأيسر وعرض خيار الحذف الدائم في القائمة المنسدلة
- **الملفات المعدلة:**
  - `app/admin/service-requests/page.jsx`:
    - توسيع عرض عمود الإجراءات إلى `w-[17%]` وتزويده ببادنج أيسر مريح `pl-6 sm:pl-8` لمنع التصاق زر النقاط الثلاث أو زر المراجعة بحافة الجدول اليسرى نهائياً.
    - إتاحة خيار «حذف الطلب نهائياً» مباشرة وبشكل دائم في القائمة المنسدلة (`...`) مع الإبقاء على خياري «نسخ رقم الهاتف» و«مراسلة عبر واتساب».
  - `app/admin/applications/page.jsx`:
    - تطبيق نفس البادنج الأيسر المريح `pl-6 sm:pl-8` وعرض العمود `w-[18%]` لضمان الاتساق الكامل.
    - إتاحة خيار الحذف النهائي بشكل مباشر ودائم في قائمة الإجراءات المنسدلة.
  - `components/Admin/ui/ActionDropdown.jsx`:
    - رفع طبقة الظهور `z-50` وضبط العرض الأدنى `min-w-[185px]` لمنع أي تداخل أو قص على الحواف.
- **التحقق:**
  - `npx eslint`: خالي تماماً من أي أخطاء أو تحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 272 ناجحة 100%.

---

## المرحلة P06.1: بناء وضبط المكونات المشتركة لإدارة المحتوى التنظيمي (Shared Content Management Components)
- **الحالة:** مكتملة بنجاح (Frontend Shared Components & Integration).
- **الأهداف المنجزة والتصحيحات الدقيقة:**
  1. **مكون رفع الصور `ImageUploadField.jsx`:**
     - بناء مكون متجاوب يدعم رفع صور المحتوى التنظيمي عبر السحب والإفلات أو اختيار الملفات.
     - ربط حصري بنقطة النهاية المعتمدة `POST /api/admin/content/upload` مع حقل `file` والاعتماد التلقائي لكوكي الجلسة `credentials: "include"`.
     - تطبيق مطابقة حازمة بين الامتداد ونوع MIME (`MIME_EXTENSION_MAP`) ترفض التوليفات غير المتطابقة.
     - عند غياب نوع MIME من بيئة المتصفح/النظام، يُسمح بالتحقق الأولي بناءً على الامتدادات المصرح بها (`jpg`, `jpeg`, `png`, `webp`) مع بقاء تحقق الخادم من الـ magic bytes حاسماً ونهائياً.
     - الرفض الصارم لملفات SVG والملفات التي تتجاوز 5 ميجابايت.
     - إدارة دورة حياة كائنات Object URL بشكل آمن وتفادي أي استدعاء مكرر لـ `revokeObjectURL` وتنظيفها نهائياً عند إلغاء التحميل (unmount).
     - منع اختيار أو سحب ملف جديد أو الحذف أثناء سريان عملية الرفع (`uploading`).
  2. **نافذة تأكيد الحذف `DeleteConfirmModal.jsx`:**
     - بناء نافذة تأكيد حذف متوافقة بالكامل مع معايير إمكانية الوصول (WAI-ARIA Dialog Modal).
     - إغلاق النافذة عند النقر على الخلفية المعتمة الخارجية (Backdrop click) دون إغلاقها عند النقر داخل بطاقة الحوار، مع حجب الإغلاق أثناء المعالجة (`submitting`).
     - إدارة بؤرة التركيز (Focus Management): حفظ العنصر النشط السابق `previousFocusRef` قبل الفتح، وتوجيه التركيز فور الفتح لزر الإلغاء الآمن (`Cancel`).
     - حصر بؤرة التركيز (Focus Trap): استمرار انتقال التركيز عبر Tab وShift+Tab داخل عناصر النافذة فقط أثناء فتحها.
     - استعادة التركيز التلقائي إلى العنصر السابق فور إغلاق النافذة.
     - الحفاظ على حمولة الحذف الإلزامية `{ confirm: true }` ومعالجة الخطأ 409 `PANEL_HAS_LEADERS` وفحص صلاحية `records:delete`.
  3. **ألسنة التبويب وصفحة المحتوى `ContentTabs.jsx` و `app/admin/content/page.jsx`:**
     - مواءمة معايير إمكانية الوصول: كل لسان تبويب يرتبط بخاصية `aria-controls={`tabpanel-${tab.id}`}` مع لوحة فعلية في الـ DOM تحمل `role="tabpanel"` و `id={`tabpanel-${activeTabId}`}` و `aria-labelledby={`tab-${activeTabId}`}`.
     - التحقق الصارم من مدخل `activeTab` وتوافقه مع معرفات التبويبات الستة المعتمدة والرجوع لـ `DEFAULT_CONTENT_TAB` عند عدم الصلاحية.
     - مزامنة المعلمة `?tab=...` في عنوان الصفحة (URL) بأمان ودون إنشاء أي حلقات تنقل لا نهائية (Loop-free URL sync).
     - دمج المكونات داخل صفحة المحتوى التنظيمي مع تغليف `<Suspense>` لضمان دعم SSR وClient-side Navigation.
- **الملفات المعدلة والمضافة:**
  - `components/Admin/Content/ImageUploadField.jsx` (جديد)
  - `components/Admin/Content/DeleteConfirmModal.jsx` (جديد)
  - `components/Admin/Content/ContentTabs.jsx` (جديد)
  - `app/admin/content/page.jsx` (محدث)
  - `docs/BACKEND_PROGRESS.md` (محدث)
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/Content/ app/admin/content/page.jsx`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع اختبارات الباك إند (279/279) ناجحة بنسبة 100%.

---

## المرحلة P06.2-C: تنفيذ واجهات برمجة إدارة برنامج الحزب باللوحة (Party Program Admin Backend Exception)
- **الحالة:** مكتملة بنجاح (Backend Implementation & Comprehensive Unit Tests).
- **الأهداف والقرارات المنفذة:**
  1. **استثناء معزول ومحدد بدقة (Narrow Backend Exception):**
     - تمكين إدارة بطاقة "برنامج الحزب" بالصفحة الرئيسية من خلال لوحة التحكم بالاعتماد على جدول `party_programs` القائم.
     - الالتزام التام بعدم إنشاء أي migrations جديدة أو المساس بـ `prisma/schema.prisma` (Zero Migrations).
  2. **حفظ العقد البرمجي للواجهة العامة:**
     - الإبقاء على نقطة النهاية العامة `GET /api/content/party-program` وسلوكها وعقدها كما هو دون أي تعديل.
  3. **نمط السجل المنشور والمسودة المفردة (Singleton Pair Pattern):**
     - سجل واحد منشور (`is_published: true`) ومسودة عمل واحدة كحد أقصى (`is_published: false`).
     - استرجاع كلا السجلين مع تفكيك الفقرات ومؤشر وجود المسودة `has_draft` عبر `GET /api/admin/content/party-program`.
     - إنشاء أو تحديث المسودة عبر `PUT /api/admin/content/party-program/draft` مع الحفاظ على السجل المنشور دون أي مساس.
  4. **الترقية والنشر الذري (Atomic Promotion):**
     - النشر الذري للمسودة عبر `POST /api/admin/content/party-program/publish` حيث يتم تحديث السجل المنشور بمحتوى المسودة وحذف سجل المسودة تماماً ضمن معاملة ذرية واحدة (`withTransaction`).
     - منع نشر المسودة في حال عدم وجود مسودة نشطة وإرجاع خطأ `400 { "error": "NO_DRAFT_TO_PUBLISH" }`.
     - إهمال وحذف المسودة بأمان عبر `DELETE /api/admin/content/party-program/draft` بشرط تأكيد `{ "confirm": true }` دون المساس بالسجل المنشور.
  5. **الصلاحيات وسجل التدقيق (Permissions & Staff Audit Logging):**
     - اشتراط صلاحية `content:manage` لجميع العمليات الإدارية (قراءة، حفظ، نشر، إهمال المسودة).
     - تسجيل كافة التغييرات ذرياً في `staff_audit_log` بالأنواع المعتمدة (`content_created`, `content_updated`, `content_published`, `content_deleted`).
- **الملفات المنشأة:**
  - `lib/validation/content/party-program.js`
  - `lib/services/content-party-program.js`
  - `lib/content/handlers/party-program.js`
  - `app/api/admin/content/party-program/route.js`
  - `app/api/admin/content/party-program/draft/route.js`
  - `app/api/admin/content/party-program/publish/route.js`
  - `lib/services/content-party-program.test.js`
- **التحقق والاختبارات:**
  - `npx eslint .`: فحص كامل للمشروع خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: اجتياز جميع الاختبارات الـ 292 بنجاح 100% (بإضافة 13 اختبار وحدي جديد لتغطية خدمات ومناولات وتحقق وصلاحيات وتدقيق برنامج الحزب).

---

## المرحلة P06.2-C.1: معالجة وقفل التزامن لبرنامج الحزب (Fix Party Program Concurrency)
- **الحالة:** مكتملة بنجاح (Concurrency Row-Locking & Expanded Concurrency Tests).
- **التعديلات والقرارات المنفذة:**
  1. **قفل الصف المنشور الصريح `lockPartyProgram(tx)`:**
     - بناء دالة مساعدة مشتركة تنفذ `SELECT "id", "title" FROM "party_programs" WHERE "is_published" = true LIMIT 1 FOR UPDATE` عبر عميل المعاملة `tx.$queryRaw`.
     - حجز القفل في بداية المعاملة وقبل قراءة أو كتابة أي مسودة في العمليات الثلاث: `savePartyProgramDraft` و `publishPartyProgramDraft` و `discardPartyProgramDraft`.
     - المعالجة الصريحة لغياب السجل المنشور برمي خطأ صريح `500 NO_PUBLISHED_PARTY_PROGRAM` دون التجاوز الصامت.
  2. **حماية التزامن:**
     - منع إنشاء مسودات مكررة عند تزامن أول حفظ للمسودة (`PUT /draft`)؛ فالمعاملة الثانية تنتظر القفل وتقوم بتحديث المسودة المنشأة حديثاً بدلاً من تكرارها.
     - منع التضارب عند تزامن طلبات النشر (`POST /publish`)؛ فالطلب الأول ينشر بنجاح والطلب الثاني المنتظر يرمي `400 NO_DRAFT_TO_PUBLISH` دون أي audit مكرر.
  3. **الملفات المعدلة حصراً:**
     - `lib/services/content-party-program.js`
     - `lib/services/content-party-program.test.js`
- **التحقق والاختبارات:**
  - `npx eslint lib/services/content-party-program.js lib/services/content-party-program.test.js`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: اجتياز جميع الاختبارات الـ 301 بنجاح 100% (22 اختباراً في ملف `content-party-program.test.js`).

---

## المرحلة P06.2-D: تنفيذ واجهة إدارة برنامج الحزب باللوحة (Party Program Admin UI Implementation)
- **الحالة:** مكتملة بنجاح (Frontend UI Implementation & Integration).
- **المكونات والوظائف المنفذة:**
  1. **مكونات الإدارة المخصصة `components/Admin/Content/PartyProgram/`:**
     - `PartyProgramManager.jsx`: الحاوية الرئيسية لإدارة برنامج الحزب؛ تجلب البيانات عبر `GET /api/admin/content/party-program`، وتعالج حالات التحميل والهيكل العظمي (Skeleton)، والأخطاء (401، 403، 500)، وتدير التبديل بين محرر المسودة والنسخة المنشورة.
     - `PublishedProgramCard.jsx`: بطاقة قراءة فقط تعرض النسخة المنشورة حالياً مع شارة "مباشر للجمهور"، وتاريخ آخر تحديث، والفقرات المنسقة، وملاحظة المصدر؛ وتمنع التعديل المباشر تماماً مع توفير زر لإنشاء مسودة من المنشور في حال عدم وجود مسودة.
     - `DraftEditor.jsx`: محرر المسودة المتكامل؛ يدعم حقول العنوان (بحد أقصى 200 حرف)، والنص الطويل (حتى 50,000 حرف مع دعم RTL وحفظ الفواصل والفقرات)، وملاحظة المصدر (حتى 500 حرف)؛ مع كاشف التعديلات غير المحفوظة (Unsaved Changes Indicator)، وزر الحفظ عبر `PUT /draft`، وزر استيراد المنشور.
     - `PublishConfirmModal.jsx`: نافذة تأكيد النشر المتوافقة مع معايير WAI-ARIA Dialog؛ تمنع النشر غير المقصود وتشترط تأكيداً صريحاً لاعتماد المسودة المحفوظة عبر `POST /publish`.
     - `DiscardConfirmModal.jsx`: نافذة تأكيد إهمال المسودة عبر `DELETE /draft` بحمولة `{ "confirm": true }` دون المساس بالنسخة المنشورة.
     - `ProgramPreviewModal.jsx`: نافذة معاينة تحاكي بدقة شكل بطاقة ونافذة برنامج الحزب في الصفحة الرئيسية مع شارة تمييز للمسودة.
  2. **الدمج في صفحة المحتوى `app/admin/content/page.jsx`:**
     - دمج قسم إدارة برنامج الحزب بشكل بارز كأول قسم لإدارة محتوى الصفحة الرئيسية.
     - الإبقاء الكامل على ألسنة التبويب التنظيمية الستة (`CONTENT_TABS`) وعناصر `tabpanel` ومزامنة عناوين URL دون أدنى مساس.
- **التحقق:**
  - `npx eslint components/Admin/Content/PartyProgram/ app/admin/content/page.jsx`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 301 ناجحة بنسبة 100%.

---

## المرحلة P06.2-D.1: تشخيص وإصلاح خطأ حفظ المسودة وقيد تدقيق الموظفين (Fix Draft Save & Audit Log Constraint)
- **الحالة:** مكتملة ومختبرة بنجاح (Bug Fixed & Verified).
- **التشخيص وسبب المشكلة (Root Cause):**
  1. عند الضغط على "حفظ التعديلات كمسودة" في لوحة التحكم، كانت الدالة `savePartyProgramDraft` في `lib/services/content-party-program.js` تمرر كائن التفاصيل التالي لسجل التدقيق: `{ entity_type: "party_program", entity_id: String(draft.id), is_draft: true }`.
  2. جدول `staff_audit_log` في قاعدة بيانات PostgreSQL محمي بقيد تحقق صارم `staff_audit_log_details_safe_keys_check` يسمح فقط بمفاتيح محددة (`'previous_role'`, `'new_role'`, `'previous_is_active'`, `'new_is_active'`, `'changed_fields'`, `'entity_type'`, `'entity_id'`, `'slug'`, `'cascade_deleted_people_count'`, `'deleted_people_count'`).
  3. تمرير مفاتيح غير مسموحة مثل `is_draft` أو `action` أدى لانتهاك قيد قاعدة البيانات وإلغاء المعاملة (Rollback) وإرجاع خطأ `500 SERVER_ERROR`، مما تسبب بظهور رسالة "حدث خطأ غير متوقع، حاول مرة أخرى" في واجهة المستخدم.
  4. بالإضافة لذلك، مخطط التحقق `partyProgramDraftSchema` كان يرفض قيمة `null` لملاحظة المصدر (`source_note`) عند تفريغها من الفرونت.
- **الإصلاحات المنفذة:**
  1. **تنظيف كائنات سجل التدقيق في `lib/services/content-party-program.js`:**
     - إزالة المفاتيح غير المسموحة (`is_draft` و `action`) من تفاصيل عمليات `savePartyProgramDraft` و `publishPartyProgramDraft` و `discardPartyProgramDraft`.
     - قصر التفاصيل حصراً على `{ entity_type: "party_program", entity_id: String(...) }` المعتمدة والمطابقة 100% لقيد قاعدة البيانات.
  2. **تحديث مخطط التحقق `lib/validation/content/party-program.js`:**
     - دعم `null` و `undefined` والسلاسل الفارغة لحقل `source_note` مع تحويلها بأمان إلى `null`.
  3. **تعزيز الاختبارات والـ Mock في `lib/services/content-party-program.test.js`:**
     - إضافة فحص محاكاة دقيق لقيد PostgreSQL `staff_audit_log_details_safe_keys_check` داخل دالة `makeDb` لمنع أي خرق مستقبلي للمفاتيح المسموحة في بيئة الاختبار.
     - إضافة اختبارات وحدية للتأكد من قبول `source_note: null` و `source_note: ""`.
  4. **تحسين أداء التزامن في مكونات React:**
     - إزالة مزامنة `useEffect` الزائدة في `DraftEditor.jsx` وتعيين مفتاح `key={draft?.updated_at}` لضمان تحديث القيم بسلاسة مع تجنب تحذيرات دورة حياة React.
- **التحقق والاختبارات:**
  - `node --test lib/services/content-party-program.test.js`: نجاح 22/22 اختباراً بنسبة 100%.
  - `npm test`: نجاح جميع اختبارات المشروع الـ 301 اختباراً بنسبة 100%.
  - `npx eslint lib/services/content-party-program.js lib/validation/content/party-program.js lib/services/content-party-program.test.js components/Admin/Content/PartyProgram/`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).

---

## المرحلة P06.3: تنفيذ واجهة إدارة محتوى الصفحة الرئيسية (Homepage Main Content Management UI)
- **الحالة:** مكتملة بنجاح (UI Implementation & Blocker Report Documented).
- **المكونات والوظائف المنفذة:**
  1. **مكونات الإدارة المخصصة `components/Admin/Content/Popups/`:**
     - `HomepagePopupsManager.jsx`: الحاوية الرئيسية لإدارة محتوى عناصر العمود الأول بالصفحة الرئيسية؛ تجلب البيانات عبر `GET /api/admin/content/popups`، وتدير حالات التحميل والخطأ والحالة الفارغة والإحصائيات السريعة، وتنسق النوافذ المنبثقة للتعديل والمعاينة والحذف وتغيير الحالة والترتيب.
     - `PopupCardList.jsx`: عرض البطاقات التفاعلية للعناصر؛ يعرض العنوان، المعرف (slug)، الأيقونة المعتمدة، شارة حالة النشر، ترتيب العرض، عدد الفقرات، ملاحظة المصدر، وتاريخ آخر تحديث؛ مع أزرار المعاينة، والتعديل، والنشر/إلغاء النشر، والترتيب لأعلى/لأسفل، والحذف.
     - `PopupFormModal.jsx`: نافذة إضافة وتعديل العناصر؛ تدعم حقول العنوان (بحد أقصى 200 حرف)، المعرف المختصر slug (بحد أقصى 120 حرفاً بنمط regex محدد)، اختيار الأيقونة من الأيقونات الخمس المعتمدة (`user`, `target`, `eye`, `send`, `message`)، نص المحتوى (حتى 10,000 حرف)، ملاحظة المصدر (حتى 500 حرف)، ترتيب العرض، والتحقق قبل الإرسال.
     - `PopupPreviewModal.jsx`: نافذة معاينة مطابقة تماماً لنافذة `InfoModal` في واجهة الموقع العامة لعرض النص والفقرات والأيقونة وشارة الحالة وملاحظة المصدر للزوار.
     - `PopupStatusModal.jsx`: نافذة تأكيد تغيير حالة النشر للجمهور (نشر / إيقاف نشر) متوافقة مع معايير الوصولية WAI-ARIA.
     - استخدام `DeleteConfirmModal.jsx` المشترك للحذف النهائي عبر `DELETE /api/admin/content/popups/[id]` مع شرط صلاحية `records:delete` وتأكيد صريح `{ "confirm": true }`.
  2. **الدمج في صفحة المحتوى وتبويب Popups:**
     - تحديث تسمية التبويب في `ContentTabs.jsx` إلى «محتوى الصفحة الرئيسية» مع الحفاظ على المعرف `popups` لتفادي كسر الروابط والتوجيه.
     - دمج `HomepagePopupsManager` في `app/admin/content/page.jsx` داخل لوحة التبويب المخصصة `tabpanel-popups` مع الإبقاء على كافة الألواح الستة مركبة ومطابقة لمعايير ARIA.
- **حماية المحتوى المنشور وتقرير القيد (Draft Workflow Blocker):**
  - **التحقق:** الـ APIs الحالية لجدول `info_items` لا تدعم نظام المسودات المستقلة (Draft/Publish Workflow)؛ إذ يتم التعديل عبر `PATCH /api/admin/content/popups/[id]` مباشرة على السجل المنشور دون وجود جدول أو أعمدة مسودة، كما أن قيد `@unique` على عمود `slug` يمنع تكرار السجل كمسودة.
  - **التنفيذ الصارم لسياسة الحماية:** تم إيقاف التعديل المباشر على العناصر المنشورة (`is_published: true`) وعرض تنبيه حاجز صريح (Blocker Banner) داخل نافذة التعديل يشرح القيد للمستخدم، مع توفير خيار «إلغاء النشر للتعديل بأمان» لتحويل السجل لوضع الإيقاف أولاً قبل تعديله، دون ابتكار حلول وهمية في الفرونت أو تعديل الـ Backend تلقائياً.
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/Content/ContentTabs.jsx app/admin/content/page.jsx components/Admin/Content/Popups/`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: اجتياز جميع اختبارات المشروع الـ 301 اختباراً بنسبة 100%.

---

## المرحلة P07.2: تنفيذ واجهة إدارة رئيس وقيادات الحزب باللوحة (Party President & Leadership Admin UI)
- **الحالة:** مكتملة بنجاح (Frontend UI Implementation & Integration).
- **المكونات والوظائف المنفذة:**
  1. **مكونات الإدارة المخصصة `components/Admin/Content/Leadership/`:**
     - `PartyLeadershipManager.jsx`: الحاوية الرئيسية لإدارة رئيس الحزب وقياداته؛ تجلب لوح القيادة المركزية `central-leadership` عبر `GET /api/admin/content/leadership/panels` ثم تجلب القيادات عبر `GET /api/admin/content/leadership/leaders?panel_id=...`، وتفرز رئيس الحزب (`is_head: true`) وبقية القيادات (`is_head: false`). وتدير عمليات الحفظ والتعديل ورفع الصور وتغيير الترتيب وإيقاف/تفعيل النشر وحالات التحميل والخطأ.
     - `PresidentCard.jsx`: بطاقة مخصصة لرئيس الحزب تعكس هوية القيادة العليا؛ تعرض الصورة الشخصية الكبيرة، والاسم، والصفة الحزبية، والشارة التكريمية، وشارة النشر بالصفحة الرئيسية، مع زر التعديل المباشر أو إضافة رئيس حزب في حال عدم وجود سجل.
     - `PresidentEditModal.jsx`: نافذة تعديل بيانات وصورة رئيس الحزب؛ تدعم حقول الاسم (حتى 200 حرف)، والصفة (حتى 200 حرف)، والشارة (حتى 50 حرفاً)، ورفع ومعاينة واستبدال الصورة عبر `ImageUploadField.jsx` و `POST /api/admin/content/upload`.
     - `LeaderCardList.jsx`: قائمة بطاقات قيادات الحزب غير الرئيسية؛ تعرض الصورة والاسم والصفة والشارة ورقم الترتيب وشارة حالة النشر، مع أزرار التحريك لأعلى ولأسفل، وتغيير حالة النشر، والتعديل، والحذف.
     - `LeaderFormModal.jsx`: نافذة إضافة وتعديل قيادي جديد؛ تدعم الاسم، والصفة، والشارة، ورقم الترتيب، وتحديد حالة النشر (دون حقل صورة لأن القيادات لا تعرض صوراً بالصفحة الرئيسية)، مع نظام تحقق دقيق يحدد الحقل وسبب الخطأ تفصيلياً مع إبراز الحقل غير الصالح وتوجيه التركيز إليه.
     - `LeaderCardList.jsx`: بطاقات القيادات تعرض الاسم والصفة والشارة والترتيب وأزرار التحكم دون مساحة صورة غير مستخدمة.
     - استخدام `DeleteConfirmModal.jsx` المشترك للحذف النهائي للقيادي عبر `DELETE /api/admin/content/leadership/leaders/[id]` مع شرط صلاحية `records:delete` وتأكيد صريح `{ "confirm": true }`.
  2. **الدمج في صفحة المحتوى وتبويب Leadership:**
     - دمج `PartyLeadershipManager` في `app/admin/content/page.jsx` داخل لوحة التبويب المخصصة `tabpanel-leadership` تحت التبويب النشط «قيادات الحزب».
     - الحفاظ التام على معايير الوصولية WAI-ARIA ودعم لوحة المفاتيح وحصر بؤرة التركيز (Focus Trap).
  3. **سلوك الحفظ والنشر المباشر:**
     - الالتزام بالتعديل المباشر الصريح عبر `PATCH` دون اختراع آليات Draft وهمية غير مدعومة من الـ Backend، مع تنبيه المستخدم بوضوح أن التعديل ينعكس مباشرة على الموقع العام.
- **الملفات المنشأة والمعدلة:**
  - `components/Admin/Content/Leadership/PresidentCard.jsx` (جديد)
  - `components/Admin/Content/Leadership/PresidentEditModal.jsx` (جديد)
  - `components/Admin/Content/Leadership/LeaderFormModal.jsx` (جديد)
  - `components/Admin/Content/Leadership/LeaderCardList.jsx` (جديد)
  - `components/Admin/Content/Leadership/PartyLeadershipManager.jsx` (جديد)
  - `app/admin/content/page.jsx` (محدث للربط)
  - `docs/BACKEND_PROGRESS.md` (محدث)
- **التحقق والاختبارات:**
  - `eslint components/Admin/Content/Leadership/ app/admin/content/page.jsx`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع اختبارات المشروع الـ 301 اختباراً ناجحة بنسبة 100%.

---

## المرحلة P07.2-Fix: تشخيص وإصلاح خطأ التحقق في إضافة القيادي وتبسيط الواجهة
- **الحالة:** مكتملة ومختبرة بنجاح (Bug Fixed & Verified).
- **التشخيص وسبب المشكلة (Root Cause):**
  1. في صورة الخطأ عند إضافة قيادي جديد («محمد السيد»، «نائب رسمي متضمن»، الترتيب 1)، ظهرت رسالة تنبيه حمراء: `يرجى التأكد من صحة البيانات المدخلة` دون تحديد الحقل المتسبب.
  2. بالتحليل، وجد أن حقل «الشارة (اختياري)» عند تركه فارغاً كان يتم إرساله من الفورم كـ `null` (`badge_label: null`) بسبب الصيغة `badgeLabel.trim() || null`.
  3. في الـ Backend، مخطط التحقق `lib/validation/content/common.js` لدالة `optionalText` يستخدم `z.string().trim().max(max).optional()` وهو يقبل السلاسل النصية أو `undefined`، ولكنه يرفض صراحة القيمة `null` مما تسبب في إرجاع السيرفر لخطأ `400 VALIDATION`.
  4. لعدم إرجاع السيرفر لتفاصيل الحقول في كائن التحقق، كانت دالة `adminFetch` تعرض رسالة الخطأ الافتراضية العامة.
- **الإصلاحات المنفذة:**
  1. **تعديل `LeaderFormModal.jsx` و `PresidentEditModal.jsx`:**
     - إرسال الحقول النصية الفارغة كسلسلة نصية فارغة `""` بدلاً من `null` ليقوم السيرفر بتحويلها تلقائياً بأمان إلى `null` في قاعدة البيانات.
     - إضافة نظام تحقق تفصيلي يحدد الحقل وسبب المشكلة أسفل كل حقل مع التركيز المباشر (Auto Focus) على أول حقل غير صالح عند الإرسال.
  2. **تحصين معالج الحفظ في `PartyLeadershipManager.jsx`:**
     - تطهير بيانات الحفظ (`sanitization`) وضمان تحويل الحقول النصية الفارغة إلى `""` بدلاً من `null`، وتحويل `sort_order` إلى رقم صحيح `Number` و `is_published` إلى `Boolean`.
  3. **تبسيط واجهة قائمة القيادات `LeaderCardList.jsx` وإزالة إشعار الحذف المكرر:**
     - تحويل عرض القيادات إلى جدول صفوف أنيق وبسيط واحترافي بدلاً من البطاقات المزدحمة، وحذف حقل الصورة من نموذج القيادات لعدم عرض صور لهم في الصفحة الرئيسية وقصرها على رئيس الحزب فقط.
     - إزالة استدعاء `showSuccess` الزائد في `handleDeleteSuccess` داخل `PartyLeadershipManager.jsx` لمنع تكرار ظهور إشعارين Toast في نفس الوقت، حيث تتولى نافذة `DeleteConfirmModal` إطلاق الإشعار المعتمد تلقائياً.
- **التحقق والاختبارات:**
  - `eslint components/Admin/Content/Leadership/`: خالٍ تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 301 ناجحة بنسبة 100%.

---

## المرحلة P07.3 + P07.4: تنفيذ واجهات كلمات القيادة والأمانات المركزية وكوادرها
- **الحالة:** مكتملة ومختبرة بنجاح (Full Implementation & Integration).
- **المكونات والوظائف المنفذة:**
  1. **إدارة كلمات القيادة الرسمية (P07.3):**
     - `components/Admin/Content/Leadership/Speeches/LeadershipSpeechesManager.jsx`: الحاوية المنظمة لإدارة الكلمات الثلاث («كلمة رئيس الحزب»، «كلمة النائب الأول»، «كلمة نائب رئيس الحزب»). تدعم الجلب عبر `GET /api/admin/content/leadership/contents` والإضافة والتعديل والحذف وتغيير حالة النشر.
     - `SpeechCardList.jsx`: عرض الكلمات الثلاث في بطاقات احترافية توضح اسم الزر، عنوان الكلمة، اسم المتحدث وصفته، وعدد الفقرات وحالة النشر.
     - `SpeechPreviewModal.jsx`: نافذة معاينة مطابقة 100% لنافذة `SpeechModal` في الموقع العام لعرض الفقرات والمصدر.
     - `SpeechFormModal.jsx`: نموذج إضافة وتعديل الكلمة مع التحقق الميداني والتركيز التلقائي على الأخطاء.
     - دمج منظم وسلس كقسم فرعي داخل `PartyLeadershipManager.jsx` عبر تبويب مقسم يتيح التنقل السريع بين «رئيس وقيادات الحزب» و«كلمات القيادة الرسمية (3)».
  2. **إدارة الأمانات المركزية وكوادرها (P07.4):**
     - `components/Admin/Content/CentralSecretariats/CentralSecretariatsManager.jsx`: الحاوية الرئيسية المدمجة في تبويب `central-secretariats` في `app/admin/content/page.jsx`.
     - `SecretariatList.jsx`: جدول منظم للأمانات المركزية يوضح اسم الأمانة، اسم الأمين، عدد الكوادر، الترتيب، وحالة النشر مع البحث السريع وإمكانية التعديل والحذف.
     - `CentralSecretariatFormModal.jsx`: نموذج إضافة وتعديل الأمانة المركزية (اسم الأمانة، اسم الأمين، المصدر، الترتيب، حالة النشر).
     - `SecretariatPeopleManager.jsx`: شاشة عرض وإدارة كوادر وأعضاء الأمانة المختارة، تدعم التنقل السلس وعرض الصور والمنصب والتفاصيل.
     - `SecretariatPersonFormModal.jsx`: نموذج إضافة وتعديل العضو/الكادر ورفع الصورة الشخصية عبر `ImageUploadField.jsx` والربط بـ `POST /api/admin/content/upload`.
  3. **عقود الـ APIs والتكامل:**
     - استخدام المعالجات الحالية فقط:
       - `leadership/contents` (GET, POST, PATCH, DELETE, status).
       - `central-secretariats` (GET, POST, PATCH, DELETE, status).
       - `central-secretariats/[id]/people` (POST, PATCH, DELETE, status).
       - `upload` (POST).
- **التحقق والاختبارات:**
  - `eslint components/Admin/Content/ app/admin/content/page.jsx`: 0 errors, 0 warnings.
  - `npm test`: جميع اختبارات المشروع الـ 301 اختباراً ناجحة بنسبة 100%.

---

## المرحلة P07.4-Fix: تشخيص وإصلاح مشاكل واجهة أزرار وكلمات القيادة والصفحة الرئيسية
- **الحالة:** مكتملة ومختبرة بنجاح (Full Fixes & Integration Verified).
- **المشاكل التي تم حلها والتشخيص (Root Causes & Resolutions):**
  1. **مشكلة التصميم وعدادات الأحرف وانقطاع رأس النافذة المنبثقة (UI & RTL Counter Fix):**
     - في `SpeechFormModal.jsx`، تم تثبيت رأس النافذة المنبثقة (Fixed Header) وأزرار الحفظ والإلغاء في الأسفل (Pinned Footer) مع جعل محتوى النموذج قابلاً للتمرير الداخلي السلس (`max-h-[90vh]` و `overflow-y-auto`) لمنع انقطاع العنوان أو اختفاء زر الإغلاق عند فتح النافذة على الشاشات المختلفة.
     - تم إصلاح انعكاس أرقام عدادات الأحرف في اللغة العربية (`200 / 0` و `50 / 0`) بضبط اتجاه الأرقام الصريح `dir="ltr"` في `SpeechFormModal.jsx` و `LeaderFormModal.jsx` و `PresidentEditModal.jsx` لتظهر بالترتيب الطبيعي السليم (`0 / 200` و `0 / 50`).
  2. **خطأ React في نافذة الأمانات المركزية بالصفحة الرئيسية (SecretariatsModal Key Warning):**
     - في `components/Home/sections/CentralSecretariats.jsx`، تم تصحيح ربط بيانات الأمانات المركزية القادمة من API لتشمل `name: s.name_ar` و `head: s.head_name` و `source: s.source_note` بدلاً من `title: s.title` التي كانت ترجع `undefined`.
     - في `components/Home/ui/SecretariatsModal.jsx`، تم تحصين المفتاح ليصبح `key={item.id ?? item.name ?? index}` ودعم بدائل التسمية (`item.name || item.title || item.name_ar`) مما قضى تماماً على خطأ الكونسول واختفاء أسماء الأمانات.
  3. **إتاحة وتخصيص زر الأمانات المركزية الرابع (Button 4 Management):**
     - إتاحة إدارة الزر الرابع في عمود الأمانات المركزية («الأمانات المركزية» ذو المعرف `central-secretariats`) مباشرة من واجهة التحكم، مع ضبط تسمية الزر في الصفحة الرئيسية، وعنوان النافذة المنبثقة، وملاحظة المصدر/الهامش.
     - ربط الصفحة الرئيسية `CentralSecretariats.jsx` و `lib/home-data.js` بقراءة نصوص وهوامش الزر الرابع من `contents` المحدثة بواسطة الأدمن.
  4. **ظهور الكلمات المضافة حديثاً بالصفحة الرئيسية (Speech Binding & Heuristics):**
     - تم توسيع دالة الربط `findSpeech` في `CentralSecretariats.jsx` و `lib/home-data.js` لتدعم مرونة المطابقة لمعرفات الـ Slugs الشائعة (مثل `speech-president` و `speech`) والكلمات المفتاحية للصفة الحزبية، واستخراج اسم المتحدث وصفته ونص الكلمة وتقسيم الفقرات بدقة على أسطر الإدخال (`/\r?\n+/`).
     - إضافة قائمة اختيار للزر المستهدف في `SpeechFormModal.jsx` تتيح للأدمن بنقرة واحدة ربط الكلمة بالزر المطلوب وضبط الـ Slug تلقائياً لمنع أي أخطاء إدخال.
  5. **التحكم الديناميكي الكامل في أزرار العمود الثاني (Dynamic Buttons Architecture):**
     - تم إلغاء القيود السابقة التي كانت تقصر العمود الثاني على 4 أزرار ثابتة فقط، وأصبحت الصفحة الرئيسية (`CentralSecretariats.jsx` و `lib/home-data.js`) تعرض كافة الأزرار المنشورة ديناميكياً وحسب ترتيب `sort_order` الفعلي المسجل في قاعدة البيانات (1، 2، 3، 4، 5، أو أي عدد يريده الأدمن).
     - كل زر يفتح نافذته المخصصة بحسب نوعه (نافذة كلمة أو نافذة الأمانات المركزية)، مع الحفاظ على التناوب اللوني الجذاب لأزرار الموقع.
  6. **إصلاح خطأ حفظ الزر الجديد وخطأ المفاتيح المكررة (Key Collision & Duplicate Slug Fix):**
     - حل خطأ `Encountered two children with the same key, '15'` في `SpeechCardList.jsx` بتحويل العرض إلى قائمة ديناميكية حقيقية ترندر كل زر بمعرفه الفريد `item.id` دون تكرار أو محاكاة خانات ثابتة.
     - حل خطأ «حدث خطأ غير متوقع» عند إنشاء زر جديد بتفعيل حقل الـ `slug` ليصبح قابلاً للتعديل تماماً مع اقتراح معرفات فريدة تلقائياً ومنع إرسال معرف مكرر، وإضافة رسالة خطأ صريحة في `lib/admin/errors.js` لكود `DUPLICATE_SLUG` لتنبيه الأدمن بدقة حال وجود تكرار.
- **التحقق والاختبارات:**
  - `node node_modules/eslint/bin/eslint.js`: 0 أخطاء و 0 تحذيرات في كافة الملفات المحدثة.
  - `node --test`: جميع اختبارات المشروع الـ 301 اختباراً ناجحة بنسبة 100%.

---

## المرحلة P07.4-Refine: إزالة المعرف البرمجي من الفورم وإصلاح تصميم وإضافة عضو الأمانات المركزية
- **الحالة:** مكتملة ومختبرة بنجاح (Fully Implemented & Verified).
- **التعديلات والتحسينات المنفذة:**
  1. **إزالة المعرف البرمجي (Slug) نهائياً من الفورم ومن واجهة الأدمن:**
     - تم حذف حقل إدخال المعرف البرمجي (`Slug`) وتنبيهاته وأخطائه تماماً من واجهة النموذج في `components/Admin/Content/Leadership/Speeches/SpeechFormModal.jsx`.
     - أصبحت إدارة الـ Slug تتم بنسبة 100% في الخلفية بصورة تلقائية وصامتة:
       - عند التعديل: يتم الاحتفاظ بالـ Slug الأصلي للسجل دون تغييره.
       - عند إضافة زر جديد: يتم توليد Slug فريد وصالح برمجياً يتوافق مع قواعد الخادم (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`) استناداً إلى اسم الزر وقائمة المعرفات الحالية والوقت، دون أي تدخل من الأدمن.
       - إزالة التحقق اليدوي المربك للمعرف البرمجي، وحال حدوث أي تعارض بالخادم يتم توليد بديل فريد تلقائياً.
     - إعادة تنظيم وتنسيق عناصر النموذج في شبكة متناسقة (اسم الزر + عنوان النافذة في صف، واسم المتحدث + صفته الحزبية في صف).
     - إخفاء عرض الـ Slug التقني (`/{sp.slug}`) في بطاقات الأزرار في `SpeechCardList.jsx` واستبداله بملاحظة المصدر وعدد الفقرات.
  2. **إصلاح تصميم نافذة إضافة وتعديل عضو الأمانة المركزية (Fixed Header / Footer Layout):**
     - في `components/Admin/Content/CentralSecretariats/SecretariatPersonFormModal.jsx` (وكذلك `CentralSecretariatFormModal.jsx`):
       - حل مشكلة انقطاع رأس النافذة المنبثقة واختفاء العنوان وزر الإغلاق والأزرار السفلية الناتجة عن التوسيط الرأسي في الشاشات العادية.
       - اعتماد هيكلية الحاوية المحصنة: رأس نافذة ثابت بالأعلى (Pinned Header) يحتوي الأيقونة والعنوان وزر الإغلاق، وجسم قابل للتمرير السلس (`max-h-[90vh]` و `overflow-y-auto`)، وتذييل ثابت بالأسفل (Pinned Footer) يحتوي زري الحفظ والإلغاء مع ربط نموذج الإرسال عبر `form="person-form"`.
       - إصلاح اتجاه عدادات الأحرف `dir="ltr"` لمنع انعكاس الأرقام العربية (`14 / 200` بدلاً من `200 / 14`).
  3. **تحصين عملية إضافة وتعديل عضو الأمانة المركزية (Member Creation & Edit Robustness):**
     - تأمين جميع دوال التهيئة والتحقق والقص الميداني (`trim()`) ضد القيم الخالية (`null` أو `undefined`) لكافة الحقول (`fullName`, `positionTitle`, `imageUrl`, `details`, `sortOrder`).
     - تمرير مفتاح فريد ديناميكي `key={personModalState.person?.id || ...}` عند فتح النافذة في `CentralSecretariatsManager.jsx` لضمان تفريغ وتهيئة حقول النموذج دائماً بشكل نظيف وتلقائي عند كل فتح جديد.
     - منع ازدواجية رسائل الخطأ (عدم إطلاق Toast خطأ مكرر عند وجود تنبيه تفصيلي داخل النافذة).
- **التحقق والاختبارات:**
  - `node node_modules/eslint/bin/eslint.js`: 0 أخطاء و 0 تحذيرات في كافة ملفات `Speeches` و `CentralSecretariats`.
  - `node --test`: نجاح جميع اختبارات الباك إند الـ 301 اختباراً بنسبة 100%.

---

## المرحلة P07.4-PresidentUI: إعادة تصميم واجهة فورم رئيس الحزب (UI Only)
- **الحالة:** مكتملة ومختبرة بنجاح (UI Overhaul Verified).
- **التعديلات المنفذة (UI Design & Layout):**
  1. **هيكلية الحاوية المحصنة (Pinned Header & Footer Layout):**
     - في `components/Admin/Content/Leadership/PresidentEditModal.jsx`:
       - حل مشكلة انقطاع رأس النافذة المنبثقة واختفاء العنوان وزر الإغلاق في الأعلى، واختفاء أزرار الحفظ والإلغاء في الأسفل الناتجة عن التوسيط التلقائي.
       - اعتماد هيكلية الحاوية المحصنة: رأس نافذة ثابت بالأعلى (Pinned Header) يحتوي أيقونة التاج والعنوان وزر الإغلاق (X) يظل مرئياً دائماً، وجسم نموذج قابل للتمرير الداخلي السلس (`max-h-[90vh]` و `overflow-y-auto`)، وتذييل ثابت بالأسفل (Pinned Footer) يحتوي زري «إلغاء» و«حفظ التعديلات» مع ربط الإرسال عبر `form="president-edit-form"`.
  2. **تحسين وتنسيق عناصر النموذج (Compact & Modern Grid):**
     - دمج حقلي «الصفة الحزبية / المسمى» و«الشارة التكريمية» في شبكة متناسقة ثنائية الأعمدة (`grid grid-cols-1 sm:grid-cols-2`) لاختصار الارتفاع الرأسي ومنع التزاحم.
     - تبسيط نصوص التعليمات والهوامش واستبدال التنبيهات الكبيرة بإرشادات مدمجة وأنيقة.
     - ضبط عدادات الأحرف برمجياً `dir="ltr"` لتظهر بصورة صحيحة وبسيطة.
- **التحقق والاختبارات:**
  - `eslint components/Admin/Content/Leadership/PresidentEditModal.jsx`: 0 أخطاء و 0 تحذيرات.
  - `node --test`: نجاح جميع اختبارات الباك إند الـ 301 بنسبة 100%.

---

## المرحلة P08.2: واجهة إدارة أمانات المحافظات (Governorate Secretariats Management UI)
- **الحالة:** مكتملة ومختبرة بنجاح (Fully Implemented & Verified).
- **التعديلات والمكونات المنفذة:**
  1. **مكون مدير أمانات المحافظات (`GovernorateSecretariatsManager.jsx`):**
     - جلب قائمة الـ 27 محافظة السيادية الثابتة من `GET /api/governorates`.
     - بناء شريط جانبي يمين الشاشة (`lg:col-span-4`) يعرض المحافظات الـ 27 مع كود كل محافظة والترتيب مع إمكانية البحث الفوري باسم أو كود المحافظة.
     - تحديد المحافظة النشطة بوضوح وتحديث كوادرها فور الاختيار.
     - عرض كوادر أمانة المحافظة المختارة من خلال `GET /api/admin/content/governorate-secretariats?page=1&page_size=100&governorate_id={id}`.
     - إتاحة التبديل السريع لحالة النشر بنقرة واحدة `PATCH .../status` وحذف العضو بعد التأكيد عبر `DeleteConfirmModal`.
     - معالجة حالات التحميل (`Skeleton`) والخطأ (`Retry`) والبيانات الفارغة (`EmptyState`).
  2. **نموذج إضافة وتعديل عضو الأمانة (`GovernoratePersonFormModal.jsx`):**
     - نموذج متكامل يعتمد هيكلية الحاوية المحصنة: رأس ثابت وتذييل ثابت وجسم قابل للتمرير الداخلي `max-h-[90vh]`.
     - الحقول: الاسم بالكامل (إلزامي)، الصفة/المنصب (اختياري)، ترتيب الظهور (رقم صحيح)، وحالة النشر.
     - رفع ومعاينة وحذف الصورة الشخصية اختيارية تماماً 100% باستخدام `ImageUploadField.jsx` ومسار `POST /api/admin/content/upload`، مع إمكانية الحفظ دون صورة دون أي خطأ.
     - دعم عدادات الأحرف `dir="ltr"` وتنبيهات الأخطاء المباشرة لكل حقل.
  3. **الربط مع صفحة إدارة المحتوى (`app/admin/content/page.jsx`):**
     - ربط التبويب `governorate-secretariats` لعرض المكون عند اختياره بسلاسة.
- **التحقق والاختبارات:**
  - `eslint`: 0 أخطاء و 0 تحذيرات في كافة ملفات المرحلة.
  - `node --test lib/content/phase13-handlers.test.js lib/services/content-phase13.test.js`: نجاح 22/22 اختباراً بنسبة 100%.
  - `node --test` العام: نجاح 284/284 اختباراً بنسبة 100%.

---

## المرحلة P08.3: إدارة المحافظات والتحكم في الظهور بالموقع (Governorates Management & Visibility Control)
- **الحالة:** مكتملة ومختبرة بنجاح (Fully Implemented & Verified).
- **التعديلات والمكونات المنفذة:**
  1. **خدمات الباك إند (`lib/services/governorates.js`):**
     - إضافة وظائف CRUD متكاملة للمحافظات:
       - `listGovernoratesAdmin`: جلب المحافظات مرتبة تصاعدياً مع إحصائيات عدد الكوادر والأعضاء وطلبات الانضمام التابعة لها.
       - `createGovernorate`: إضافة محافظة جديدة مع توحيد كود المحافظة بحروف كبيرة وتوثيق العملية في سجل التدقيق.
       - `updateGovernorate`: تعديل بيانات المحافظة (الاسم، الكود، الترتيب، حالة الظهور).
       - `setGovernorateActive`: تبديل حالة الظهور في الموقع العام (`is_active: true/false`).
       - `deleteGovernorate`: حذف المحافظة مع فحص تكامل صارم يمنع الحذف في حال وجود بيانات أو طلبات مرتبطة (`GOVERNORATE_HAS_DATA`) وتوثيق الحذف.
  2. **واجهات ومسارات الـ Admin APIs:**
     - `GET /api/admin/content/governorates`: قائمة المحافظات الإدارية.
     - `POST /api/admin/content/governorates`: إضافة محافظة.
     - `PATCH /api/admin/content/governorates/[id]`: تعديل بيانات المحافظة.
     - `PATCH /api/admin/content/governorates/[id]/status`: تفعيل أو إخفاء المحافظة.
     - `DELETE /api/admin/content/governorates/[id]`: حذف المحافظة بشرط التأكيد وعدم وجود بيانات مرتبطة.
  3. **واجهة لوحة التحكم:**
     - بناء نافذة `GovernorateFormModal.jsx` لإضافة وتعديل بيانات وترتيب وظهور المحافظة.
     - دمج عناصر التحكم في شريط المحافظات بـ `GovernorateSecretariatsManager.jsx`:
       - زر «+ إضافة محافظة جديدة».
       - إظهار مؤشر ملون لكل محافظة (معروضة بالموقع أو مخفية).
       - زر إخفاء/إظهار سريع بنقرة واحدة (Eye toggle).
       - زر تعديل المحافظة وزر الحذف مع نافذة التأكيد وحماية العلاقات.
  4. **ربط الموقع العام (`GovernoratesSecretariats.jsx`):**
     - رندرة المحافظات النشطة فقط وتحديث القائمة الرئيسية والفرعية ديناميكياً استناداً إلى بيانات السيرفر دون الاعتماد على القوائم الثابتة، بحيث تختفي أي محافظة معطلة مباشرة من عمود الموقع ومن نافذة تصفح المحافظات.
- **التحقق والاختبارات:**
  - `eslint`: 0 أخطاء و 0 تحذيرات في كافة ملفات المرحلة.
  - `node --test lib/content/governorates-admin.test.js`: نجاح 12/12 اختباراً بنسبة 100%.
  - `node --test` العام: نجاح 313/313 اختباراً بنسبة 100%.
  - معالجة كافة تحذيرات المفاتيح المتكررة (Duplicate React Keys) في `GovernoratesSecretariats.jsx` و `SecretariatsModal.jsx`.

---

## المرحلة P09.2: واجهة إدارة الوحدة البرلمانية (Parliamentary Unit Admin Management)
- **الحالة:** مكتملة ومختبرة بنجاح (Fully Implemented & Verified).
- **التعديلات والمكونات المنفذة:**
  1. **مدير الوحدة البرلمانية (`ParliamentaryUnitManager.jsx`):**
     - جلب قائمة عناصر الوحدة البرلمانية من `GET /api/admin/content/parliamentary-unit?page=1&page_size=100`.
     - عرض بطاقات العناصر البرلمانية بشكل منظم يشمل: شارة الترتيب، زر التفعيل السريع للنشر بنقرة واحدة، الأيقونة المذهبة، العنوان والعنوان الفرعي، صندوق ملخص محتوى الـ Popup (المسؤول، الصفة، مقتطف الكلمة، والمصدر).
     - توفير أزرار الإجراءات: «معاينة النافذة»، «تعديل»، و«حذف» بعد التأكيد عبر `DeleteConfirmModal`.
     - معالجة حالات التحميل (`Skeleton`)، الخطأ مع إعادة المحاولة، والقائمة الفارغة (`EmptyState`).
  2. **نموذج إضافة وتعديل العنصر ومحتوى النافذة (`ParliamentaryItemFormModal.jsx`):**
     - دمج بيانات العنصر في العمود مع محتوى الـ Popup في نموذج موحد عالي التنظيم وسهل الاستخدام.
     - توليد المعرف البرمجي (`slug`) تلقائياً في الخلفية بطريقة متوافقة مع قواعد الباك إند دون إرباك المشرف.
     - منتقي بصري للأيقونات الثلاث المدعومة فعلياً في الصفحة الرئيسية (`landmark`, `church`, `house`) مع معاينة حية للأيقونة.
     - حقول: العنوان الرئيسي (إلزامي)، العنوان الفرعي، ترتيب الظهور، حالة النشر، اسم المسؤول، الصفة، نص الكلمة (حتى 10,000 حرف مع دعم تقسيم الفقرات)، والمصدر.
     - زر معاينة فورية مستقلة للنافذة المنبثقة من داخل النموذج دون حفظ أو نشر.
  3. **معاينة النافذة المنبثقة (`ParliamentaryPreviewModal.jsx`):**
     - معاينة مطابقة 100% للنافذة المنبثقة الحقيقية بالاعتماد على مكون `ParliamentaryModal.jsx`.
  4. **إصلاح تزامن الموقع العام (`ParliamentaryUnit.jsx`):**
     - استيعاب الاستجابة الفعلية للـ API (`parliamentary_items` بجانب `parliamentary_units`).
     - تحصين المفاتيح ضد التكرار: `key={item.id ? parl-${item.id} : parl-idx-${index}}`.
     - تحديث زر التذييل لاستهداف أول عنصر متوفر ديناميكياً بدلاً من التثبيت على `senate`.
  5. **ربط صفحة إدارة المحتوى (`app/admin/content/page.jsx`):**
     - تفعيل التبويب `parliamentary-unit` لعرض `ParliamentaryUnitManager`.
- **التحقق والاختبارات:**
  - `eslint`: 0 أخطاء و 0 تحذيرات في كافة ملفات المرحلة.
  - `node --test lib/content/phase13-handlers.test.js lib/services/content-phase13.test.js lib/validation/content/content.test.js`: نجاح 27/27 اختباراً بنسبة 100%.
  - `node --test` العام: نجاح 313/313 اختباراً بنسبة 100%.







## المرحلة D5.1: إعادة تصميم وتطوير واجهة إدارة الأخبار وعارض ملاحظات المراجعة (News Management UI/UX Redesign & Review Workflow)
- **الحالة:** مكتملة بنجاح (Frontend & Editorial Workflow).
- **الأهداف المنجزة:**
  1. **إعادة تصميم الصفحة بالكامل (UI/UX Redesign):**
     - تصميم حديث وراقي يعكس هوية الحزب بتدرجات ذهبية ناعمة ولمسات احترافية تناسب نظام إدارة تحريري وإعلامي متقدم.
     - تنظيم فلاتر البحث والحالات والتصنيفات في شريط أدوات مدمج وسلس مع عدادات إحصائية واضحة للأخبار في كل تبويب.
     - اعتماد نظام عرض هجين متجاوب بالكامل:
       - **Desktop (`hidden lg:block`):** جدول بأعمدة نسبية مضبوطة بدقة `w-[24%]`, `w-[16%]`, `w-[13%]`, `w-[11%]`, `w-[16%]`, `w-[20%]` وبادنج أيسر مريح `pl-6 sm:pl-8` دون أي شريط تمرير أفقي `overflow-x-auto`.
       - **Mobile & Tablet (`block lg:hidden`):** شبكة كروت متجاوبة بالكامل تعرض صورة الخبر وعنوانه وملخصه وتصنيفه والكاتب وحالته والإجراءات أسفل كل كارت.
  2. **معالجة تكرار طلب المراجعة (Fix Repeated "Request Review" Action):**
     - تم فحص حالة المقال مسبقاً قبل إرسال الطلب؛ فإذا كان المقال بالفعل `pending_review`، يتم إظهار إشعار معلوماتي لطيف للمستخدم: «هذا المقال مُرسل بالفعل للمراجعة مسبقاً وهو قيد التدقيق والاعتماد حالياً» دون إرسال طلب API غير ضروري.
     - تعطيل زر الإجراء فوريًا وإظهار حالة تحميل `submittingReviewId === article.id` لمنع النقر المزدوج المتزامن.
     - التحديث الفوري لحالة المقال في واجهة المستخدم إلى `pending_review` فور نجاح الطلب مع تغيير الأزرار المتاحة ديناميكياً لتطابق الحالة الجديدة.
     - التعامل المرن مع استجابة الخادم عند حدوث سباق (Race Condition)؛ إذا رد الباك إند بـ `INVALID_STATUS_TRANSITION` لأن المقال قيد المراجعة، يتم مزامنة الواجهة وإظهار إشعار لطيف بدلاً من رسالة خطأ عامة.
  3. **إضافة عارض احترافي لملاحظات المراجعة (`ReviewNotesModal`):**
     - تم إنشاء مكون `components/Admin/News/ReviewNotesModal.jsx` بنافذة منبثقة مميزة ذات خلفية معتمة بضبابية (`backdrop-blur-md`) وتأثيرات حركية أنيقة.
     - مخصص للمقالات التي تحمل حالة `changes_requested`: يظهر زر بارز ومميز بعنوان «عرض التعديلات المطلوبة» أو «ملاحظات المراجع».
     - يعرض اسم المراجع الذي قام بالتدقيق (`article.reviewed_by_user.full_name`)، تاريخ المراجعة بتنسيق نسبي ودقيق، والنص الكامل للملاحظات مع الحفاظ على الفواصل والأسطر (`whitespace-pre-wrap`).
     - يحتوي على زر إغلاق ذهبي دوار وزر إجراء مباشر «تعديل المقال الآن» لفتح محرر المقال فوراً.
     - يعتمد بالكامل على البيانات الحقيقية العائدة من API الموجودة مسبقاً في `listArticlesAdmin` عبر `articleAdminSelect` دون الحاجة لأي تعديل في قاعدة البيانات أو الباك إند.
  4. **تنظيم قائمة الإجراءات وعمود العمليات (Dynamic Actions & Dropdown):**
     - دمج المكون الموحد `ActionDropdown` لعرض الإجراءات الثانوية بنظام النقاط الثلاث مع زر أساسي بارز لكل حالة (مثل «مراجعة واعتماد» للمراجعين، «طلب المراجعة» للمحررين، «تعديل المقال»، و«ملاحظات المراجع»).
- **الملفات المعدلة والمضافة:**
  - `components/Admin/News/ReviewNotesModal.jsx` (جديد)
  - `app/admin/news/page.jsx` (محدث بالكامل)
  - `docs/BACKEND_PROGRESS.md` (محدث)
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/News/ReviewNotesModal.jsx app/admin/news/page.jsx`: خالي تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 272 ناجحة بنسبة 100% (272 pass, 0 fail).

---

## تحديث إضافي للمرحلة D5.1: حل مشكلة اختفاء وقص القائمة المنسدلة (ActionDropdown Portal & Auto-Flip Positioning)
- **الحالة:** مكتملة بنجاح (Frontend UI/UX Fix).
- **سبب المشكلة:**
  - كانت القائمة المنسدلة (`ActionDropdown`) تعتمد على التموضع النسبي داخل خلايا الجدول وكروت الموبايل (`absolute left-0 mt-1.5`).
  - نظراً لوجود `overflow-hidden` على حاوية الجدول الرئيسية (`rounded-3xl border border-line bg-white shadow-card overflow-hidden`)، وقواعد ترتيب طبقات عناصر الصفوف (`<tr>` stacking contexts) وكروت الموبايل، كانت القائمة تُقص عند حواف الجدول أو أسفله، أو تختفي تحت الصفوف والكروت التالية في الـ DOM.
- **التعديلات والحل الجذري المطبق:**
  - `components/Admin/ui/ActionDropdown.jsx`:
    - تحويل القائمة المنسدلة بالكامل لتعمل بنظام الـ **React Portal (`createPortal(..., document.body)`)**، مما يحررها تماماً من أي حاوية ذات `overflow: hidden` أو سياق تكديس محلي في الجدول أو الكروت.
    - حساب الإحداثيات الشاشية الدقيقة للزر عبر `buttonRef.current.getBoundingClientRect()` وضبط التموضع الثابت `position: fixed` مع أعلى طبقة ظهور `z-[9999]`.
    - دعم الانعكاس التلقائي الذكي (Smart Auto-Flip): عند الضغط على الزر في الصفوف السفلية أو قرب أسفل الشاشة، تُفتح القائمة تلقائياً إلى **الأعلى** بدلاً من الأسفل لتجنب أي قص، مع تأثير حركي ناعم `animate-elem-scale-in` و `origin-bottom`.
    - ضبط المحاذاة الأفقية لتناسب الواجهة العربية (RTL) مع حماية ضد الخروج عن حدود الشاشة يميناً أو يساراً.
    - إضافة مستمعات للأحداث أثناء فتح القائمة: التحديث التلقائي للموقع عند التمرير (`scroll` بـ capture phase) أو تغيير حجم النافذة (`resize`)، والإغلاق التلقائي عند الضغط خارج القائمة أو ضغط مفتاح Escape أو خروج الزر عن نطاق الشاشة.
- **الصفحات المستفيدة تلقائياً:**
  1. صفحة طلبات الانضمام (`/admin/applications`).
  2. صفحة طلبات الخدمات (`/admin/service-requests`).
  3. صفحة إدارة الأخبار (`/admin/news`).
  (سواء في عرض الجداول على Desktop أو عرض الكروت على Mobile & Tablet).
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/ui/ActionDropdown.jsx app/admin/applications/page.jsx app/admin/service-requests/page.jsx app/admin/news/page.jsx`: 0 errors, 0 warnings.
  - `npm test`: جميع الاختبارات (272/272) ناجحة بنسبة 100%.

---

## المرحلة D5.2: تطوير وإعادة تصميم واجهة إدارة مصادر الأخبار المعتمدة (News Sources UI/UX Redesign)
- **الحالة:** مكتملة بنجاح (Frontend Admin UI & Editorial Management).
- **الأهداف المنجزة:**
  1. **إعادة تصميم الصفحة بالكامل (`/admin/news-sources`):**
     - تصميم عصري وفاخر يتماشى مع هوية الحزب البصرية بلمسات ذهبية أنيقة وتدرجات ضوئية محيطية وتوزيع بصري متناسق.
     - شريط فلاتر وتبويبات الحالات (`الكل`، `المصادر المعتمدة`، `المعطلة مؤقتاً`) مدمج مع حقل البحث في شريط أدوات موحد ومرن على سطر واحد، مع التخلص الكامل من الصناديق المتعددة المتداخلة والحاويات المحبوسة (Unboxed Clean Layout) مما يمنح الصفحة مظهراً عصرياً ومفتوحاً متناسقاً مع لوحة التحكم.
     - ترويسة مفتوحة وفسيحة (Open Page Header) مع شارة عدد المصادر وأزرار الإجراءات بدون إحاطتها بحاوية كرت ثقيلة.
     - شريط بحث فوري باسم الجريدة/الموقع أو المعرف اللطيف (Slug) بتصميم مطابق تماماً لحقول الموقع الرئيسي (`h-14`, `rounded-2xl`, `hover:border-gold`, `focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]`).
     - زر تحديث سريع بـ rotate animation لتحديث البيانات في أي وقت.
  2. **طريقة العرض المتجاوبة بالكامل بدون تمرير أفقي:**
     - **Desktop (`hidden lg:block`):** جدول منظم بنسب مئوية مضبوطة بدقة `w-[10%]`, `w-[32%]`, `w-[22%]`, `w-[12%]`, `w-[12%]`, `w-[12%]` مع بادنج أيسر مريح `pl-6 sm:pl-8` وزر نسخ المعرف اللطيف بنقرة واحدة (One-click copy).
     - **Mobile & Tablet (`block lg:hidden`):** شبكة كروت متجاوبة بالكامل (`grid grid-cols-1 md:grid-cols-2 gap-4`) تعرض كل مصدر في كارت أنيق يوضح الاسم، الـ Slug، ترتيب العرض، تاريخ التسجيل، وشارة الحالة وأزرار الإجراءات.
  3. **التبديل الفوري لحالة التفعيل والاعتماد (Instant Status Toggle):**
     - إمكانية تفعيل أو تعطيل المصدر بنقرة واحدة مباشرة من الجدول أو الكارت مع حالة تحميل تفاعلية `updatingStatusId === source.id` واستدعاء `PATCH /api/admin/news/sources/[id]/status`.
     - تحديث فوري (Optimistic UI) للواجهة مع إشعار Toast إيجابي وتأكيد فوري.
  4. **مكون النافذة المنبثقة لإضافة وتعديل المصادر (`SourceEditorModal`):**
     - إنشاء المكون `components/Admin/News/SourceEditorModal.jsx`.
     - دعم كامل لإنشاء مصدر جديد وتعديل المصادر الحالية.
     - توليد تلقائي ذكي للـ Slug أثناء كتابة الاسم، مع إمكانية التعديل اليدوي وتطهير المدخلات (`normalizeSlug`).
     - معالجة خطأ تكرار المعرف `DUPLICATE_SLUG` بوضوح ولطف.
     - زر إغلاق ذهبي دوار احترافي وخلفية معتمة بضبابية (`backdrop-blur-xs`).
  5. **الحفاظ على الصلاحيات وحماية الوصول (RBAC Guard):**
     - حصر الوصول حصرياً لمدير النظام (`super_admin`) وفقاً لقواعد النظام، وعرض واجهة تنبيه راقية (`ShieldAlert`) لغير المصرح لهم مع روابط توجيهية.
- **الملفات المعدلة والمضافة:**
  - `components/Admin/News/SourceEditorModal.jsx` (جديد)
  - `app/admin/news-sources/page.jsx` (محدث ومطور بالكامل)
  - `docs/BACKEND_PROGRESS.md` (محدث)
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/News/SourceEditorModal.jsx app/admin/news-sources/page.jsx`: خالي تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 272 ناجحة بنسبة 100% (272 pass, 0 fail).
## مرحلة D5.3: ربط قائمة مصادر الأخبار من الداتا بيز وتحسين تجاوب شريط فلاتر الحالات (News Active Sources & Zero-Scroll Tabs)
- **الحالة:** مكتملة بنجاح (Frontend UI/UX Enhancement).
- **الأهداف المنجزة:**
  1. **ربط قائمة مصادر الأخبار في محرر المقال (`ArticleEditorModal.jsx`):**
     - استبدال حقل الإدخال النصي اليدوي لمصدر الخبر بقائمة منسدلة أنيقة باستخدام المكون المعتمد للموقع `CustomSelect` مع الهوية البصرية الرسمية (ارتفاع `h-14`، حواف `rounded-2xl`، إطار وتوهج ذهبي متناسق).
     - استدعاء المصادر المعتمدة مباشرة من قاعدة البيانات عبر مسار الـ API `GET /api/admin/news/sources?is_active=true&page_size=100`.
     - **استبعاد المصادر المعطلة بدقة:** تم تطبيق فلترة صارمة `is_active === true` بحيث لا تظهر إطلاقاً أي مصادر صحفية تم تعطيلها مؤقتاً في لوحة التحكم، تلبيةً لتعليمات المستخدم بدقة.
     - ربط المعرف اللطيف والرقمي `source_id` و`source_name` وإرسال البيانات للباك إند بتوافق كامل مع مخطط التحقق `articleCreateSchema` و `articleUpdateSchema`.
  2. **تحسين تجاوب شريط فلاتر حالات الأخبار (`Status Segmented Tabs`):**
     - إلغاء التمرير الأفقي `overflow-x-auto` تماماً لتجنب مشكلة الـ scrollbar على الموبايل والشاشات الصغيرة مع الحفاظ على التناسق البصري الجذاب.
     - اعتماد نظام عرض متجاوب ذكي:
       - **على الشاشات الكبيرة (Desktop):** تم تحويل الحاوية إلى `sm:w-auto sm:inline-flex` بدلاً من الامتداد الكامل للشاشة؛ مما يلغي المساحة الرمادية الفارغة الطويلة على اليسار ويجعل الشريط يلتف بأناقة حول التبويبات فقط.
       - **على الشاشات الصغيرة (Mobile):** الحاوية تشغل العرض كاملاً `w-full flex` مع تقسيم متساوٍ ومتوازن `flex-1 min-w-0` لكل تبويب مع نصوص عربية مختصرة وبليغة (`الكل`, `مسودة`, `للمراجعة`, `تعديلات`, `منشور`) تمنع أي شريط تمرير أو تداخل في النصوص على الشاشات حتى 360px.
- **الملفات المعدلة:**
  - `components/Admin/News/ArticleEditorModal.jsx` (ربط `CustomSelect` بالمصادر النشطة فقط مع التوافق التام مع API).
  - `app/admin/news/page.jsx` (تحديث جلب المصادر النشطة وإعادة تصميم شريط التبويبات المتجاوب بدون scroll).
  - `docs/BACKEND_PROGRESS.md` (توثيق المرحلة).
- **التحقق والاختبارات:**
  - `npx eslint components/Admin/News/ArticleEditorModal.jsx app/admin/news/page.jsx`: خالي تماماً من الأخطاء (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 272 ناجحة بنسبة 100% (272 pass, 0 fail).

---

## مرحلة D5.4: تحسين تجاوب شريط فلاتر الحالات لصفحات لوحة التحكم (Applications, Services & News Zero-Scroll Tabs)
- **الحالة:** مكتملة بنجاح (Frontend UI/UX Enhancement).
- **الأهداف المنجزة:**
  1. **شريط فلاتر حالات طلبات الانضمام (`/admin/applications`):**
     - معالجة مشكلة الامتداد الأفقي الزائد على Desktop (`sm:w-auto sm:inline-flex`) بحيث يلتف الشريط حول التبويبات بدقة دون ترك مساحة رمادية فارغة على اليسار.
     - معالجة الـ Responsive على الشاشات الصغيرة والموبايل: إزالة `overflow-x-auto`، وجعل الحاوية تتسع لكامل العرض `w-full flex` مع تقسيم متوازن `flex-1 min-w-0` لكل تبويب ومحاذاة مركزية.
     - حل مشكلة اقتطاع نصوص الأزرار وظهور علامة الحذف (`...`): إخفاء النقطة الدائرية الملونة على الموبايل (`hidden sm:inline-block`) لتوفير مساحة كافية للكلمة، واستبدال `truncate` بـ `whitespace-nowrap text-center` مع بادنج جانبي مناسب `px-1 sm:px-4` واعتماد نصوص مختصرة واضحة ومباشرة (`الكل`, `جديد`, `مراجعة`, `مقبول`, `مرفوض`) مما جعل الكلمات تظهر كاملة وواضحة جداً.
  2. **شريط فلاتر حالات طلبات الخدمات (`/admin/service-requests`) والأخبار (`/admin/news`):**
     - تطبيق نفس المعالجة الدقيقة لمنع اقتطاع النصوص في باقي صفحات لوحة التحكم.
- **الملفات المعدلة:**
  - `app/admin/applications/page.jsx`
  - `app/admin/service-requests/page.jsx`
  - `app/admin/news/page.jsx`
  - `docs/BACKEND_PROGRESS.md`
- **التحقق والاختبارات:**
  - `npx eslint app/admin/applications/page.jsx app/admin/service-requests/page.jsx app/admin/news/page.jsx`: 0 errors, 0 warnings.
  - `npm test`: 272/272 ناجحة بنسبة 100%.

---

## مرحلة D5.5: تحسين تجاوب كارت "طلبات تحتاج مراجعتك" في صفحة نظرة عامة (Overview Recent Requests Mobile Responsive)
- **الحالة:** مكتملة بنجاح (Frontend UI/UX Enhancement).
- **سبب المشكلة:**
  - كان كل صف يحتوي على الأيقونة الرمزية + الاسم والبيانات + شارة الحالة + زر "مراجعة" في صف أفقي واحد (`flex justify-between items-center`).
  - على الشاشات الصغيرة للموبايل، كانت شارة الحالة وزر المراجعة تستهلكان أكثر من 150 بكسل، مما أدى إلى انضغاط خانة الاسم وتداخل شارة الحالة "قيد المراجعة" فوق اسم المواطن وبيانات الطلب.
- **الحلول المنفذة:**
  - `app/admin/page.jsx`:
    - تحويل صف كل طلب إلى تصميم متجاوب ذكي:
      - **على الموبايل (`< sm`):** يتحول الصف إلى تخطيط رأسي منظم من مستويين (`flex flex-col gap-2.5`):
        - المستوى العلوي: أيقونة الاسم + الاسم الكامل للمواطن (بمساحة عرض كاملة ومريحة بدون أي تداخل أو قص) + نوع الطلب وتاريخه.
        - المستوى السفلي: شريط إجراءات سفلي أنيق يفصل بين شارة الحالة (`قيد المراجعة` / `جديد`) وزر الانتقال المباشر (`مراجعة`) عبر `justify-between` وفاصل خفيف `border-t border-line/40`.
      - **على الشاشات الأكبر (`sm:` فما فوق):** يبقى العرض أفقياً بالكامل في سطر واحد (`sm:flex-row sm:items-center sm:justify-between`) كما هو مصمم مسبقاً.
    - تحسين البادنج العام للحاوية والكروت (`p-4 sm:p-6 lg:p-7`) لمنح شاشات الموبايل مساحة عرض إضافية وتفادي ضيق الهوامش.
    - تحديث حالة التحميل (Skeleton) لتطابق التخطيط المتجاوب الجديد.
- **الملفات المعدلة:**
  - `app/admin/page.jsx`
  - `docs/BACKEND_PROGRESS.md`
- **التحقق والاختبارات:**
  - `npx eslint app/admin/page.jsx`: 0 errors, 0 warnings.
  - `npm test`: 272/272 ناجحة بنسبة 100%.

---

## مرحلة D5.6: ضمان ديناميكية جميع بيانات صفحة نظرة عامة من قاعدة البيانات (Overview 100% Dynamic Data)
- **الحالة:** مكتملة بنجاح (Frontend Data Integration & RBAC Alignment).
- **التدقيق والحلول المنفذة دون المساس بقاعدة البيانات أو الباك إند:**
  1. **إصلاح قراءة إجمالي فريق العمل (`stats.staffTotal`):**
     - تم تصحيح قراءة الإجمالي من مسار `/api/admin/staff` عبر `staffRes?.total ?? staffRes?.pagination?.total` ليطابق كائن الاستجابة الحقيقي المعين في `listStaff` ويعرض عدد الموظفين الفعلي في قاعدة البيانات بدقة.
  2. **حساب نسبة إنجاز الطلبات ديناميكياً بدلاً من الرقم الثابت 74% (`completionRate`):**
     - تم إلغاء أي قيمة ثابتة وحساب النسبة ديناميكياً ومباشرة من قاعدة البيانات:
       - استعلام عدد الطلبات المقبولة/المكتملة من مساري `/api/admin/applications?status=accepted` و `/api/admin/service-requests?status=completed`.
       - قسمة المكتمل على الإجمالي: `Math.round(((acceptedApps + completedSrv) / totalCount) * 100)`.
       - ضبط شريط التقدم ونسبة النسبة المئوية لتعكس الأداء الحقيقي للطلبات في الداتا بيز لحظة بلحظة.
  3. **ربط قائمة الطلبات الحقيقية وحالاتها الدقيقة من قاعدة البيانات (`recentRequests`):**
     - استخدام نوع العضوية الفعلي من جدول `membership_applications` (`app.type`: عضوية عاملة / عمل تطوعي / مناصرة ومتابعة) بدلاً من الاسم الثابت العام.
     - استخدام اسم القطاع أو الوزارة الفعلي من جداول `request_sectors` و `government_ministries` لطلبات الخدمات.
     - مطابقة شارات الحالات وتلوينها بدقة مع قيم الداتا بيز الحقيقية (`new`, `under_review`, `in_progress`, `accepted`, `completed`, `rejected`, `closed`) دون خلط أو إطلاق مسميات تقريبية.
     - ترتيب الطلبات بتقديم الطلبات التي تحتاج مراجعة أولاً، تليها الأحدث تاريخاً.
- **الملفات المعدلة:**
  - `app/admin/page.jsx`
  - `docs/BACKEND_PROGRESS.md`
- **التحقق والاختبارات:**
  - `npx eslint app/admin/page.jsx`: 0 errors, 0 warnings.
  - `npm test`: 272/272 ناجحة بنسبة 100%.

---

## مرحلة D5.7: تطوير منظومة تصدير طلبات الانضمام إلى مصنف إكسيل احترافي متكامل (Professional Excel Workbook Export)
- **الحالة:** مكتملة بنجاح (Full-Stack Professional Excel Export & RBAC Integration).
- **الأهداف المنجزة:**
  1. **إنشاء محرك توليد مصنف Excel المتطور (`lib/export/applications-excel.js`):**
     - بناء مصنف إكسيل احترافي عالي الجودة متوافق مع معايير مايكروسوفت أوفيس (`.xlsx`) باستخدام مكتبة `exceljs` مع تطبيق الهوية البصرية الرسمية الكاملة لحزب الجبهة الوطنية (`#15171C`, `#C9A24B`, `#8C6A16`, `#E6CC85`, `#BE953A`, `#FBF6E9`, `#F4F5F7`, `#E7E9EE`, `#5B6270`).
     - **الورقة الأولى (Sheet 1: `الإحصائيات ولوحة المؤشرات` / Executive Dashboard):**
       - ترويسة سيادية فاخرة بشعار واسم حزب الجبهة الوطنية وتاريخ التصدير بالتقويم الكامل ونطاق الفلاتر المطبقة.
       - **5 بطاقات مؤشرات أداء رئيسية (KPI Cards):** إجمالي الطلبات، الطلبات الجديدة، قيد المراجعة، المقبولة، والمرفوضة بحسابات حقيقية ودقيقة بنسبة 100% من واقع البيانات المصدرة.
       - **4 جداول ومخططات بيانية إحصائية مدمجة (In-Cell Visual Charts):**
         1. توزيع الطلبات حسب الحالة (Status Breakdown) مع نسب مئوية ورسم شريطي بصري (`█`).
         2. توزيع الطلبات حسب نوع الانضمام (عضوية عاملة، عمل تطوعي، مناصرة ومتابعة).
         3. أكثر المحافظات تقديماً للطلبات (Top Governorates) مع نسبة التمثيل ورسم بياني نسبي.
         4. وتيرة تدفق الطلبات عبر الزمن (Applications Timeline) مع مؤشر الكثافة اليومية.
       - ضبط اتجاه الصفحة من اليمين لليسار (RTL: true) مع تنسيق الألوان والحدود الرفيعة والأبعاد القياسية للقراءة والطباعة.
     - **الورقة الثانية (Sheet 2: `بيانات الطلبات` / Applications Detailed Data):**
       - شيت مفصل بجميع السجلات الفعلية للطلبات المشمولة بالتصدير.
       - اتجاه ورقة العمل من اليمين لليسار (RTL: true).
       - تجميد صف الترويسة العلوي (`ySplit: 1`) لتسهيل التصفح والتمرير.
       - تفعيل فلترة الجداول التلقائية المدمجة في إكسيل (`autoFilter: A1:I1`).
       - صف رأس جدول بلون الحبر الداكن الفاخر وخط ذهبي رفيع سفلي، وتناوب ألوان الصفوف (Zebra Striping: أبيض ورمادي فاتح).
       - تلوين شارات الحالات المعتمدة بنعومة وبدقة (الأخضر للمقبول، الأحمر للمرفوض، السماوي للجديد، والذهبي لقيد المراجعة).
       - معالجة أرقام الطلبات والمعرفات كنصوص لمنع ترميز الفواصل أو الصيغ العلمية وحفظ الأصفار.
  2. **بناء مسار الـ API المخصص ومعالج الـ Handler (`lib/export/applications-excel-handler.js` & `/api/admin/applications/export/excel`):**
     - الالتزام التام بقواعد التحقق والأمان RBAC (`applications:export` لـ `super_admin`).
     - احترام كامل لمعايير الفلترة المشتركة (البحث بالاسم، الحالة، نوع العضوية، المحافظة، النطاق الزمني من وإلى).
     - منع تسريب أي بيانات حساسة أو استعلام حقول غير مصرح بها.
     - معالجة حدود الحجم والصفوف (`413 EXPORT_LIMIT_EXCEEDED`) والردود غير المخزنة (`no-store, private`).
     - الحفاظ على سلامة مسار الـ CSV الأصلي بدون أي كسر أو تعارض مع الاختبارات السابقة.
  3. **تحديث واجهة إدارة الطلبات (`app/admin/applications/page.jsx`):**
     - استبدال زر تصدير CSV بزر تصدير Excel فائق الجودة والجمالية، مع أيقونة الإكسيل الخضراء المميزة `FileSpreadsheet` وتأثيرات hover الذهبية التفاعلية.
     - مؤشر تحميل متحرك أثناء معالجة الملف، وتنزيل فوري لملف `.xlsx` باسم `تقرير_طلبات_الانضمام_YYYY-MM-DD.xlsx`.
     - إشعار نجاح فوري للمستخدم (`تم تصدير تقرير Excel بنجاح`).
- **الملفات المضافة والمعدلة:**
  - `lib/export/applications-excel.js` (محرك بناء مصنف الإكسيل المكون من شيتين).
  - `lib/export/applications-excel-handler.js` (معالج التصدير الآمن).
  - `lib/export/applications-excel-handler.test.js` (اختبارات الوحدة الشاملة للمعالج والملف).
  - `app/api/admin/applications/export/excel/route.js` (مسار API المباشر لتصدير الإكسيل).
  - `app/admin/applications/page.jsx` (ربط زر التصدير وتحديث الواجهة).
  - `package.json` (إضافة مكتبة `exceljs`).
  - `docs/BACKEND_PROGRESS.md` (توثيق المرحلة).
- **التحقق والاختبارات:**
  - `npx eslint`: خالي تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 276 ناجحة بنسبة 100% (276 pass, 0 fail).

## UI Phase — Admin Organizational Content visual refinement

- Applied page-scoped presentation styles to /admin/content using existing ink, gold, gold-gradient, page, and border tokens.
- Standardized field focus/hover treatment, modal sizing and close-button hover, card borders, upload drop-zone hover, and small-screen modal constraints.
- No API, database, validation, CRUD, authentication, authorization, routing, or business logic changes.
- Browser visual verification was not available; viewport checks remain unverified.

## UI Phase — Party Program section redesign

- Updated only the Party Program manager, editor, published content card, preview modal, and publish/discard confirmation dialogs.
- Used the existing dashboard gold gradient, card, field, button, and close-button conventions; changes are presentation-only.
- Responsive verification was source-level only because no browser session is available.

- Follow-up UI refinement: changed the Party Program accent to a solid gold top border and matched title/source/body field heights, borders, typography, and focus shadows to the News article editor.

## UI Phase — Central Secretariats section polish

- Updated organizational content tab active and inactive visual states, and refined Central Secretariats search, forms, tables, actions, and modal presentation.
- Matched text, number, search, and textarea controls to the News editor field dimensions, border, typography, and gold focus treatment while preserving validation styling.
- Responsive review was source-level only; no browser viewport was tested.
- No API, data flow, validation rules, permissions, CRUD behavior, or backend logic changed.

- Follow-up: Central Secretariat form focus styling now stays aligned with the resting field border, retaining keyboard-visible focus; both publication checkboxes use the gold accent.

- Follow-up: removed the elevated shadow and scale from the active organizational tab so its gold gradient sits cleanly within the tab container.

- Follow-up: aligned Central Secretariat form field grouping with the News editor by arranging the name/head and sort/source pairs in responsive two-column rows that stack on narrow screens.

- Follow-up: restored the News editor's gold focus shadow on Central Secretariat inputs and textarea, and equalized sort/source label row height for aligned controls.

- Follow-up: added a restrained gold-tinted hover shadow to the active Organizational Content tab without scaling or lifting it.

## UI Phase — Governorate Secretariats section refinement

- Replaced the two-column manager layout with a stacked governorates list and selected governorate results section. Kept search, selection, visibility, edit, delete, member status, edit, and delete actions connected to their existing handlers and permission checks.
- Restyled the governorate and member forms to match Central Secretariats fields, actions, modal sizing, and gold hover treatment. Added responsive member cards below the wide-screen breakpoint so the member table does not require horizontal scrolling on smaller screens.
- UI-only changes; no API requests, state flow, validation rules, permissions, or backend behavior were changed. Responsive review was source-level only; browser viewports were not tested.
- Follow-up: aligned all visible Governorate Secretariats search and form fields with the News field treatment, and changed the governorate picker into an accessible custom dropdown that retains search and the existing per-governorate actions.
- Follow-up: standardized focus treatment for every editable Governorate Secretariats control, including the custom governorate picker, checkboxes, and the section's image upload field; text fields now use the News page's gold focus shadow without changing validation colors.
- Follow-up: removed the redundant top image-format hint from the member form; the upload instructions and optional field label remain. Applied pointer and keyboard focus feedback consistently across both forms' text fields, checkboxes, governorate picker, and image upload controls.
- Follow-up: scoped the global 3px keyboard focus outline off the Governorate Secretariats text fields and image drop zone so the News-style gold focus shadow appears cleanly without a doubled outline.
- Follow-up: hid the secondary supported-format line inside the Governorate member image drop zone only; the upload component keeps its current default everywhere else.

- Follow-up: matched the active organizational tab hover lift and gold shadow to the Add New Secretariat action, while leaving the tab container styles unchanged. Organizational tabs now wrap instead of horizontally scrolling; secretariat and member tables switch to responsive cards below the wide-screen breakpoint, retaining their existing actions and status controls.
- UI behavior and data handling remain unchanged. Responsive review was source-level only; no browser viewport was tested.

## UI Phase — Parliamentary Unit polish

- Refined Parliamentary Unit cards, responsive layouts, form fields, actions, and modal presentation using the existing News field treatment and project gold-gradient button styles.
- Added an opt-in neutral-to-gold hover close-button style for the Admin Parliamentary preview; other shared modal users retain their default styling.
- UI-only changes. API calls, data flow, validation, permissions, CRUD behavior, and backend logic were not changed. Responsive review was source-level only; no browser viewport was tested.
- Follow-up: added a restrained lift, slight brightness increase, and stronger shadow on hover for the selected Parliamentary Unit icon card, matching the existing hover treatment of the unselected cards.

## UI Phase — Party Leadership polish

- Refined the Party Leadership president card, leader table and mobile rows, speech cards, management tabs, form fields, modal layouts, action controls, and preview close control using the existing News field and project gold button styles.
- Responsive checks were source-level only; browser viewport testing was not performed.
- UI-only changes. API calls, data flow, validation, permissions, CRUD behavior, upload behavior, and backend logic were not changed.
- Follow-up: removed the president form's helper text beneath the name, role, and badge fields, plus the upload-field format hint at the top of the photo section. Validation errors and the upload drop-zone's own guidance remain intact.
---

## مرحلة D5.8: تطوير واجهة إدارة الكتالوجات المرجعية - الوزارات والقطاعات (Admin Catalogs Management Page)
- **الحالة:** مكتملة بنجاح (Frontend Implementation, Visual Redesign & Integration).
- **الأهداف المنجزة دون المساس بالباك إند:**
  1. **الترقية والتصميم البصري الفاخر (Premium Visual Redesign):**
     - تطبيق الهوية البصرية الرسمية لحزب الجبهة الوطنية باستخدام تدرجات الذهبي والخطوط والظلال المعتمدة في `globals.css` (`bg-gold-gradient`, `animate-modal-overlay-enter`, `animate-modal-shell-enter`, `animate-elem-fade-up`).
     - **ترويسة سيادية وتفاعلية:** أيقونة الصرح الحكومي `Landmark` وزر إجراء سياقي بارز يتغير تلقائياً مع التبويب النشط ("إضافة وزارة" / "إضافة قطاع").
     - **4 كروت إحصائية موجزة (Summary Statistics Cards):** تعرض إجمالي الوزارات، الوزارات المعتمدة، إجمالي القطاعات، والقطاعات المعتمدة بحسابات ديناميكية 100% من واقع البيانات المحملة وتأثيرات hover جذابة.
     - **تبويبان رئيسيان مستقلان بدون تمرير أفقي:** الانتقال التفاعلي اللحظي بين "الوزارات الحكومية" و "القطاعات الخدمية" مع حفظ الحالة المستقلة لكل منهما.
     - **تصميم جدول البيانات وكروت الموبايل المتجاوبة:** عرض تاريخ التسجيل للوزارات عند توفره، وتضمين أزرار نسخ المعرّف (Slug/Code)، وترتيب العرض، وشارات النشاط المعتمدة، وقائمة إجراءات `ActionDropdown`.
  2. **ربط عمليات الـ CRUD والـ Activation عبر الـ APIs القائمة:**
     - **الإضافة:** نافذة منبثقة موحدة `CatalogEditorModal` تدعم الوزارات والقطاعات بالحقول المطابقة لمخطط الـ validation (`name_ar`, `slug` للوزارات، `code` للقطاعات، `sort_order`، و `is_active`).
     - **التعديل:** فتح نافذة التعديل بنفس الحقول واستدعاء `PATCH /api/admin/ministries/[id]` و `PATCH /api/admin/request-sectors/[id]`.
     - **التفعيل والتعطيل:** استخدام المسار المخصص `PATCH /[id]/status` مع `{ is_active: boolean }` وزر تبديل سريع مع مؤشر تحميل تفاعلي per-item وتحديث فوري للحالة.
     - **عدم وجود حذف نهائي:** الالتزام الصارم بعدم إضافة أي إجراء أو زر حذف للحفاظ على السلامة المرجعية لسجلات طلبات المواطنين السابقة، واعتماد التعطيل المؤقت كبديل رسمي.
     - **تعديل ترتيب العرض (`sort_order`):** دعم تعديل الترتيب بالأرقام الصحيحة SmallInt وحفظه وإعادة فرز القائمة تلقائياً.
  3. **البحث اللحظي والفلترة الذكية في الفرونت إند (Client-Side Filtering):**
     - التزام تام بقيود الـ API بعدم إرسال أي معاملات استعلام غير مدعومة (تجنب `400 VALIDATION`).
     - فلترة حسب الحالة: (الكل / المعتمدة والنشطة / المعطلة مؤقتاً) مع شارات عدّاد رقمية حية لكل تبويب.
     - بحث لحظي بالاسم بالعربي أو المعرف اللطيف / الكود.
     - شريط ترقيم صفحات (Pagination) في حال زاد عدد العناصر عن 100 عنصر.
  4. **معالجة أخطاء التكرار والتحقق:**
     - `DUPLICATE_SLUG`: "المعرّف المختصر مستخدم بالفعل، برجاء اختيار معرّف آخر."
     - `DUPLICATE_CODE`: "كود القطاع مستخدم بالفعل، برجاء إدخال كود مختلف."
  5. **الأمان والصلاحيات (RBAC):**
     - تمكين `super_admin` و `service_officer` بصلاحية `services:manage` من الإدارة الكاملة.
     - حظر باقي الأدوار غير المخولة مع إظهار شاشة تنبيه ودية.
- **الملفات المضافة والمعدلة:**
  - `components/Admin/Catalogs/CatalogEditorModal.jsx` (إضافة التحقق من صحة الحقول عند الإرسال ومنع الحقول الفارغة مع إظهار تنبيهات وتلوين الحقل بالأحمر، وزر الإغلاق الدوار الذهبي، وتوحيد استايل الحقول h-14 rounded-2xl).
  - `app/admin/catalogs/page.jsx` (تحسين التجاوب على الموبايل عبر النزول الرأسي المنظم للتبويبات flex-col sm:flex-row لمنع التداخل تماماً، وتوحيد شريط البحث h-14 مع الأيقونة والظلال الذهبية، وإضافة تأثيرات Hover متقدمة للتبويبات والفلاتر).
  - `components/Admin/AppShell.jsx` (إصلاح وتنسيق عنصر القائمة الجانبية النشط وإزالة التدرج الجانبي المتداخل border-r-4 على الحواف المنحنية).
  - `app/admin/page.jsx` (تحسين تجاوب كارت "طلبات تحتاج مراجعتك" لمنع أي تداخل بين النصوص وشارة الحالة على جميع الشاشات).
  - `docs/BACKEND_PROGRESS.md` (توثيق المرحلة).
- **التحقق والاختبارات:**
  - `npx eslint app/admin/catalogs/page.jsx components/Admin/Catalogs/CatalogEditorModal.jsx components/Admin/AppShell.jsx app/admin/page.jsx`: 0 errors, 0 warnings.
  - `npm test`: جميع الاختبارات الـ 282 ناجحة بنسبة 100% (282 pass, 0 fail).

---

## مرحلة D5.9: دعم الحذف النهائي الآمن في الكتالوجات وضبط التجاوب التام للشاشات الصغيرة
- **الحالة:** مكتملة بنجاح (Safe Permanent Deletion & Full Responsive Layout Optimization).
- **الأهداف المنجزة:**
  1. **خدمة الحذف النهائي الآمن مع فحص العلاقات المرجعية (`lib/services/service-catalogs.js`):**
     - دالة `deleteServiceCatalogItem(catalog, id, db)`: فحص مسبق لاستخدام الوزارة أو القطاع في جدول طلبات الخدمة `service_requests`.
     - في حال وجود طلبات مرتبطة بالوزارة أو القطاع، يتم رفض الحذف فوراً وإرجاع `{ ok: false, code: "CATALOG_IN_USE", count }` وتوليد خطأ HTTP 409 Conflict للحفاظ التام على السلامة المرجعية وعدم كسر المفاتيح الخارجية `ON DELETE RESTRICT`.
     - في حال عدم وجود أي طلبات مرتبطة، يتم تنفيذ الحذف بأمان وسلاسة وإرجاع السجل المحذوف.
  2. **معالجات الـ API للحذف وحماية الصلاحيات (`lib/service-catalogs/handlers.js`):**
     - تصدير طريقة `DELETE` في معالجات الكتالوجات (`/api/admin/ministries/[id]` و `/api/admin/request-sectors/[id]`).
     - تقييد صارم لصلاحية الحذف بمدير النظام فقط `super_admin` عبر `records:delete` مع التحقق من جسم الطلب `{ confirm: true }`.
  3. **واجهة المستخدم للحذف الفردي والجماعي المتطابقة مع صفحة طلبات الخدمة (`app/admin/catalogs/page.jsx`):**
     - إجراء "حذف نهائي" مخصص ومحمي في قائمة إجراءات كل عنصر `ActionDropdown` باللون الأحمر.
     - زر "حذف الكل (X)" في شريط العنوان للحذف الجماعي لنتائج العرض المفلترة الحالية حصراً لمدير النظام.
     - نافذة تأكيد حذف فردي وجماعي مخصصة ومطابقة للهوية المؤسسية تعرض تفاصيل العنصر المحذوف وتحذيراً أمنياً ومؤشرات تحميل تمنع النقر المكرر.
  4. **الحل الجذري لتجاوب التبويبات ومنع التصادم (Zero Collision Responsive Layout):**
     - إزالة جميع تحويلات `scale` التي كانت تتسبب في تمدد الأزرار بصرياً واختراق حدود الـ flexbox وتراكب شارات العداد على الأيقونات المجاورة في الشاشات المتوسطة والصغيرة.
     - التبويبان الرئيسيان ("الوزارات الحكومية" / "القطاعات الخدمية"): نزول رأسي كامل العرض `w-full` على الشاشات الصغيرة مع توزيع متوازن للأيقونة والاسم والشارة، وعرض أفقي مريح `sm:flex-row` و `whitespace-nowrap` على الشاشات الأوسع بدون أي التفاف نصوص أو انكسار سطر.
     - تبويبات الفلترة ("الكل" / "النشطة" / "المعطلة"): اعتماد تصميم الأسطول الموحد مع تسميات متجاوبة (`shortLabel` على الموبايل و `label` على الشاشات الكبيرة) لتظل دائماً في صف واحد نظيف ومنسق بدون كسر أو تداخل.
     - شارات العداد: توحيد تصميم الشارة النشطة بالخلفية الداكنة المطعمة بالنص الذهبي وإطار الذهب `bg-ink text-gold border border-gold/40` لتنسجم فخامتها مع الهوية البصرية الرسمية للحزب.
- **الملفات المضافة والمعدلة:**
  - `lib/services/service-catalogs.js`
  - `lib/service-catalogs/handlers.js`
  - `lib/service-catalogs/handlers.test.js`
  - `app/api/admin/ministries/[id]/route.js`
  - `app/api/admin/request-sectors/[id]/route.js`
  - `components/Admin/Catalogs/catalogs-verification.test.js`
  - `app/admin/catalogs/page.jsx`
  - `docs/BACKEND_PROGRESS.md`
- **التحقق والاختبارات:**
  - `npx eslint`: خالي تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 283 ناجحة بنسبة 100% (283 pass, 0 fail).

---

## مرحلة D5.10: التطبيق الوظيفي المتكامل لإدارة حسابات الموظفين (`/admin/staff`)
- **الحالة:** مكتملة بنجاح (Functional Implementation Phase).
- **الأهداف المنجزة:**
  1. **حماية الصلاحيات والوصول الصارم (`staff:manage`):**
     - تقييد وصول الصفحة حصراً لمدير النظام `super_admin` عبر نظام الصلاحيات المعتمد `hasPermission(user?.role, "staff:manage")`.
  2. **لوحة الإحصائيات الفورية (KPIs):**
     - احتساب مؤشرات الأداء الحقيقية عبر تجميع كافة سجلات الموظفين حتى لو تجاوزت 100 موظف عبر استدعاءات متوازية متعددة الصفحات.
     - مؤشرات: إجمالي الموظفين، الحسابات النشطة، الحسابات المعطلة، توزيع الكادر حسب الأدوار الستة الرسمية.
  3. **إضافة موظف جديد (`POST /api/admin/staff`):**
     - نموذج إضافة متكامل يلتزم بالأدوار الستة القانونية المعتمدة في النظام (`super_admin`, `membership_officer`, `service_officer`, `content_editor`, `news_editor`, `news_reviewer`).
     - توليد كلمة مرور مؤقتة آمنة تلقائياً (12 حرفاً تضم أحرفاً كبيرة وصغيرة وأرقاماً ورموزاً) مطابقة لمعايير Zod.
     - نافذة أمان مخصصة لعرض كلمة المرور بعد تأكيد نجاح الـ API فقط مع زر نسخ سريع وتحذير بعدم تخزينها محلياً والتأكيد على إلزام الموظف بتغييرها عند أول تسجيل دخول.
  4. **تعديل بيانات الموظف (`PATCH /api/admin/staff/[id]`):**
     - إرسال الحقول المعدلة فقط لمنع أي تعديلات غير مقصودة، مع معالجة خطأ تكرار البريد وخطأ تجريد آخر مدير نظام.
  5. **تفعيل وتعطيل الحسابات مع الإلغاء الفوري للجلسات (`PATCH /api/admin/staff/[id]/status`):**
     - نافذة تأكيد تعطيل/تفعيل توضح الأثر الأمني.
     - منع تعطيل الحساب الذاتي للمشرف المسجل حالياً، وتفسير خطأ `LAST_ACTIVE_SUPER_ADMIN` لمنع إغلاق لوحة التحكم.
  6. **إعادة تعيين كلمة المرور (`POST /api/admin/staff/[id]/reset-password`):**
     - توليد كلمة مرور مؤقتة وتحديثها عبر الـ API وعرضها في نافذة النجاح المؤقتة فقط.
  7. **سجل تدقيق الموظف (`GET /api/admin/staff/audit-log?target_id=[id]`):**
     - نافذة استعراض الأحداث الأمنية والعمليات الإدارية الخاصة بكل موظف وتفاصيل التغييرات ومسؤول التنفيذ.
  8. **الاستجابة التامة للشاشات الصغيرة:**
     - دعم التسميات المتجاوبة المصغرة (`shortLabel`) لتبويبات الفلترة على الموبايل لمنع أي كسر للنصوص أو التفاف.
- **الملفات المضافة والمعدلة:**
  - `app/admin/staff/page.jsx`
  - `lib/admin/staff-utils.js`
  - `components/Admin/Staff/StaffEditorModal.jsx`
  - `components/Admin/Staff/StaffResetPasswordModal.jsx`
  - `components/Admin/Staff/StaffStatusModal.jsx`
  - `components/Admin/Staff/StaffSuccessPasswordModal.jsx`
  - `components/Admin/Staff/StaffAuditModal.jsx`
  - `app/admin/catalogs/page.jsx`
  - `docs/BACKEND_PROGRESS.md`
- **التحقق والاختبارات:**
  - `npx eslint app/admin/catalogs/page.jsx app/admin/staff/page.jsx`: نجاح تام (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 283 ناجحة بنسبة 100% (283 pass, 0 fail).

| 2026-11-20 | Staff Visual Refinement | تحسين بصري شامل لصفحة إدارة الموظفين: مطابقة زر الإغلاق الذهبي الدوار مع نمط Catalog في جميع النوافذ المنبثقة الخمس، وتوحيد أنماط hover للأزرار، وتعميق تطابق حقول الإدخال مع نظام التصميم المشترك (focus shadow + error states + duration-300)، وتحسين dropdown الفلترة مع focus shadow ذهبي، وتعزيز أزرار الإجراءات بـscale وduration متناسقة. | `app/admin/staff/page.jsx`؛ `components/Admin/Staff/StaffEditorModal.jsx`؛ `components/Admin/Staff/StaffAuditModal.jsx`؛ `components/Admin/Staff/StaffResetPasswordModal.jsx`؛ `components/Admin/Staff/StaffStatusModal.jsx`؛ `components/Admin/Staff/StaffSuccessPasswordModal.jsx` | لا تغييرات على الباك إند أو API أو الصلاحيات أو المنطق التجاري. `npm test`: 283 ناجحاً. ESLint: 3 أخطاء pre-existing (setState في useEffect) موجودة قبل هذه التعديلات؛ لا أخطاء جديدة. |

## UI Phase — Audit Logs operation descriptions

- Removed the affected filter and target displays from the Audit Logs page; the frontend request now keeps only executor and pagination filters.
- Added Arabic operation descriptions for every current database audit action, the existing news action aliases, and an unknown-action fallback. Removed the modal changes list and affected card.
- API and backend behavior were not changed. Operation descriptions and desktop/tablet/mobile source layouts were checked. A browser session and local server were unavailable; ESLint reports two issues in the page effects, which were not changed.

## Backend Phase — Dynamic Audit Log Operation Type Filter

- Added a database-backed distinct `action_type` query for the Audit Logs operation dropdown. Known values receive Arabic labels; unknown values receive a generic Arabic label without exposing the raw key.
- Added optional `action_type` query validation and runtime support validation against the database-backed action list. Unsupported values return HTTP 400.
- Applied executor and action type filters together to both the audit record query and total count. Pagination ordering and permissions are unchanged.
- Added the searchable Operation Type selector to the Audit Logs page; options come from the API response, include an All Operations choice, and filter changes reset pagination to page 1.
- No database schema, migration, audit writer, or unrelated page changes.
- Verification: 18 focused tests passed. ESLint passed for backend and test files. The Audit Logs page lint command reports two pre-existing `react-hooks/set-state-in-effect` errors in its data-fetching effects.
## مرحلة D5.10: تبسيط وتحديث فورم إضافة وتعديل الكتالوجات وضمان التجاوب الكامل للنافذة المنبثقة
- **الحالة:** مكتملة بنجاح (Form Simplification, Auto-Generated Keys & Fully Responsive Modal).
- **الأهداف المنجزة دون المساس بالباك إند:**
  1. **إزالة حقلي `slug` و `code` من الواجهة المرئية للمودال (`components/Admin/Catalogs/CatalogEditorModal.jsx`):**
     - تم إزالة حقل إدخال الـ `slug` الخاص بالوزارات وحقل الـ `code` الخاص بالقطاعات بالكامل من واجهة المستخدم المرئية، بما في ذلك رسائل التحقق والنصوص الإرشادية.
     - الفورم أصبح مقتصراً فقط على الحقول الجوهرية: اسم الجهة بالعربية (إلزامي)، ترتيب العرض (اختياري)، وحالة الاعتماد في النظام (نشط / معطل).
  2. **توليد الـ `slug` والـ `code` تلقائياً في الخلفية عند الإضافة (`POST`):**
     - بناء أداة مساعدة معيارية `generateCatalogIdentifier(name, type)` في `lib/admin/catalog-utils.js` تقوم بالتعريب الصوتي (Transliteration) للأحرف العربية إلى نص لاتيني صالح وودود للرابط، متبوعاً بمقطع إنتروبيا عشوائي فريد `crypto.randomUUID().slice(0, 8)` يمنع أي احتمالية للتصادم أو التكرار.
     - في حال كان الاسم فارغاً أو رموزاً فقط، يتم استخدام بادئة بديلة آمنة (`min-` أو `sec-`).
     - إرسال المعرف المولد تلقائياً في طلب الـ `POST` لإرضاء شروط الباك إند والـ Schema الإلزامية (`slugSchema`).
  3. **الحفاظ على المعرفات الحالية عند التعديل (`PATCH`):**
     - في طلبات التعديل (`PATCH`)، يتم إسقاط الـ `slug` والـ `code` تماماً من كائن التعديل، مما يضمن احتفاظ قاعدة البيانات بالمعرفات الأصلية دون مساس أو تغيير.
  4. **إعادة هيكلة المودال ليكون متجاوباً بالكامل بنمط 3-Tier Flexbox Shell:**
     - تحديد الحد الأقصى للارتفاع بـ `max-h-[90vh] sm:max-h-[85vh]` لمنع تجاوز النافذة لارتفاع الشاشة.
     - ترويسة ثابتة في الأعلى (`shrink-0`) مع زر الإغلاق الدوار الذهبي.
     - جسم فورم داخلي مستقل التمرير (`flex-1 min-h-0 overflow-y-auto overscroll-contain`) لحماية الشاشات القصيرة ومود الـ Landscape.
     - شريط أزرار ثابت دائماً في الأسفل (`shrink-0 border-t border-line bg-page/50`) يضمن بقاء زري "حفظ" و "إلغاء" في متناول يد المستخدم على كافة الأجهزة.
- **الملفات المضافة والمعدلة:**
  - `app/admin/staff/page.jsx`
  - `lib/admin/staff-utils.js`
  - `components/Admin/Staff/StaffEditorModal.jsx`
  - `components/Admin/Staff/StaffResetPasswordModal.jsx`
  - `components/Admin/Staff/StaffStatusModal.jsx`
  - `components/Admin/Staff/StaffSuccessPasswordModal.jsx`
  - `components/Admin/Staff/StaffAuditModal.jsx`
  - `app/admin/catalogs/page.jsx`
  - `docs/BACKEND_PROGRESS.md`
- **التحقق والاختبارات:**
  - `npx eslint app/admin/catalogs/page.jsx app/admin/staff/page.jsx`: نجاح تام (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 283 ناجحة بنسبة 100% (283 pass, 0 fail).

| 2026-11-20 | Staff Visual Refinement | تحسين بصري شامل لصفحة إدارة الموظفين: مطابقة زر الإغلاق الذهبي الدوار مع نمط Catalog في جميع النوافذ المنبثقة الخمس، وتوحيد أنماط hover للأزرار، وتعميق تطابق حقول الإدخال مع نظام التصميم المشترك (focus shadow + error states + duration-300)، وتحسين dropdown الفلترة مع focus shadow ذهبي، وتعزيز أزرار الإجراءات بـscale وduration متناسقة. | `app/admin/staff/page.jsx`؛ `components/Admin/Staff/StaffEditorModal.jsx`؛ `components/Admin/Staff/StaffAuditModal.jsx`؛ `components/Admin/Staff/StaffResetPasswordModal.jsx`؛ `components/Admin/Staff/StaffStatusModal.jsx`؛ `components/Admin/Staff/StaffSuccessPasswordModal.jsx` | لا تغييرات على الباك إند أو API أو الصلاحيات أو المنطق التجاري. `npm test`: 283 ناجحاً. ESLint: 3 أخطاء pre-existing (setState في useEffect) موجودة قبل هذه التعديلات؛ لا أخطاء جديدة. |

## 2026-11-22 - Content page merge conflict resolution

- Resolved the unmerged Admin Content page by retaining the tabbed content managers and URL-selected tabs already documented in the P06.2 UI work. Kept the page wrapped in Suspense for useSearchParams. No API or schema behavior changed.
  - `npx eslint`: خالي تماماً من الأخطاء والتحذيرات (0 errors, 0 warnings).
  - `npm test`: جميع الاختبارات الـ 284 ناجحة بنسبة 100% (284 pass, 0 fail).

## تحديث عناوين الأعمدة الرئيسية في الصفحة الرئيسية
- تحديث العنوان الظاهر لبطاقة الأمانات المركزية إلى «الأمانات المركزية لحزب الجبهة الوطنية».
- تحديث عنوان بطاقة الوحدة البرلمانية إلى «الهيئة البرلمانية».
- إزالة كلمة «مع» من عنوان الحكومة والوزارات في بيانات الصفحة الافتراضية وبيانات قاعدة البيانات.
- التحقق النصي: تأكدت من أن العناوين القديمة غير موجودة في مكونات الصفحة الرئيسية ومصدر البيانات. تعذر التحقق البصري لأن أداة المتصفح لم تتمكن من تحديد عنوان التبويب.

## واجهة معالجة UNAUTHENTICATED
- أُضيفت صفحة واجهة /unauthorized بهوية الموقع (الكحلي والذهبي) لتوضيح أن الجلسة غير موثقة، مع مسار لتسجيل الدخول والعودة للموقع.
- الصفحة مخصصة لعرض واجهة المستخدم؛ استجابات /api/* تظل JSON بعقدها الحالي ولا تُحوّل إلى HTML.
- التحقق: لم تُشغّل الاختبارات أو lint بناءً على تعليمات العمل الحالية.

## معالجة عرض صفحة الإدارة عند غياب الجلسة
- عُدّل proxy.js لتوجيه طلبات صفحات /admin/* غير الموثقة إلى /unauthorized، مع تمرير المسار المطلوب في next للعودة إليه بعد تسجيل الدخول.
- بقيت طلبات /api/admin/* غير الموثقة تُرجع استجابة JSON بحالة 401، حفاظًا على عقد API.
- التحقق: لم تُشغّل الاختبارات أو lint.

## إخفاء غلاف الموقع العام عن شاشة عدم تسجيل الدخول
- عُدّل PublicShell ليستثني /unauthorized من Navbar وFooter مثل صفحات لوحة التحكم، فتظهر شاشة المعالجة مستقلة.
- التحقق: لم تُشغّل الاختبارات أو lint.

## منع التمرير في شاشة عدم تسجيل الدخول
- جعلت شاشة /unauthorized بارتفاع نافذة العرض (`h-dvh`) مع إخفاء تجاوز المحتوى وتقليل المسافات لتناسب الشاشة دون تمرير.
- التحقق: لم تُشغّل الاختبارات أو lint.

## صفحة 404 بهوية الموقع
- أُضيف app/not-found.jsx برسالة عربية واضحة ورابط عودة للرئيسية، مستخدمًا ألوان وهوية الموقع.
- الشاشة مثبتة بارتفاع نافذة العرض، وتُخفى عناصر Navbar وFooter ويُمنع تمرير الصفحة أثناء عرضها.
- وفق دليل Next.js، app/not-found.jsx يعالج المسارات غير الموجودة ويُرجع حالة 404 قبل بدء البث.
- التحقق: لم تُشغّل الاختبارات أو lint.

## Backend + UI Phase — Archive Audit Log Records (Password Protected)

- أُضيف حذف آمن لسجلات التدقيق من `/admin/audit-log`: زر `حذف الكل` في الترويسة، وزر `حذف السجل` لكل صف في عروض سطح المكتب والتابلت والجوال، ونافذة تأكيد تطلب `confirm: true` وكلمة مرور مدير النظام الحالي.
- عقد API الجديد:
  - `DELETE /api/admin/staff/audit-log` يحذف كل السجلات ويرجع `{ ok: true, deleted: n }`.
  - `DELETE /api/admin/staff/audit-log/:id` يحذف سجلًا واحدًا ويرجع `{ ok: true, deleted: 1 }`.
  - الجسم مطلوب بالشكل `{ "confirm": true, "password": "<current super_admin password>" }`.
  - الحماية تستخدم `staff:manage` ثم في الخدمة تُعاد قراءة الموظف النشط والتحقق من دور `super_admin` وكلمة المرور بـ`scrypt`؛ لا تُسجل كلمة المرور ولا تُعرض في الاستجابات.
  - الأخطاء: `400 INVALID_CURRENT_PASSWORD`، `400 VALIDATION`، `403 FORBIDDEN`، `404 NOT_FOUND`، `500 SERVER_ERROR`؛ دون stack trace وبـ`Cache-Control: no-store`.
- لا توجد تغييرات على schema أو migration أو seed. عملية الحذف لا تكتب سجل تدقيق جديدًا، حتى يبقى `حذف الكل` فارغًا فعلًا. الملف المحذوف مسبقًا `public/uploads/news/news-970161c8-632e-4ec1-981c-e23ab3821ba2.jpg` لم يُلمس.
- الملفات: `lib/validation/staff.js`، `lib/services/staff.js`، `lib/staff/handlers.js`، `app/api/admin/staff/audit-log/route.js`، `app/api/admin/staff/audit-log/[id]/route.js`، `app/admin/audit-log/page.jsx`، والاختبارات المرتبطة بها.
- التحقق: `npm test` نجح بالكامل (338 pass / 0 fail). ESLint ناجح على جميع الملفات المعدّلة؛ الفحص الكامل يُظهر 3 أخطاء `react-hooks/set-state-in-effect` سابقة في ملفات لم تُعدّل: `StaffAuditModal.jsx`، `StaffEditorModal.jsx`، `StaffResetPasswordModal.jsx`. `npm run build` نجح في التجميع والـTypeScript لكنه فشل في prerender لصفحتين لم تُعدّلا (`/admin` و`/admin/news`) بسبب `Render in Browser` خارج Suspense مع `cacheComponents`؛ لم تُجرَ تعديلات Install/DB.

## Phase 18.1 — قاعدة بيانات الهيكل التنظيمي للوحدات الحزبية (قيد المراجعة)
- أُضيفت نماذج Prisma: `centers`, `local_secretariats`, `party_units`, `party_unit_people` على Branch مستقل.
- المحافظات تستخدم جدول `governorates` الحالي دون إنشاء جدول بديل.
- قيود uniqueness مرتبطة بالأب: اسم المركز داخل المحافظة، واسم الأمانة داخل المركز، واسم الوحدة داخل الأمانة؛ لذلك يمكن تكرار اسم الوحدة في أمانتين مختلفتين.
- الأشخاص يدعمون عضوًا مرتبطًا من `members` أو إدخالًا يدويًا بالاسم، مع منصب حر وتفاصيل وترتيب ونشر، دون صور في هذه المرحلة.
- أُنشئت Migration إضافية وفهارس وعلاقات FK مع منع الحذف المتسلسل، وتريجر `set_updated_at()` الموجود مسبقًا.
- التدقيق سيعيد استخدام قيم `staff_audit_action` الحالية ومفاتيح JSONB المسموح بها في Phase 13؛ لا تعديل على enum أو CHECK constraint.
- **مهم:** Migration أُنشئت للمراجعة فقط ولم تُطبّق على قاعدة البيانات. لم يتم تنفيذ أي كتابة على قاعدة البيانات.
- **التحقق المتبقي:** تشغيل Prisma format/validate/generate والاختبارات في بيئة المشروع قبل الانتقال لخدمات وواجهات API.


### 2026-11-21 — Phase 18.2 (قيد المراجعة)
- إضافة صلاحية مستقلة `organization:manage` ومنحها لـ`super_admin` فقط، مع اختبار تغطية الصلاحيات.
- إضافة Validation لإنشاء وتعديل المراكز والأمانات المحلية والوحدات الحزبية والأشخاص.
- إضافة Services لإدارة التسلسل: المحافظة ← المركز ← الأمانة المحلية ← الوحدة الحزبية، مع رفض إنشاء أبناء تحت أب غير نشط، ومنع حذف الأب الذي لديه أبناء.
- إضافة إدارة الأشخاص المرتبطين بعضو نشط من `members` أو شخص يدوي، والاسم العام للعضو يُقرأ من `membership_application.full_name`.
- إضافة سجل تدقيق باستخدام أحداث `content_*` ومفاتيح JSON المسموح بها في Phase 13 فقط: `entity_type`, `entity_id`, `changed_fields`.
- إضافة Admin APIs لإدارة المراكز والأمانات المحلية والوحدات والأشخاص، وبحث آمن عن الأعضاء النشطين لاختيارهم، وPublic APIs لقوائم المحافظات والمراكز والوحدات وتفاصيل الوحدة.
- Public responses لا تعرض بيانات اتصال أو رقم قومي أو تاريخ ميلاد أو أي حقول خاصة بالعضو، كما تخفي فروع البحث الفارغة وتتحقق من معاملات الاستعلام المكررة.
- توثيق عقود المسارات العامة والإدارية في `docs/API_INTEGRATION_GUIDE.md`، وإضافة اختبارات صلاحيات وValidation دون تشغيلها.
- لم تُشغّل اختبارات أو أوامر Prisma، ولم تُطبّق Migration على قاعدة البيانات. يلزم تشغيل `npx prisma generate` لتحديث Prisma Client المولّد بعد تغيير الـSchema قبل اختبار التشغيل والبناء.


### 2026-11-21 — Phase 18.3 (واجهة لوحة التحكم)
- إضافة صفحة إدارة الهيكل التنظيمي: `/admin/organization`.
- إضافة مدخل مستقل في القائمة الجانبية تحت مجموعة الإدارة، يظهر لمدير النظام فقط.
- توحيد المظهر مع هوية لوحة التحكم الحالية: ألوان الذهبي والرمادي، البطاقات البيضاء، الحواف الدائرية، الخطوط، RTL، وحالات التحميل والفراغ والأخطاء.
- تنفيذ واجهة اختيار المحافظة والمركز والأمانة المحلية، وإدارة المراكز والأمانات والوحدات الحزبية.
- تنفيذ واجهة إدارة الأشخاص: البحث عن عضو نشط وربطه، أو إدخال شخص يدوي، مع تعديل البيانات والترتيب والنشر والإخفاء والحذف.
- لم يتم تشغيل lint أو build أو الاختبارات حتى الآن؛ يلزم التحقق من تكامل الواجهة مع APIs وتشغيل Prisma Client generation في بيئة المشروع.


### 2026-11-21 — Phase 18.4 (تكامل البحث العام والتحقق)
- استبدال واجهة البحث الجغرافي التجريبية في `components/Home/sections/GeographicSearch.jsx` بالـPublic APIs الفعلية.
- أصبح البحث بثلاثة اختيارات فقط: المحافظة، المركز، الوحدة الحزبية. اختيارات الأب تعيد ضبط الاختيارات التابعة، وقائمة الوحدات تعرض اسم الأمانة المحلية للتفريق بين الأسماء المتكررة.
- نتيجة البحث تعرض بيانات الوحدة والمحافظة والمركز والأمانة المحلية والقيادات المنشورة فقط، مع رسالة واضحة عند عدم وجود قيادات منشورة.
- إزالة الاعتماد على `geoSearchMock` وحقول القرية والعزبة وبيانات قيادات المحافظة القديمة من مكون البحث.
- منع تخزين استجابات البحث العامة مؤقتًا حتى يظهر تعطيل أو نشر الوحدات والقيادات دون نتائج قديمة من Cache.
- إصلاح البحث عن الأعضاء النشطين في لوحة الإدارة، وإتاحة ربط عضو موجود حتى عند تعديل شخص أُضيف يدويًا.
- إصلاح إرسال التفاصيل الاختيارية الفارغة لتتوافق مع Zod validation، وتحديث قائمة الأشخاص بعد النشر والحذف، وتحسين معالجة أخطاء التحديث.
- إضافة اختبارات وحدات للـOrganization handlers والـServices وValidation، مع حقن الاعتماديات في handlers لتسهيل اختبار الصلاحيات وعقود الاستجابات.
- مراجعة Phase 13 audit JSON CHECK: المفاتيح المستخدمة (`entity_type`, `entity_id`, `changed_fields`) مسموح بها وأنواعها متوافقة؛ لم يتم توسيع القيود أو الـenum.
- لا تزال اختبارات Node وESLint وNext build وPrisma generate غير مشغّلة في بيئة محلية ضمن هذه الجلسة؛ لا تعتبر نتائجها ناجحة قبل تشغيلها.

## إصلاحات lint وbuild والتحقق العام (فرع test)
- أعيد تنظيم Effects في صفحة إدارة الهيكل التنظيمي والبحث الجغرافي: أصبحت حالات مسح القوائم التابعة تتغير مع أحداث الاختيار، وأُضيف إلغاء الطلبات القديمة مع إبقاء حواجز منع النتائج المتأخرة.
- حُذفت متغيرات المحافظة والمركز غير المستخدمة في GeographicSearch.
- استُبدل تحميل IBM Plex Sans Arabic من Google Fonts بملفات WOFF2 محلية للأوزان 400/500/600/700 من حزمة IBM الرسمية، وأُدرج ملف ترخيص OFL.
- أُضيفت حدود مسار موحدة لمجلد public/uploads/org، مع تعليمات Turbopack لتجاوز التتبع الديناميكي لملفات الرفع وقت التشغيل. اختفى تحذير تتبع المشروع من build.
- أُحيط غلاف لوحة الإدارة بحد Suspense مع شاشة انتظار من نفس الهوية لمعالجة CSR bailout في prerender.
- نتائج التحقق: lint ناجح بلا تحذيرات؛ build ناجح؛ Prisma validate ناجح؛ Prisma generate ناجح إلى مجلد مؤقت للحفاظ على تغييرات generated/prisma الموجودة؛ npm test ناجح (338/338).
- سجّل build استثناءات Prisma P2021 أثناء توليد صفحات، لأن بعض الجداول غير متاحة في قاعدة البيانات الحالية؛ استخدمت الصفحة بيانات fallback وأكمل البناء. لم تُجرَ أي عملية كتابة أو migration لقاعدة البيانات.
- ظهرت تحذيرات Node MODULE_TYPELESS_PACKAGE_JSON أثناء الاختبارات، ولم تؤثر على النتائج.

### 2026-11-22 — News Sources deletion backend
- Added confirmed Super Admin DELETE handlers for one source and the full source collection; both source service operations enforce role authorization and use database transactions.
- Deletion is rejected with `SOURCE_IN_USE` (409) when articles reference a source. Bulk deletion checks the complete collection and rejects atomically if any source is referenced; it never deletes or changes articles.
- Source row locks serialize individual deletion with article creation. Bulk deletion locks the source table against concurrent inserts, locks all source rows, checks references, deletes all unused sources, and writes one `content_deleted` audit record per source in the same transaction.
- Focused service and handler tests cover permissions, confirmations, missing IDs, reference conflicts, empty/all-unused collections, audits, rollback, route exports, and lock calls. Tests were run directly with Node because the Node test runner subprocess launch is blocked (`spawn EPERM`); no PostgreSQL concurrency integration was run.

### 2026-11-22 - Staff role UI cleanup
- Removed unsupported legacy roles from the shared Staff role options; the role filter, role counts, and create/edit selector now expose only `super_admin`, `news_editor`, and `news_reviewer`.
- Corrected the permissions test to reflect that legacy roles have no current permission grants and added a focused check for the three role options and labels. Existing validation rejection tests remain unchanged.

### 2026-11-22 - Individual employee deletion backend
- Added a Super Admin-only confirmed individual DELETE endpoint for inactive staff accounts. The service revalidates the actor, serializes against role/status changes with the existing advisory lock, locks the target row, writes a `staff_deleted` audit snapshot, then deletes only the staff row in one transaction.
- Added an additive audit enum migration and regenerated the Prisma client. The migration was not applied. Existing staff foreign-key relations remain SetNull.
- Service and handler tests cover authorization, confirmation, active/missing/self rejection, audit rollback/snapshots, and mock lock ordering. PostgreSQL concurrency and foreign-key behavior were not integration-tested.

### 2026-11-22 - Individual employee deletion frontend
- Added a per-employee delete action to the Staff page. Active accounts show a deactivation requirement; the current account action is disabled. Inactive accounts require a named confirmation dialog before sending the existing DELETE request.
- Success removes the account from the local list and updates counts; errors remain in the dialog, and a missing account triggers a list refresh. No bulk action or database request was run.

### 2026-11-22 - Home navigation links frontend
- Replaced the separate village and ezba entries in the shared Navbar/Footer link data with one "الوحدة الحزبية" link targeting the existing "#geo" section.
- Navbar and Footer retain their in-page smooth scrolling and active link behavior on `/`; on other routes, the links point to `/#geo` and the existing section anchor receives focus on load.
- No backend, API, service, authentication, Prisma, migration, or database files were changed; no database command was run.

### 2026-11-22 - Navbar pathname reference fix
- Fixed a runtime ReferenceError in NavigationLinks by passing the current pathname from NavbarContent to both the desktop and mobile link lists.
- Verified with targeted ESLint and git diff whitespace checks.

### 2026-11-22 - Admin toast responsiveness and header search removal
- Updated the shared admin toast placement and card sizing to stay within viewport gutters, wrap long messages, and align decorative status icons to multiline Arabic text on mobile while retaining desktop styling, colors, and timer dismissal.
- Removed the unused dashboard header search input and its Ctrl+K focus shortcut; the mobile drawer and Escape handling remain.
- Targeted ESLint and git diff whitespace checks passed. Interactive browser checks were not available in this environment.
- No backend or database files or records were changed.

### 2026-11-22 - Responsive admin request filters
- Made the Service Requests and Membership Applications filter grids use two columns through laptop widths, a single column on phones, and four columns only at wide desktop sizes.
- Added opt-in wrapping for long selected values and dropdown options in CustomSelect and enabled it only for these pages; reduced field and action padding/font sizes at narrower widths.
- ESLint passed for each modified JSX file when run individually with an explicit Node heap. Live viewport testing was unavailable because no browser surface was available; breakpoint behavior was checked from the responsive classes.
- No backend, API, database, Prisma, or migration files were changed.

### 2026-11-22 - Dashboard quick access text wrapping
- Replaced truncation in Quick Access tile labels with natural wrapping and safe overflow wrapping; constrained tile sizing and reduced padding/gaps at narrower widths while retaining the two-column layout, icons, and links.
- Targeted ESLint and git diff --check passed. Browser viewport rendering was unavailable; the requested widths were checked against the responsive class rules and dashboard container sizing.
- No backend or database files were modified.

### 2026-11-22 - Responsive dashboard statistics and sparklines
- Changed the statistics grid to one column on phones, two columns through typical laptop widths, and four columns on very wide screens. Stat-card titles and long values now wrap within constrained flex items; font sizes and padding scale down at smaller widths.
- Resized each existing SVG sparkline to its card width while retaining its original path data and count values.
- Targeted ESLint and git diff --check passed. Browser viewport rendering was unavailable; requested widths were checked against the responsive breakpoints and dashboard content width.
- Existing Quick Access changes were preserved. No backend or database files were modified.
