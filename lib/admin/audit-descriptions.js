import { ROLE_LABELS } from "./permissions.js";

const ENTITY_LABELS = {
  panel: "القسم القيادي",
  leader: "القيادي",
  leadership_content: "المحتوى القيادي",
  popup: "المحتوى المنبثق",
  news_article: "الخبر",
  news_source: "مصدر الأخبار",
  central_secretariat: "الأمانة المركزية",
  central_secretariat_person: "عضو الأمانة المركزية",
  governorate_secretariat_person: "عضو أمانة المحافظة",
  parliamentary_unit_item: "عنصر الهيئة البرلمانية",
};

function cleanName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function quoteName(value, fallback) {
  const name = cleanName(value);
  return name ? `«${name}»` : fallback;
}

function getDetails(record) {
  const details = record?.details;
  return details && typeof details === "object" && !Array.isArray(details)
    ? details
    : {};
}

function formatRole(role) {
  return Object.hasOwn(ROLE_LABELS, role) ? ROLE_LABELS[role] : "دور وظيفي آخر";
}

function publicationSentence(details) {
  const published = typeof details.new_is_published === "boolean"
    ? details.new_is_published
    : details.is_published;
  if (typeof published !== "boolean") return "";
  return published
    ? "، وحالة النشر الآن منشورة"
    : "، وحالة النشر الآن غير منشورة";
}

export function getOperationDescription(record) {
  const details = getDetails(record);
  const action = record?.action_type;
  const targetName = cleanName(record?.target_name);
  const employee = quoteName(targetName, "الموظف");
  const entity = Object.hasOwn(ENTITY_LABELS, details.entity_type)
    ? ENTITY_LABELS[details.entity_type]
    : "المحتوى";
  const content = targetName ? `${entity} ${quoteName(targetName, "العنصر")}` : entity;

  switch (action) {
    case "staff_created": {
      let description = `تم إنشاء حساب الموظف ${employee}`;
      if (details.new_role) description += `، وتعيين دور ${formatRole(details.new_role)}`;
      if (details.new_is_active === true) description += "، وأصبح الحساب نشطًا";
      else if (details.new_is_active === false) description += "، وأصبح الحساب غير نشط";
      return `${description}.`;
    }
    case "staff_profile_updated":
      return `تم تحديث بيانات الموظف ${employee}، وأصبحت التعديلات محفوظة على النظام.`;
    case "staff_role_changed": {
      const previousRole = details.previous_role;
      const newRole = details.new_role;
      if (previousRole && newRole) {
        return `تم تغيير دور الموظف ${employee} من ${formatRole(previousRole)} إلى ${formatRole(newRole)}، وأصبحت صلاحياته مرتبطة بالدور الجديد.`;
      }
      if (newRole) {
        return `تم تحديث دور الموظف ${employee} إلى ${formatRole(newRole)}، وأصبحت صلاحياته مرتبطة بالدور الجديد.`;
      }
      return `تم تحديث دور الموظف ${employee} وصلاحياته في النظام.`;
    }
    case "staff_activated":
      return `تم تفعيل حساب الموظف ${employee}، وأصبحت حالة الحساب نشطة في النظام.`;
    case "staff_deactivated":
      return `تم تعطيل حساب الموظف ${employee}، وأصبح الحساب غير نشط ولن يتمكن من تسجيل الدخول إلى النظام.`;
    case "staff_password_reset":
      return `تمت إعادة تعيين كلمة مرور حساب الموظف ${employee}، وسيُطلب منه تغييرها عند تسجيل الدخول التالي.`;
    case "content_created":
      return targetName
        ? `تم إنشاء ${entity} ${quoteName(targetName, "العنصر")} وحُفظ على النظام.`
        : `تم إنشاء عنصر جديد من نوع ${entity} وحُفظ على النظام.`;
    case "content_updated":
      return `تم تحديث بيانات ${entity}${targetName ? ` ${quoteName(targetName, "العنصر")}` : ""}${publicationSentence(details)}، وأصبحت التعديلات محفوظة على النظام.`;
    case "content_published":
      return details.entity_type === "news_article"
        ? `تم نشر ${content}، وأصبح متاحًا للزوار على الموقع.`
        : `تم نشر ${content}، وأصبحت حالة نشره منشورة على الموقع.`;
    case "content_unpublished":
      return `تم إلغاء نشر ${content}، وأصبحت حالته غير منشورة ولن يظهر ضمن المحتوى المنشور الذي يعرضه الموقع.`;
    case "content_deleted": {
      const cascadeCount = Number.isInteger(details.cascade_deleted_people_count)
        ? details.cascade_deleted_people_count
        : null;
      const cascadeDescription = cascadeCount === null || cascadeCount <= 0
        ? ""
        : `، وشمل ذلك حذف ${cascadeCount} من الأعضاء المرتبطين بها`;
      return `تم حذف ${targetName ? `${entity} ${quoteName(targetName, "العنصر")}` : entity} من النظام${cascadeDescription}.`;
    }
    default:
      return targetName
        ? `تم تنفيذ إجراء إداري على ${quoteName(targetName, "العنصر")}.`
        : "تم تسجيل إجراء إداري في النظام.";
  }
}
