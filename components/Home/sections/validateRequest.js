const NAME_PATTERN =
  /^(?:(?=\p{Script=Arabic})\p{L}|(?=\p{Script=Latin})\p{L}| )+$/u;
const PHONE_SEPARATORS = /[\s\-‐‑‒–—―]/g;
const ARABIC_INDIC_DIGITS = /[٠-٩]/g;

const errorMessages = {
  nameRequired: "من فضلك أدخل الاسم",
  nameTooShort: "الاسم يجب ألا يقل عن 3 أحرف",
  nameTooLong: "الاسم يجب ألا يزيد عن 50 حرفًا",
  nameInvalid: "الاسم يجب أن يحتوي على حروف فقط",
  phoneRequired: "من فضلك أدخل رقم الموبايل",
  phoneInvalid: "أدخل رقم موبايل مصري صحيح مكون من 11 رقم",
  sectorRequired: "من فضلك اختر القطاع أو الجهة",
};

export function normalizeRequestName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeRequestPhone(value) {
  return String(value ?? "")
    .replace(ARABIC_INDIC_DIGITS, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(PHONE_SEPARATORS, "");
}

export function normalizeRequestPhoneInput(value) {
  return normalizeRequestPhone(value).replace(/\D/g, "").slice(0, 11);
}

export function validateRequest({ name, phone, sector, entity } = {}) {
  const payload = {
    name: normalizeRequestName(name),
    phone: normalizeRequestPhone(phone),
    sector: String(sector ?? ""),
    entity: String(entity ?? ""),
  };
  const errors = {};
  const nameLength = [...payload.name].length;

  if (!payload.name) {
    errors.name = errorMessages.nameRequired;
  } else if (nameLength < 3) {
    errors.name = errorMessages.nameTooShort;
  } else if (nameLength > 50) {
    errors.name = errorMessages.nameTooLong;
  } else if (!NAME_PATTERN.test(payload.name)) {
    errors.name = errorMessages.nameInvalid;
  }

  if (!payload.phone) {
    errors.phone = errorMessages.phoneRequired;
  } else if (!/^01[0125][0-9]{8}$/.test(payload.phone)) {
    errors.phone = errorMessages.phoneInvalid;
  }

  if (!payload.sector) {
    errors.sector = errorMessages.sectorRequired;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    payload,
  };
}
