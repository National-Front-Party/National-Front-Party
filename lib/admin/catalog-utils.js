const ARABIC_TRANSLITERATION_MAP = {
  "أ": "a", "إ": "e", "آ": "a", "ا": "a",
  "ب": "b", "ت": "t", "ث": "th",
  "ج": "g", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "z", "ر": "r", "ز": "z",
  "س": "s", "ش": "sh", "ص": "s", "ض": "d",
  "ط": "t", "ظ": "z", "ع": "a", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l",
  "م": "m", "ن": "n", "ه": "h", "و": "w",
  "ي": "y", "ى": "a", "ة": "h", "ء": "", "ئ": "y", "ؤ": "o",
};

export function transliterateArabic(text) {
  if (typeof text !== "string") return "";
  return text
    .split("")
    .map((char) => ARABIC_TRANSLITERATION_MAP[char] || char)
    .join("");
}

/**
 * Generates a valid, non-empty, URL/code-friendly, and collision-resistant identifier
 * for ministries (slug) and request sectors (code).
 */
export function generateCatalogIdentifier(name, type) {
  const defaultPrefix = type === "ministries" ? "min" : "sec";
  let base = transliterateArabic(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

  if (!base) {
    base = defaultPrefix;
  }

  // Reliable browser and Node.js-supported unique entropy
  let uniqueSuffix;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    uniqueSuffix = crypto.randomUUID().slice(0, 8);
  } else {
    uniqueSuffix = Math.random().toString(36).slice(2, 10);
  }

  return `${base}-${uniqueSuffix}`.toLowerCase();
}
