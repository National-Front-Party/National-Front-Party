"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Building2, ChevronLeft, ChevronRight, FileText, Landmark, MapPin,
  Pencil, Plus, RefreshCw, Trash2, Users, X, Check, Eye, EyeOff,
} from "lucide-react";
import Button from "@/components/Admin/ui/Button";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/Admin/ui/Card";
import Field, { inputClass } from "@/components/Admin/ui/Field";
import EmptyState from "@/components/Admin/ui/EmptyState";
import PageHeader from "@/components/Admin/ui/PageHeader";
import Skeleton from "@/components/Admin/ui/Skeleton";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { CONTENT_RESOURCES, CONTENT_SECTIONS, LEADERSHIP_RESOURCES } from "./content-config";

const iconMap = { central: Building2, governorate: MapPin, parliamentary: Landmark, leadership: Users, popups: FileText };
const labels = {
  name_ar: "اسم الأمانة", full_name: "الاسم", title: "العنوان", slug: "المعرّف",
  head_name: "الأمين / الرئيس", role_title: "الصفة", governorate: "المحافظة",
  governorate_id: "المحافظة", panel_id: "القسم", leaders_heading: "عنوان القيادات",
  button_label: "نص الزر", person_name: "الشخص", source_note: "المصدر",
  sort_order: "الترتيب", is_published: "حالة النشر",
};
const valueOf = (item, key) => key === "governorate" ? item.governorate?.name_ar : item[key];

function ContentForm({ resource, record, options, onSubmit, onClose, saving, error }) {
  const [values, setValues] = useState(() => {
    const initial = {};
    for (const field of resource.fields) {
      if (field.name === "info_item_id" && record) continue;
      const current = record?.[field.name];
      initial[field.name] = field.type === "checkbox" ? Boolean(current) : field.type === "date" && current ? String(current).slice(0, 10) : current ?? "";
    }
    return initial;
  });
  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    const payload = {};
    for (const field of resource.fields) {
      if (field.name === "info_item_id" && record) continue;
      const value = values[field.name];
      if (field.type === "checkbox") payload[field.name] = Boolean(value);
      else if (field.type === "number") {
        if (value !== "") payload[field.name] = Number(value);
      } else payload[field.name] = value;
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="content-form-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-line bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <div>
            <h2 id="content-form-title" className="text-lg font-black text-ink">{record ? `تعديل ${resource.title}` : `إضافة ${resource.title}`}</h2>
            <p className="mt-1 text-xs text-muted">تُطبّق قواعد التحقق المعتمدة عند الحفظ.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:border-gold hover:bg-gold-tint hover:text-gold-dark"><X className="size-5" /></button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid gap-x-5 gap-y-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
            {resource.fields.map((field) => {
              if (field.name === "info_item_id" && record) return null;
              const value = values[field.name];
              if (field.type === "checkbox") return (
                <label key={field.name} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-page/50 px-4 text-sm font-bold text-ink sm:col-span-2">
                  <input type="checkbox" checked={Boolean(value)} onChange={(event) => setValue(field.name, event.target.checked)} className="size-5 accent-[#C9A24B]" />
                  {field.label}
                </label>
              );
              if (["textarea", "select", "governorate", "panel"].includes(field.type)) {
                const choices = field.type === "governorate" ? options.governorates : field.type === "panel" ? options.panels : field.options;
                return (
                  <Field key={field.name} id={field.name} name={field.name} label={field.label} required={field.required} hint={field.hint} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    {field.type === "textarea" ? (
                      <textarea id={field.name} name={field.name} rows={field.rows || 4} required={field.required} value={value} onChange={(event) => setValue(field.name, event.target.value)} className={`${inputClass} h-auto min-h-28 py-3`} />
                    ) : (
                      <select id={field.name} name={field.name} required={field.required} value={value} onChange={(event) => setValue(field.name, event.target.value)} className={inputClass}>
                        <option value="">اختر {field.label}</option>
                        {(choices || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    )}
                  </Field>
                );
              }
              return (
                <div key={field.name} className={field.preview && value ? "sm:col-span-2" : ""}>
                  <Field id={field.name} name={field.name} label={field.label} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => setValue(field.name, event.target.value)} required={field.required} hint={field.hint} />
                  {field.preview && value && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-page/40 p-3"><Image src={value} alt={`معاينة ${field.label}`} width={96} height={72} unoptimized className="h-18 w-24 rounded-xl object-cover" /><span className="min-w-0 break-all text-xs text-muted">معاينة الصورة</span></div>}
                </div>
              );
            })}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-line bg-page/40 p-4 sm:flex-row sm:justify-end sm:px-7">
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button type="submit" loading={saving}>{record ? "حفظ التعديلات" : "إنشاء"}</Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ConfirmDelete({ title, loading, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-black text-ink">تأكيد الحذف</h3>
        <p className="mt-2 text-sm leading-7 text-muted">هل تريد حذف «{title}»؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>إلغاء</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>حذف نهائي</Button>
        </div>
      </div>
    </div>
  );
}

function PeopleManager({ parent, onClose }) {
  const { showError, showSuccess } = useToast();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [personForm, setPersonForm] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const endpoint = `/api/admin/content/central-secretariats/${parent.id}`;
  const peopleResource = useMemo(() => ({ title: "شخص", titleField: "full_name", fields: [
    { name: "full_name", label: "الاسم بالكامل", required: true },
    { name: "position_title", label: "الصفة" },
    { name: "image_url", label: "رابط الصورة", type: "url", preview: true },
    { name: "details", label: "التفاصيل", type: "textarea", rows: 4 },
    { name: "sort_order", label: "ترتيب الظهور", type: "number" },
    { name: "is_published", label: "منشور على الموقع", type: "checkbox" },
  ] }), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch(endpoint);
      setPeople(data.central_secretariat?.people || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل الأسماء");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  // Loading here synchronizes this dialog with its API resource.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (personForm?.id) await adminFetch(`${endpoint}/people/${personForm.id}`, { method: "PATCH", body: payload });
      else await adminFetch(`${endpoint}/people`, { method: "POST", body: payload });
      setPersonForm(undefined);
      showSuccess("تم حفظ البيانات بنجاح");
      await load();
    } catch (err) {
      showError(err.message || "تعذر حفظ البيانات");
    } finally { setSaving(false); }
  };

  const toggle = async (person) => {
    setBusyId(person.id);
    try {
      await adminFetch(`${endpoint}/people/${person.id}/status`, { method: "PATCH", body: { is_published: !person.is_published } });
      showSuccess("تم تحديث حالة النشر");
      await load();
    } catch (err) { showError(err.message || "تعذر تحديث الحالة"); }
    finally { setBusyId(null); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminFetch(`${endpoint}/people/${deleteTarget.id}`, { method: "DELETE", body: { confirm: true } });
      setDeleteTarget(null);
      showSuccess("تم حذف الشخص");
      await load();
    } catch (err) { showError(err.message || "تعذر حذف الشخص"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="people-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-page shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4 sm:px-7">
          <div><h2 id="people-title" className="font-black text-ink">أسماء أمانة «{parent.name_ar}»</h2><p className="mt-1 text-xs text-muted">إدارة الأعضاء المرتبطين بالأمانة</p></div>
          <div className="flex items-center gap-2"><Button size="sm" icon={Plus} onClick={() => setPersonForm({})}>إضافة شخص</Button><button type="button" onClick={onClose} aria-label="إغلاق" className="flex size-10 items-center justify-center rounded-xl border border-line text-muted hover:border-gold hover:bg-gold-tint hover:text-gold-dark"><X className="size-5" /></button></div>
        </header>
        <div className="overflow-auto p-4 sm:p-6">
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading ? <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : people.length === 0 ? <EmptyState title="لا يوجد أشخاص مسجلون" description="أضف أول شخص مرتبط بهذه الأمانة." /> : (
            <div className="grid gap-3 md:grid-cols-2">{people.map((person) => <Card key={person.id} className="p-4"><div className="flex items-center gap-3">
              {person.image_url ? <Image src={person.image_url} alt="" width={56} height={56} unoptimized className="size-14 rounded-xl object-cover" /> : <div className="flex size-14 items-center justify-center rounded-xl bg-gold-tint text-gold-dark"><Users className="size-6" /></div>}
              <div className="min-w-0 flex-1"><p className="truncate font-bold text-ink">{person.full_name}</p><p className="truncate text-xs text-muted">{person.position_title || "—"}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${person.is_published ? "bg-emerald-50 text-emerald-700" : "bg-page text-muted"}`}>{person.is_published ? "منشور" : "مسودة"}</span></div>
              <div className="flex gap-1"><button type="button" title={person.is_published ? "إلغاء النشر" : "نشر"} disabled={busyId === person.id} onClick={() => toggle(person)} className="rounded-lg p-2 text-muted hover:bg-gold-tint hover:text-gold-dark">{person.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button><button type="button" title="تعديل" onClick={() => setPersonForm(person)} className="rounded-lg p-2 text-muted hover:bg-gold-tint hover:text-gold-dark"><Pencil className="size-4" /></button><button type="button" title="حذف" disabled={busyId === person.id} onClick={() => setDeleteTarget(person)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button></div>
            </div></Card>)}</div>
          )}
        </div>
      </section>
      {personForm !== undefined && <ContentForm resource={peopleResource} record={personForm} options={{}} saving={saving} onClose={() => setPersonForm(undefined)} onSubmit={save} />}
      {deleteTarget && <ConfirmDelete title={deleteTarget.full_name} loading={busyId === deleteTarget.id} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
    </div>
  );
}

function ResourceManager({ resourceId, options }) {
  const resource = CONTENT_RESOURCES[resourceId];
  const { showError, showSuccess } = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 25, total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [formRecord, setFormRecord] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [peopleParent, setPeopleParent] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (nextPage = page, quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(nextPage), page_size: "25" });
      const data = await adminFetch(`${resource.endpoint}?${query}`);
      const items = data.items || data[resource.collectionKey] || [];
      setRows(items);
      setPagination(data.pagination || { page: nextPage, page_size: 25, total: items.length, total_pages: 1 });
    } catch (err) {
      setError(err.message || "تعذر تحميل المحتوى");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, resource]);
  // Loading here synchronizes the selected page with its API resource.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(page); }, [load, page]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) => resource.columns.some((key) => String(valueOf(row, key) ?? "").toLocaleLowerCase().includes(query)));
  }, [rows, resource.columns, search]);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (formRecord?.id) await adminFetch(`${resource.endpoint}/${formRecord.id}`, { method: "PATCH", body: payload });
      else await adminFetch(resource.endpoint, { method: "POST", body: payload });
      setFormRecord(undefined);
      showSuccess("تم حفظ المحتوى بنجاح");
      await load(page, true);
    } catch (err) { showError(err.message || "تعذر حفظ المحتوى"); }
    finally { setSaving(false); }
  };

  const toggle = async (row) => {
    setBusyId(row.id);
    try {
      await adminFetch(`${resource.endpoint}/${row.id}/status`, { method: "PATCH", body: { is_published: !row.is_published } });
      showSuccess("تم تحديث حالة النشر");
      await load(page, true);
    } catch (err) { showError(err.message || "تعذر تحديث الحالة"); }
    finally { setBusyId(null); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminFetch(`${resource.endpoint}/${deleteTarget.id}`, { method: "DELETE", body: { confirm: true } });
      showSuccess("تم حذف المحتوى");
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) setPage((current) => current - 1);
      else await load(page, true);
    } catch (err) { showError(err.message || "تعذر حذف المحتوى"); }
    finally { setBusyId(null); }
  };

  const columnLabel = (key) => labels[key] || key;
  if (peopleParent) return <PeopleManager parent={peopleParent} onClose={() => setPeopleParent(null)} />;

  return (
    <>
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>{resource.title}</CardTitle><CardDescription className="mt-1">إدارة السجلات وحالة ظهورها على الموقع.</CardDescription></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="بحث في السجلات المعروضة" placeholder="بحث في السجلات المعروضة..." value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} h-11 sm:w-64`} />
            <Button variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => load(page, true)}>تحديث</Button>
            <Button icon={Plus} onClick={() => setFormRecord({})}>إضافة</Button>
          </div>
        </div>
        {error && <div role="alert" className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" onClick={() => load(page)}>إعادة المحاولة</Button></div>}
        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-page text-xs text-muted"><tr>{resource.columns.map((key) => <th key={key} className="px-4 py-3 font-bold">{columnLabel(key)}</th>)}<th className="px-4 py-3 font-bold">إجراءات</th></tr></thead><tbody className="divide-y divide-line bg-white">{loading ? Array.from({ length: 4 }, (_, index) => <tr key={index}><td colSpan={resource.columns.length + 1} className="p-3"><Skeleton className="h-8 w-full" /></td></tr>) : visibleRows.map((row) => <tr key={row.id} className="transition hover:bg-gold-tint/20">{resource.columns.map((key) => <td key={key} className="max-w-56 px-4 py-3 text-ink">{key === "is_published" ? <StatusBadge published={row.is_published} /> : <span className="block truncate">{valueOf(row, key) ?? "—"}</span>}</td>)}<td className="px-4 py-3"><RowActions row={row} busy={busyId === row.id} onEdit={() => setFormRecord(row)} onDelete={() => setDeleteTarget(row)} onToggle={() => toggle(row)} onPeople={() => setPeopleParent(row)} showPeople={resourceId === "central"} /></td></tr>)}</tbody></table></div>
          <div className="space-y-3 p-3 md:hidden">{loading ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />) : visibleRows.map((row) => <article key={row.id} className="rounded-2xl border border-line bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-ink">{row[resource.titleField] || "—"}</h3><p className="mt-1 text-xs text-muted">{resource.columns.slice(1, 3).map((key) => `${columnLabel(key)}: ${valueOf(row, key) ?? "—"}`).join(" · ")}</p></div><StatusBadge published={row.is_published} /></div><div className="mt-3"><RowActions row={row} busy={busyId === row.id} onEdit={() => setFormRecord(row)} onDelete={() => setDeleteTarget(row)} onToggle={() => toggle(row)} onPeople={() => setPeopleParent(row)} showPeople={resourceId === "central"} /></div></article>)}</div>
          {!loading && visibleRows.length === 0 && <EmptyState title={search ? "لا توجد نتائج مطابقة" : "لا توجد سجلات بعد"} description={search ? "جرّب عبارة بحث أخرى." : "أضف أول سجل لهذا القسم."} className="m-3" />}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted"><span>الإجمالي: {pagination.total ?? rows.length}</span><div className="flex items-center gap-2"><Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} icon={ChevronRight}>السابق</Button><span>صفحة {page} من {Math.max(1, pagination.total_pages || 1)}</span><Button size="sm" variant="secondary" disabled={loading || page >= (pagination.total_pages || 1)} onClick={() => setPage((current) => current + 1)} icon={ChevronLeft} iconPosition="end">التالي</Button></div></div>
      </Card>
      {formRecord !== undefined && <ContentForm resource={resource} record={formRecord} options={options} saving={saving} error={error} onClose={() => setFormRecord(undefined)} onSubmit={save} />}
      {deleteTarget && <ConfirmDelete title={deleteTarget[resource.titleField] || resource.title} loading={busyId === deleteTarget.id} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
    </>
  );
}

function RowActions({ row, busy, onEdit, onDelete, onToggle, onPeople, showPeople }) {
  return <div className="flex flex-wrap items-center gap-1"><button type="button" disabled={busy} title={row.is_published ? "إلغاء النشر" : "نشر"} onClick={onToggle} className="rounded-lg p-2 text-muted transition hover:bg-gold-tint hover:text-gold-dark disabled:opacity-50">{row.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button><button type="button" title="تعديل" onClick={onEdit} className="rounded-lg p-2 text-muted transition hover:bg-gold-tint hover:text-gold-dark"><Pencil className="size-4" /></button>{showPeople && <button type="button" title="إدارة الأشخاص" onClick={onPeople} className="rounded-lg p-2 text-muted transition hover:bg-gold-tint hover:text-gold-dark"><Users className="size-4" /></button>}<button type="button" disabled={busy} title="حذف" onClick={onDelete} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" /></button></div>;
}

function StatusBadge({ published }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${published ? "bg-emerald-50 text-emerald-700" : "bg-page text-muted"}`}><span className="ml-1">{published ? "منشور" : "مسودة"}</span>{published ? <Check className="size-3" /> : null}</span>;
}

function PartyProgramViewer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>برنامج الحزب</CardTitle>
        <CardDescription>إدارة محتوى برنامج الحزب.</CardDescription>
      </CardHeader>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        لا تتوفر حالياً واجهة API إدارية لعرض سجلات برنامج الحزب أو إنشائها أو تعديلها أو حذفها. يوجد مسار عام لقراءة النسخة المنشورة فقط، لذلك لم يتم توصيله هنا كواجهة إدارة.
      </div>
    </Card>
  );
}

export default function ContentWorkspace() {
  const [section, setSection] = useState("central");
  const [leadershipResource, setLeadershipResource] = useState("panels");
  const [governorates, setGovernorates] = useState([]);
  const [panels, setPanels] = useState([]);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/governorates").then((response) => response.json()).then((data) => {
      if (active) setGovernorates((data.governorates || []).map((item) => ({ value: item.id, label: item.name_ar })));
    }).catch((error) => { if (active) setLookupError(error.message || "تعذر تحميل المحافظات"); });
    adminFetch("/api/admin/content/leadership/panels?page=1&page_size=100").then((data) => {
      if (active) setPanels((data.items || []).map((item) => ({ value: item.id, label: item.title })));
    }).catch((error) => { if (active) setLookupError(error.message || "تعذر تحميل أقسام القيادات"); });
    return () => { active = false; };
  }, []);

  const activeSection = CONTENT_SECTIONS.find((item) => item.id === section);
  const ActiveIcon = iconMap[section] || FileText;
  const resourceId = section === "leadership" ? leadershipResource : section;
  const options = useMemo(() => ({ governorates, panels }), [governorates, panels]);

  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <PageHeader title="المحتوى التنظيمي" description="إدارة محتوى الأقسام التنظيمية من خلال الخدمات المتاحة في النظام." badge={<span className="rounded-full border border-gold/30 bg-gold-tint px-3 py-1 text-xs font-bold text-gold-dark">{activeSection?.label}</span>} />
      <Card className="p-3 sm:p-4"><nav aria-label="أقسام المحتوى" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{CONTENT_SECTIONS.map((item) => { const Icon = iconMap[item.id] || FileText; return <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all ${section === item.id ? "bg-gold-gradient text-ink shadow-btn" : "border border-line bg-white text-muted hover:border-gold/50 hover:bg-gold-tint/50 hover:text-gold-dark"}`}><Icon className="size-4 shrink-0" /><span>{item.label}</span></button>; })}</nav></Card>
      {lookupError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{lookupError}</p>}
      {section === "party-program" ? <PartyProgramViewer /> : <>
        {section === "leadership" && <Card className="p-3"><nav aria-label="أقسام قيادات الحزب" className="flex flex-wrap gap-2">{LEADERSHIP_RESOURCES.map((item) => <button key={item.id} type="button" onClick={() => setLeadershipResource(item.id)} aria-pressed={leadershipResource === item.id} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${leadershipResource === item.id ? "bg-gold-gradient text-ink shadow-btn" : "border border-line bg-white text-muted hover:border-gold/50 hover:bg-gold-tint/50 hover:text-gold-dark"}`}>{item.label}</button>)}</nav></Card>}
        <div className="flex items-center gap-2 text-sm font-bold text-ink"><ActiveIcon className="size-4 text-gold-dark" />{activeSection?.label}</div>
        <ResourceManager key={resourceId} resourceId={resourceId} options={options} />
      </>}
    </div>
  );
}
