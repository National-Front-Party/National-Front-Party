export const ARABIC_MONTH_NAMES = Object.freeze([
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
]);

export function parsePublishedDateComponents(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateInput);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
  }
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) return null;
  return {
    year: dateObj.getUTCFullYear(),
    month: dateObj.getUTCMonth() + 1,
    day: dateObj.getUTCDate(),
  };
}

export function formatDateYMD(dateInput) {
  const parts = parsePublishedDateComponents(dateInput);
  if (!parts) return "";
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${parts.year}-${m}-${d}`;
}

export function formatArabicDateDisplay(dateInput, precision = "day") {
  const parts = parsePublishedDateComponents(dateInput);
  if (!parts) return "";
  const monthName = ARABIC_MONTH_NAMES[parts.month - 1] ?? "";
  if (precision === "month") {
    return `${monthName} ${parts.year}`.trim();
  }
  return `${parts.day} ${monthName}`.trim();
}

export function formatArabicNewsMeta(dateInput, precision = "day", sourceName = "") {
  const formattedDate = formatArabicDateDisplay(dateInput, precision);
  const trimmedSource = typeof sourceName === "string" ? sourceName.trim() : "";
  if (trimmedSource && formattedDate) {
    return `${formattedDate} · ${trimmedSource}`;
  }
  return formattedDate || trimmedSource;
}

export function splitArticleParagraphs(body) {
  if (typeof body !== "string") return [];
  return body
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function mapArticleToPublicItem(article) {
  if (!article) return null;
  const sourceName = article.source_name || article.source?.name_ar || "";
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    image_url: article.image_url ?? null,
    image_alt: article.image_alt ?? null,
    published_on: formatDateYMD(article.published_on),
    date_precision: article.date_precision ?? "day",
    formatted_date: formatArabicDateDisplay(article.published_on, article.date_precision),
    meta: formatArabicNewsMeta(article.published_on, article.date_precision, sourceName),
    is_featured: article.is_featured ?? false,
    source_name: sourceName || null,
    source: article.source
      ? {
          id: article.source.id,
          name_ar: article.source.name_ar,
          slug: article.source.slug,
        }
      : (sourceName ? { id: null, name_ar: sourceName, slug: null } : null),
  };
}

export function mapArticleToPublicDetail(article) {
  if (!article) return null;
  const baseItem = mapArticleToPublicItem(article);
  const body = typeof article.body === "string" ? article.body : "";
  return {
    ...baseItem,
    body,
    paragraphs: splitArticleParagraphs(body),
    source_url: article.source_url ?? null,
    link_label: article.source_url ? "التفاصيل من المصدر" : null,
  };
}
