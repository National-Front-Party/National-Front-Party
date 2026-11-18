"use client";

import { useRef, useState } from "react";
import { sectionCardHoverClassName } from "@/components/Home/ui/SectionCard";
import { inputBase } from "@/components/Home/ui/CustomSelect";
import RequestSectorSelect from "@/components/Home/ui/RequestSectorSelect";
import RequestToast from "@/components/Home/ui/RequestToast";
import {
  normalizeRequestPhoneInput,
  validateRequest,
} from "@/components/Home/sections/validateRequest";

const fieldInputClass = `${inputBase} focus:!shadow-[0_2px_3px_rgba(201,162,74,0.45)]`;
const invalidFieldClass =
  "focus:!border-[#C0392B] focus:!ring-2 focus:!ring-[#C0392B]/20 focus:!shadow-[0_0_0_3px_rgba(192,57,43,0.16)]";

function FieldError({ id, message }) {
  return message ? (
    <p
      id={id}
      role="alert"
      className="request-error-enter mt-1 text-xs text-red-600"
    >
      {message}
    </p>
  ) : null;
}

export default function RequestForm({
  data,
  header,
  selected,
  onSelect,
  selectedMinistry: propSelectedMinistry,
  onSelectMinistry: propOnSelectMinistry,
  selectedSector: propSelectedSector,
  onSelectSector: propOnSelectSector,
  ministryError: propMinistryError,
  onMinistryErrorChange: propOnMinistryErrorChange,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalSector, setInternalSector] = useState("");
  const [internalMinistry, setInternalMinistry] = useState("");
  const [internalMinistryError, setInternalMinistryError] = useState("");

  const currentMinistry =
    propSelectedMinistry !== undefined
      ? propSelectedMinistry
      : (selected ?? internalMinistry);
  const setMinistry = propOnSelectMinistry ?? onSelect ?? setInternalMinistry;

  const currentSector =
    propSelectedSector !== undefined ? propSelectedSector : internalSector;
  const setSector = propOnSelectSector ?? setInternalSector;

  const externalMinistryError =
    propMinistryError !== undefined ? propMinistryError : internalMinistryError;
  const setExternalMinistryError =
    propOnMinistryErrorChange ?? setInternalMinistryError;

  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const toastRef = useRef(null);
  const pendingToastRef = useRef(null);
  const toastIdRef = useRef(0);

  const sectorError = errors.sector;
  const ministryError = externalMinistryError || errors.ministry;
  const sectorValue = data.sectorOptions.some(
    (option) => option.value === currentSector,
  )
    ? currentSector
    : "";

  const ministryItem = data.ministries?.find((m) => m.id === currentMinistry);
  const entityName = ministryItem
    ? ministryItem.label
    : (data.entityNames?.[currentMinistry] ?? "اختر الوزارة من القائمة أعلاه");

  const currentValues = {
    name,
    phone,
    sector: currentSector,
    ministry: currentMinistry,
    entity: entityName,
  };

  function setFieldError(field, message) {
    setErrors((currentErrors) => {
      if (message) {
        return { ...currentErrors, [field]: message };
      }

      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleFieldBlur(field) {
    const validation = validateRequest(currentValues);
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
    setFieldError(field, validation.errors[field]);

    if (field === "name") setName(validation.payload.name);
    if (field === "phone") {
      setPhone(normalizeRequestPhoneInput(validation.payload.phone));
    }
  }

  function handleFieldChange(field, value) {
    const nextValue =
      field === "phone" ? normalizeRequestPhoneInput(value) : value;

    if (field === "name") setName(nextValue);
    if (field === "phone") setPhone(nextValue);

    if (touched[field] || errors[field]) {
      const validation = validateRequest({
        ...currentValues,
        [field]: nextValue,
      });
      setFieldError(field, validation.errors[field]);
    }
  }

  function handleSectorChange(value) {
    setSector(value);

    if (touched.sector || errors.sector) {
      const validation = validateRequest({
        ...currentValues,
        sector: value,
      });
      setFieldError("sector", validation.errors.sector);
    }
  }

  function showToast(type) {
    const nextToast = {
      id: ++toastIdRef.current,
      type,
      phase: "enter",
    };
    const currentToast = toastRef.current;

    if (currentToast) {
      pendingToastRef.current = nextToast;

      if (currentToast.phase !== "interrupted") {
        const exitingToast = { ...currentToast, phase: "interrupted" };
        toastRef.current = exitingToast;
        setToast(exitingToast);
      }

      return;
    }

    toastRef.current = nextToast;
    setToast(nextToast);
  }

  function handleToastExited(id) {
    if (toastRef.current?.id !== id) return;

    const nextToast = pendingToastRef.current;
    pendingToastRef.current = null;
    toastRef.current = nextToast;
    setToast(nextToast);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validateRequest(currentValues);
    const { payload } = validation;
    setName(payload.name);
    setPhone(normalizeRequestPhoneInput(payload.phone));
    setTouched({ name: true, phone: true, sector: true, ministry: true });
    setErrors(validation.errors);
    if (setExternalMinistryError) {
      setExternalMinistryError(validation.errors.ministry || "");
    }

    if (!validation.valid) {
      showToast("error");
      const firstInvalidField = ["ministry", "name", "phone", "sector"].find(
        (field) => validation.errors[field],
      );

      if (firstInvalidField === "ministry") {
        const firstRadio = document.querySelector('[role="radio"]');
        firstRadio?.focus();
        firstRadio?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstInvalidField === "name") {
        nameInputRef.current?.focus();
      } else if (firstInvalidField === "phone") {
        phoneInputRef.current?.focus();
      } else if (firstInvalidField === "sector") {
        document.getElementById("request-sector")?.focus();
      }

      return;
    }

    const ministryObj = data.ministries?.find((m) => m.id === currentMinistry);
    const sectorObj = data.sectorOptions?.find(
      (s) => s.value === currentSector,
    );

    const ministryDbId =
      ministryObj?.dbId ??
      (data.ministries?.findIndex((m) => m.id === currentMinistry) + 1);
    const sectorDbId = sectorObj?.dbId;

    if (!ministryDbId || !sectorDbId) {
      showToast("error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: payload.name,
          phone: payload.phone,
          ministry_id: Number(ministryDbId),
          sector_id: Number(sectorDbId),
        }),
      });

      if (!response.ok) {
        showToast("error");
        return;
      }

      setName("");
      setPhone("");
      setMinistry("");
      setSector("");
      setTouched({});
      setErrors({});
      if (setExternalMinistryError) setExternalMinistryError("");
      showToast("success");
    } catch {
      showToast("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section
        aria-label={data.requestTitle}
        dir="rtl"
        lang="ar"
        className={`flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-card ${sectionCardHoverClassName}`}
      >
        {header}
        <div className="p-4 flex-1 flex flex-col min-h-0 [&_input]:transition [&_input:focus]:border-gold [&_input:focus]:ring-2 [&_input:focus]:ring-gold/30">
          <form
            autoComplete="off"
            className="space-y-2.5 flex-1 flex flex-col justify-between"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="request-full-name"
                className="mb-2 block text-sm font-bold text-ink"
              >
                {data.fields.name}
              </label>
              <input
                ref={nameInputRef}
                id="request-full-name"
                name="fullName"
                type="text"
                maxLength={50}
                autoComplete="name"
                value={name}
                onChange={(event) =>
                  handleFieldChange("name", event.target.value)
                }
                onBlur={() => handleFieldBlur("name")}
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "request-name-error" : undefined
                }
                className={`${fieldInputClass} ${
                  errors.name ? invalidFieldClass : ""
                }`}
                style={errors.name ? { borderColor: "#C0392B" } : undefined}
              />
              <FieldError id="request-name-error" message={errors.name} />
            </div>

            <div>
              <label
                htmlFor="request-phone"
                className="mb-2 block text-sm font-bold text-ink"
              >
                {data.fields.phone}
              </label>
              <input
                ref={phoneInputRef}
                id="request-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                maxLength={11}
                dir="ltr"
                autoComplete="tel"
                placeholder={data.fields.phonePlaceholder}
                value={phone}
                onChange={(event) =>
                  handleFieldChange("phone", event.target.value)
                }
                onBlur={() => handleFieldBlur("phone")}
                aria-required="true"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={
                  errors.phone ? "request-phone-error" : undefined
                }
                className={`${fieldInputClass} ${
                  errors.phone ? invalidFieldClass : ""
                }`}
                style={errors.phone ? { borderColor: "#C0392B" } : undefined}
              />
              <FieldError id="request-phone-error" message={errors.phone} />
            </div>

            <div>
              <label
                id="request-sector-label"
                htmlFor="request-sector"
                className="mb-2 block text-sm font-bold text-ink"
              >
                {data.fields.sector}
              </label>
              <RequestSectorSelect
                id="request-sector"
                labelId="request-sector-label"
                options={data.sectorOptions}
                value={sectorValue}
                onChange={handleSectorChange}
                error={sectorError}
                errorId="request-sector-error"
                className={`${fieldInputClass} ${
                  sectorError ? invalidFieldClass : ""
                }`}
                triggerStyle={
                  sectorError ? { borderColor: "#C0392B" } : undefined
                }
              />
              <FieldError id="request-sector-error" message={sectorError} />
            </div>

            <div>
              <div
                className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                  ministryError
                    ? "border-[#C0392B] bg-[#FDEDEC] text-[#922B21] shadow-[0_0_0_3px_rgba(192,57,43,0.16)]"
                    : "border-gold-light bg-gold-tint text-ink"
                }`}
              >
                <span className="font-bold">{data.fields.entity}</span>{" "}
                <span>{entityName}</span>
              </div>
              {ministryError ? (
                <FieldError
                  id="request-ministry-error"
                  message={ministryError}
                />
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-gold-gradient px-6 font-bold text-ink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none mt-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "جاري إرسال الطلب..." : data.fields.submit}
            </button>
          </form>
        </div>
      </section>
      <RequestToast toast={toast} onExited={handleToastExited} />
    </>
  );
}
