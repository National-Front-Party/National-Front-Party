"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Loader2 } from "lucide-react";
import ModalShell from "@/components/Home/ui/ModalShell";
import CustomSelect, {
  inputBase,
  inputError,
} from "@/components/Home/ui/CustomSelect";

const initialValues = {
  membershipType: "member",
  fullName: "",
  phone: "",
  nationalId: "",
  governorate: "",
};

const fieldOrder = ["fullName", "phone", "nationalId", "governorate"];

function toEnglishDigits(value) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
  );
}

// Client validation is for UX only; the backend must revalidate and store national IDs securely.
function validateMembership(values) {
  const errors = {};
  const fullName = (values.fullName ?? "").trim();
  const phone = toEnglishDigits(values.phone ?? "");
  const nationalId = toEnglishDigits(values.nationalId ?? "");

  if (fullName.split(/\s+/).filter(Boolean).length < 4) {
    errors.fullName = "من فضلك اكتب الاسم رباعي (أربعة أسماء على الأقل)";
  }

  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    errors.phone = "رقم الهاتف غير صحيح";
  }

  if (
    (values.membershipType === "member" || nationalId) &&
    !/^[23][0-9]{13}$/.test(nationalId)
  ) {
    errors.nationalId = "الرقم القومي يجب أن يتكون من 14 رقمًا";
  }

  if (!values.governorate) {
    errors.governorate = "من فضلك اختر المحافظة";
  }

  return errors;
}

// Local mock only; no membership data is persisted.
async function submitMembership(payload) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { success: Boolean(payload) };
}

function RequiredMark() {
  return <span aria-hidden="true" className="mr-1 text-gold">*</span>;
}

function FieldError({ id, children }) {
  return children ? (
    <p id={id} className="mt-1 text-sm text-red-600">
      {children}
    </p>
  ) : null;
}

export default function JoinModal({ open, onClose, types, governorates }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successIconEntered, setSuccessIconEntered] = useState(false);
  const requestIdRef = useRef(0);
  const submittingRef = useRef(false);
  const fullNameRef = useRef(null);
  const phoneRef = useRef(null);
  const nationalIdRef = useRef(null);
  const governorateRef = useRef(null);
  const fieldRefs = {
    fullName: fullNameRef,
    phone: phoneRef,
    nationalId: nationalIdRef,
    governorate: governorateRef,
  };

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!isSuccess) return;

    const frame = requestAnimationFrame(() => setSuccessIconEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isSuccess]);

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setHasSubmitError(false);
  }

  function handleMembershipTypeChange(membershipType) {
    const nextValues = { ...values, membershipType };
    const nationalIdError = validateMembership(nextValues).nationalId;
    setValues(nextValues);
    setErrors((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, "nationalId")) return current;
      const next = { ...current };
      if (nationalIdError) next.nationalId = nationalIdError;
      else delete next.nationalId;
      return next;
    });
    setHasSubmitError(false);
  }

  function handleBlur(name) {
    const validation = validateMembership(values);
    setErrors((current) => {
      const next = { ...current };
      if (validation[name]) next[name] = validation[name];
      else delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const validation = validateMembership(values);
    setErrors(validation);
    setHasSubmitError(false);

    const firstInvalidField = fieldOrder.find((field) => validation[field]);
    if (firstInvalidField) {
      fieldRefs[firstInvalidField].current?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    const requestId = ++requestIdRef.current;

    const payload = {
      membershipType: values.membershipType,
      fullName: values.fullName.trim(),
      phone: toEnglishDigits(values.phone).replace(/\D/g, ""),
      nationalId: toEnglishDigits(values.nationalId).replace(/\D/g, ""),
      governorate: values.governorate,
    };

    try {
      await submitMembership(payload);
      if (requestId === requestIdRef.current) setIsSuccess(true);
    } catch {
      if (requestId === requestIdRef.current) setHasSubmitError(true);
    } finally {
      if (requestId === requestIdRef.current) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="انضم للحزب"
      maxWidth="max-w-[780px]"
    >
      {isSuccess ? (
        <div
          role="status"
          className="mt-8 flex flex-col items-center gap-4 text-center"
        >
          <CheckCircle2
            aria-hidden="true"
            size={64}
            className={`text-gold transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              successIconEntered ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          />
          <h3 className="text-2xl font-extrabold text-ink">
            تم استلام طلبك بنجاح
          </h3>
          <p className="text-muted">سيتم التواصل معك قريبًا</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 min-h-14 w-full rounded-2xl bg-ink px-6 font-bold text-white transition hover:brightness-125 hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
          >
            إغلاق
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {hasSubmitError ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              حدث خطأ أثناء الإرسال، حاول مرة أخرى
            </p>
          ) : null}

          <fieldset disabled={isSubmitting} className="min-w-0">
            <legend className="mb-3 text-sm font-bold text-ink">
              نوع الانضمام
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {types.map((type) => (
                <label
                  key={type.value}
                  className="block"
                >
                  <input
                    type="radio"
                    name="membershipType"
                    value={type.value}
                    checked={values.membershipType === type.value}
                    onChange={() => handleMembershipTypeChange(type.value)}
                    disabled={isSubmitting}
                    className="peer sr-only"
                  />
                  <span
                    className={`relative block rounded-2xl border-2 p-4 text-right transition-all duration-300 hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_12px_28px_-8px_rgba(201,162,74,0.4)] active:scale-[0.98] peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none ${
                      values.membershipType === type.value
                        ? "border-gold bg-gold-tint shadow-[0_12px_28px_-8px_rgba(201,162,74,0.45)]"
                        : "border-border bg-white"
                    } ${
                      isSubmitting
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute left-3 top-3 flex size-[22px] items-center justify-center rounded-full bg-gold text-white transition-transform duration-300 motion-reduce:transition-none ${
                        values.membershipType === type.value
                          ? "scale-100"
                          : "scale-0"
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="block text-xl font-extrabold text-ink">
                      {type.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {type.subtitle}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="membership-full-name"
                className="mb-2 block text-sm font-bold text-ink"
              >
                الاسم رباعي <RequiredMark />
              </label>
              <input
                ref={fullNameRef}
                id="membership-full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="مثال: أحمد محمد علي حسن"
                value={values.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                onBlur={() => handleBlur("fullName")}
                aria-required="true"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "membership-full-name-error" : undefined}
                disabled={isSubmitting}
                className={`${inputBase} ${errors.fullName ? inputError : ""} motion-reduce:transition-none`}
              />
              <FieldError id="membership-full-name-error">
                {errors.fullName}
              </FieldError>
            </div>

            <div>
              <label
                htmlFor="membership-phone"
                className="mb-2 block text-sm font-bold text-ink"
              >
                الهاتف المحمول <RequiredMark />
              </label>
              <input
                ref={phoneRef}
                id="membership-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="مثال: 01234567890"
                dir="ltr"
                autoComplete="tel"
                value={values.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    toEnglishDigits(event.target.value).replace(/\D/g, "").slice(0, 11),
                  )
                }
                onBlur={() => handleBlur("phone")}
                aria-required="true"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "membership-phone-error" : undefined}
                disabled={isSubmitting}
                className={`${inputBase} ${errors.phone ? inputError : ""} placeholder:text-muted motion-reduce:transition-none`}
              />
              <FieldError id="membership-phone-error">{errors.phone}</FieldError>
            </div>

            <div>
              <label
                htmlFor="membership-national-id"
                className="mb-2 block text-sm font-bold text-ink"
              >
                الرقم القومي
                {values.membershipType === "member" ? <RequiredMark /> : null}
              </label>
              <input
                ref={nationalIdRef}
                id="membership-national-id"
                name="nationalId"
                type="text"
                inputMode="numeric"
                maxLength={14}
                dir="ltr"
                value={values.nationalId}
                onChange={(event) =>
                  updateField(
                    "nationalId",
                    toEnglishDigits(event.target.value).replace(/\D/g, "").slice(0, 14),
                  )
                }
                onBlur={() => handleBlur("nationalId")}
                aria-required={values.membershipType === "member"}
                aria-invalid={Boolean(errors.nationalId)}
                aria-describedby={
                  errors.nationalId ? "membership-national-id-error" : undefined
                }
                disabled={isSubmitting}
                className={`${inputBase} ${errors.nationalId ? inputError : ""} motion-reduce:transition-none`}
              />
              <FieldError id="membership-national-id-error">
                {errors.nationalId}
              </FieldError>
            </div>

            <div>
              <CustomSelect
                ref={governorateRef}
                id="membership-governorate"
                label="المحافظة"
                placeholder="اختر المحافظة"
                options={governorates}
                value={values.governorate}
                onChange={(value) => updateField("governorate", value)}
                onBlur={() => handleBlur("governorate")}
                error={errors.governorate}
                disabled={isSubmitting}
                required
              />
              <FieldError id="membership-governorate-error">
                {errors.governorate}
              </FieldError>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-125 hover:shadow-[0_12px_28px_-8px_rgba(22,22,26,0.55)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:transform-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" size={20} className="animate-spin" />
                <span>جارٍ الإرسال...</span>
              </>
            ) : (
              <>
                <span>إرسال الطلب</span>
                <ArrowLeft
                  aria-hidden="true"
                  size={18}
                  className="text-gold-light opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 motion-reduce:transition-none"
                />
              </>
            )}
          </button>
        </form>
      )}
    </ModalShell>
  );
}
