"use client";

import ParliamentaryModal from "@/components/Home/ui/ParliamentaryModal";

export default function ParliamentaryPreviewModal({
  isOpen,
  onClose,
  item = null,
  title = "",
  personName = "",
  personRole = "",
  body = "",
  source = "",
}) {
  const displayTitle = item?.title || title || "عنوان النافذة المنبثقة";
  const displayName = item?.head_name ?? personName ?? "";
  const displayRole = item?.head_role ?? personRole ?? "";
  const rawBody = item?.body ?? body ?? "";
  const displaySource = item?.source_note ?? source ?? "";

  const paragraphs = rawBody
    ? rawBody.split(/\r?\n+/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <ParliamentaryModal
      open={isOpen}
      onClose={onClose}
      title={displayTitle}
      personName={displayName.trim() ? displayName : null}
      personRole={displayRole.trim() ? displayRole : null}
      paragraphs={
        paragraphs.length > 0
          ? paragraphs
          : ["لم يتم إدخال نص للمحتوى أو الكلمة بعد."]
      }
      source={displaySource.trim() ? displaySource : null}
    />
  );
}
