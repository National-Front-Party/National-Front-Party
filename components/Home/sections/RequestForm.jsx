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

export default function RequestForm({ data, header, selected, onSelect }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const toastRef = useRef(null);
  const pendingToastRef = useRef(null);
  const toastIdRef = useRef(0);
  const sectorError = selected ? undefined : errors.sector;
  const sectorValue = data.sectorOptions.some(
    (option) => option.value === selected,
  )
    ? selected
    : "";
  const entityName = data.entityNames[selected] ?? data.entityNames[""];
  const currentValues = {
    name,
    phone,
    sector: selected,
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
    onSelect(value);

    if (touched.sector || errors.sector) {
      const validation = validateRequest({
        ...currentValues,
        sector: value,
        entity: data.entityNames[value] ?? data.entityNames[""],
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

  function handleSubmit(event) {
    event.preventDefault();

    const validation = validateRequest(currentValues);
    const { payload } = validation;
    setName(payload.name);
    setPhone(normalizeRequestPhoneInput(payload.phone));
    setTouched({ name: true, phone: true, sector: true });
    setErrors(validation.errors);

    if (!validation.valid) {
      showToast("error");
      const firstInvalidField = ["name", "phone", "sector"].find(
        (field) => validation.errors[field],
      );

      if (firstInvalidField === "name") nameInputRef.current?.focus();
      if (firstInvalidField === "phone") phoneInputRef.current?.focus();
      if (firstInvalidField === "sector") {
        document.getElementById("request-sector")?.focus();
      }

      return;
    }

    setName("");
    setPhone("");
    onSelect("");
    setTouched({});
    setErrors({});
    showToast("success");
  }

  return (
    <>
      <section
        aria-label={data.requestTitle}
        dir="rtl"
        lang="ar"
        className={`flex h-auto min-w-0 w-full flex-none flex-col overflow-hidden rounded-3xl bg-white shadow-card ${sectionCardHoverClassName}`}
      >
        {header}
        <div className="p-4 [&_input]:transition [&_input:focus]:border-gold [&_input:focus]:ring-2 [&_input:focus]:ring-gold/30">
          <form
            autoComplete="off"
            className="space-y-2.5"
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

            <p className="rounded-xl border border-gold-light bg-gold-tint px-4 py-3 text-sm text-ink">
              <span className="font-bold">{data.fields.entity}</span>{" "}
              {entityName}
            </p>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-gold-gradient px-6 font-bold text-ink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"
            >
              {data.fields.submit}
            </button>
          </form>
        </div>
      </section>
      <RequestToast toast={toast} onExited={handleToastExited} />
    </>
  );
}
