export const ADMIN_ERROR_MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  ACCOUNT_LOCKED: "تم قفل الحساب مؤقتًا بسبب محاولات كثيرة",
  RATE_LIMITED: "محاولات كثيرة، حاول مرة أخرى لاحقًا",
  VALIDATION: "يرجى التأكد من صحة البيانات المدخلة",
  FORBIDDEN: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  UNAUTHENTICATED: "انتهت الجلسة، سجل دخولك مرة أخرى",
  PASSWORD_CHANGE_REQUIRED: "يجب تغيير كلمة المرور المؤقتة قبل المتابعة",
  INVALID_CURRENT_PASSWORD: "كلمة المرور الحالية غير صحيحة",
  PASSWORD_NOT_CHANGED: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية",
  WEAK_PASSWORD: "كلمة المرور ضعيفة ولا تستوفي الشروط",
  PAYLOAD_TOO_LARGE: "حجم البيانات المرسلة كبير جدًا",
  UNSUPPORTED_MEDIA_TYPE: "نوع البيانات غير مدعوم",
  SERVER_ERROR: "حدث خطأ غير متوقع، حاول مرة أخرى",
  NOT_FOUND: "العنصر المطلوب غير موجود",
  INVALID_TRANSITION: "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية",
  CONFLICT: "تم تحديث حالة الطلب من قبل مستخدم آخر، يرجى تحديث الصفحة",
  ASSIGNEE_NOT_FOUND: "الموظف المحدد غير موجود في النظام",
  ASSIGNEE_INACTIVE: "الموظف المحدد حسابه غير نشط حالياً",
  ASSIGNEE_UNAUTHORIZED: "الموظف المحدد ليس لديه الصلاحية اللازمة لمعالجة هذا الطلب",
  TOO_MANY_ROWS: "تجاوز عدد السجلات الحد المسموح به للتصدير (الحد الأقصى 10,000)",
  TOO_LARGE: "حجم ملف التصدير تجاوز الحد الأقصى المسموح (10 ميجابايت)",
  DUPLICATE_SLUG: "المعرف البرمجي (Slug) مستخدم بالفعل، يرجى كتابة معرف آخر",
  DUPLICATE_CODE: "كود المحافظة مسجل بالفعل، يرجى كتابة كود فريد",
  GOVERNORATE_HAS_DATA: "لا يمكن حذف المحافظة لأنها مرتبطة ببيانات أو أعضاء مسجلين. يمكنك إخفاؤها من الموقع بدلاً من ذلك",
  DUPLICATE: "هذا السجل أو المعرف مكرر بالفعل في النظام",
  NETWORK_ERROR: "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت",
});

export const DEFAULT_ERROR_MESSAGE = "حدث خطأ غير متوقع، حاول مرة أخرى";

export function getErrorMessage(code) {
  if (!code || typeof code !== "string") return DEFAULT_ERROR_MESSAGE;
  return ADMIN_ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}
