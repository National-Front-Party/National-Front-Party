export function normalizeDigits(str) {
  return str.replace(/[٠-٩]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0x0660 + 0x0030),
  );
}

export function parseNationalId(id) {
  if (typeof id !== "string") {
    return null;
  }

  const normalizedId = normalizeDigits(id);
  if (!/^[23]\d{13}$/.test(normalizedId)) {
    return null;
  }

  const century = normalizedId[0] === "2" ? 1900 : 2000;
  const year = century + Number(normalizedId.slice(1, 3));
  const month = Number(normalizedId.slice(3, 5));
  const day = Number(normalizedId.slice(5, 7));
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  if (birthDate.getTime() > todayUtc) {
    return null;
  }

  return {
    birthDate,
    gender: Number(normalizedId[12]) % 2 === 1 ? "male" : "female",
  };
}
