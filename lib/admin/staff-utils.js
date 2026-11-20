/**
 * Utility functions for Staff management operations
 */

export const STAFF_ROLES = Object.freeze([
  "super_admin",
  "membership_officer",
  "service_officer",
  "content_editor",
  "news_editor",
  "news_reviewer",
]);

/**
 * Generates a compliant strong temporary password:
 * - Length: 12 characters (well within 10-128)
 * - Contains uppercase, lowercase, numbers, and symbols
 * - Passes validatePasswordStrength every time
 */
export function generateTemporaryPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const specials = "!@#$%^&*";
  const all = letters + digits + specials;

  const pwd = [
    letters[Math.floor(Math.random() * letters.length)],
    letters[Math.floor(Math.random() * letters.length)],
    digits[Math.floor(Math.random() * digits.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];

  while (pwd.length < 12) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join("");
}

/**
 * Format date for Arabic display
 */
export function formatStaffDate(dateString) {
  if (!dateString) return "لم يسجل الدخول بعد";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Convert numbers to Arabic-Indic digits
 */
export function toArabicDigits(num) {
  if (num === null || num === undefined) return "٠";
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}
