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
