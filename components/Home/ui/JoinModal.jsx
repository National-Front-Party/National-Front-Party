
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Loader2 } from "lucide-react";
import ModalShell from "@/components/Home/ui/ModalShell";
import CustomSelect, {
  inputBase,
} from "@/components/Home/ui/CustomSelect";
import { parseNationalId } from "@/lib/national-id";
import { mapApplicationResponse } from "@/components/Home/ui/application-response";

const initialValues = {
  membershipType: "member",
  fullName: "",
  phone: "",
  nationalId: "",
  governorateId: "",
  termsAccepted: false,
};

const fieldOrder = [
  "fullName",
  "phone",
  "nationalId",
  "governorate",
  "termsAccepted",
];

const fieldInputClass = `${inputBase} focus:!shadow-[0_2px_3px_rgba(201,162,74,0.45)]`;

function toEnglishDigits(value) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
  );
}

// Client validation is for UX only; the backend must revalidate and store national IDs securely.
function validateMembership(values, governorates) {
  const errors = {};
  const fullName = (values.fullName ?? "").trim();
  const phone = toEnglishDigits(values.phone ?? "");
  const nationalId = toEnglishDigits(values.nationalId ?? "");

  if (
  fullName.length < 8 ||
  fullName.length > 120 ||
  fullName.split(/\s+/).filter(Boolean).length < 4
) {
  errors.fullName = "يرجى إدخال الاسم الرباعي كاملًا";
}

if (!/^01[0125]\d{8}$/.test(phone)) {
  errors.phone = "يرجى إدخال رقم هاتف محمول مصري صحيح";
}

if (!/^[23]\d{13}$/.test(nationalId) || !parseNationalId(nationalId)) {
  errors.nationalId = "يرجى إدخال رقم قومي صحيح مكوّن من 14 رقمًا";
}

if (
  !governorates.some(
    (governorate) => governorate.value === values.governorateId,
  )
) {
  errors.governorate = "يرجى اختيار المحافظة";
}

if (values.termsAccepted !== true) {
  errors.termsAccepted = "يرجى الموافقة على الشروط والأحكام للمتابعة";
}

return errors;
}

function RequiredMark() {
  return <span aria-hidden="true" className="mr-1 text-gold">*</span>;
}

function FieldError({ id, children }) {
  return children ? (
    <p id={id} className="mt-1 text-xs text-red-600">
      {children}
    </p>
  ) : null;
}

export default function JoinModal({ open, onClose, types }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState("");
  const [successIconEntered, setSuccessIconEntered] = useState(false);
  const [governorates, setGovernorates] = useState([]);
  const [isLoadingGovernorates, setIsLoadingGovernorates] = useState(true);
  const [governoratesLoadError, setGovernoratesLoadError] = useState(false);
  const [governoratesRetry, setGovernoratesRetry] = useState(0);

  const requestIdRef = useRef(0);
  const submittingRef = useRef(false);
  const fullNameRef = useRef(null);
  const phoneRef = useRef(null);
  const nationalIdRef = useRef(null);
  const governorateRef = useRef(null);
  const termsAcceptedRef = useRef(null);

  const fieldRefs = {
    fullName: fullNameRef,
    phone: phoneRef,
    nationalId: nationalIdRef,
    governorate: governorateRef,
    termsAccepted: termsAcceptedRef,
  };

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadGovernorates() {
      setIsLoadingGovernorates(true);
      setGovernoratesLoadError(false);

      try {
        const response = await fetch("/api/governorates", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Governorates request failed.");
        }

        const body = await response.json();

        if (
          !Array.isArray(body.governorates) ||
          !body.governorates.every(
            (item) =>
              Number.isInteger(item.id) && typeof item.name_ar === "string",
          )
        ) {
          throw new Error("Governorates response was invalid.");
        }

        if (active) {
          setGovernorates(
            body.governorates.map(({ id, name_ar }) => ({
              value: id,
              label: name_ar,
            })),
          );
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setGovernorates([]);
          setGovernoratesLoadError(true);
        }
      } finally {
        if (active) setIsLoadingGovernorates(false);
      }
    }

    loadGovernorates();

    return () => {
      active = false;
      controller.abort();
    };
  }, [governoratesRetry]);

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

    setSubmitError("");
  }

  function handleMembershipTypeChange(membershipType) {
    setValues((current) => ({ ...current, membershipType }));
    setSubmitError("");
  }

  function handleBlur(name) {
    const validation = validateMembership(values, governorates);

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

    const validation = validateMembership(values, governorates);

    setErrors(validation);
    setSubmitError("");

    const firstInvalidField = fieldOrder.find(
      (field) => validation[field],
    );

    if (firstInvalidField) {
      fieldRefs[firstInvalidField].current?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    const requestId = ++requestIdRef.current;

    const payload = {
      type: values.membershipType,
      full_name: values.fullName.trim(),
      phone: toEnglishDigits(values.phone),
      national_id: toEnglishDigits(values.nationalId),
      governorate_id: Number(values.governorateId),
      terms_accepted: values.termsAccepted,
      website: "",
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      const result = mapApplicationResponse({
        status: response.status,
        body,
        retryAfter: response.headers.get("Retry-After"),
      });

      if (requestId !== requestIdRef.current) return;

      if (result.kind === "success") {
        setValues(initialValues);
        setErrors({});
        setApplicationNumber(result.applicationNo);
        setIsSuccess(true);
      } else {
        const nextErrors = result.errors ?? {};

        setErrors(nextErrors);
        setSubmitError(result.message ?? "");

        const firstInvalidField = fieldOrder.find(
          (field) => nextErrors[field],
        );

        if (firstInvalidField) {
          fieldRefs[firstInvalidField].current?.focus();
        }
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setSubmitError("حدث خطأ، حاول مرة أخرى لاحقا");
      }
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
              successIconEntered
                ? "scale-100 opacity-100"
                : "scale-50 opacity-0"
            }`}
          />

          <h3 className="text-2xl font-extrabold text-ink">
            تم استلام طلبك بنجاح
          </h3>

          <p className="font-bold text-ink">
            تم استلام طلبك برقم {applicationNumber}
          </p>

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
        <form
          onSubmit={handleSubmit}
          noValidate
          autoComplete="off"
          className="-mx-2 mt-3 space-y-3 px-2 pb-2"
        >
          {submitError ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </p>
          ) : null}

          {/* Honeypot field (anti-bot). */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="membership-website" aria-hidden="true">
              Website
            </label>

            <input
              id="membership-website"
              name="website"
              type="text"
              value=""
              readOnly
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
          </div>

          <fieldset disabled={isSubmitting} className="min-w-0">
            <legend className="mb-2 text-sm font-bold text-ink">
              نوع الانضمام
            </legend>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {types.map((type) => (
                <label key={type.value} className="block">
                  <input
                    type="radio"
                    name="membershipType"
                    value={type.value}
                    checked={values.membershipType === type.value}
                    onChange={() =>
                      handleMembershipTypeChange(type.value)
                    }
                    disabled={isSubmitting}
                    className="peer sr-only"
                  />

                  <span
                    className={`relative block rounded-2xl border-2 px-4 py-3 text-right transition-all duration-300 hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_12px_28px_-8px_rgba(201,162,74,0.4)] active:scale-[0.98] peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none ${
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

                    <span className="block text-lg font-extrabold text-ink">
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

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
            {/* Full Name */}
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
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
                onBlur={() => handleBlur("fullName")}
                aria-required="true"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={
                  errors.fullName
                    ? "membership-full-name-error"
                    : undefined
                }
                disabled={isSubmitting}
                className={fieldInputClass}
              />

              <FieldError id="membership-full-name-error">
                {errors.fullName}
              </FieldError>
            </div>

            {/* Phone */}
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
                    toEnglishDigits(event.target.value).slice(0, 11),
                  )
                }
                onBlur={() => handleBlur("phone")}
                aria-required="true"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={
                  errors.phone
                    ? "membership-phone-error"
                    : undefined
                }
                disabled={isSubmitting}
                className={fieldInputClass}
              />

              <FieldError id="membership-phone-error">
                {errors.phone}
              </FieldError>
            </div>

            {/* National ID */}
            <div>
              <label
                htmlFor="membership-national-id"
                className="mb-2 block text-sm font-bold text-ink"
              >
                الرقم القومي <RequiredMark />
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
                    toEnglishDigits(event.target.value).slice(0, 14),
                  )
                }
                onBlur={() => handleBlur("nationalId")}
                aria-required="true"
                aria-invalid={Boolean(errors.nationalId)}
                aria-describedby={
                  errors.nationalId
                    ? "membership-national-id-error"
                    : undefined
                }
                disabled={isSubmitting}
                className={fieldInputClass}
              />

              <FieldError id="membership-national-id-error">
                {errors.nationalId}
              </FieldError>
            </div>

            {/* Governorate */}
            <div>
              <CustomSelect
                ref={governorateRef}
                id="membership-governorate"
                label="المحافظة"
                placeholder="اختر المحافظة"
                options={governorates}
                value={values.governorateId}
                onChange={(value) =>
                  updateField("governorateId", value)
                }
                onBlur={() => handleBlur("governorate")}
                disabled={isSubmitting}
                required
              />

              <FieldError id="membership-governorate-error">
                {errors.governorate}
              </FieldError>

              {isLoadingGovernorates ? (
                <p role="status" className="mt-1 text-xs text-muted">
                  جارٍ تحميل المحافظات...
                </p>
              ) : null}

              {governoratesLoadError ? (
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p role="alert" className="text-xs text-red-600">
                    تعذر تحميل المحافظات
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setGovernoratesRetry((count) => count + 1)
                    }
                    className="rounded-lg px-2 py-1 text-xs font-bold text-ink underline decoration-gold underline-offset-4 hover:text-gold"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Terms */}
          <div>
            <label
              htmlFor="membership-terms-accepted"
              className={`flex cursor-pointer items-center gap-3 text-sm font-medium text-ink ${
                isSubmitting
                  ? "cursor-not-allowed opacity-60"
                  : ""
              }`}
            >
              <input
                ref={termsAcceptedRef}
                id="membership-terms-accepted"
                name="terms_accepted"
                type="checkbox"
                checked={values.termsAccepted}
                onChange={(event) =>
                  updateField("termsAccepted", event.target.checked)
                }
                onBlur={() => handleBlur("termsAccepted")}
                aria-required="true"
                aria-invalid={Boolean(errors.termsAccepted)}
                aria-describedby={
                  errors.termsAccepted
                    ? "membership-terms-accepted-error"
                    : undefined
                }
                disabled={isSubmitting}
                className="size-5 shrink-0 cursor-pointer accent-gold"
              />

              <span>
                أقر بصحة بياناتي وأوافق على شروط الانضمام
                <RequiredMark />
              </span>
            </label>

            <FieldError id="membership-terms-accepted-error">
              {errors.termsAccepted}
            </FieldError>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-125 hover:shadow-[0_12px_28px_-8px_rgba(22,22,26,0.55)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:transform-none"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  aria-hidden="true"
                  size={20}
                  className="animate-spin"
                />
                <span>جاري الإرسال...</span>
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
