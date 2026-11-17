const fieldNames = {
  full_name: "fullName",
  phone: "phone",
  national_id: "nationalId",
  governorate_id: "governorate",
  terms_accepted: "termsAccepted",
};

const genericErrorMessage = "حدث خطأ، حاول مرة أخرى لاحقا";

export function mapApplicationResponse({ status, body, retryAfter }) {
  if (status === 201 && typeof body?.application_no === "string") {
    return {
      kind: "success",
      applicationNo: body.application_no,
    };
  }

  if (status === 400 && body?.error === "VALIDATION") {
    const errors = {};
    for (const [apiField, messages] of Object.entries(body.issues ?? {})) {
      const field = fieldNames[apiField];
      if (field && Array.isArray(messages) && typeof messages[0] === "string") {
        errors[field] = messages[0];
      }
    }

    return Object.keys(errors).length
      ? { kind: "error", errors }
      : { kind: "error", message: genericErrorMessage };
  }

  if (status === 400 && body?.error === "INVALID_NATIONAL_ID") {
    return {
      kind: "error",
      errors: { nationalId: "الرقم القومي غير صحيح" },
    };
  }

  if (status === 400 && body?.error === "INVALID_GOVERNORATE") {
    return {
      kind: "error",
      errors: { governorate: "المحافظة غير صحيحة، اختر محافظة من القائمة" },
    };
  }

  if (status === 409 && body?.error === "DUPLICATE") {
    return {
      kind: "error",
      message: "تم استلام طلب سابق بنفس الرقم القومي",
    };
  }

  if (status === 429 && body?.error === "RATE_LIMITED") {
    const seconds = Number(retryAfter);
    const minutes = Number.isFinite(seconds)
      ? Math.max(1, Math.ceil(seconds / 60))
      : 1;
    return {
      kind: "error",
      message: `محاولات كثيرة، حاول مرة أخرى بعد ${minutes} دقيقة`,
    };
  }

  return {
    kind: "error",
    message: genericErrorMessage,
  };
}
