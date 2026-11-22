# دليل تكامل واجهات البرمجة لتطوير الواجهة الأمامية (Frontend API Integration Guide)
**المشروع:** حزب الجبهة الوطنية (National Front Party)  
**حالة الوثيقة:** مرجع التسليم الرسمي للمرحلة 16 (Phase 16 Handoff Reference)  
**نطاق التغطية:** توثيق شامل لجميع مسارات النظام (72 ملف مسار و106 معالجات HTTP فعلية)  
**تاريخ الاعتماد والتحديث:** 18 نوفمبر 2026

---

## 1. نظرة عامة والهدف من الدليل (Overview & Purpose)

تم إعداد هذا الدليل ليكون المرجع الفني القطعي لمطوري الواجهة الأمامية (Frontend Developers) للتكامل مع واجهات البرمجة (APIs) الخاصة بحزب الجبهة الوطنية دون الحاجة إلى تخمين المسارات، أو الصلاحيات، أو الحقول المطلوبة، أو هياكل الردود، أو قواعد التحقق (Validation)، أو معالجة الأخطاء.

### إحصائيات الفهرس البرمجي المعتمد (Verified Inventory Metrics)
* **إجمالي ملفات المسارات (Route Files):** **72** ملفاً.
* **إجمالي معالجات الطلبات (HTTP Method Handlers):** **106** معالجات موزعة كالتالي:
  * **GET:** **46** معالجاً.
  * **PATCH:** **27** معالجاً.
  * **POST:** **24** معالجاً.
  * **DELETE:** **9** معالجات.
* **إجمالي الواجهات العامة (Public APIs):** **16** معالجاً.
* **إجمالي واجهات لوحة الإدارة المحمية (Admin Protected APIs):** **90** معالجاً.

---

## 2. الفهرس الشامل لجميع معالجات الـ API (Master Endpoint Index)

الجدول التالي يوضح جميع الـ 106 معالجات المصدرة فعلياً في كود المشروع، ومستوى الحماية، والأدوار المسموحة، والرابط المباشر للتوثيق التفصيلي:

| # | الطريقة (Method) | المسار الفعلي (Exact URL) | المجال (Domain) | مستوى الوصول (Access) | الأدوار / الصلاحيات المطلوبة | الرابط التفصيلي |
| :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **1** | `POST` | `/api/admin/auth/login` | Admin Auth | Public (Admin) | متاح للجميع (تسجيل الدخول) | [تفاصيل](#11-تسجيل-دخول-الموظف-post-apiadminauthlogin) |
| **2** | `POST` | `/api/admin/auth/logout` | Admin Auth | Protected | جلسة موظف نشطة | [تفاصيل](#12-تسجيل-خروج-الموظف-post-apiadminauthlogout) |
| **3** | `GET` | `/api/admin/auth/me` | Admin Auth | Protected | جلسة موظف نشطة | [تفاصيل](#13-بيانات-الموظف-الحالي-get-apiadminauthme) |
| **4** | `POST` | `/api/admin/auth/change-password` | Admin Auth | Protected | جلسة موظف نشطة (يسمح بتغيير كلمة المرور) | [تفاصيل](#14-تغيير-كلمة-المرور-post-apiadminauthchange-password) |
| **5** | `GET` | `/api/admin/staff` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#21-عرض-قائمة-الموظفين-get-apiadminstaff) |
| **6** | `POST` | `/api/admin/staff` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#22-إنشاء-حساب-موظف-جديد-post-apiadminstaff) |
| **7** | `GET` | `/api/admin/staff/[id]` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#23-جلب-بيانات-موظف-get-apiadminstaffid) |
| **8** | `PATCH` | `/api/admin/staff/[id]` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#24-تحديث-بيانات-موظف-patch-apiadminstaffid) |
| **9** | `PATCH` | `/api/admin/staff/[id]/status` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#25-تعديل-حالة-نشاط-الموظف-patch-apiadminstaffidstatus) |
| **10** | `POST` | `/api/admin/staff/[id]/reset-password` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#26-إعادة-تعيين-كلمة-مرور-موظف-post-apiadminstaffidreset-password) |
| **11** | `GET` | `/api/admin/staff/audit-log` | Admin Staff | Protected | `super_admin` (`staff:manage`) | [تفاصيل](#27-سجل-تدقيق-إجراءات-الموظفين-get-apiadminstaffaudit-log) |
| **12** | `GET` | `/api/admin/applications` | Admin Applications | Protected | `super_admin` | [تفاصيل](#31-قائمة-طلبات-الانضمام-get-apiadminapplications) |
| **13** | `GET` | `/api/admin/applications/[id]` | Admin Applications | Protected | `super_admin` | [تفاصيل](#32-تفاصيل-طلب-انضمام-get-apiadminapplicationsid) |
| **14** | `PATCH` | `/api/admin/applications/[id]/status` | Admin Applications | Protected | `super_admin` | [تفاصيل](#33-تحديث-حالة-طلب-الانضمام-patch-apiadminapplicationsidstatus) |
| **15** | `POST` | `/api/admin/applications/[id]/notes` | Admin Applications | Protected | `super_admin` | [تفاصيل](#34-إضافة-ملاحظة-داخلية-post-apiadminapplicationsidnotes) |
| **16** | `PATCH` | `/api/admin/applications/[id]/assignment` | Admin Applications | Protected | `super_admin` | [تفاصيل](#35-إسناد-طلب-الانضمام-لموظف-patch-apiadminapplicationsidassignment) |
| **17** | `GET` | `/api/admin/applications/export` | Admin Applications | Protected | `super_admin` (`applications:export`) | [تفاصيل](#36-تصدير-طلبات-الانضمام-csv-get-apiadminapplicationsexport) |
| **18** | `GET` | `/api/admin/ministries` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#41-قائمة-الوزارات-get-apiadminministries) |
| **19** | `POST` | `/api/admin/ministries` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#42-إنشاء-وزارة-post-apiadminministries) |
| **20** | `GET` | `/api/admin/ministries/[id]` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#43-جلب-وزارة-get-apiadminministriesid) |
| **21** | `PATCH` | `/api/admin/ministries/[id]` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#44-تحديث-وزارة-patch-apiadminministriesid) |
| **22** | `PATCH` | `/api/admin/ministries/[id]/status` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#45-تعديل-حالة-نشاط-وزارة-patch-apiadminministriesidstatus) |
| **23** | `GET` | `/api/admin/request-sectors` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#46-قائمة-القطاعات-get-apiadminrequest-sectors) |
| **24** | `POST` | `/api/admin/request-sectors` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#47-إنشاء-قطاع-خدمي-post-apiadminrequest-sectors) |
| **25** | `GET` | `/api/admin/request-sectors/[id]` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#48-جلب-قطاع-خدمي-get-apiadminrequest-sectorsid) |
| **26** | `PATCH` | `/api/admin/request-sectors/[id]` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#49-تحديث-قطاع-خدمي-patch-apiadminrequest-sectorsid) |
| **27** | `PATCH` | `/api/admin/request-sectors/[id]/status` | Admin Catalogs | Protected | `super_admin` | [تفاصيل](#410-تعديل-حالة-نشاط-قطاع-patch-apiadminrequest-sectorsidstatus) |
| **28** | `GET` | `/api/admin/service-requests` | Admin Services | Protected | `super_admin` | [تفاصيل](#411-قائمة-طلبات-المواطنين-get-apiadminservice-requests) |
| **29** | `GET` | `/api/admin/service-requests/[id]` | Admin Services | Protected | `super_admin` | [تفاصيل](#412-تفاصيل-طلب-مواطن-get-apiadminservice-requestsid) |
| **30** | `GET` | `/api/admin/news/articles` | Admin News | Protected | `super_admin`, `news_reviewer`, `news_editor` (الخاص به فقط) | [تفاصيل](#51-قائمة-مقالات-الأخبار-get-apiadminnewsarticles) |
| **31** | `POST` | `/api/admin/news/articles` | Admin News | Protected | `super_admin`, `news_editor` | [تفاصيل](#52-إنشاء-مقال-جديد-post-apiadminnewsarticles) |
| **32** | `GET` | `/api/admin/news/articles/[id]` | Admin News | Protected | `super_admin`, `news_reviewer`, `news_editor` (الخاص به فقط) | [تفاصيل](#53-جلب-مقال-محدد-get-apiadminnewsarticlesid) |
| **33** | `PATCH` | `/api/admin/news/articles/[id]` | Admin News | Protected | `super_admin`, `news_editor` (الخاص به في حالتي المسودة والتعديل) | [تفاصيل](#54-تعديل-مقال-patch-apiadminnewsarticlesid) |
| **34** | `DELETE` | `/api/admin/news/articles/[id]` | Admin News | Protected | `super_admin` (`records:delete`) | [تفاصيل](#55-حذف-مقال-نهائيا-delete-apiadminnewsarticlesid) |
| **35** | `POST` | `/api/admin/news/articles/[id]/submit` | Admin News | Protected | `super_admin`, `news_editor` (الخاص به) | [تفاصيل](#56-إرسال-المقال-للمراجعة-post-apiadminnewsarticlesidsubmit) |
| **36** | `POST` | `/api/admin/news/articles/[id]/request-changes` | Admin News | Protected | `super_admin`, `news_reviewer` | [تفاصيل](#57-طلب-تعديلات-على-المقال-post-apiadminnewsarticlesidrequest-changes) |
| **37** | `POST` | `/api/admin/news/articles/[id]/publish` | Admin News | Protected | `super_admin`, `news_reviewer` (يحظر النشر الذاتي للـ Reviewer) | [تفاصيل](#58-نشر-المقال-post-apiadminnewsarticlesidpublish) |
| **38** | `POST` | `/api/admin/news/articles/[id]/unpublish` | Admin News | Protected | `super_admin` | [تفاصيل](#59-إلغاء-نشر-المقال-post-apiadminnewsarticlesidunpublish) |
| **39** | `GET` | `/api/admin/news/sources` | Admin News | Protected | `super_admin` فقط | [تفاصيل](#510-قائمة-مصادر-الأخبار-get-apiadminnewssources) |
| **40** | `POST` | `/api/admin/news/sources` | Admin News | Protected | `super_admin` فقط | [تفاصيل](#511-إنشاء-مصدر-أخبار-post-apiadminnewssources) |
| **41** | `GET` | `/api/admin/news/sources/[id]` | Admin News | Protected | `super_admin` فقط | [تفاصيل](#512-جلب-مصدر-أخبار-get-apiadminnewssourcesid) |
| **42** | `PATCH` | `/api/admin/news/sources/[id]` | Admin News | Protected | `super_admin` فقط | [تفاصيل](#513-تعديل-مصدر-أخبار-patch-apiadminnewssourcesid) |
| **43** | `PATCH` | `/api/admin/news/sources/[id]/status` | Admin News | Protected | `super_admin` فقط | [تفاصيل](#514-تعديل-حالة-مصدر-أخبار-patch-apiadminnewssourcesidstatus) |
| **44** | `GET` | `/api/admin/content/central-secretariats` | Admin Content | Protected | `super_admin` | [تفاصيل](#61-قائمة-الأمانات-المركزية-get-apiadmincontentcentral-secretariats) |
| **45** | `POST` | `/api/admin/content/central-secretariats` | Admin Content | Protected | `super_admin` | [تفاصيل](#62-إنشاء-أمانة-مركزية-post-apiadmincontentcentral-secretariats) |
| **46** | `GET` | `/api/admin/content/central-secretariats/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#63-جلب-أمانة-مركزية-get-apiadmincontentcentral-secretariatsid) |
| **47** | `PATCH` | `/api/admin/content/central-secretariats/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#64-تحديث-أمانة-مركزية-patch-apiadmincontentcentral-secretariatsid) |
| **48** | `DELETE` | `/api/admin/content/central-secretariats/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#65-حذف-أمانة-مركزية-delete-apiadmincontentcentral-secretariatsid) |
| **49** | `PATCH` | `/api/admin/content/central-secretariats/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#66-نشرإخفاء-أمانة-مركزية-patch-apiadmincontentcentral-secretariatsidstatus) |
| **50** | `POST` | `/api/admin/content/central-secretariats/[id]/people` | Admin Content | Protected | `super_admin` | [تفاصيل](#67-إضافة-عضو-للأمانة-المركزية-post-apiadmincontentcentral-secretariatsidpeople) |
| **51** | `GET` | `/api/admin/content/central-secretariats/[id]/people/[personId]` | Admin Content | Protected | `super_admin` | [تفاصيل](#68-جلب-عضو-بالأمانة-المركزية-get-apiadmincontentcentral-secretariatsidpeoplepersonid) |
| **52** | `PATCH` | `/api/admin/content/central-secretariats/[id]/people/[personId]` | Admin Content | Protected | `super_admin` | [تفاصيل](#69-تعديل-عضو-بالأمانة-المركزية-patch-apiadmincontentcentral-secretariatsidpeoplepersonid) |
| **53** | `DELETE` | `/api/admin/content/central-secretariats/[id]/people/[personId]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#610-حذف-عضو-بالأمانة-المركزية-delete-apiadmincontentcentral-secretariatsidpeoplepersonid) |
| **54** | `PATCH` | `/api/admin/content/central-secretariats/[id]/people/[personId]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#611-نشرإخفاء-عضو-بالأمانة-المركزية-patch-apiadmincontentcentral-secretariatsidpeoplepersonidstatus) |
| **55** | `GET` | `/api/admin/content/governorate-secretariats` | Admin Content | Protected | `super_admin` | [تفاصيل](#612-قائمة-أمانات-المحافظات-get-apiadmincontentgovernorate-secretariats) |
| **56** | `POST` | `/api/admin/content/governorate-secretariats` | Admin Content | Protected | `super_admin` | [تفاصيل](#613-إنشاء-أمانة-محافظة-post-apiadmincontentgovernorate-secretariats) |
| **57** | `GET` | `/api/admin/content/governorate-secretariats/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#614-جلب-أمانة-محافظة-get-apiadmincontentgovernorate-secretariatsid) |
| **58** | `PATCH` | `/api/admin/content/governorate-secretariats/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#615-تحديث-أمانة-محافظة-patch-apiadmincontentgovernorate-secretariatsid) |
| **59** | `DELETE` | `/api/admin/content/governorate-secretariats/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#616-حذف-أمانة-محافظة-delete-apiadmincontentgovernorate-secretariatsid) |
| **60** | `PATCH` | `/api/admin/content/governorate-secretariats/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#617-نشرإخفاء-أمانة-محافظة-patch-apiadmincontentgovernorate-secretariatsidstatus) |
| **61** | `GET` | `/api/admin/content/leadership/panels` | Admin Content | Protected | `super_admin` | [تفاصيل](#618-قائمة-هيئات-القيادة-get-apiadmincontentleadershippanels) |
| **62** | `POST` | `/api/admin/content/leadership/panels` | Admin Content | Protected | `super_admin` | [تفاصيل](#619-إنشاء-هيئة-قيادية-post-apiadmincontentleadershippanels) |
| **63** | `GET` | `/api/admin/content/leadership/panels/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#620-جلب-هيئة-قيادية-get-apiadmincontentleadershippanelsid) |
| **64** | `PATCH` | `/api/admin/content/leadership/panels/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#621-تحديث-هيئة-قيادية-patch-apiadmincontentleadershippanelsid) |
| **65** | `DELETE` | `/api/admin/content/leadership/panels/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#622-حذف-هيئة-قيادية-delete-apiadmincontentleadershippanelsid) |
| **66** | `PATCH` | `/api/admin/content/leadership/panels/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#623-نشرإخفاء-هيئة-قيادية-patch-apiadmincontentleadershippanelsidstatus) |
| **67** | `GET` | `/api/admin/content/leadership/leaders` | Admin Content | Protected | `super_admin` | [تفاصيل](#624-قائمة-القادة-get-apiadmincontentleadershipleaders) |
| **68** | `POST` | `/api/admin/content/leadership/leaders` | Admin Content | Protected | `super_admin` | [تفاصيل](#625-إضافة-قائد-جديد-post-apiadmincontentleadershipleaders) |
| **69** | `GET` | `/api/admin/content/leadership/leaders/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#626-جلب-قائد-محدد-get-apiadmincontentleadershipleadersid) |
| **70** | `PATCH` | `/api/admin/content/leadership/leaders/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#627-تحديث-بيانات-قائد-patch-apiadmincontentleadershipleadersid) |
| **71** | `DELETE` | `/api/admin/content/leadership/leaders/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#628-حذف-قائد-نهائيا-delete-apiadmincontentleadershipleadersid) |
| **72** | `PATCH` | `/api/admin/content/leadership/leaders/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#629-نشرإخفاء-قائد-patch-apiadmincontentleadershipleadersidstatus) |
| **73** | `GET` | `/api/admin/content/leadership/contents` | Admin Content | Protected | `super_admin` | [تفاصيل](#630-قائمة-قرارات-ومحتوى-القيادة-get-apiadmincontentleadershipcontents) |
| **74** | `POST` | `/api/admin/content/leadership/contents` | Admin Content | Protected | `super_admin` | [تفاصيل](#631-إنشاء-قرارمحتوى-قيادة-post-apiadmincontentleadershipcontents) |
| **75** | `GET` | `/api/admin/content/leadership/contents/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#632-جلب-قرارمحتوى-قيادة-get-apiadmincontentleadershipcontentsid) |
| **76** | `PATCH` | `/api/admin/content/leadership/contents/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#633-تحديث-قرارمحتوى-قيادة-patch-apiadmincontentleadershipcontentsid) |
| **77** | `DELETE` | `/api/admin/content/leadership/contents/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#634-حذف-قرارمحتوى-قيادة-delete-apiadmincontentleadershipcontentsid) |
| **78** | `PATCH` | `/api/admin/content/leadership/contents/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#635-نشرإخفاء-قرارمحتوى-قيادة-patch-apiadmincontentleadershipcontentsidstatus) |
| **79** | `GET` | `/api/admin/content/parliamentary-unit` | Admin Content | Protected | `super_admin` | [تفاصيل](#636-قائمة-بنود-الهيئة-البرلمانية-get-apiadmincontentparliamentary-unit) |
| **80** | `POST` | `/api/admin/content/parliamentary-unit` | Admin Content | Protected | `super_admin` | [تفاصيل](#637-إنشاء-بند-برلماني-post-apiadmincontentparliamentary-unit) |
| **81** | `GET` | `/api/admin/content/parliamentary-unit/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#638-جلب-بند-برلماني-get-apiadmincontentparliamentary-unitid) |
| **82** | `PATCH` | `/api/admin/content/parliamentary-unit/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#639-تحديث-بند-برلماني-patch-apiadmincontentparliamentary-unitid) |
| **83** | `DELETE` | `/api/admin/content/parliamentary-unit/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#640-حذف-بند-برلماني-delete-apiadmincontentparliamentary-unitid) |
| **84** | `PATCH` | `/api/admin/content/parliamentary-unit/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#641-نشرإخفاء-بند-برلماني-patch-apiadmincontentparliamentary-unitidstatus) |
| **85** | `GET` | `/api/admin/content/popups` | Admin Content | Protected | `super_admin` | [تفاصيل](#642-قائمة-النوافذ-المنبثقة-get-apiadmincontentpopups) |
| **86** | `POST` | `/api/admin/content/popups` | Admin Content | Protected | `super_admin` | [تفاصيل](#643-إنشاء-نافذة-منبثقة-post-apiadmincontentpopups) |
| **87** | `GET` | `/api/admin/content/popups/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#644-جلب-نافذة-منبثقة-get-apiadmincontentpopupsid) |
| **88** | `PATCH` | `/api/admin/content/popups/[id]` | Admin Content | Protected | `super_admin` | [تفاصيل](#645-تحديث-نافذة-منبثقة-patch-apiadmincontentpopupsid) |
| **89** | `DELETE` | `/api/admin/content/popups/[id]` | Admin Content | Protected | `super_admin` (`records:delete`) | [تفاصيل](#646-حذف-نافذة-منبثقة-delete-apiadmincontentpopupsid) |
| **90** | `PATCH` | `/api/admin/content/popups/[id]/status` | Admin Content | Protected | `super_admin` | [تفاصيل](#647-نشرإخفاء-نافذة-منبثقة-patch-apiadmincontentpopupsidstatus) |
| **91** | `POST` | `/api/applications` | Public Portal | Public | متاح للجمهور (تقديم طلب عضوية) | [تفاصيل](#71-تقديم-طلب-انضمام-post-apiapplications) |
| **92** | `POST` | `/api/service-requests` | Public Portal | Public | متاح للجمهور (طلب خدمة مواطن) | [تفاصيل](#72-تقديم-طلب-خدمة-post-apiservice-requests) |
| **93** | `GET` | `/api/governorates` | Public Portal | Public | متاح للجمهور (قائمة المحافظات) | [تفاصيل](#73-قائمة-المحافظات-النشطة-get-apigovernorates) |
| **94** | `GET` | `/api/ministries` | Public Portal | Public | متاح للجمهور (قائمة الوزارات) | [تفاصيل](#74-قائمة-الوزارات-النشطة-get-apiministries) |
| **95** | `GET` | `/api/request-sectors` | Public Portal | Public | متاح للجمهور (قائمة القطاعات) | [تفاصيل](#75-قائمة-القطاعات-النشطة-get-apirequest-sectors) |
| **96** | `GET` | `/api/content/news` | Public Content | Public | متاح للجمهور (قائمة الأخبار المنشورة) | [تفاصيل](#81-قائمة-الأخبار-المنشورة-get-apicontentnews) |
| **97** | `GET` | `/api/content/news/[slug]` | Public Content | Public | متاح للجمهور (تفاصيل مقال منشور بالـ Slug) | [تفاصيل](#82-تفاصيل-مقال-منشور-get-apicontentnewsslug) |
| **98** | `GET` | `/api/content/central-secretariats` | Public Content | Public | متاح للجمهور (الأمانات المركزية المنشورة) | [تفاصيل](#83-عرض-الأمانات-المركزية-المنشورة-get-apicontentcentral-secretariats) |
| **99** | `GET` | `/api/content/central-secretariats/[id]` | Public Content | Public | متاح للجمهور (تفاصيل أمانة مركزية منشورة) | [تفاصيل](#84-تفاصيل-أمانة-مركزية-منشورة-get-apicontentcentral-secretariatsid) |
| **100** | `GET` | `/api/content/governorate-secretariats` | Public Content | Public | متاح للجمهور (أمانات المحافظات المنشورة) | [تفاصيل](#85-عرض-أمانات-المحافظات-المنشورة-get-apicontentgovernorate-secretariats) |
| **101** | `GET` | `/api/content/governorate-secretariats/[id]` | Public Content | Public | متاح للجمهور (تفاصيل أمانة محافظة منشورة) | [تفاصيل](#86-تفاصيل-أمانة-محافظة-منشورة-get-apicontentgovernorate-secretariatsid) |
| **102** | `GET` | `/api/content/leadership` | Public Content | Public | متاح للجمهور (قيادات الحزب والقرارات) | [تفاصيل](#87-عرض-قيادات-الحزب-والقرارات-المنشورة-get-apicontentleadership) |
| **103** | `GET` | `/api/content/parliamentary-unit` | Public Content | Public | متاح للجمهور (الهيئة البرلمانية المنشورة) | [تفاصيل](#88-عرض-الهيئة-البرلمانية-المنشورة-get-apicontentparliamentary-unit) |
| **104** | `GET` | `/api/content/parliamentary-unit/[id]` | Public Content | Public | متاح للجمهور (تفاصيل بند برلماني منشور) | [تفاصيل](#89-تفاصيل-بند-برلماني-منشور-get-apicontentparliamentary-unitid) |
| **105** | `GET` | `/api/content/popups` | Public Content | Public | متاح للجمهور (النوافذ المنبثقة المنشورة) | [تفاصيل](#810-عرض-النوافذ-المنبثقة-المنشورة-get-apicontentpopups) |
| **106** | `GET` | `/api/content/popups/[id]` | Public Content | Public | متاح للجمهور (تفاصيل نافذة منبثقة منشورة) | [تفاصيل](#811-تفاصيل-نافذة-منبثقة-منشورة-get-apicontentpopupsid) |
| **107** | `GET` | `/api/content/party-program` | Public Content | Public | متاح للجمهور (عرض بيانات ومحاور برنامج الحزب) | [تفاصيل](#812-عرض-برنامج-الحزب-المنشور-get-apicontentparty-program) |

---

## 3. القواعد المعمارية العامة للتكامل (Global Integration Rules)

### 3.1 إدارة الجلسات والمصادقة (Authentication & Session Management)
1. **اسم كوكي الجلسة:** `staff_session`
2. **نوع الكوكي وخصائصه:**
   * `HttpOnly: true` (لا يمكن قراءته بواسطة JavaScript على المتصفح لمنع ثغرات XSS).
   * `Secure: true` في بيئة الإنتاج (`process.env.NODE_ENV === "production"`).
   * `SameSite: lax` للحماية من هجمات CSRF.
   * `Path: /`
   * `Max-Age: 28800` (مدة صلاحية الجلسة **8 ساعات** متصلة).
3. **متطلب الواجهة الأمامية الإلزامي لجلسات الإدارة:**
   * يجب تمرير خيار `credentials: "include"` في جميع طلبات `fetch` أو خيار `withCredentials: true` في مكتبة `axios` لجميع مسارات الإدارة المحمية (`/api/admin/...`) لإرسال واستقبال كوكي الجلسة.
   * **المسارات العامة:** جميع المسارات العامة (Public APIs مثل استمارة العضوية `/api/applications`، وطلبات الخدمات `/api/service-requests`، وقوائم المحافظات والوزارات والقطاعات، والأخبار والمحتوى العام `/api/content/...`) **لا تتطلب** جلسة موظف ولا تشترط تمرير كوكي أو تفعيل `credentials: "include"`.
4. **انتهاء الجلسة والتعامل مع عدم المصادقة:**
   * عند انتهاء الجلسة أو عدم وجود الكوكي، يُرجع الخادم رمز الحالة `401` مع الجسم `{ "error": "UNAUTHENTICATED" }`.
   * إذا تم تعطيل حساب الموظف في قاعدة البيانات (`is_active = false`)، يتم رفض الطلب فوراً بـ `401 UNAUTHENTICATED` ويقوم الخادم بحذف كوكي الجلسة فوراً عبر رأس `Set-Cookie` بـ `Max-Age=0`.
   * يجب على الواجهة الأمامية عند استقبال خطأ `401 UNAUTHENTICATED` توجيه المستخدم فوراً إلى صفحة الدخول `/admin/login`.
5. **إلزام تغيير كلمة المرور (`PASSWORD_CHANGE_REQUIRED`):**
   * إذا كان حساب الموظف مؤشراً بعلم `must_change_password: true` (مثل الحسابات الجديدة أو بعد Reset)، ترفض جميع المسارات المحمية تنفيذ أي إجراء وتُرجع رمز الحالة `403` والجسم:
     ```json
     { "error": "PASSWORD_CHANGE_REQUIRED" }
     ```
   * الاستثناء الوحيد هو المساران: `GET /api/admin/auth/me` و `POST /api/admin/auth/change-password`.
   * يجب على الواجهة الأمامية عند استقبال هذا الخطأ فتح شاشة إجبارية لتغيير كلمة المرور ولا تسمح للمستخدم بالتنقل داخل لوحة التحكم قبل إتمام التغيير بنجاح.

---

### 3.2 التحقق من المصدر وحماية الـ CSRF (Origin & CSRF Protection)
1. **نطاق فرض التحقق من المصدر (Origin Validation Scope):**
   * يتم فرض التحقق من تطابق رأس `Origin` إجبارياً على:
     * **جميع طلبات التعديل والحذف والإدخال الإدارية المحمية** (`POST`, `PATCH`, `DELETE` داخل مسارات `/api/admin/...` عبر حارس `requireStaff`).
     * **مساري تسجيل الدخول والخروج** (`POST /api/admin/auth/login` و `POST /api/admin/auth/logout` عبر معالجات `lib/auth/handlers.js`).
   * **المسارات العامة المستثناة من فحص الـ Origin:**
     * طلبات التقديم العامة للمواطنين (`POST /api/applications` و `POST /api/service-requests`) **لا تفرض** فحص رأس `Origin`:
       * مسار طلبات العضوية (`POST /api/applications`): مؤمن عبر تقييد المعدل الصارم (5 طلبات / 15 دقيقة)، واختبار التحقق البشري (Cloudflare Turnstile عند ضبط مفتاحه بالسيرفر)، وحقل المصيدة (Honeypot).
       * مسار طلبات الخدمات (`POST /api/service-requests`): مؤمن عبر تقييد المعدل الصارم (5 طلبات / 15 دقيقة)، والتحقق الصارم من الحقول بمخطط صارم (.strict()) وأقفال المعاملات المشتركة، ولا يستخدم Turnstile أو Honeypot.
2. **آلية الفحص البرمجية:**
   * يتحقق السيرفر بدقة عبر الشرط:
     `new URL(origin).origin === new URL(request.url).origin`
   * إذا كان رأس `Origin` مفقوداً أو يختلف عن نطاق السيرفر (Cross-Origin)، يرفض الخادم الطلب فوراً دون استهلاك موارد المعالجة برمز الحالة `403` وجسم:
     ```json
     { "error": "FORBIDDEN" }
     ```
3. **متطلب الـ Frontend:**
   * ترسل المتصفحات رأس `Origin` تلقائياً في طلبات `POST` و `PATCH` و `DELETE`. يجب التأكد أثناء التطوير من عدم إزالة هذا الرأس بواسطة أي reverse proxy أو HTTP interceptor.

---

### 3.3 مصفوفة الأدوار والصلاحيات (Role-Based Access Control - RBAC)
يحتوي النظام على **3 active staff roles** (stored in `staff_users.role`):

1. `super_admin`: المطور والمسؤول العام، يمتلك كامل الصلاحيات دون قيود، وهو الوحيد المخول بحذف السجلات نهائياً (`records:delete`)، وإدارة الموظفين (`staff:manage`)، وتصدير طلبات العضوية (`applications:export`)، وإدارة مصادر الأخبار.
2. `news_editor`: محرر الأخبار، مخول بإنشاء مسودات المقالات وتعديل مقالاته الخاصة فقط وإرسالها للمراجعة. لا يملك صلاحية النشر، ولا يرى مقالات زملائه.
3. `news_reviewer`: Reviews and publishes articles submitted by other authors, and may request revisions with a review note. Reviewers cannot create, edit, or upload article media and cannot review or request changes on their own articles.

#### مصفوفة الصلاحيات المطبقة في الـ Backend:
| الصلاحية البرمجية (Permission) | الأدوار المسموح لها | الوصف البرمجي |
| :--- | :--- | :--- |
| `applications:read` | `super_admin` | عرض طلبات الانضمام وتفاصيلها |
| `applications:update` | `super_admin` | تغيير الحالة والإسناد وإضافة الملاحظات |
| `applications:export` | `super_admin` | تصدير طلبات الانضمام بصيغة CSV |
| `services:manage` | `super_admin` | قراءة طلبات المواطنين وإدارة الوزارات والقطاعات |
| `content:manage` | `super_admin` | إدارة ونشر وإخفاء جميع أقسام المحتوى التنظيمي |
| `news:write` | `super_admin`, `news_editor` | إنشاء المقالات وتعديلها في مسودة ورفع صورها |
| `news:submit` | `super_admin`, `news_editor` | إرسال المقال من مسودة إلى قيد المراجعة |
| `news:read_all` | `super_admin`, `news_reviewer` | قراءة وعرض مقالات جميع المحررين |
| `news:read_own` | `news_editor` | قراءة وعرض المقالات التي أنشأها الموظف فقط |
| `news:review` | `super_admin`, `news_reviewer` | Review, publish, and request article revisions |
| `staff:manage` | `super_admin` | إنشاء وتعديل وإعادة تعيين كلمات مرور وسجل الموظفين |
| `records:delete` | `super_admin` | الحذف النهائي للسجلات (Hard Delete) مع تأكيد صريح |

> [!IMPORTANT]
> **قاعدة أمنية حاسمة للواجهة الأمامية:**
> إخفاء الأزرار في الواجهة (UI Visibility) هو لتحسين تجربة المستخدم فقط؛ السيرفر يفرض تحققاً صارماً في قاعدة البيانات لكل طلب. محاولة استدعاء أي Endpoint دون امتلاك الدور أو الصلاحية ستُقابل دائماً برمز `403 FORBIDDEN`.

---

### 3.4 معالجة الطلبات وأحجام البيانات (Payloads & Media Types)
1. **نوع المحتوى الإلزامي:**
   * جميع الطلبات التي ترسل جسماً (`body`) يجب أن تحتوي ترويسة: `Content-Type: application/json`.
   * إرسال أي ترويسة أخرى يُرجع رمز الحالة `415 UNSUPPORTED_MEDIA_TYPE`.
2. **حدود أحجام الطلبات (Payload Size Limits):**
   * **الحد العام (Default Limit):** **10 كيلوبايت (10 KB)** لجميع المسارات العادية.
   * **حد المقالات الإخبارية الاستثنائي:** **256 كيلوبايت (256 KB)** لمساري إنشاء وتحديث المقالات الإخبارية (`POST /api/admin/news/articles` و `PATCH /api/admin/news/articles/[id]`) لاستيعاب المقالات الطويلة والمحتوى الغني.
   * طلبات التعديلات على المقالات (`POST .../request-changes`) ملتزمة بالحد الافتراضي 10 KB.
   * عند تجاوز الحد المسموح، يُرجع الخادم رمز الحالة `413 PAYLOAD_TOO_LARGE`.
3. **أخطاء صياغة الـ JSON:**
   * إرسال JSON غير سليم تركيبياً (Malformed JSON) يُرجع رمز الحالة `400` مع الجسم `{ "error": "VALIDATION" }`.

---

### 3.5 هياكل الردود ومعالجة الأخطاء (Response Envelopes & Error Handling)
#### أ. هياكل الردود الناجحة (Success Envelopes):
* **العنصر الفردي (Single Resource):** يُغلف دائماً باسم الكيان المفرد، مثل:
  * `{ "staff": { ... } }`
  * `{ "application": { ... } }`
  * `{ "ministry": { ... } }`
  * `{ "request_sector": { ... } }`
  * `{ "article": { ... } }`
  * `{ "popup": { ... } }`
  * `{ "central_secretariat": { ... } }`
* **المجموعات والقوائم (Collection Resources):** تنقسم إلى 3 أنماط حسب الدومين (ويجب على الواجهة الأمامية الانتباه لها بدقة):
  1. **نمط الكتالوجات والأخبار والتطبيقات:** يُغلف باسم الجمع المخصص للدومين مع كائن `pagination`:
     * `{ "applications": [ ... ], "pagination": { "page": 1, "page_size": 25, "total": 142, "total_pages": 6 } }`
     * `{ "ministries": [ ... ], "pagination": { ... } }`
     * `{ "request_sectors": [ ... ], "pagination": { ... } }`
     * `{ "service_requests": [ ... ], "pagination": { ... } }`
     * `{ "articles": [ ... ], "pagination": { ... } }`
     * `{ "sources": [ ... ], "pagination": { ... } }`
     * `{ "news": [ ... ], "pagination": { ... } }` (في الـ Public News API)
  2. **نمط المحتوى التنظيمي للإدارة (Admin Organizational Content Lists - 7 مسارات):** تُرجع دائماً المصفوفة باسم `items`:
     * `{ "items": [ ... ], "pagination": { "page": 1, "page_size": 25, "total": 12, "total_pages": 1 } }`
  3. **نمط الموظفين وسجل التدقيق (Staff & Audit Log):** تُرجع الترقيم مسطحاً (Flat Pagination) دون كائن `pagination` فرعي وبمصفوفة باسم `items`:
     * `{ "items": [ ... ], "page": 1, "page_size": 25, "total": 12 }`
* **ردود الإجراءات والتحديثات:**
  * `{ "ok": true }` أو `{ "ok": true, "status": "accepted", "membership_no": "..." }`
  * `{ "success": true }` (في تقديم طلب الخدمة العام `POST /api/service-requests`).

#### ب. الفروق الصريحة في ردود الحذف (Deletion Differences):
يجب على مطور الواجهة الأمامية الانتباه بدقة للاختلاف البرمجي في ردود الحذف وعدم افتراض عقد موحد:
* **حذف مقال إخباري (`DELETE /api/admin/news/articles/[id]`):**
  ```json
  {
    "ok": true,
    "id": "e2a4b890-7d12-4c2f-b4a1-000000000001"
  }
  ```
* **حذف أي عنصر من عناصر المحتوى التنظيمي (Organizational Content Deletion):**
  ```json
  {
    "deleted": true
  }
  ```

#### ج. معالجة الأخطاء (Error Responses):
تتبع استجابات الأخطاء نسقاً ثابتاً:
```json
{
  "error": "ERROR_CODE"
}
```
وقد تحتوي حقولاً إضافية في حالات معينة:
* أخطاء التحقق من المدخلات: `{ "error": "VALIDATION", "issues": { "email": ["Invalid email"] } }`
* أخطاء تقييد المعدل: `{ "error": "RATE_LIMITED", "retryAfterSeconds": 60 }`
* أخطاء الحساب المقفل: `{ "error": "ACCOUNT_LOCKED", "retryAfterSeconds": 900 }`
* أخطاء كلمة المرور الضعيفة: `{ "error": "WEAK_PASSWORD", "issues": ["..."] }`

---

### 3.6 الترقيم والفلترة (Pagination & Filtering Conventions)
1. **معاملات الترقيم (Pagination Parameters):**
   * `page`: رقم الصفحة (يبدأ من `1`، الحد الأقصى `10000`، القيمة الافتراضية `1`).
   * `page_size`: عدد العناصر في الصفحة:
     * واجهات الإدارة: الحد الافتراضي `25`، الحد الأقصى `100`.
     * واجهة الأخبار العامة (`GET /api/content/news`): الحد الافتراضي `12`، الحد الأقصى `50`.
2. **كائن الترقيم المرجع في الردود (`pagination`):**
   * **تنبيه حاسم:** الحقل الممثل للعدد الإجمالي هو دائماً `total` (وليس `total_items`):
   ```json
   {
     "page": 1,
     "page_size": 25,
     "total": 142,
     "total_pages": 6
   }
   ```
3. **قواعد الفلترة بالتواريخ:**
   * تقبل الواجهات التاريخ بصيغة يوم فقط: `YYYY-MM-DD` (تُحول تلقائياً لـ `00:00:00.000Z` في البداية و `23:59:59.999Z` في النهاية).
   * أو بصيغة ISO كاملة: `YYYY-MM-DDTHH:mm:ss.sssZ`.
   * شرط منطقي: `created_from` يجب أن يكون مساوياً أو سابقاً لـ `created_to`، وإلا يُرجع خطأ `400 VALIDATION`.
4. **تكرار معلمات الاستعلام (Query Parameters):**
   * يمنع تكرار نفس المفتاح في رابط الاستعلام (مثال: `?page=1&page=2`). تكرار أي مفتاح يتسبب فوراً في رفض الطلب بـ `400 VALIDATION`.

---

### 3.7 تقييد المعدل وسياسات التخزين المؤقت (Rate Limiting & Caching)
1. **حدود معدل الطلبات (Rate Limiting):**
   * **تسجيل دخول الموظف:** 5 محاولات لكل بريد إلكتروني، و10 محاولات لكل عنوان IP خلال نافذة 15 دقيقة. عند التجاوز يُرجع `429 RATE_LIMITED`، وعند القفل التلقائي يُرجع `423 ACCOUNT_LOCKED`.
   * **تقديم طلبات العضوية العامة:** 5 طلبات لكل IP خلال 15 دقيقة (أو 20 طلب للـ Unknown IP). عند التجاوز يُرجع `429 RATE_LIMITED`.
   * **تقديم طلبات الخدمات العامة:** 5 طلبات لكل IP خلال 15 دقيقة (أو 20 طلب للـ Unknown IP).
   * **قوائم المحافظات والكتالوجات العامة:** 60 طلباً في الدقيقة لكل IP.
   * **قائمة الأخبار العامة:** 120 طلباً في الدقيقة لكل IP.
2. **سياسات الـ Cache Headers الفعلية:**
   * **جميع مسارات الإدارة المحمية (`app/api/admin/...`):**
     * تحمل دائماً ترويسة: `Cache-Control: no-store`.
     * يجب على الواجهة الأمامية عدم تخزين أي رد محمي في الذاكرة المحلية أو الـ Browser Cache.
   * **مسارات المحتوى التنظيمي العامة (`app/api/content/...` عدا الأخبار):**
     * تحمل ترويسة: `Cache-Control: no-store` عبر دوال الاستجابة القياسية `jsonResponse`.
   * **المسارات العامة المستقرة (`GET /api/governorates`):**
     * `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` (تُرجع في كافة مسارات الاستجابة: النجاح 200، وتجاوز المعدل 429، وأخطاء الخادم 500).
   * **قوائم الكتالوجات العامة (`GET /api/ministries` و `GET /api/request-sectors`):**
     * تحمل ترويسة: `Cache-Control: no-store` (تُرجع عبر دالة `jsonResponse`).
   * **مسار الأخبار العامة (`GET /api/content/news` و `GET /api/content/news/[slug]`):**
     * `Cache-Control: public, s-maxage=120, stale-while-revalidate=300` (وفي حال الخطأ أو تقييد المعدل تُرجع `no-store`).

---

### 3.8 التعامل مع الصور والتواريخ (Images & Dates Specification)
1. **عدم وجود Media Library أو رفع ملفات مباشر (No Multipart Upload):**
   * **تنبيه حاسم:** لا يوجد في الواجهة الخلفية نظام لرفع الملفات من نوع `multipart/form-data`، ولا يوجد نظام مكتبة وسائط (Media Library).
   * جميع حقول الصور (`image_url`, `photo_url`) تستقبل نصوصاً (`string`) بصيغة روابط ويب كاملة تبدأ بـ `http://` أو `https://`، أو مسارات نسبية تبدأ بـ `/` تشير إلى مجلد الأصول الثابتة (مثل `/assets/news/sample.jpg`).
2. **تنسيقات التواريخ:**
   * تواريخ النظام الإدارية (`created_at`, `updated_at`, `occurred_at`) تُرجع دائماً بصيغة ISO 8601 القياسية (مثل `"2026-11-18T15:30:00.000Z"`).
   * تواريخ المقالات (`published_on`): بصيغة `YYYY-MM-DD` الميلادية، مع حقل `date_precision` بقيمة `"day"` أو `"month"`، مع حقل محسوب جاهز للعرض باللغة العربية `formatted_date` (مثل: `"18 نوفمبر 2026"`).

---

### 3.9 معمارية `proxy.js` في Next.js 16 (Next.js 16 Proxy Architecture)
1. **المعيار الرسمي:** في Next.js 16، تم اعتماد ملف `proxy.js` في جذر المشروع كبديل رسمي لمعمارية الـ Routing والـ Middleware السابقة (`middleware.js`).
2. **بيئة التشغيل (Node.js Runtime by Default):**
   * يعمل `proxy.js` في Next.js 16 على **بيئة تشغيل Node.js افتراضياً (Node.js runtime by default)**، وليس على Edge Runtime.
3. **التطبيق والتحقق في المستودع:**
   * الملف متواجد في المسار: `/proxy.js`.
   * يقوم بتصدير الدالة: `export function proxy(request) { ... }`.
   * يطبق الـ Matcher التالي:
     ```js
     export const config = {
       matcher: ["/admin/:path*", "/api/admin/:path*"],
     };
     ```
   * وظيفته اعتراض الطلبات الموجهة للوحة وتحكم الإدارة، والسماح بالمسارات العامة `/admin/login` و `/api/admin/auth/login`، ورفض أي طلب محمي يفتقر لكوكي `staff_session` مبكراً على مستوى البروكسي برمز الحالة `401 UNAUTHENTICATED` مع ترويسة `Cache-Control: no-store`.
4. **علاقة البروكسي بالصلاحيات (Not a replacement for Route Handler Authorization):**
   * ملف `proxy.js` يعمل كبوابة فحص سريعة لوجود كوكي الجلسة فقط، **ولا يغني إطلاقاً عن التحقق الداخلي من الصلاحيات والبيانات**.
   * كل معالج مسار في الـ Backend يقوم بشكل مستقل وصريح باستدعاء دالة `requireStaff` للتحقق من صلاحية الجلسة، ونشاط الموظف في قاعدة البيانات، وفرض قيود تغيير كلمة المرور، ومطابقة الصلاحيات التفصيلية (RBAC).

---

## 4. دورات العمل وقواعد الأعمال الرئيسية (Core Business Workflows)

### 4.1 دورة طلبات العضوية (Membership Applications Workflow)
1. **التقديم العام (`POST /api/applications`):**
   * يقدم المواطن استمارة العضوية، ويختار النوع (`member`, `volunteer`, `follower`).
   * يتم التحقق الصارم من صحة الرقم القومي المصري المكون من 14 رقماً، واستخراج تاريخ الميلاد والمحافظة والنوع منه تلقائياً ومطابقتها.
   * يتم إنشاء الطلب بحالة أولية `new` وإصدار رقم طلب مميز ومحمي `application_no`.
2. **إدارة الطلبات من لوحة التحكم:**
   * يستعرض الموظف القائمة مع إمكانية الفلترة بالاسم، الهاتف، الرقم القومي، النوع، الحالة، المحافظة، ونطاق التواريخ.
   * إسناد الطلب: يمكن إسناد الطلب لموظف معين (`PATCH .../assignment`) أو إلغاء الإسناد بتمرير `"assigned_to": null`.
   * إضافة الملاحظات: يمكن للموظفين تدوين ملاحظات داخلية متتابعة (`POST .../notes`) لا يراها مقدم الطلب.
   * تغيير الحالة (`PATCH .../status`):
     * الانتقال من `new` $ightarrow$ `under_review`.
     * القبول (`accepted`): يؤدي تلقائياً إلى توليد رقم عضوية حزبي رسمي `membership_no` وتحديث حالة الطلب.
     * الرفض (`rejected`): **يتطلب إجبارياً** إرسال حقل `rejection_reason` (من 1 إلى 1000 حرف).
3. **التصدير (`GET /api/admin/applications/export`):**
   * مقتصر حصرياً على `super_admin`. يقوم بتحميل ملف CSV فوري بالبيانات المفلترة.

---

### 4.2 دورة طلبات الخدمات (Citizen Service Requests Workflow)
1. **الاستعلام عن الكتالوجات النشطة:**
   * تستدعي الواجهة `GET /api/ministries` و `GET /api/request-sectors` للحصول على الوزارات والقطاعات النشطة فقط.
2. **تقديم الطلب (`POST /api/service-requests`):**
   * يقدم المواطن اسمه الكامل، ورقم هاتفه، ومعرف الوزارة (`ministry_id`) والقطاع (`sector_id`).
   * يتحقق السيرفر من وجود الوزارة والقطاع وأنهما في حالة نشطة (`is_active = true`).
   * يتم حفظ الطلب بنجاح وإرجاع `{ "success": true }` برمز الحالة `201`.
3. **طبيعة المعالجة في الإدارة:**
   * The `super_admin` role can view citizen service requests through `GET /api/admin/service-requests`, with the existing phone, ministry, sector, and date filters.
   * **قاعدة معمارية هامة:** لا توجد دورة تغيير حالة (Accept/Reject) لطلبات الخدمات؛ السجلات تُحفظ كطلبات واردة للمتابعة فقط.

---

### 4.3 دورة المحتوى التنظيمي (Organizational Content Workflow)
1. **الهيكل العام:** يشمل الأمانات المركزية، أمانات المحافظات، الهيئات القيادية والقادة، والوحدة البرلمانية، والنوافذ المنبثقة.
2. **التحكم في النشر:**
   * تمتلك السجلات حقل `is_published`.
   * يمكن تعديل حالة النشر في أي وقت عبر مسار `PATCH .../status` المخصص لكل قسم.
   * السجلات ذات `is_published: false` تظهر فقط في واجهات الإدارة وتختفي تماماً وتلقائياً من واجهات البوابة العامة (Public APIs).
3. **الحذف النهائي (Permanent Deletion):**
   * الحذف مقصور حصرياً على دور `super_admin`.
   * يتطلب إرسال جسم طلب صريح: `{ "confirm": true }` لمنع الحذف غير المقصود.
   * الحذف يزيل السجل نهائياً من قاعدة البيانات (Hard Delete) ويُرجع `{ "deleted": true }`.

---

### 4.4 دورة إدارة الأخبار والمقالات (News Publishing Workflow)
يمر كل مقال بدورة حياة وحالات نشر صارمة:
```text
draft  ──(submit)──>  pending_review  ──(publish)──>  published
  ^                         │
  │                         └──(request-changes)──> changes_requested
  │                                                        │
  └───────────────────(edit & submit)──────────────────────┘
```
1. **إنشاء المقال وتعديل المسودة (`draft`):**
   * ينشئه `news_editor` أو `super_admin`.
   * يكون في حالة مسودة `draft`.
   * التعديل متاح فقط في حالتي: `draft` أو `changes_requested`.
   * المحرر لا يستطيع تعديل مقال غيره؛ محاولة تعديل مقال محرر آخر تُرجع `403 FORBIDDEN`.
2. **إرسال المقال للمراجعة (`POST .../submit`):**
   * ينقل المقال من `draft` أو `changes_requested` إلى `pending_review`.
   * يصبح المقال مقفلاً أمام التعديل. محاولة تعديله أثناء وجوده في `pending_review` تُرجع خطأ `400 CANNOT_EDIT_IN_CURRENT_STATUS`.
3. **مراجعة المقال:**
   * يراجع المقال `news_reviewer` أو `super_admin`.
   * **طلب تعديلات (`POST .../request-changes`):** ينقل المقال إلى `changes_requested` مع إرفاق ملاحظة مراجعة إلزامية `review_note` توضح التعديلات المطلوبة، ليعود المقال قابلاً للتعديل من قبل محرره.
   * **النشر (`POST .../publish`):** ينقل المقال إلى `published` ويجعل `is_published = true`.
     * Reviewer self-review is prohibited for both publication and revision requests. The publish endpoint returns `403 SELF_PUBLISHING_PROHIBITED`; the request-changes endpoint returns `403 SELF_REVIEW_PROHIBITED`. `super_admin` may review and publish their own articles.
4. **إلغاء النشر (`POST .../unpublish`):**
   * Moves a published article back to `draft` and sets `is_published = false`.
   * Available only to `super_admin`.
5. **تاريخ النشر الأصلي مقابل النشر على الموقع:**
   * حقل `published_on` هو تاريخ الخبر الحقيقي (الذي حدثت فيه الواقعة أو نشر في الصحيفة الأصلية)، ويحدده المحرر.
   * حقل `published_at` هو تاريخ وقت اعتماد ونشر المقال على موقع الحزب، ويولده النظام تلقائياً.


---

## 5. التوثيق التفصيلي لواجهات الإدارة (Admin Detailed Specifications)

### المجال الأول: مصادقة المشرفين (Admin Authentication) — 4 معالجات

#### 1.1 تسجيل دخول الموظف (`POST /api/admin/auth/login`)
* **ملف المسار:** `app/api/admin/auth/login/route.js` (مستخرج من `lib/auth/handlers.js`).
* **الهدف واستخدام الواجهة الأمامية:** استيثاق بيانات الموظف (البريد الإلكتروني وكلمة المرور)، وإنشاء جلسة عمل جديدة وإرجاع كوكي `staff_session`. يُستخدم في صفحة تسجيل دخول الإدارة `/admin/login`.
* **المصادقة والصلاحيات:**
  * **نوع الوصول:** عام داخلياً (Public for Login).
  * **الجلسة:** لا تشترط جلسة سابقة.
  * **التحقق من المصدر:** يتحقق من تطابق رأس `Origin` مع نطاق الخادم؛ في حال عدم التطابق يُرجع `403 FORBIDDEN`.
* **معاملات الرابط (Parameters):** لا يوجد.
* **جسم الطلب (Request Body):**
  * نوع المحتوى: `application/json` (الحد الأقصى 10 KB).
  * الحقول:
    * `email` (string, إلزامي): بريد إلكتروني قياسي، بحد أقصى 254 حرفاً (يتم تحويله تلقائياً لأحرف صغيرة وتجريده من المسافات).
    * `password` (string, إلزامي): كلمة المرور، من 1 إلى 128 حرفاً.
  * مثال واقعي للطلب:
    ```json
    {
      "email": "admin@example.com",
      "password": "StrongPassword123"
    }
    ```
* **الرد الناجح (Successful Response):**
  * **رمز الحالة:** `200 OK`.
  * **الترويسات:** `Set-Cookie: staff_session=...; HttpOnly; SameSite=lax; Path=/; Max-Age=28800`, `Cache-Control: no-store`.
  * **جسم الرد:**
    ```json
    {
      "mustChangePassword": false
    }
    ```
* **الأخطاء المحتملة (Errors):**
  * `400 Bad Request`: `{ "error": "VALIDATION" }` (عند فشل التحقق من صحة البريد أو كلمة المرور).
  * `401 Unauthorized`: `{ "error": "INVALID_CREDENTIALS" }` (بيانات الدخول غير صحيحة أو الحساب غير مفعل).
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }` (فشل التحقق من الـ Origin).
  * `413 Payload Too Large`: `{ "error": "PAYLOAD_TOO_LARGE" }` (تجاوز حجم الطلب 10 KB).
  * `415 Unsupported Media Type`: `{ "error": "UNSUPPORTED_MEDIA_TYPE" }` (غياب ترويسة application/json).
  * `423 Locked`: `{ "error": "ACCOUNT_LOCKED", "retryAfterSeconds": 900 }` (قفل الحساب مؤقتاً لتكرار المحاولات الفاشلة).
  * `429 Too Many Requests`: `{ "error": "RATE_LIMITED", "retryAfterSeconds": 300 }` (تجاوز حد معدل المحاولات للـ IP أو البريد).
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }`.
* **قواعد الأعمال:**
  * إذا كان `mustChangePassword: true`، يجب توجيه الموظف فوراً لشاشة تغيير كلمة المرور الإلزامية.

---

#### 1.2 تسجيل خروج الموظف (`POST /api/admin/auth/logout`)
* **ملف المسار:** `app/api/admin/auth/logout/route.js`.
* **الهدف واستخدام الواجهة الأمامية:** إنهاء جلسة الموظف وحذف كوكي الجلسة من المتصفح. يُستدعى عند الضغط على زر "تسجيل الخروج".
* **المصادقة والصلاحيات:**
  * **نوع الوصول:** محمي (Protected).
  * **التحقق من المصدر:** يتحقق من تطابق `Origin`.
* **معاملات الرابط:** لا يوجد.
* **جسم الطلب:** فارغ أو لا يوجد.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **الترويسات:** `Set-Cookie: staff_session=; Max-Age=0; Path=/...`.
  * **جسم الرد:**
    ```json
    {
      "ok": true
    }
    ```
* **الأخطاء المحتملة:**
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }` (فشل تطابق الـ Origin).
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }`.

---

#### 1.3 بيانات الموظف الحالي (`GET /api/admin/auth/me`)
* **ملف المسار:** `app/api/admin/auth/me/route.js`.
* **الهدف واستخدام الواجهة الأمامية:** استرجاع الملف الشخصي وصلاحيات الموظف صاحب الجلسة الحالية لتحديد واجهة المستخدم والقوائم المناسبة لدوره.
* **المصادقة والصلاحيات:**
  * **نوع الوصول:** محمي (Protected).
  * **الجلسة:** تتطلب كوكي `staff_session` ساري المفعول وحساب نشط (`is_active = true`).
  * **استثناء خاص:** هذا المسار يعمل حتى لو كان `must_change_password: true` للسماح بعرض اسم الموظف أثناء شاشة التغيير الإجباري.
* **معاملات الرابط:** لا يوجد.
* **جسم الطلب:** لا يوجد.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "fullName": "أحمد محمود",
      "email": "a.mahmoud@party.eg",
      "role": "super_admin",
      "mustChangePassword": false
    }
    ```
* **الأخطاء المحتملة:**
  * `401 Unauthorized`: `{ "error": "UNAUTHENTICATED" }` (غياب أو عدم صلاحية الكوكي أو تعطيل الحساب).
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }`.

---

#### 1.4 تغيير كلمة المرور (`POST /api/admin/auth/change-password`)
* **ملف المسار:** `app/api/admin/auth/change-password/route.js`.
* **الهدف واستخدام الواجهة الأمامية:** تغيير الموظف لكلمة مروره الحالية (سواء اختيارياً أو إجبارياً بعد أول دخول).
* **المصادقة والصلاحيات:**
  * **نوع الوصول:** محمي (Protected).
  * **استثناء خاص:** مسموح به في حالة `must_change_password: true`.
  * **التحقق من المصدر:** إلزامي عبر `Origin`.
* **جسم الطلب:**
  * الحقول:
    * `currentPassword` (string, إلزامي): كلمة المرور الحالية (1-128 حرفاً).
    * `newPassword` (string, إلزامي): كلمة المرور الجديدة (10-128 حرفاً، تحتوي حرفاً ورقماً).
  * مثال واقعي للطلب:
    ```json
    {
      "currentPassword": "OldPassword123",
      "newPassword": "NewStrongPass2026"
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "ok": true
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`:
    * `{ "error": "VALIDATION" }` (صيغة غير مطابقة).
    * `{ "error": "INVALID_CURRENT_PASSWORD" }` (كلمة المرور الحالية غير صحيحة).
    * `{ "error": "PASSWORD_NOT_CHANGED" }` (كلمة المرور الجديدة مطابقة للقديمة).
    * `{ "error": "WEAK_PASSWORD", "issues": ["كلمة المرور يجب أن تحتوي على رقم."] }` (ضعف كلمة المرور الجديدة).
  * `401 Unauthorized`: `{ "error": "UNAUTHENTICATED" }`.
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }`.
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }`.

---

### المجال الثاني: إدارة الموظفين وسجل التدقيق (Staff Management & Audit Log) — 7 معالجات

> **ملاحظة الصلاحيات:** جميع معالجات هذا المجال مقتصرة حصرياً على دور `super_admin` الذي يحمل صلاحية `staff:manage`. محاولة استدعائها من أي دور آخر تُقابل بـ `403 FORBIDDEN`.

#### 2.1 عرض قائمة الموظفين (`GET /api/admin/staff`)
* **ملف المسار:** `app/api/admin/staff/route.js`.
* **الهدف:** جلب قائمة حسابات موظفي النظام مع الترقيم.
* **المعاملات (Query Parameters):**
  * `page` (number, اختياري): رقم الصفحة، الافتراضي `1`.
  * `page_size` (number, اختياري): حجم الصفحة (1-100)، الافتراضي `25`.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد (مصفوفة مسطحة باسم items مع ترقيم مسطح):**
    ```json
    {
      "items": [
        {
          "id": "c1f7a834-56b9-4f7d-bc23-112233445566",
          "full_name": "سارة إبراهيم",
          "email": "s.ibrahim@party.eg",
          "role": "super_admin",
          "is_active": true,
          "must_change_password": false,
          "created_at": "2026-11-10T12:00:00.000Z",
          "updated_at": "2026-11-10T12:00:00.000Z"
        }
      ],
      "page": 1,
      "page_size": 25,
      "total": 12
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "VALIDATION" }`.
  * `401 Unauthorized`: `{ "error": "UNAUTHENTICATED" }`.
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }`.

---

#### 2.2 إنشاء حساب موظف جديد (`POST /api/admin/staff`)
* **ملف المسار:** `app/api/admin/staff/route.js`.
* **الهدف:** إنشاء حساب موظف جديد وتعيين دوره وكلمة مرور مؤقتة له مع تسجيل العملية في سجل التدقيق.
* **جسم الطلب (Request Body):**
  * `full_name` (string, إلزامي): من 1 إلى 200 حرف.
  * `email` (string, إلزامي): بريد إلكتروني فريد، بحد أقصى 254 حرفاً.
  * `role` (string, required): one of `super_admin`, `news_editor`, `news_reviewer`.
  * `temporary_password` (string, إلزامي): كلمة مرور مؤقتة تحقق معايير القوة (10 أحرف على الأقل، حرف ورقم).
  * مثال واقعي للطلب:
    ```json
    {
      "full_name": "محمد علي القاضي",
      "email": "m.elkadi@party.eg",
      "role": "super_admin",
      "temporary_password": "TempPassword2026"
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:**
    ```json
    {
      "staff": {
        "id": "d2f8a945-67c0-4e8e-cd34-223344556677",
        "full_name": "محمد علي القاضي",
        "email": "m.elkadi@party.eg",
        "role": "super_admin",
        "is_active": true,
        "must_change_password": true,
        "created_at": "2026-11-18T16:00:00.000Z",
        "updated_at": "2026-11-18T16:00:00.000Z"
      }
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "VALIDATION" }`.
  * `409 Conflict`: `{ "error": "EMAIL_ALREADY_EXISTS" }` (البريد مسجل مسبقاً).

---

#### 2.3 جلب بيانات موظف (`GET /api/admin/staff/[id]`)
* **ملف المسار:** `app/api/admin/staff/[id]/route.js`.
* **المعاملات (Path Parameters):** `id` (UUID, إلزامي).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "staff": { ...بيانات الموظف } }`.
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 2.4 تحديث بيانات موظف (`PATCH /api/admin/staff/[id]`)
* **ملف المسار:** `app/api/admin/staff/[id]/route.js`.
* **الهدف:** تعديل الاسم، البريد، أو الدور الوظيفي للموظف.
* **المعاملات (Path Parameters):** `id` (UUID, إلزامي).
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من الحقول التالية:
  * `full_name` (string, اختياري): 1-200 حرف.
  * `email` (string, اختياري): بريد إلكتروني فريد.
  * `role` (string, اختياري): دور وظيفي صالح.
  * مثال:
    ```json
    {
      "role": "news_reviewer"
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "staff": { ...البيانات المحدثة } }`.
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.
  * `409 Conflict`:
    * `{ "error": "EMAIL_ALREADY_EXISTS" }`.
    * `{ "error": "LAST_ACTIVE_SUPER_ADMIN" }` (حظر تغيير دور آخر مدير نظام نشط).

---

#### 2.5 تعديل حالة نشاط الموظف (`PATCH /api/admin/staff/[id]/status`)
* **ملف المسار:** `app/api/admin/staff/[id]/status/route.js`.
* **الهدف:** تفعيل أو تعطيل حساب موظف.
* **المعاملات:** `id` (UUID, إلزامي).
* **جسم الطلب:**
  ```json
  {
    "is_active": false
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "staff": { ...البيانات مع is_active المحدثة } }`.
* **الأخطاء المحتملة:**
  * `409 Conflict`: `{ "error": "LAST_ACTIVE_SUPER_ADMIN" }` (يحظر تعطيل آخر مدير نشط).

---

#### 2.6 إعادة تعيين كلمة مرور موظف (`POST /api/admin/staff/[id]/reset-password`)
* **ملف المسار:** `app/api/admin/staff/[id]/reset-password/route.js`.
* **الهدف:** تعيين كلمة مرور مؤقتة جديدة للموظف وإجباره على تغييرها عند الدخول القادم.
* **جسم الطلب:**
  ```json
  {
    "temporary_password": "NewTempPass2026"
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "staff": {
        "id": "c1f7a834-56b9-4f7d-bc23-112233445566",
        "full_name": "سارة إبراهيم",
        "email": "s.ibrahim@party.eg",
        "role": "super_admin",
        "is_active": true,
        "must_change_password": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-18T16:15:00.000Z"
      }
    }
    ```

---

#### 2.7 سجل تدقيق إجراءات الموظفين (`GET /api/admin/staff/audit-log`)
* **ملف المسار:** `app/api/admin/staff/audit-log/route.js`.
* **الهدف:** تتبع جميع العمليات الإدارية التي طرأت على حسابات الموظفين ومن قام بها.
* **المعاملات (Query Parameters):**
  * `page` (number, اختياري): الافتراضي `1`.
  * `page_size` (number, اختياري): الافتراضي `25`.
  * `target_id` (string, اختياري): معرف الموظف المستهدف بالإجراء.
  * `actor_id` (UUID, اختياري): معرف الموظف المنفذ للإجراء.
* **القيم الفعلية لنوع الإجراء (`action_type`):**
  * إجراءات الموظفين: `staff_created`, `staff_profile_updated`, `staff_role_changed`, `staff_activated`, `staff_deactivated`, `staff_password_reset`.
  * إجراءات المحتوى: `content_created`, `content_updated`, `content_published`, `content_unpublished`, `content_deleted`.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد (مصفوفة مسطحة باسم items مع ترقيم مسطح):**
    ```json
    {
      "items": [
        {
          "id": "105",
          "actor_id": "a1b2c3d4-0000-0000-0000-000000000001",
          "actor_name": "المدير العام",
          "actor_email": "superadmin@party.eg",
          "target_id": "c1f7a834-56b9-4f7d-bc23-112233445566",
          "target_name": "سارة إبراهيم",
          "target_email": "s.ibrahim@party.eg",
          "action_type": "staff_deactivated",
          "details": {
            "is_active": false
          },
          "occurred_at": "2026-11-18T16:10:00.000Z"
        }
      ],
      "page": 1,
      "page_size": 25,
      "total": 105
    }
    ```

---

### المجال الثالث: إدارة طلبات الانضمام (Admin Membership Applications) — 6 معالجات

> Permission note: all application handlers, including read, update, assignment, notes, and export, are available to `super_admin`.

#### 3.1 قائمة طلبات الانضمام (`GET /api/admin/applications`)
* **ملف المسار:** `app/api/admin/applications/route.js`.
* **الهدف:** استعراض طلبات الانضمام وتصفيتها بالمعايير المختلفة.
* **المعاملات (Query Parameters):**
  * `page` (number, default: 1, max: 10000).
  * `page_size` (number, default: 25, max: 100).
  * `name` (string, 1-120 chars, اختياري).
  * `phone` (string, حتى 11 رقماً، اختياري - يتم توحيد الأرقام تلقائياً).
  * `national_id` (string, 14 رقماً، اختياري).
  * `application_no` (string/bigint, اختياري).
  * `application_type` (enum: `member`, `volunteer`, `follower`, اختياري).
  * `status` (enum: `new`, `under_review`, `accepted`, `rejected`, اختياري).
  * `governorate_id` (number, اختياري).
  * `assigned_to` (UUID, اختياري).
  * `created_from` (date string: YYYY-MM-DD أو ISO).
  * `created_to` (date string: YYYY-MM-DD أو ISO).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "applications": [
        {
          "id": "f3b9c056-78d1-4f9f-de45-334455667788",
          "application_no": "100234",
          "type": "member",
          "full_name": "محمود أحمد حسن السيد",
          "phone": "01012345678",
          "national_id": "29001010101234",
          "governorate_id": 1,
          "status": "new",
          "assigned_to": null,
          "created_at": "2026-11-18T10:00:00.000Z",
          "governorates": {
            "name_ar": "القاهرة"
          }
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 25,
        "total": 1,
        "total_pages": 1
      }
    }
    ```

---

#### 3.2 تفاصيل طلب انضمام (`GET /api/admin/applications/[id]`)
* **ملف المسار:** `app/api/admin/applications/[id]/route.js`.
* **الهدف:** جلب الملف الكامل للطلب متضمناً سجل الحركات السابقة والملاحظات الداخلية.
* **المعاملات (Path Parameters):** `id` (UUID, إلزامي).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "application": {
        "id": "f3b9c056-78d1-4f9f-de45-334455667788",
        "application_no": "100234",
        "membership_no": null,
        "type": "member",
        "full_name": "محمود أحمد حسن السيد",
        "phone": "01012345678",
        "national_id": "29001010101234",
        "governorate_id": 1,
        "status": "new",
        "assigned_to": null,
        "rejection_reason": null,
        "created_at": "2026-11-18T10:00:00.000Z",
        "governorates": {
          "id": 1,
          "name_ar": "القاهرة"
        },
        "assigned_staff": null,
        "status_history": [
          {
            "id": 1,
            "old_status": null,
            "new_status": "new",
            "changed_by": null,
            "created_at": "2026-11-18T10:00:00.000Z"
          }
        ],
        "notes": []
      }
    }
    ```
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 3.3 تحديث حالة طلب الانضمام (`PATCH /api/admin/applications/[id]/status`)
* **ملف المسار:** `app/api/admin/applications/[id]/status/route.js`.
* **الهدف:** تغيير حالة الطلب وتسجيل الحركة في تاريخ الحالات وتوليد رقم العضوية في حال القبول.
* **المعاملات:** `id` (UUID, إلزامي).
* **جسم الطلب (Request Body):**
  * إذا كانت الحالة `under_review` أو `accepted`:
    ```json
    {
      "status": "accepted"
    }
    ```
  * إذا كانت الحالة `rejected` (حقل `rejection_reason` إلزامي من 1 إلى 1000 حرف):
    ```json
    {
      "status": "rejected",
      "rejection_reason": "عدم استيفاء شروط السن القانونية"
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "ok": true,
      "status": "accepted",
      "membership_no": "MEM-2026-00421"
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "INVALID_TRANSITION" }` (محاولة انتقال غير صالحة أو غياب سبب الرفض).
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.
  * `409 Conflict`: `{ "error": "CONFLICT" }`.

---

#### 3.4 إضافة ملاحظة داخلية (`POST /api/admin/applications/[id]/notes`)
* **ملف المسار:** `app/api/admin/applications/[id]/notes/route.js`.
* **الهدف:** تدوين تعليق أو ملاحظة إدارية داخلية خاصة بفريق العمل حول الطلب.
* **المعاملات:** `id` (UUID, إلزامي).
* **جسم الطلب:**
  ```json
  {
    "note": "تم التواصل هاتفياً مع مقدم الطلب وتأكيد رغبته في الانضمام للجنة الشباب"
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "ok": true
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "VALIDATION" }`.
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 3.5 إسناد طلب الانضمام لموظف (`PATCH /api/admin/applications/[id]/assignment`)
* **ملف المسار:** `app/api/admin/applications/[id]/assignment/route.js`.
* **الهدف:** إسناد مهمة متابعة الطلب لموظف معين أو فك الإسناد.
* **المعاملات:** `id` (UUID, إلزامي).
* **جسم الطلب:**
  * للإسناد: `{ "assigned_to": "uuid-of-staff-member" }`
  * لفك الإسناد: `{ "assigned_to": null }`
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "ok": true,
      "assigned_to": "uuid-of-staff-member"
    }
    ```
* **الأخطاء المحتملة:**
  * `403 Forbidden`: `{ "error": "INVALID_ASSIGNEE" }` (الموظف المسند إليه غير نشط أو لا يملك صلاحية).
  * `404 Not Found`: `{ "error": "ASSIGNEE_NOT_FOUND" }` أو `{ "error": "NOT_FOUND" }`.

---

#### 3.6 تصدير طلبات الانضمام بصيغة CSV (`GET /api/admin/applications/export`)
* **ملف المسار:** `app/api/admin/applications/export/route.js`.
* **الهدف:** تنزيل ملف CSV يحتوي بيانات طلبات الانضمام المفلترة.
* **الصلاحية المطلوبة:** مقتصر حصرياً على `super_admin` (`applications:export`).
* **المعاملات (Query Parameters):** نفس معاملات الفلترة في مسار القائمة (`name`, `phone`, `national_id`, `status`, `governorate_id`, `created_from`, `created_to`). (لا يقبل `page` أو `page_size`).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **الترويسات:**
    * `Content-Type: text/csv; charset=utf-8`
    * `Content-Disposition: attachment; filename="applications-2026-11-18.csv"`
    * `Cache-Control: no-store, private, max-age=0`
* **الأخطاء المحتملة:**
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }` (إذا لم يكن super_admin).
  * `413 Payload Too Large`:
    * `{ "error": "EXPORT_LIMIT_EXCEEDED" }` (تجاوز الحد الأقصى لعدد الصفوف 50,000 صف).
    * `{ "error": "EXPORT_SIZE_LIMIT_EXCEEDED" }` (تجاوز حجم الملف 15 ميجابايت).


### المجال الرابع: الكتالوجات وطلبات الخدمات (Admin Services & Catalogs) — 12 معالجاً

> Permission note: service request and catalog handlers require `services:manage`, which is granted to `super_admin`.

#### 4.1 قائمة الوزارات (`GET /api/admin/ministries`)
* **ملف المسار:** `app/api/admin/ministries/route.js`.
* **الهدف:** استعراض قائمة الوزارات الحكومية المتاحة في الكتالوج مع الترقيم.
* **المعاملات (Query Parameters):**
  * `page` (number, default: 1, max: 10000).
  * `page_size` (number, default: 25, max: 100).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "ministries": [
        {
          "id": 1,
          "name_ar": "وزارة الصحة والسكان",
          "slug": "health",
          "sort_order": 1,
          "is_active": true,
          "created_at": "2026-11-10T10:00:00.000Z",
          "updated_at": "2026-11-10T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 25,
        "total": 1,
        "total_pages": 1
      }
    }
    ```

---

#### 4.2 إنشاء وزارة جديدة (`POST /api/admin/ministries`)
* **ملف المسار:** `app/api/admin/ministries/route.js`.
* **الهدف:** إضافة وزارة جديدة إلى كتالوج الخدمات.
* **جسم الطلب (Request Body):**
  * `name_ar` (string, إلزامي): اسم الوزارة بالعربية (1-200 حرف).
  * `slug` (string, إلزامي): معرف فريد بالحروف اللاتينية والأرقام والشرطات (1-120 حرفاً، صيغة: `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
  * `sort_order` (number, اختياري): ترتيب العرض (-32,768 إلى 32,767).
  * `is_active` (boolean, اختياري): الافتراضي `true`.
  * مثال:
    ```json
    {
      "name_ar": "وزارة التربية والتعليم والتعليم الفني",
      "slug": "education",
      "sort_order": 2,
      "is_active": true
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:** `{ "ministry": { ...بيانات الوزارة المنشأة } }`.
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "VALIDATION" }`.
  * `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }` (الـ Slug مستخدم مسبقاً).

---

#### 4.3 جلب وزارة محددة (`GET /api/admin/ministries/[id]`)
* **ملف المسار:** `app/api/admin/ministries/[id]/route.js`.
* **المعاملات (Path Parameters):** `id` (smallint, 1-32,767).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "ministry": { ...بيانات الوزارة } }`.
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 4.4 تحديث بيانات وزارة (`PATCH /api/admin/ministries/[id]`)
* **ملف المسار:** `app/api/admin/ministries/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من: `name_ar`, `slug`, `sort_order`, `is_active`.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "ministry": { ...البيانات المحدثة } }`.
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.
  * `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

---

#### 4.5 تعديل حالة نشاط وزارة (`PATCH /api/admin/ministries/[id]/status`)
* **ملف المسار:** `app/api/admin/ministries/[id]/status/route.js`.
* **الهدف:** تفعيل أو تعطيل ظهور الوزارة في نموذج التقديم العام.
* **جسم الطلب:**
  ```json
  {
    "is_active": false
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "ministry": { ...بيانات الوزارة مع is_active المحدثة } }`.

---

#### 4.6 قائمة القطاعات الخدمية (`GET /api/admin/request-sectors`)
* **ملف المسار:** `app/api/admin/request-sectors/route.js`.
* **الهدف:** استعراض قطاعات الطلبات الخدمية المتاحة.
* **المعاملات (Query Parameters):** `page` (number, default: 1), `page_size` (number, default: 25).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "request_sectors": [
        {
          "id": 1,
          "name_ar": "العلاج على نفقة الدولة",
          "code": "state-funded-treatment",
          "sort_order": 1,
          "is_active": true,
          "created_at": "2026-11-10T10:00:00.000Z",
          "updated_at": "2026-11-10T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 25,
        "total": 1,
        "total_pages": 1
      }
    }
    ```

---

#### 4.7 إنشاء قطاع خدمي جديد (`POST /api/admin/request-sectors`)
* **ملف المسار:** `app/api/admin/request-sectors/route.js`.
* **جسم الطلب (Request Body):**
  * `name_ar` (string, إلزامي): 1-200 حرف.
  * `code` (string, إلزامي): كود فريد بصيغة slug (1-120 حرفاً).
  * `sort_order` (number, اختياري).
  * `is_active` (boolean, اختياري).
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:** `{ "request_sector": { ...بيانات القطاع المنشأ } }`.
* **الأخطاء المحتملة:**
  * `409 Conflict`: `{ "error": "DUPLICATE_CODE" }`.

---

#### 4.8 جلب قطاع خدمي محدد (`GET /api/admin/request-sectors/[id]`)
* **ملف المسار:** `app/api/admin/request-sectors/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "request_sector": { ...بيانات القطاع } }`.

---

#### 4.9 تحديث قطاع خدمي (`PATCH /api/admin/request-sectors/[id]`)
* **ملف المسار:** `app/api/admin/request-sectors/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من: `name_ar`, `code`, `sort_order`, `is_active`.
* **الرد الناجح:** `{ "request_sector": { ...البيانات المحدثة } }`.
* **الأخطاء المحتملة:**
  * `409 Conflict`: `{ "error": "DUPLICATE_CODE" }`.

---

#### 4.10 تعديل حالة نشاط قطاع خدمي (`PATCH /api/admin/request-sectors/[id]/status`)
* **ملف المسار:** `app/api/admin/request-sectors/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_active": true | false }`.
* **الرد الناجح:** `{ "request_sector": { ...البيانات المحدثة } }`.

---

#### 4.11 قائمة طلبات خدمات المواطنين (`GET /api/admin/service-requests`)
* **ملف المسار:** `app/api/admin/service-requests/route.js`.
* **الهدف:** عرض طلبات الخدمات المقدمة من المواطنين مع إمكانية البحث والفلترة.
* **المعاملات (Query Parameters):**
  * `page` (number, default: 1).
  * `page_size` (number, default: 25, max: 100).
  * `phone` (string, اختياري: حتى 11 رقماً).
  * `national_id` (string, اختياري: 14 رقماً).
  * `ministry_id` (number, اختياري).
  * `sector_id` (number, اختياري).
  * `created_from` (date string: YYYY-MM-DD أو ISO).
  * `created_to` (date string: YYYY-MM-DD أو ISO).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "service_requests": [
        {
          "id": "b1a2c3d4-e5f6-7a8b-9c0d-112233445566",
          "full_name": "إبراهيم حسن مصطفى",
          "phone": "01234567890",
          "ministry_id": 1,
          "sector_id": 1,
          "created_at": "2026-11-18T14:30:00.000Z",
          "ministry": {
            "id": 1,
            "name_ar": "وزارة الصحة والسكان"
          },
          "sector": {
            "id": 1,
            "name_ar": "العلاج على نفقة الدولة"
          }
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 25,
        "total": 1,
        "total_pages": 1
      }
    }
    ```

---

#### 4.12 تفاصيل طلب خدمة مواطن (`GET /api/admin/service-requests/[id]`)
* **ملف المسار:** `app/api/admin/service-requests/[id]/route.js`.
* **المعاملات:** `id` (UUID, إلزامي).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "service_request": {
        "id": "b1a2c3d4-e5f6-7a8b-9c0d-112233445566",
        "full_name": "إبراهيم حسن مصطفى",
        "phone": "01234567890",
        "ministry_id": 1,
        "sector_id": 1,
        "created_at": "2026-11-18T14:30:00.000Z",
        "ministry": {
          "id": 1,
          "name_ar": "وزارة الصحة والسكان"
        },
        "sector": {
          "id": 1,
          "name_ar": "العلاج على نفقة الدولة"
        }
      }
    }
    ```
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

### المجال الخامس: إدارة الأخبار والمصادر (Admin News & Sources) — 14 معالجاً

> **ملاحظة الصلاحيات:** 
> * إدارة مصادر الأخبار (`sources`): مقتصرة حصرياً على `super_admin`.
> * حذف المقالات نهائياً (`DELETE articles`): مقتصر حصرياً على `super_admin` (`records:delete`).
> * إنشاء وتعديل وإرسال المقالات للمراجعة: متاح لـ `news_editor` و `super_admin`.
> * Review, request revisions, and publish: `news_reviewer` and `super_admin`; unpublishing: `super_admin` only.
> * Article visibility: `super_admin` and `news_reviewer` see all articles; `news_editor` sees their own.

#### 5.1 قائمة مقالات الأخبار (`GET /api/admin/news/articles`)
* **ملف المسار:** `app/api/admin/news/articles/route.js`.
* **المعاملات (Query Parameters):**
  * `page` (number, default: 1).
  * `page_size` (number, default: 25, max: 100).
  * `status` (enum: `draft`, `pending_review`, `changes_requested`, `published`).
  * `source_id` (number, اختياري).
  * `is_featured` (boolean, اختياري: `true` أو `false`).
  * `is_published` (boolean, اختياري).
  * `search` (string, حتى 100 حرف, اختياري: بحث في العنوان والنص).
  * `author_id` (UUID, اختياري: متاح لـ super_admin و reviewer فقط).
  * `sort_by` (enum: `created_at`, `published_on`, `sort_order`, `title`, default: `created_at`).
  * `sort_dir` (enum: `asc`, `desc`, default: `desc`).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "articles": [
        {
          "id": "e2a4b890-7d12-4c2f-b4a1-000000000001",
          "slug": "party-announces-new-initiative-2026",
          "title": "حزب الجبهة الوطنية يطلق مبادرة جديدة لدعم الشباب",
          "status": "published",
          "is_published": true,
          "is_featured": true,
          "published_on": "2026-11-18",
          "date_precision": "day",
          "formatted_date": "18 نوفمبر 2026",
          "author_id": "c1f7a834-56b9-4f7d-bc23-112233445566",
          "author_name": "سارة إبراهيم",
          "source": {
            "id": 1,
            "name_ar": "بوابة الأهرام",
            "slug": "ahram"
          },
          "created_at": "2026-11-18T12:00:00.000Z",
          "updated_at": "2026-11-18T13:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 25,
        "total": 1,
        "total_pages": 1
      }
    }
    ```

---

#### 5.2 إنشاء مقال جديد (`POST /api/admin/news/articles`)
* **ملف المسار:** `app/api/admin/news/articles/route.js`.
* **الحد الأقصى لحجم الطلب:** **256 كيلوبايت (256 KB)**.
* **الأدوار المسموحة:** `super_admin`, `news_editor`.
* **جسم الطلب (Request Body):**
  * `title` (string, إلزامي): عنوان المقال (1-300 حرف).
  * `body` (string, إلزامي): نص المقال (1-50,000 حرف).
  * `source_id` (number, إلزامي): معرف مصدر الخبر (1-32,767) ويجب أن يكون نشطاً.
  * `source_url` (string, اختياري): رابط المقال على المصدر الخارجي (يبدأ بـ http/https).
  * `image_url` (string, اختياري): رابط صورة الغلاف (http/https أو مسار نسبي).
  * `image_alt` (string, اختياري): النص البديل للصورة (حتى 200 حرف).
  * `published_on` (string, إلزامي): تاريخ الخبر بصيغة YYYY-MM-DD الميلادية.
  * `date_precision` (enum: `"day"` أو `"month"`, default: `"day"`).
  * `is_featured` (boolean, اختياري, default: `false`).
  * `sort_order` (number, اختياري).
  * `slug` (string, اختياري): إن لم يرسل يتم توليده تلقائياً من العنوان العربي.
  * مثال:
    ```json
    {
      "title": "افتتاح المقر الجديد لأمانة الجيزة",
      "body": "افتتح قيادات حزب الجبهة الوطنية اليوم المقر الجديد...",
      "source_id": 1,
      "source_url": "https://example.com/news/123",
      "image_url": "/assets/news/giza-hq.jpg",
      "image_alt": "صورة افتتاح مقر الجيزة",
      "published_on": "2026-11-18",
      "is_featured": false
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:** `{ "article": { ...بيانات المقال المنشأ بحالة draft } }`.
* **الأخطاء المحتملة:**
  * `400 Bad Request`:
    * `{ "error": "VALIDATION" }`.
    * `{ "error": "INVALID_REFERENCE" }` (معرف المصدر غير موجود).
    * `{ "error": "SOURCE_INACTIVE" }` (مصدر الأخبار معطل).
  * `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.
  * `413 Payload Too Large`: `{ "error": "PAYLOAD_TOO_LARGE" }` (إذا تجاوز 256 KB).

---

#### 5.3 جلب مقال محدد (`GET /api/admin/news/articles/[id]`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/route.js`.
* **المعاملات:** `id` (UUID, إلزامي).
* **قاعدة الصلاحية:** `news_editor` يستطيع فقط جلب المقالات التي أنشأها هو؛ محاولة جلب مقال محرر آخر تُرجع `403 FORBIDDEN`.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "article": { ...البيانات الكاملة للمقال بما فيها review_note ومصفوفة paragraphs } }`.
* **الأخطاء المحتملة:**
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }`.
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 5.4 تعديل مقال (`PATCH /api/admin/news/articles/[id]`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/route.js`.
* **الحد الأقصى لحجم الطلب:** **256 كيلوبايت (256 KB)**.
* **الأدوار المسموحة:** `super_admin`, `news_editor` (الخاص به فقط).
* **قاعدة حالة التعديل:** التعديل مسموح فقط إذا كان المقال في حالة `draft` أو `changes_requested`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من حقول المقال القابلة للتعديل.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "article": { ...بيانات المقال بعد التعديل } }`.
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "CANNOT_EDIT_IN_CURRENT_STATUS" }` (إذا كان المقال قيد المراجعة أو منشوراً).
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }` (إذا حاول محرر تعديل مقال غيره).
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 5.5 حذف مقال نهائياً (`DELETE /api/admin/news/articles/[id]`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/route.js`.
* **الأدوار المسموحة:** مقتصر حصرياً على `super_admin` (`records:delete`).
* **المعاملات:** `id` (UUID, إلزامي).
* **جسم الطلب (Request Body):**
  ```json
  {
    "confirm": true
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "ok": true,
      "id": "e2a4b890-7d12-4c2f-b4a1-000000000001"
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "VALIDATION" }` (غياب تأكيد confirm).
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }` (أي دور غير super_admin).
  * `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 5.6 إرسال المقال للمراجعة (`POST /api/admin/news/articles/[id]/submit`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/submit/route.js`.
* **الهدف:** نقل المقال من `draft` أو `changes_requested` إلى `pending_review`.
* **الأدوار المسموحة:** `super_admin`, `news_editor` (الخاص به فقط).
* **جسم الطلب:** فارغ أو لا يوجد.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "article": { ...البيانات مع status: "pending_review" } }`.
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "INVALID_STATUS_TRANSITION" }`.
  * `403 Forbidden`: `{ "error": "FORBIDDEN" }`.

---

#### 5.7 طلب تعديلات على المقال (`POST /api/admin/news/articles/[id]/request-changes`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/request-changes/route.js`.
* **الهدف:** إرجاع المقال من `pending_review` إلى `changes_requested` مع إبداء ملاحظات المراجعة.
* **الأدوار المسموحة:** `super_admin`, `news_reviewer`.
* **حد الحجم:** 10 كيلوبايت.
* **جسم الطلب:**
  ```json
  {
    "review_note": "يرجى تدقيق الفقرة الثالثة وإرفاق رابط المصدر الرسمي للتصريح."
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "article": { ...البيانات مع status: "changes_requested" و review_note } }`.
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "REVIEW_NOTE_REQUIRED" }` or `{ "error": "INVALID_STATUS_TRANSITION" }`.
  * `403 Forbidden`: `{ "error": "SELF_REVIEW_PROHIBITED" }` when a Reviewer attempts to review their own article.

---

#### 5.8 نشر المقال (`POST /api/admin/news/articles/[id]/publish`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/publish/route.js`.
* **الهدف:** اعتماد المقال ونشره ليصبح متاحاً للجمهور على الموقع الخارجي.
* **الأدوار المسموحة:** `super_admin`, `news_reviewer`.
* **قاعدة حظر النشر الذاتي (Self-Publishing Prohibition):**
  * إذا كان الموظف المسجل يحمل دور `news_reviewer` وهو نفسه كاتب المقال (`author_id === staff.id`)، يتم حظر العملية برمز:
    `403 Forbidden` مع الجسم: `{ "error": "SELF_PUBLISHING_PROHIBITED" }`.
  * فقط مراجع آخر أو `super_admin` يمكنه نشر هذا المقال.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "article": { ...البيانات مع status: "published" و is_published: true } }`.

---

#### 5.9 إلغاء نشر المقال (`POST /api/admin/news/articles/[id]/unpublish`)
* **ملف المسار:** `app/api/admin/news/articles/[id]/unpublish/route.js`.
* **الهدف:** سحب مقال منشور وإعادته إلى حالة `draft` وإخفائه فوراً من الموقع العام.
* **Allowed roles:** `super_admin` only.
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:** `{ "article": { ...البيانات مع status: "draft" و is_published: false } }`.

---

#### 5.10 قائمة مصادر الأخبار (`GET /api/admin/news/sources`)
* **ملف المسار:** `app/api/admin/news/sources/route.js`.
* **الأدوار المسموحة:** `super_admin` فقط.
* **المعاملات:** `page` (default: 1), `page_size` (default: 25), `is_active` (boolean, اختياري).
* **الرد الناجح:**
  * **رمز الحالة:** `200 OK`.
  * **جسم الرد:**
    ```json
    {
      "sources": [
        {
          "id": 1,
          "name_ar": "بوابة الأهرام",
          "slug": "ahram",
          "sort_order": 1,
          "is_active": true,
          "created_at": "2026-11-10T10:00:00.000Z",
          "updated_at": "2026-11-10T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 25,
        "total": 1,
        "total_pages": 1
      }
    }
    ```

---

#### 5.11 إنشاء مصدر أخبار (`POST /api/admin/news/sources`)
* **ملف المسار:** `app/api/admin/news/sources/route.js`.
* **الأدوار المسموحة:** `super_admin` فقط.
* **جسم الطلب:**
  ```json
  {
    "name_ar": "وكالة أنباء الشرق الأوسط",
    "slug": "mena",
    "sort_order": 2,
    "is_active": true
  }
  ```
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:** `{ "source": { ...بيانات المصدر المنشأ } }`.
* **الأخطاء المحتملة:**
  * `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

---

#### 5.12 جلب مصدر أخبار محدد (`GET /api/admin/news/sources/[id]`)
* **ملف المسار:** `app/api/admin/news/sources/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الأدوار المسموحة:** `super_admin` فقط.
* **الرد الناجح:** `{ "source": { ...بيانات المصدر } }`.

---

#### 5.13 تعديل مصدر أخبار (`PATCH /api/admin/news/sources/[id]`)
* **ملف المسار:** `app/api/admin/news/sources/[id]/route.js`.
* **الأدوار المسموحة:** `super_admin` فقط.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من: `name_ar`, `slug`, `sort_order`, `is_active`.
* **الرد الناجح:** `{ "source": { ...البيانات المحدثة } }`.
* **الأخطاء المحتملة:**
  * `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

---

#### 5.14 تعديل حالة نشاط مصدر أخبار (`PATCH /api/admin/news/sources/[id]/status`)
* **ملف المسار:** `app/api/admin/news/sources/[id]/status/route.js`.
* **الأدوار المسموحة:** `super_admin` فقط.
* **جسم الطلب:**
  ```json
  {
    "is_active": false
  }
  ```
* **الرد الناجح:** `{ "source": { ...بيانات المصدر المحدثة } }`.


### المجال السادس: المحتوى الحزبي والتنظيمي (Admin Organizational Content) — 47 معالجاً

> **قواعد الصلاحيات الموحدة للمحتوى التنظيمي:**
> Permission note: organizational content handlers require `content:manage`, which is granted to `super_admin`.
> * **عمليات الحذف النهائي (`DELETE`):** مقتصرة حصرياً على `super_admin` (صلاحية `records:delete`).
> * **تأكيد الحذف:** جميع معالجات `DELETE` تشترط إرسال جسم طلب `{ "confirm": true }` بصيغة JSON، وترد عند النجاح دائماً بـ: `{ "deleted": true }`.

---

#### 6.1 إلى 6.6 الأمانات المركزية (Central Secretariats) — 6 معالجات

##### 6.1 قائمة الأمانات المركزية (`GET /api/admin/content/central-secretariats`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/route.js`.
* **المعاملات (Query Parameters):** `page` (default: 1), `page_size` (default: 25).
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "info_item_id": 10,
        "name_ar": "أمانة التنظيم المركزية",
        "head_name": "اللواء عصام الدين",
        "source_note": null,
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.2 إنشاء أمانة مركزية (`POST /api/admin/content/central-secretariats`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/route.js`.
* **جسم الطلب (Request Body):**
  * `info_item_id` (number, إلزامي: 1-32,767): معرف بند المحتوى الأب المرتبط.
  * `name_ar` (string, إلزامي: 1-200 حرف).
  * `head_name` (string, اختياري: حتى 200 حرف).
  * `source_note` (string, اختياري: حتى 500 حرف).
  * `sort_order` (number, اختياري).
  * `is_published` (boolean, اختياري).
  * مثال:
    ```json
    {
      "info_item_id": 10,
      "name_ar": "أمانة الشباب المركزية",
      "head_name": "الدكتور أحمد سعيد",
      "sort_order": 2,
      "is_published": true
    }
    ```
* **الرد الناجح:** `201 Created` مع الجسم: `{ "central_secretariat": { ...بيانات الأمانة } }`.

##### 6.3 جلب أمانة مركزية محددة (`GET /api/admin/content/central-secretariats/[id]`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الرد الناجح (200 OK):** `{ "central_secretariat": { ...البيانات متضمنة قائمة people } }`.

##### 6.4 تحديث أمانة مركزية (`PATCH /api/admin/content/central-secretariats/[id]`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من: `name_ar`, `head_name`, `source_note`, `sort_order`, `is_published`. (لا يمكن تغيير `info_item_id`).
* **الرد الناجح (200 OK):** `{ "central_secretariat": { ...البيانات المحدثة } }`.

##### 6.5 حذف أمانة مركزية (`DELETE /api/admin/content/central-secretariats/[id]`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.6 نشر/إخفاء أمانة مركزية (`PATCH /api/admin/content/central-secretariats/[id]/status`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "central_secretariat": { ...بيانات الأمانة المحدثة } }`.

---

#### 6.7 إلى 6.11 أعضاء الأمانات المركزية (Central Secretariat People) — 5 معالجات

##### 6.7 إضافة عضو للأمانة المركزية (`POST /api/admin/content/central-secretariats/[id]/people`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/people/route.js`.
* **المعاملات:** `id` (smallint: معرف الأمانة المركزية).
* **جسم الطلب:**
  * `full_name` (string, إلزامي: 1-200 حرف).
  * `position_title` (string, اختياري: حتى 200 حرف).
  * `image_url` (string, اختياري: رابط صورة).
  * `details` (string, اختياري: حتى 2000 حرف).
  * `sort_order` (number, اختياري).
  * `is_published` (boolean, اختياري).
  * مثال:
    ```json
    {
      "full_name": "رامي كمال الدين",
      "position_title": "أمين مساعد التنظيم",
      "image_url": "/assets/team/rami.jpg",
      "sort_order": 1,
      "is_published": true
    }
    ```
* **الرد الناجح:** `201 Created` مع الجسم: `{ "person": { ...بيانات العضو المنشأ } }`.

##### 6.8 جلب عضو بالأمانة المركزية (`GET /api/admin/content/central-secretariats/[id]/people/[personId]`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/people/[personId]/route.js`.
* **المعاملات:** `id` (smallint), `personId` (UUID).
* **الرد الناجح (200 OK):** `{ "person": { ...بيانات العضو } }`.

##### 6.9 تعديل عضو بالأمانة المركزية (`PATCH /api/admin/content/central-secretariats/[id]/people/[personId]`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/people/[personId]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من حقول العضو.
* **الرد الناجح (200 OK):** `{ "person": { ...بيانات العضو بعد التعديل } }`.

##### 6.10 حذف عضو بالأمانة المركزية (`DELETE /api/admin/content/central-secretariats/[id]/people/[personId]`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/people/[personId]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.11 نشر/إخفاء عضو بالأمانة المركزية (`PATCH /api/admin/content/central-secretariats/[id]/people/[personId]/status`)
* **ملف المسار:** `app/api/admin/content/central-secretariats/[id]/people/[personId]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "person": { ...بيانات العضو المحدثة } }`.

---

#### 6.12 إلى 6.17 أمانات المحافظات (Governorate Secretariats) — 6 معالجات

##### 6.12 قائمة أمانات المحافظات (`GET /api/admin/content/governorate-secretariats`)
* **ملف المسار:** `app/api/admin/content/governorate-secretariats/route.js`.
* **المعاملات (Query Parameters):** `page`, `page_size`, `governorate_id` (اختياري).
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "g1a2b3c4-0000-0000-0000-000000000001",
        "governorate_id": 2,
        "full_name": "المستشار هشام فاروق",
        "role_title": "أمين عام المحافظة",
        "photo_url": "/assets/team/hesham.jpg",
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.13 إنشاء أمانة محافظة (`POST /api/admin/content/governorate-secretariats`)
* **ملف المسار:** `app/api/admin/content/governorate-secretariats/route.js`.
* **جسم الطلب:**
  * `governorate_id` (number, إلزامي: 1-32,767).
  * `full_name` (string, إلزامي: 1-200 حرف).
  * `role_title` (string, اختياري: حتى 200 حرف).
  * `photo_url` (string, اختياري: رابط صورة).
  * `sort_order` (number, اختياري).
  * `is_published` (boolean, اختياري).
* **الرد الناجح:** `201 Created` مع الجسم: `{ "governorate_secretariat": { ...بيانات الأمانة } }`.

##### 6.14 جلب أمانة محافظة محددة (`GET /api/admin/content/governorate-secretariats/[id]`)
* **ملف المسار:** `app/api/admin/content/governorate-secretariats/[id]/route.js`.
* **المعاملات:** `id` (UUID, إلزامي).
* **الرد الناجح (200 OK):** `{ "governorate_secretariat": { ...بيانات الأمانة } }`.

##### 6.15 تحديث أمانة محافظة (`PATCH /api/admin/content/governorate-secretariats/[id]`)
* **ملف المسار:** `app/api/admin/content/governorate-secretariats/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من حقول الأمانة.
* **الرد الناجح (200 OK):** `{ "governorate_secretariat": { ...البيانات المحدثة } }`.

##### 6.16 حذف أمانة محافظة (`DELETE /api/admin/content/governorate-secretariats/[id]`)
* **ملف المسار:** `app/api/admin/content/governorate-secretariats/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.17 نشر/إخفاء أمانة محافظة (`PATCH /api/admin/content/governorate-secretariats/[id]/status`)
* **ملف المسار:** `app/api/admin/content/governorate-secretariats/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "governorate_secretariat": { ...البيانات المحدثة } }`.

---

#### 6.18 إلى 6.23 هيئات القيادة (Leadership Panels) — 6 معالجات

##### 6.18 قائمة هيئات القيادة (`GET /api/admin/content/leadership/panels`)
* **ملف المسار:** `app/api/admin/content/leadership/panels/route.js`.
* **المعاملات:** `page`, `page_size`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "slug": "presidential-board",
        "title": "الهيئة الرئاسية العليا",
        "subtitle": "القيادة العليا للحزب",
        "icon": "shield",
        "leaders_heading": "أعضاء الهيئة الرئاسية",
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.19 إنشاء هيئة قيادية (`POST /api/admin/content/leadership/panels`)
* **ملف المسار:** `app/api/admin/content/leadership/panels/route.js`.
* **جسم الطلب:** `slug` (إلزامي), `title` (إلزامي: 1-200 حرف), `subtitle`, `icon`, `leaders_heading`, `sort_order`, `is_published`.
* **الرد الناجح:** `201 Created` مع الجسم: `{ "panel": { ...بيانات الهيئة } }`.
* **الأخطاء المحتملة:** `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

##### 6.20 جلب هيئة قيادية محددة (`GET /api/admin/content/leadership/panels/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/panels/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الرد الناجح (200 OK):** `{ "panel": { ...بيانات الهيئة متضمنة قائمة leaders } }`.

##### 6.21 تحديث هيئة قيادية (`PATCH /api/admin/content/leadership/panels/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/panels/[id]/route.js`.
* **جسم الطلب:** حقل واحد على الأقل من حقول الهيئة.
* **الرد الناجح (200 OK):** `{ "panel": { ...البيانات المحدثة } }`.

##### 6.22 حذف هيئة قيادية (`DELETE /api/admin/content/leadership/panels/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/panels/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.
* **قاعدة تعارض خاصة:** إذا كانت الهيئة تحتوي على قادة مرتبطين بها، يتم حظر الحذف برمز `409 Conflict` مع الجسم: `{ "error": "PANEL_HAS_LEADERS" }`.

##### 6.23 نشر/إخفاء هيئة قيادية (`PATCH /api/admin/content/leadership/panels/[id]/status`)
* **ملف المسار:** `app/api/admin/content/leadership/panels/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "panel": { ...البيانات المحدثة } }`.

---

#### 6.24 إلى 6.29 القادة (Leadership Leaders) — 6 معالجات

##### 6.24 قائمة القادة (`GET /api/admin/content/leadership/leaders`)
* **ملف المسار:** `app/api/admin/content/leadership/leaders/route.js`.
* **المعاملات:** `page`, `page_size`, `panel_id` (اختياري).
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "l1a2b3c4-0000-0000-0000-000000000001",
        "panel_id": 1,
        "full_name": "الدكتور حازم عمر",
        "role_title": "رئيس الحزب",
        "photo_url": "/assets/team/hazem.jpg",
        "badge_label": "الرئيس",
        "is_head": true,
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.25 إضافة قائد جديد (`POST /api/admin/content/leadership/leaders`)
* **ملف المسار:** `app/api/admin/content/leadership/leaders/route.js`.
* **جسم الطلب:** `panel_id` (إلزامي), `full_name` (إلزامي: 1-200 حرف), `role_title`, `photo_url`, `badge_label` (حتى 50 حرفاً), `is_head` (boolean), `sort_order`, `is_published`.
* **الرد الناجح:** `201 Created` مع الجسم: `{ "leader": { ...بيانات القائد المنشأ } }`.

##### 6.26 جلب قائد محدد (`GET /api/admin/content/leadership/leaders/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/leaders/[id]/route.js`.
* **المعاملات:** `id` (UUID, إلزامي).
* **الرد الناجح (200 OK):** `{ "leader": { ...بيانات القائد } }`.

##### 6.27 تحديث بيانات قائد (`PATCH /api/admin/content/leadership/leaders/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/leaders/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من حقول القائد.
* **الرد الناجح (200 OK):** `{ "leader": { ...البيانات المحدثة } }`.

##### 6.28 حذف قائد نهائياً (`DELETE /api/admin/content/leadership/leaders/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/leaders/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.29 نشر/إخفاء قائد (`PATCH /api/admin/content/leadership/leaders/[id]/status`)
* **ملف المسار:** `app/api/admin/content/leadership/leaders/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "leader": { ...البيانات المحدثة } }`.

---

#### 6.30 إلى 6.35 محتوى وقرارات القيادة (Leadership Contents / Decisions) — 6 معالجات

##### 6.30 قائمة قرارات ومحتوى القيادة (`GET /api/admin/content/leadership/contents`)
* **ملف المسار:** `app/api/admin/content/leadership/contents/route.js`.
* **المعاملات:** `page`, `page_size`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "slug": "leadership-decree-42-2026",
        "button_label": "عرض نص القرار",
        "title": "قرار رئيس الحزب رقم 42 لسنة 2026",
        "person_name": "الدكتور حازم عمر",
        "person_role_title": "رئيس الحزب",
        "body": "قرر رئيس الحزب بعد الاطلاع على اللائحة...",
        "decision_number": "42 / 2026",
        "decision_date": "2026-11-15",
        "source_note": "الأمانة العامة",
        "icon": "document",
        "button_style": "primary",
        "action_type": "modal",
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-15T10:00:00.000Z",
        "updated_at": "2026-11-15T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.31 إنشاء قرار/محتوى قيادة (`POST /api/admin/content/leadership/contents`)
* **ملف المسار:** `app/api/admin/content/leadership/contents/route.js`.
* **جسم الطلب:**
  * `slug` (string, إلزامي: بصيغة slug).
  * `button_label` (string, إلزامي: 1-200 حرف).
  * `title` (string, إلزامي: 1-200 حرف).
  * `person_name` (string, إلزامي: 1-200 حرف).
  * `person_role_title` (string, إلزامي: 1-200 حرف).
  * `body` (string, إلزامي: 1-10,000 حرف).
  * `decision_number` (string, اختياري: حتى 100 حرف).
  * `decision_date` (string, اختياري: تاريخ YYYY-MM-DD ميلادي صالح).
  * `source_note`, `icon`, `button_style`, `action_type`, `sort_order`, `is_published`.
* **الرد الناجح:** `201 Created` مع الجسم: `{ "leadership_content": { ...بيانات المحتوى } }`.
* **الأخطاء المحتملة:** `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

##### 6.32 جلب قرار/محتوى قيادة محدد (`GET /api/admin/content/leadership/contents/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/contents/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الرد الناجح (200 OK):** `{ "leadership_content": { ...بيانات المحتوى } }`.

##### 6.33 تحديث قرار/محتوى قيادة (`PATCH /api/admin/content/leadership/contents/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/contents/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من الحقول.
* **الرد الناجح (200 OK):** `{ "leadership_content": { ...البيانات المحدثة } }`.

##### 6.34 حذف قرار/محتوى قيادة (`DELETE /api/admin/content/leadership/contents/[id]`)
* **ملف المسار:** `app/api/admin/content/leadership/contents/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.35 نشر/إخفاء قرار/محتوى قيادة (`PATCH /api/admin/content/leadership/contents/[id]/status`)
* **ملف المسار:** `app/api/admin/content/leadership/contents/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "leadership_content": { ...البيانات المحدثة } }`.

---

#### 6.36 إلى 6.41 الهيئة البرلمانية (Parliamentary Unit) — 6 معالجات

##### 6.36 قائمة بنود الهيئة البرلمانية (`GET /api/admin/content/parliamentary-unit`)
* **ملف المسار:** `app/api/admin/content/parliamentary-unit/route.js`.
* **المعاملات:** `page`, `page_size`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "slug": "house-of-representatives",
        "title": "مجلس النواب",
        "subtitle": "نواب الحزب في البرلمان",
        "icon": "landmark",
        "head_name": "النائب طارق رضوان",
        "head_role": "رئيس الهيئة البرلمانية",
        "body": "تضم الهيئة البرلمانية للحزب نخبة من النواب...",
        "source_note": null,
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.37 إنشاء بند برلماني (`POST /api/admin/content/parliamentary-unit`)
* **ملف المسار:** `app/api/admin/content/parliamentary-unit/route.js`.
* **جسم الطلب:** `slug` (إلزامي), `title` (إلزامي: 1-200 حرف), `subtitle`, `icon`, `head_name`, `head_role`, `body`, `source_note`, `sort_order`, `is_published`.
* **الرد الناجح:** `201 Created` مع الجسم: `{ "item": { ...بيانات البند } }`.
* **الأخطاء المحتملة:** `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

##### 6.38 جلب بند برلماني محدد (`GET /api/admin/content/parliamentary-unit/[id]`)
* **ملف المسار:** `app/api/admin/content/parliamentary-unit/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الرد الناجح (200 OK):** `{ "item": { ...بيانات البند } }`.

##### 6.39 تحديث بند برلماني (`PATCH /api/admin/content/parliamentary-unit/[id]`)
* **ملف المسار:** `app/api/admin/content/parliamentary-unit/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من الحقول.
* **الرد الناجح (200 OK):** `{ "item": { ...البيانات المحدثة } }`.

##### 6.40 حذف بند برلماني (`DELETE /api/admin/content/parliamentary-unit/[id]`)
* **ملف المسار:** `app/api/admin/content/parliamentary-unit/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.41 نشر/إخفاء بند برلماني (`PATCH /api/admin/content/parliamentary-unit/[id]/status`)
* **ملف المسار:** `app/api/admin/content/parliamentary-unit/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "item": { ...البيانات المحدثة } }`.

---

#### 6.42 إلى 6.47 النوافذ المنبثقة (Popups) — 6 معالجات

##### 6.42 قائمة النوافذ المنبثقة (`GET /api/admin/content/popups`)
* **ملف المسار:** `app/api/admin/content/popups/route.js`.
* **المعاملات:** `page`, `page_size`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "slug": "party-vision",
        "title": "رؤية الحزب",
        "body": "يسعى حزب الجبهة الوطنية إلى بناء دولة ديمقراطية حديثة...",
        "source_note": "البرنامج السياسي",
        "icon": "eye",
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-11-10T12:00:00.000Z",
        "updated_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
  }
  ```

##### 6.43 إنشاء نافذة منبثقة (`POST /api/admin/content/popups`)
* **ملف المسار:** `app/api/admin/content/popups/route.js`.
* **جسم الطلب:** `slug` (إلزامي), `title` (إلزامي: 1-200 حرف), `body` (حتى 10,000 حرف), `source_note` (حتى 500 حرف), `icon` (حتى 100 حرف), `sort_order`, `is_published`.
* **الرد الناجح:** `201 Created` مع الجسم: `{ "popup": { ...بيانات النافذة } }`.
* **الأخطاء المحتملة:** `409 Conflict`: `{ "error": "DUPLICATE_SLUG" }`.

##### 6.44 جلب نافذة منبثقة محددة (`GET /api/admin/content/popups/[id]`)
* **ملف المسار:** `app/api/admin/content/popups/[id]/route.js`.
* **المعاملات:** `id` (smallint, إلزامي).
* **الرد الناجح (200 OK):** `{ "popup": { ...بيانات النافذة } }`.

##### 6.45 تحديث نافذة منبثقة (`PATCH /api/admin/content/popups/[id]`)
* **ملف المسار:** `app/api/admin/content/popups/[id]/route.js`.
* **جسم الطلب:** يقبل حقلاً واحداً على الأقل من الحقول.
* **الرد الناجح (200 OK):** `{ "popup": { ...البيانات المحدثة } }`.

##### 6.46 حذف نافذة منبثقة (`DELETE /api/admin/content/popups/[id]`)
* **ملف المسار:** `app/api/admin/content/popups/[id]/route.js`.
* **جسم الطلب:** `{ "confirm": true }`.
* **الرد الناجح (200 OK):** `{ "deleted": true }`.

##### 6.47 نشر/إخفاء نافذة منبثقة (`PATCH /api/admin/content/popups/[id]/status`)
* **ملف المسار:** `app/api/admin/content/popups/[id]/status/route.js`.
* **جسم الطلب:** `{ "is_published": true | false }`.
* **الرد الناجح (200 OK):** `{ "popup": { ...البيانات المحدثة } }`.


---

## 6. التوثيق التفصيلي لواجهات البوابة العامة (Public APIs Detailed Specifications)

### المجال السابع: التقديم والكتالوجات العامة (Public Portal) — 5 معالجات

#### 7.1 تقديم طلب انضمام (`POST /api/applications`)
* **ملف المسار:** `app/api/applications/route.js`.
* **الهدف:** استمارة انضمام المواطنين (عضوية، تطوع، متابعة) من الموقع العام.
* **المصادقة:** عام ومفتوح للجمهور (Public).
* **تقييد المعدل (Rate Limit):** 5 طلبات لكل IP خلال 15 دقيقة. في حال تعذر استخراج عنوان الـ IP (غياب الرؤوس)، يسقط الطلب تلقائياً في عداد الـ Unknown IP المشترك بحد أقصى 20 طلباً خلال 15 دقيقة. عند التجاوز يُرجع `429 RATE_LIMITED` مع رأس `Retry-After`.
* **الحد الأقصى لحجم الطلب:** 10 كيلوبايت (`maxBodyBytes = 10 * 1024`). تجاوز الحجم يرجع `413 PAYLOAD_TOO_LARGE`.
* **جسم الطلب (Request Body):**
  * `type` (enum: `"member"`, `"volunteer"`, `"follower"`, إلزامي).
  * `full_name` (string, إلزامي): اسم رباعي على الأقل (4 كلمات مفصولة بمسافات، من 8 إلى 120 حرفاً).
  * `phone` (string, إلزامي): رقم محمول مصري سليم (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015، يقبل الأرقام العربية ويحولها تلقائياً).
  * `national_id` (string, إلزامي): رقم قومي مصري صالح مكون من 14 رقماً (يبدأ بـ 2 أو 3، ويطابق تاريخ الميلاد والمحافظة المسجلة).
  * `governorate_id` (number, إلزامي): معرف المحافظة (رقم صحيح موجب).
  * `terms_accepted` (literal `true`, إلزامي): الموافقة الصريحة على الشروط والأحكام.
  * `turnstileToken` (string): توكن التحقق من Cloudflare Turnstile.
    * **شرط التفعيل في الكود:** يرتبط التحقق حصراً بوجود متغير البيئة `process.env.TURNSTILE_SECRET_KEY` (دون أي فحص لـ `NODE_ENV`). إذا كان هذا المتغير معرّفاً في أي بيئة (سواء كانت إنتاج أو تطوير أو اختبار):
      * يصبح حقل `turnstileToken` **إلزامياً في جسم الطلب**؛ وفي حال غيابه يرد الخادم بـ `400 Bad Request` مع `{ "error": "CAPTCHA_REQUIRED" }`.
      * إذا أُرسل التوكن ولكن فشل التحقق منه عبر Cloudflare، يرد الخادم بـ `400 Bad Request` مع `{ "error": "CAPTCHA_FAILED" }`.
    * **في حال غياب المتغير:** إذا كان `process.env.TURNSTILE_SECRET_KEY` غير معرّف (أو فارغاً)، يتم تخطي فحص Turnstile بالكامل ولا يُطلب إرسال التوكن.
  * `website` (string, اختياري - حقل مصيدة بوتات Honeypot): حقل مخصص لكشف البوتات ويجب أن يُترك فارغاً تماماً بواسطة المستخدم الطبيعي. إذا أرسل البوت قيمة في هذا الحقل، يقوم السيرفر فوراً بالرد بنجاح وهمي `201 Created` مع رقم طلب عشوائي دون حفظ أي بيانات في قاعدة البيانات.
  * مثال واقعي للطلب:
    ```json
    {
      "type": "member",
      "full_name": "أحمد إبراهيم محمد حسن",
      "phone": "01012345678",
      "national_id": "29505120101234",
      "governorate_id": 1,
      "terms_accepted": true
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:**
    ```json
    {
      "application_no": "100234"
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`:
    * `{ "error": "VALIDATION", "issues": { "full_name": ["الاسم لازم يكون رباعي"] } }`
    * `{ "error": "INVALID_NATIONAL_ID" }` (الرقم القومي غير صحيح رياضياً أو تاريخياً).
    * `{ "error": "INVALID_GOVERNORATE" }` (كود المحافظة في الرقم القومي لا يطابق المحافظة المختارة أو غير موجودة).
    * `{ "error": "CAPTCHA_REQUIRED" }` أو `{ "error": "CAPTCHA_FAILED" }`
  * `409 Conflict`: `{ "error": "DUPLICATE" }` (طلب العضوية بنفس الرقم القومي مسجل بالفعل).
  * `413 Payload Too Large`: `{ "error": "PAYLOAD_TOO_LARGE" }`.
  * `415 Unsupported Media Type`: `{ "error": "UNSUPPORTED_MEDIA_TYPE" }`.
  * `429 Too Many Requests`: `{ "error": "RATE_LIMITED" }`.

---

#### 7.2 تقديم طلب خدمة مواطن (`POST /api/service-requests`)
* **ملف المسار:** `app/api/service-requests/route.js`.
* **الهدف:** إرسال طلب خدمة أو شكوى مواطن موجهة لوزارة وقطاع محددين.
* **المصادقة:** عام ومفتوح للجمهور (Public).
* **تقييد المعدل:** 5 طلبات لكل IP خلال 15 دقيقة (أو 20 طلباً للـ Unknown IP عند غياب الرؤوس). عند التجاوز يُرجع `429 RATE_LIMITED` مع رأس `Retry-After`.
* **الحد الأقصى لحجم الطلب:** 10 كيلوبايت. تجاوز الحجم يرجع `413 PAYLOAD_TOO_LARGE`، ونوع المحتوى غير المدعوم يرجع `415 UNSUPPORTED_MEDIA_TYPE`.
* **طبيعة الحماية والأمان:** لا يستخدم هذا المسار اختبار Turnstile أو حقول Honeypot، بل يعتمد على تقييد المعدل، والتحقق الصارم من الحقول عبر مخطط Zod صارم (`.strict()`) يرفض أي حقول إضافية غير معرّفة، مع أقفال المعاملات المشتركة (`FOR SHARE`) في قاعدة البيانات.
* **جسم الطلب (Request Body):**
  * `full_name` (string, إلزامي: 1-200 حرف).
  * `phone` (string, إلزامي: رقم مصري 11 رقماً يبدأ بـ 01[0125]).
  * `ministry_id` (number, إلزامي: 1-32,767).
  * `sector_id` (number, إلزامي: 1-32,767).
  * مثال:
    ```json
    {
      "full_name": "سامح عبد الحميد عبد الرحمن",
      "phone": "01123456789",
      "ministry_id": 1,
      "sector_id": 1
    }
    ```
* **الرد الناجح:**
  * **رمز الحالة:** `201 Created`.
  * **جسم الرد:**
    ```json
    {
      "success": true
    }
    ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`:
    * `{ "error": "VALIDATION" }`.
    * `{ "error": "INVALID_SELECTION" }` (الوزارة أو القطاع غير موجود أو غير نشط في النظام).
  * `429 Too Many Requests`: `{ "error": "RATE_LIMITED" }`.

---

#### 7.3 قائمة المحافظات النشطة (`GET /api/governorates`)
* **ملف المسار:** `app/api/governorates/route.js`.
* **الهدف:** جلب قائمة محافظات جمهورية مصر العربية النشطة لملء القوائم المنسدلة في استمارة الانضمام.
* **المصادقة:** عام (Public).
* **التخزين المؤقت (Cache-Control):**
  * **الرد الناجح (200 OK):** `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
  * **تجاوز المعدل (429 RATE_LIMITED):** `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` (مع رأس `Retry-After`).
  * **أخطاء الخادم (500 SERVER_ERROR):** `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
* **تقييد المعدل:** 60 طلباً في الدقيقة لكل IP (أو للـ Unknown IP).
* **الرد الناجح (200 OK):**
  ```json
  {
    "governorates": [
      {
        "id": 1,
        "name_ar": "القاهرة",
        "sort_order": 1,
        "is_active": true
      },
      {
        "id": 2,
        "name_ar": "الجيزة",
        "sort_order": 2,
        "is_active": true
      }
    ]
  }
  ```
* **الأخطاء المحتملة:**
  * `429 Too Many Requests`: `{ "error": "RATE_LIMITED" }` (مع الترويسة `Retry-After` وترويسة الكاش أعلاه).
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }` (مع ترويسة الكاش أعلاه).

---

#### 7.4 قائمة الوزارات النشطة (`GET /api/ministries`)
* **ملف المسار:** `app/api/ministries/route.js`.
* **الهدف:** جلب قائمة الوزارات النشطة المتاحة لطلبات المواطنين.
* **المصادقة:** عام (Public).
* **تقييد المعدل:** 60 طلباً في الدقيقة لكل IP (أو للـ Unknown IP). عند التجاوز يُرجع `429 RATE_LIMITED` مع رأس `Retry-After`.
* **التخزين المؤقت:** `Cache-Control: no-store` (تُرجع عبر دالة `jsonResponse`).
* **الرد الناجح (200 OK):**
  ```json
  {
    "ministries": [
      {
        "id": 1,
        "name_ar": "وزارة الصحة والسكان",
        "slug": "health",
        "sort_order": 1
      }
    ]
  }
  ```

---

#### 7.5 قائمة القطاعات النشطة (`GET /api/request-sectors`)
* **ملف المسار:** `app/api/request-sectors/route.js`.
* **الهدف:** جلب قائمة قطاعات الطلبات النشطة.
* **المصادقة:** عام (Public).
* **تقييد المعدل:** 60 طلباً في الدقيقة لكل IP (أو للـ Unknown IP). عند التجاوز يُرجع `429 RATE_LIMITED` مع رأس `Retry-After`.
* **التخزين المؤقت:** `Cache-Control: no-store` (تُرجع عبر دالة `jsonResponse`).
* **الرد الناجح (200 OK):**
  ```json
  {
    "request_sectors": [
      {
        "id": 1,
        "name_ar": "العلاج على نفقة الدولة",
        "code": "state-funded-treatment",
        "sort_order": 1
      }
    ]
  }
  ```

---

### المجال الثامن: المحتوى والأخبار العامة (Public Content & News) — 11 معالجاً

#### 8.1 قائمة الأخبار المنشورة (`GET /api/content/news`)
* **ملف المسار:** `app/api/content/news/route.js`.
* **الهدف:** تزويد قسم الأخبار في الصفحة الرئيسية وصفحة أرشيف الأخبار بالمقالات المنشورة فقط.
* **المصادقة:** عام (Public).
* **التخزين المؤقت (Cache-Control):**
  * **الرد الناجح (200 OK):** `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.
  * **أخطاء التحقق (400 VALIDATION):** `Cache-Control: no-store`.
  * **تجاوز المعدل (429 RATE_LIMITED):** `Cache-Control: no-store` (مع رأس `Retry-After`).
  * **أخطاء الخادم (500 SERVER_ERROR):** `Cache-Control: no-store`.
* **تقييد المعدل:** 120 طلباً في الدقيقة لكل IP (أو للـ Unknown IP).
* **المعاملات (Query Parameters):**
  * `page` (number, default: 1).
  * `page_size` (number, default: 12, max: 50).
  * `featured` (boolean, اختياري: `true` أو `false` لتصفية الأخبار البارزة).
  * `source` (string, اختياري: slug المصدر الإخباري).
* **قاعدة التصفية في السيرفر:** يقتصر الرد تلقائياً على المقالات التي تحقق معاً: `status = 'published'` و `is_published = true`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "news": [
      {
        "id": "e2a4b890-7d12-4c2f-b4a1-000000000001",
        "slug": "party-initiative-youth-2026",
        "title": "حزب الجبهة الوطنية يطلق مبادرة جديدة لدعم الشباب",
        "image_url": "/assets/news/youth-initiative.jpg",
        "image_alt": "مبادرة دعم الشباب",
        "published_on": "2026-11-18",
        "date_precision": "day",
        "formatted_date": "18 نوفمبر 2026",
        "meta": {
          "source": "بوابة الأهرام",
          "date": "18 نوفمبر 2026"
        },
        "is_featured": true,
        "source": {
          "id": 1,
          "name_ar": "بوابة الأهرام",
          "slug": "ahram"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 12,
      "total": 24,
      "total_pages": 2
    }
  }
  ```
* **الأخطاء المحتملة:**
  * `400 Bad Request`: `{ "error": "VALIDATION" }` (عند تكرار مفاتيح الاستعلام في الرابط أو عدم مطابقة أنواع المعاملات).
  * `429 Too Many Requests`: `{ "error": "RATE_LIMITED" }` (مع الترويسة `Retry-After` وترويسة `no-store`).
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }` (مع ترويسة `no-store`).

---

#### 8.2 تفاصيل مقال منشور بالـ Slug (`GET /api/content/news/[slug]`)
* **ملف المسار:** `app/api/content/news/[slug]/route.js`.
* **الهدف:** جلب البيانات الكاملة لمقال إخباري منشور لعرضه في صفحة المقال الفردي أو الـ Modal.
* **المصادقة:** عام (Public).
* **التخزين المؤقت (Cache-Control):**
  * **الرد الناجح (200 OK):** `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.
  * **المقال غير موجود (404 NOT_FOUND):** `Cache-Control: no-store` (في حال فشل فك ترميز الـ slug أو عدم وجود المقال أو عدم نشره).
  * **تجاوز المعدل (429 RATE_LIMITED):** `Cache-Control: no-store` (مع رأس `Retry-After`).
  * **أخطاء الخادم (500 SERVER_ERROR):** `Cache-Control: no-store`.
* **تقييد المعدل:** 120 طلباً في الدقيقة لكل IP (أو للـ Unknown IP).
* **المعاملات (Path Parameters):** `slug` (string, إلزامي - يدعم الحروف العربية واللاتينية مع فك الترميز التلقائي URL-Decode).
* **الرد الناجح (200 OK):**
  ```json
  {
    "article": {
      "id": "e2a4b890-7d12-4c2f-b4a1-000000000001",
      "slug": "party-initiative-youth-2026",
      "title": "حزب الجبهة الوطنية يطلق مبادرة جديدة لدعم الشباب",
      "body": "أعلن حزب الجبهة الوطنية اليوم عن إطلاق حزمة برامج تدريبية وتأهيلية لسوق العمل...

وتستهدف المرحلة الأولى تدريب أكثر من عشرة آلاف شاب في مختلف المحافظات.",
      "paragraphs": [
        "أعلن حزب الجبهة الوطنية اليوم عن إطلاق حزمة برامج تدريبية وتأهيلية لسوق العمل...",
        "وتستهدف المرحلة الأولى تدريب أكثر من عشرة آلاف شاب في مختلف المحافظات."
      ],
      "image_url": "/assets/news/youth-initiative.jpg",
      "image_alt": "مبادرة دعم الشباب",
      "published_on": "2026-11-18",
      "date_precision": "day",
      "formatted_date": "18 نوفمبر 2026",
      "meta": {
        "source": "بوابة الأهرام",
        "date": "18 نوفمبر 2026"
      },
      "is_featured": true,
      "source_url": "https://gate.ahram.org.eg/News/123456.aspx",
      "source": {
        "id": 1,
        "name_ar": "بوابة الأهرام",
        "slug": "ahram"
      }
    }
  }
  ```
* **الأخطاء المحتملة:**
  * `404 Not Found`: `{ "error": "NOT_FOUND" }` (مع ترويسة `no-store` عند عدم وجود المقال أو عدم نشره أو فشل فك ترميز الرابط).
  * `429 Too Many Requests`: `{ "error": "RATE_LIMITED" }` (مع الترويسة `Retry-After` وترويسة `no-store`).
  * `500 Internal Server Error`: `{ "error": "SERVER_ERROR" }` (مع ترويسة `no-store`).

---

#### 8.3 عرض الأمانات المركزية المنشورة (`GET /api/content/central-secretariats`)
* **ملف المسار:** `app/api/content/central-secretariats/route.js`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "central_secretariats": [
      {
        "id": 1,
        "name_ar": "أمانة التنظيم المركزية",
        "head_name": "اللواء عصام الدين",
        "source_note": null,
        "sort_order": 1,
        "people": [
          {
            "id": "p1a2b3c4-0000-0000-0000-000000000001",
            "full_name": "رامي كمال الدين",
            "position_title": "أمين مساعد التنظيم",
            "image_url": "/assets/team/rami.jpg",
            "details": null,
            "sort_order": 1
          }
        ]
      }
    ]
  }
  ```

---

#### 8.4 تفاصيل أمانة مركزية منشورة (`GET /api/content/central-secretariats/[id]`)
* **ملف المسار:** `app/api/content/central-secretariats/[id]/route.js`.
* **المعاملات:** `id` (smallint).
* **الرد الناجح (200 OK):** `{ "central_secretariat": { ...البيانات متضمنة أعضائها المنشورين فقط } }`.
* **الأخطاء المحتملة:** `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 8.5 عرض أمانات المحافظات المنشورة (`GET /api/content/governorate-secretariats`)
* **ملف المسار:** `app/api/content/governorate-secretariats/route.js`.
* **المعاملات (Query Parameters):** `governorate_id` (number, اختياري - لتصفية أمانة محافظة محددة).
* **الرد الناجح (200 OK):**
  ```json
  {
    "governorate_secretariats": [
      {
        "id": "g1a2b3c4-0000-0000-0000-000000000001",
        "governorate_id": 2,
        "full_name": "المستشار هشام فاروق",
        "role_title": "أمين عام المحافظة",
        "photo_url": "/assets/team/hesham.jpg",
        "sort_order": 1
      }
    ]
  }
  ```

---

#### 8.6 تفاصيل أمانة محافظة منشورة (`GET /api/content/governorate-secretariats/[id]`)
* **ملف المسار:** `app/api/content/governorate-secretariats/[id]/route.js`.
* **المعاملات:** `id` (UUID).
* **الرد الناجح (200 OK):** `{ "governorate_secretariat": { ...بيانات الأمانة } }`.
* **الأخطاء المحتملة:** `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 8.7 عرض قيادات الحزب والقرارات المنشورة (`GET /api/content/leadership`)
* **ملف المسار:** `app/api/content/leadership/route.js`.
* **الهدف:** تزويد صفحة "قيادات الحزب" بالهيئات القيادية وقادتها وقرارات القيادة المنشورة دفعة واحدة.
* **المصادقة:** عام (Public).
* **الرد الناجح (200 OK):**
  ```json
  {
    "panels": [
      {
        "id": 1,
        "slug": "presidential-board",
        "title": "الهيئة الرئاسية العليا",
        "subtitle": "القيادة العليا للحزب",
        "icon": "shield",
        "leaders_heading": "أعضاء الهيئة الرئاسية",
        "sort_order": 1,
        "leaders": [
          {
            "id": "l1a2b3c4-0000-0000-0000-000000000001",
            "panel_id": 1,
            "full_name": "الدكتور حازم عمر",
            "role_title": "رئيس الحزب",
            "photo_url": "/assets/team/hazem.jpg",
            "badge_label": "الرئيس",
            "is_head": true,
            "sort_order": 1
          }
        ]
      }
    ],
    "contents": [
      {
        "id": 1,
        "slug": "leadership-decree-42-2026",
        "button_label": "عرض نص القرار",
        "title": "قرار رئيس الحزب رقم 42 لسنة 2026",
        "body": "قرر رئيس الحزب بعد الاطلاع على اللائحة...",
        "source_note": "الأمانة العامة",
        "icon": "document",
        "sort_order": 1,
        "button_style": "primary",
        "action_type": "modal",
        "person_name": "الدكتور حازم عمر",
        "person_role_title": "رئيس الحزب",
        "decision_number": "42 / 2026",
        "decision_date": "2026-11-15"
      }
    ]
  }
  ```

---

#### 8.8 عرض الهيئة البرلمانية المنشورة (`GET /api/content/parliamentary-unit`)
* **ملف المسار:** `app/api/content/parliamentary-unit/route.js`.
* **الرد الناجح (200 OK):**
  ```json
  {
    "parliamentary_items": [
      {
        "id": 1,
        "slug": "house-of-representatives",
        "title": "مجلس النواب",
        "subtitle": "نواب الحزب في البرلمان",
        "icon": "landmark",
        "head_name": "النائب طارق رضوان",
        "head_role": "رئيس الهيئة البرلمانية",
        "body": "تضم الهيئة البرلمانية للحزب نخبة من النواب...",
        "source_note": null,
        "sort_order": 1
      }
    ]
  }
  ```

---

#### 8.9 تفاصيل بند برلماني منشور (`GET /api/content/parliamentary-unit/[id]`)
* **ملف المسار:** `app/api/content/parliamentary-unit/[id]/route.js`.
* **المعاملات:** `id` (smallint).
* **الرد الناجح (200 OK):** `{ "item": { ...بيانات البند البرلماني } }`.
* **الأخطاء المحتملة:** `404 Not Found`: `{ "error": "NOT_FOUND" }`.

---

#### 8.10 عرض النوافذ المنبثقة المنشورة (`GET /api/content/popups`)
* **ملف المسار:** `app/api/content/popups/route.js`.
* **الهدف:** جلب قائمة النوافذ المنبثقة التعريفية المنشورة على الموقع (مثل الرؤية، الرسالة، الأهداف).
* **الرد الناجح (200 OK):**
  ```json
  {
    "popups": [
      {
        "id": 1,
        "slug": "party-vision",
        "title": "رؤية الحزب",
        "body": "يسعى حزب الجبهة الوطنية إلى بناء دولة ديمقراطية حديثة...",
        "source_note": "البرنامج السياسي",
        "icon": "eye",
        "sort_order": 1
      }
    ]
  }
  ```

---

#### 8.11 تفاصيل نافذة منبثقة منشورة (`GET /api/content/popups/[id]`)
* **ملف المسار:** `app/api/content/popups/[id]/route.js`.
* **المعاملات:** `id` (smallint).
* **الرد الناجح (200 OK):** `{ "popup": { ...بيانات النافذة المنبثقة } }`.
* **الأخطاء المحتملة:** `404 Not Found`: `{ "error": "NOT_FOUND" }`.


## Phase 18 — Party organization and geographic search

### Public search APIs

- `GET /api/organization/governorates` → `{ governorates: [{ id, name_ar }] }`
- `GET /api/organization/centers?governorate_id=<id>` → `{ centers: [{ id, name_ar, governorate_id }] }`
- `GET /api/organization/party-units?center_id=<id>` → `{ party_units: [{ id, name_ar, secretariat_id, secretariat }] }`
- `GET /api/organization/party-units/<id>` → `{ party_unit: { id, name_ar, governorate, center, local_secretariat, people } }`

The public selector intentionally has three levels only: governorate, center, and party unit. The local secretariat is returned as contextual data, not as a fourth search selector. Public people records include only published names, position titles, details, and ordering. They never expose member IDs, membership numbers, phone numbers, national IDs, birth dates, or internal member data.

### Admin organization APIs

All routes below require a staff session and the `organization:manage` permission (currently granted only to `super_admin`). Mutations also require same-origin requests.

- `GET/POST /api/admin/content/organization/centers` (optional `governorate_id` filter)
- `PATCH/DELETE /api/admin/content/organization/centers/<id>`
- `PATCH /api/admin/content/organization/centers/<id>/status`
- `GET/POST /api/admin/content/organization/local-secretariats` (optional `center_id` filter)
- `PATCH/DELETE /api/admin/content/organization/local-secretariats/<id>`
- `PATCH /api/admin/content/organization/local-secretariats/<id>/status`
- `GET/POST /api/admin/content/organization/party-units` (optional `secretariat_id` filter)
- `PATCH/DELETE /api/admin/content/organization/party-units/<id>`
- `PATCH /api/admin/content/organization/party-units/<id>/status`
- `GET/POST /api/admin/content/organization/party-units/<id>/people`
- `PATCH/DELETE /api/admin/content/organization/party-units/<id>/people/<personId>`
- `PATCH /api/admin/content/organization/party-units/<id>/people/<personId>/status`
- `GET /api/admin/content/organization/members?q=<name>` searches active members only and returns safe selection fields.

For destructive requests, send `{ "confirm": true }`. Center, local-secretariat, and party-unit deletion is rejected while children exist. Deactivating any ancestor removes its descendants from public search. A person can be linked to an active `members` row or entered manually; linked member names are always read from the related membership application.


### Admin dashboard UI

- Page: `/admin/organization`
- Navigation label: `الهيكل التنظيمي` under the administration group.
- Visibility: `super_admin` only, enforced by the dashboard section access rules and the page's `organization:manage` permission check.
- The UI uses the existing admin design system (gold accents, white cards, RTL layout, responsive grids, shared page header, skeletons, and empty states).
- The page consumes the organization admin APIs above to manage centers, local secretariats, party units, and each unit's people. Existing governorates are loaded from the current admin governorates endpoint.
