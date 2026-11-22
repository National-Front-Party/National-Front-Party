"use client";

import { useState, useRef } from "react";
import { UserPlus, UserCog, Eye, EyeOff, RefreshCw, AlertCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { generateTemporaryPassword, STAFF_ROLES } from "@/lib/admin/staff-utils";
import CustomSelect from "@/components/Home/ui/CustomSelect";

export default function StaffEditorModal({ isOpen, onClose, item, onSaved }) {
  if (!isOpen) return null;

  return (
    <StaffEditorForm
      key={item?.id ?? "create"}
      item={item}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function StaffEditorForm({ item, onClose, onSaved }) {
  const { showSuccess, showError } = useToast();
  const isEdit = Boolean(item?.id);

  const [fullName, setFullName] = useState(item?.full_name || "");
  const [email, setEmail] = useState(item?.email || "");
  const [role, setRole] = useState(item?.role || "news_editor");
  const [tempPassword, setTempPassword] = useState(() =>
    item ? "" : generateTemporaryPassword(),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);

  const handleRegeneratePassword = () => {
    setTempPassword(generateTemporaryPassword());
    if (errors.tempPassword) {
      setErrors((prev) => ({ ...prev, tempPassword: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const newErrors = {};

    if (!trimmedName) {
      newErrors.fullName = "الاسم الكامل مطلوب ولا يمكن تركه فارغاً";
    } else if (trimmedName.length < 2) {
      newErrors.fullName = "الاسم الكامل يجب ألا يقل عن حرفين";
    }

    if (!trimmedEmail) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "يرجى إدخال بريد إلكتروني صالح";
    }

    if (!isEdit) {
      const trimmedPwd = tempPassword.trim();
      if (!trimmedPwd) {
        newErrors.tempPassword = "كلمة المرور المؤقتة مطلوبة";
      } else if (trimmedPwd.length < 10) {
        newErrors.tempPassword = "كلمة المرور يجب أن تتكون من 10 أحرف على الأقل";
      } else if (!/\p{L}/u.test(trimmedPwd)) {
        newErrors.tempPassword = "يجب أن تحتوي كلمة المرور على حرف واحد على الأقل";
      } else if (!/\d/.test(trimmedPwd)) {
        newErrors.tempPassword = "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showError("يرجى مراجعة وتصحيح الحقول المحددة");
      if (newErrors.fullName) nameInputRef.current?.focus();
      else if (newErrors.email) emailInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        // Build minimal payload containing only changed fields
        const payload = {};
        if (trimmedName !== item.full_name) payload.full_name = trimmedName;
        if (trimmedEmail !== item.email) payload.email = trimmedEmail;
        if (role !== item.role) payload.role = role;

        if (Object.keys(payload).length === 0) {
          showSuccess("لم يتم إجراء أي تغييرات على بيانات الموظف");
          onClose();
          return;
        }

        const res = await adminFetch(`/api/admin/staff/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        showSuccess(`تم تحديث بيانات الموظف "${trimmedName}" بنجاح`);
        onSaved(res.staff, true, null);
        onClose();
      } else {
        const payload = {
          full_name: trimmedName,
          email: trimmedEmail,
          role,
          temporary_password: tempPassword.trim(),
        };

        const res = await adminFetch("/api/admin/staff", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showSuccess(`تم إنشاء حساب الموظف "${trimmedName}" بنجاح`);
        onSaved(res.staff, false, tempPassword.trim());
        onClose();
      }
    } catch (err) {
      if (err.code === "EMAIL_ALREADY_EXISTS") {
        setErrors((prev) => ({
          ...prev,
          email: "هذا البريد الإلكتروني مسجل بالفعل لموظف آخر في النظام.",
        }));
        emailInputRef.current?.focus();
        showError("البريد الإلكتروني مسجل بالفعل لموظف آخر.");
      } else if (err.code === "LAST_ACTIVE_SUPER_ADMIN") {
        showError(
          "لا يمكن تغيير دور هذا الحساب: إنه آخر مدير نظام نشط، ويجب الحفاظ على مدير نظام واحد نشط على الأقل.",
        );
      } else if (err.code === "WEAK_PASSWORD") {
        setErrors((prev) => ({
          ...prev,
          tempPassword: "كلمة المرور ضعيفة: يجب أن تكون 10 أحرف وتشمل حرفاً ورقماً.",
        }));
        showError("كلمة المرور المؤقتة ضعيفة ولا تستوفي الشروط.");
      } else if (err.code === "VALIDATION") {
        showError("يرجى التأكد من صحة البيانات المدخلة ومطابقتها للشروط.");
      } else {
        showError(err.message || "حدث خطأ أثناء حفظ بيانات الموظف");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      dir="rtl"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs">
              {isEdit ? <UserCog className="size-6" /> : <UserPlus className="size-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">
                {isEdit ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {isEdit
                  ? "تحديث الاسم، البريد الإلكتروني، والدور الوظيفي"
                  : "إنشاء حساب إداري جديد وتعيين صلاحيات الدور"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
            title="إغلاق"
          >
            <svg
              className="size-5 transition-transform duration-300 group-hover:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-4 sm:space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-ink mb-2">
              الاسم الكامل للموظف <span className="text-rose-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder="مثال: أحمد محمد علي"
              disabled={submitting}
              className={`h-14 w-full rounded-2xl border px-4 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-50 ${
                errors.fullName
                  ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(244,63,94,0.35)]"
                  : "border-border bg-white hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              }`}
              maxLength={200}
            />
            {errors.fullName && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-elem-fade-up">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-ink mb-2">
              البريد الإلكتروني <span className="text-rose-500">*</span>
            </label>
            <input
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@example.com"
              disabled={submitting}
              className={`h-14 w-full rounded-2xl border px-4 font-mono text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-50 text-left dir-ltr ${
                errors.email
                  ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(244,63,94,0.35)]"
                  : "border-border bg-white hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              }`}
              maxLength={254}
            />
            {errors.email && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-elem-fade-up">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <CustomSelect
              id="staff-editor-role"
              label="الدور الوظيفي والصلاحيات"
              required
              placeholder="اختر الدور الوظيفي"
              options={STAFF_ROLES.map((roleId) => ({
                value: roleId,
                label: `${ROLE_LABELS[roleId]} (${roleId})`,
              }))}
              value={role}
              onChange={(val) => setRole(val)}
              disabled={submitting}
            />
            <p className="text-[11px] text-muted/80 mt-1.5 mr-1">
              يحدد الصلاحيات الإدارية المتاحة لهذا الحساب في اللوحة.
            </p>
          </div>

          {/* Temporary Password on Create */}
          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-bold text-ink">
                  كلمة المرور المؤقتة <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 text-xs font-bold text-gold-dark hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="size-3.5" />
                  <span>توليد كلمة أخرى</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  onChange={(e) => {
                    setTempPassword(e.target.value);
                    if (errors.tempPassword) {
                      setErrors((prev) => ({ ...prev, tempPassword: undefined }));
                    }
                  }}
                  disabled={submitting}
                  className={`h-14 w-full rounded-2xl border px-4 pl-12 font-mono text-xs sm:text-sm font-bold text-ink shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-50 text-left dir-ltr ${
                    errors.tempPassword
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(244,63,94,0.35)]"
                      : "border-border bg-white hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                  }`}
                  maxLength={128}
                />

                <div className="absolute left-2.5 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="flex size-9 items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-page transition-all cursor-pointer"
                    title={showPassword ? "إخفاء" : "إظهار"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {errors.tempPassword && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-elem-fade-up">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{errors.tempPassword}</span>
                </p>
              )}

              <p className="text-[11px] text-muted/80 mt-1.5 mr-1">
                سيُطلب من الموظف تغييرها عند أول تسجيل دخول. ستظهر لك في نافذة تأكيد لنسخها بعد الحفظ.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 px-5 sm:px-7 py-3.5 sm:py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-12 px-6 rounded-2xl border border-line bg-page text-xs font-bold text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gold-gradient px-7 text-xs font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Spinner size="sm" color="ink" />}
            <span>{isEdit ? "حفظ التعديلات" : "إنشاء الحساب"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
