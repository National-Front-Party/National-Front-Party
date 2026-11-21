"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, MapPin, Network, Users, Plus, Pencil, Trash2, RefreshCw,
  Search, ChevronDown, Power, X, Save, UserRound, ShieldCheck, AlertCircle,
  CheckCircle2, Layers3, Landmark,
} from "lucide-react";
import PageHeader from "@/components/Admin/ui/PageHeader";
import Skeleton from "@/components/Admin/ui/Skeleton";
import EmptyState from "@/components/Admin/ui/EmptyState";
import Spinner from "@/components/Admin/ui/Spinner";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";

const LEVELS = [
  { key: "center", label: "المراكز", singular: "مركز", icon: Building2, parent: "governorate_id", endpoint: "centers" },
  { key: "secretariat", label: "الأمانات المحلية", singular: "أمانة محلية", icon: Landmark, parent: "center_id", endpoint: "local-secretariats" },
  { key: "unit", label: "الوحدات الحزبية", singular: "وحدة حزبية", icon: Network, parent: "secretariat_id", endpoint: "party-units" },
];

const emptyForm = { name_ar: "", sort_order: "0", is_active: true };

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white shadow-card-hover" dir="rtl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-black text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted hover:bg-page" aria-label="إغلاق"><X className="size-5" /></button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:bg-slate-50";

export default function OrganizationPage() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();
  const canManage = canAccess(user?.role, "organization:manage");
  const [governorates, setGovernorates] = useState([]);
  const [centers, setCenters] = useState([]);
  const [secretariats, setSecretariats] = useState([]);
  const [units, setUnits] = useState([]);
  const [people, setPeople] = useState([]);
  const [selection, setSelection] = useState({ governorate: "", center: "", secretariat: "", unit: "" });
  const [loading, setLoading] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [personEditor, setPersonEditor] = useState(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const selectedUnit = units.find((item) => String(item.id) === selection.unit);
  const selectedCenter = centers.find((item) => String(item.id) === selection.center);
  const selectedSecretariat = secretariats.find((item) => String(item.id) === selection.secretariat);
  const filteredPeople = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("ar");
    return q ? people.filter((p) => [p.full_name, p.position_title, p.details].some((v) => v?.toLocaleLowerCase("ar").includes(q))) : people;
  }, [people, search]);

  const loadGovernorates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetch("/api/organization/governorates");
      setGovernorates(result?.governorates ?? []);
    } catch (error) {
      showError(error?.message || "تعذر تحميل المحافظات");
    } finally { setLoading(false); }
  }, [showError]);

  const loadCenters = useCallback(async (governorateId) => {
    if (!governorateId) { setCenters([]); return; }
    const result = await adminFetch("/api/admin/content/organization/centers?governorate_id=" + governorateId);
    setCenters(result?.items ?? []);
  }, []);

  const loadSecretariats = useCallback(async (centerId) => {
    if (!centerId) { setSecretariats([]); return; }
    const result = await adminFetch("/api/admin/content/organization/local-secretariats?center_id=" + centerId);
    setSecretariats(result?.items ?? []);
  }, []);

  const loadUnits = useCallback(async (secretariatId) => {
    if (!secretariatId) { setUnits([]); return; }
    const result = await adminFetch("/api/admin/content/organization/party-units?secretariat_id=" + secretariatId);
    setUnits(result?.items ?? []);
  }, []);

  const loadPeople = useCallback(async (unitId) => {
    if (!unitId) { setPeople([]); return; }
    const result = await adminFetch("/api/admin/content/organization/party-units/" + unitId + "/people");
    setPeople(result?.people ?? []);
  }, []);

  useEffect(() => { loadGovernorates(); }, [loadGovernorates]);
  useEffect(() => {
    let active = true;
    if (!selection.governorate) { setCenters([]); return; }
    setLoadingChildren(true);
    loadCenters(selection.governorate).catch((e) => active && showError(e?.message || "تعذر تحميل المراكز")).finally(() => active && setLoadingChildren(false));
    return () => { active = false; };
  }, [selection.governorate, loadCenters, showError]);
  useEffect(() => {
    let active = true;
    if (!selection.center) { setSecretariats([]); return; }
    setLoadingChildren(true);
    loadSecretariats(selection.center).catch((e) => active && showError(e?.message || "تعذر تحميل الأمانات المحلية")).finally(() => active && setLoadingChildren(false));
    return () => { active = false; };
  }, [selection.center, loadSecretariats, showError]);
  useEffect(() => {
    let active = true;
    if (!selection.secretariat) { setUnits([]); return; }
    setLoadingChildren(true);
    loadUnits(selection.secretariat).catch((e) => active && showError(e?.message || "تعذر تحميل الوحدات الحزبية")).finally(() => active && setLoadingChildren(false));
    return () => { active = false; };
  }, [selection.secretariat, loadUnits, showError]);
  useEffect(() => {
    let active = true;
    if (!selection.unit) { setPeople([]); return; }
    loadPeople(selection.unit).catch((e) => active && showError(e?.message || "تعذر تحميل مسؤولي الوحدة"));
    return () => { active = false; };
  }, [selection.unit, loadPeople, showError]);

  useEffect(() => {
    if (!personEditor || personEditor.member_id !== undefined || memberQuery.trim().length < 2) { setMemberResults([]); return; }
    let active = true;
    const controller = new AbortController();
    setMemberLoading(true);
    adminFetch("/api/admin/content/organization/members?q=" + encodeURIComponent(memberQuery.trim()), { signal: controller.signal })
      .then((res) => active && setMemberResults(res?.members ?? []))
      .catch(() => active && setMemberResults([]))
      .finally(() => active && setMemberLoading(false));
    return () => { active = false; controller.abort(); };
  }, [memberQuery, personEditor]);

  const selectLevel = (level, value) => {
    setSelection((prev) => level === "governorate"
      ? { governorate: value, center: "", secretariat: "", unit: "" }
      : level === "center"
      ? { ...prev, center: value, secretariat: "", unit: "" }
      : level === "secretariat"
      ? { ...prev, secretariat: value, unit: "" }
      : { ...prev, unit: value });
    setSearch("");
  };

  const openEditor = (level, item = null) => {
    const config = LEVELS.find((x) => x.key === level);
    const parentId = level === "center" ? selection.governorate : level === "secretariat" ? selection.center : selection.secretariat;
    setEditor({ level, item, config, form: item ? { name_ar: item.name_ar, sort_order: String(item.sort_order ?? 0), is_active: item.is_active } : { ...emptyForm }, parentId });
  };

  const refreshLevel = async (level) => {
    if (level === "center") await loadCenters(selection.governorate);
    if (level === "secretariat") await loadSecretariats(selection.center);
    if (level === "unit") await loadUnits(selection.secretariat);
  };

  const saveLevel = async (event) => {
    event.preventDefault();
    if (!editor || !canManage) return;
    setBusy(true);
    const { level, item, config, form, parentId } = editor;
    const payload = { name_ar: form.name_ar.trim(), sort_order: Number(form.sort_order || 0), ...(item ? { is_active: form.is_active } : { is_active: true }) };
    if (!item) payload[config.parent] = Number(parentId);
    const endpoint = "/api/admin/content/organization/" + config.endpoint + (item ? "/" + item.id : "");
    try {
      const result = await adminFetch(endpoint, { method: item ? "PATCH" : "POST", body: payload });
      await refreshLevel(level);
      if (!item && result?.item?.id) {
        selectLevel(level === "center" ? "center" : level === "secretariat" ? "secretariat" : "unit", String(result.item.id));
      }
      showSuccess(item ? "تم حفظ التعديلات بنجاح" : "تمت الإضافة بنجاح");
      setEditor(null);
    } catch (error) { showError(error?.message || "تعذر حفظ البيانات"); }
    finally { setBusy(false); }
  };

  const toggleLevel = async (level, item) => {
    const config = LEVELS.find((x) => x.key === level);
    try {
      await adminFetch("/api/admin/content/organization/" + config.endpoint + "/" + item.id + "/status", { method: "PATCH", body: { is_active: !item.is_active } });
      await refreshLevel(level);
      showSuccess(item.is_active ? "تم تعطيل العنصر وإخفاء فروعه من البحث العام" : "تم تفعيل العنصر");
    } catch (error) { showError(error?.message || "تعذر تغيير الحالة"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { level, item } = deleteTarget;
    const config = LEVELS.find((x) => x.key === level);
    setBusy(true);
    try {
      await adminFetch("/api/admin/content/organization/" + config.endpoint + "/" + item.id, { method: "DELETE", body: { confirm: true } });
      await refreshLevel(level);
      if (level === "unit" && String(item.id) === selection.unit) selectLevel("unit", "");
      if (level === "secretariat" && String(item.id) === selection.secretariat) selectLevel("secretariat", "");
      if (level === "center" && String(item.id) === selection.center) selectLevel("center", "");
      showSuccess("تم الحذف بنجاح");
      setDeleteTarget(null);
    } catch (error) { showError(error?.message || "لا يمكن حذف العنصر لوجود عناصر تابعة له"); }
    finally { setBusy(false); }
  };

  const savePerson = async (event) => {
    event.preventDefault();
    if (!personEditor || !selection.unit) return;
    setBusy(true);
    const { id, full_name, position_title, details, sort_order, is_published, member_id } = personEditor;
    const payload = { full_name: member_id ? undefined : full_name?.trim(), member_id: member_id || null, position_title: position_title.trim(), details: details?.trim() || null, sort_order: Number(sort_order || 0), is_published: Boolean(is_published) };
    if (payload.full_name === undefined) delete payload.full_name;
    try {
      const endpoint = "/api/admin/content/organization/party-units/" + selection.unit + "/people" + (id ? "/" + id : "");
      const result = await adminFetch(endpoint, { method: id ? "PATCH" : "POST", body: payload });
      await loadPeople(selection.unit);
      showSuccess(id ? "تم تحديث بيانات المسؤول" : "تمت إضافة المسؤول");
      setPersonEditor(null);
      setMemberQuery("");
    } catch (error) { showError(error?.message || "تعذر حفظ بيانات المسؤول"); }
    finally { setBusy(false); }
  };

  const togglePerson = async (person) => {
    try {
      await adminFetch("/api/admin/content/organization/party-units/" + selection.unit + "/people/" + person.id + "/status", { method: "PATCH", body: { is_published: !person.is_published } });
      await loadPeople(selection.unit);
      showSuccess(person.is_published ? "تم إخفاء المسؤول من الموقع العام" : "تم نشر المسؤول");
    } catch (error) { showError(error?.message || "تعذر تغيير حالة النشر"); }
  };

  const deletePerson = async (person) => {
    if (!window.confirm("متأكد إنك عايز تحذف " + person.full_name + " نهائيًا؟")) return;
    try {
      await adminFetch("/api/admin/content/organization/party-units/" + selection.unit + "/people/" + person.id, { method: "DELETE", body: { confirm: true } });
      await loadPeople(selection.unit);
      showSuccess("تم حذف المسؤول نهائيًا");
    } catch (error) { showError(error?.message || "تعذر حذف المسؤول"); }
  };

  if (!canManage) {
    return <EmptyState icon={ShieldCheck} title="غير مصرح بالوصول" description="إدارة الهيكل التنظيمي متاحة لمدير النظام فقط." />;
  }

  if (loading) return <div className="space-y-4" dir="rtl"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-16 rounded-2xl" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div></div>;

  const currentLists = [
    { level: "center", title: "المراكز", items: centers, parent: selection.governorate, icon: Building2 },
    { level: "secretariat", title: "الأمانات المحلية", items: secretariats, parent: selection.center, icon: Landmark },
    { level: "unit", title: "الوحدات الحزبية", items: units, parent: selection.secretariat, icon: Network },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة الهيكل التنظيمي" description="إدارة التسلسل التنظيمي للحزب من المحافظات والمراكز حتى الوحدات الحزبية وقياداتها." badge={<span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-tint px-3 py-1 text-xs font-bold text-gold-dark"><ShieldCheck className="size-3.5" /> مدير النظام</span>} actions={<button type="button" onClick={() => { loadGovernorates(); if(selection.governorate) loadCenters(selection.governorate); if(selection.center) loadSecretariats(selection.center); if(selection.secretariat) loadUnits(selection.secretariat); if(selection.unit) loadPeople(selection.unit); }} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-page"><RefreshCw className="size-4" /> تحديث البيانات</button>} />

      <section className="rounded-3xl border border-line bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-gold-tint text-gold-dark"><MapPin className="size-5" /></span><div><h2 className="text-sm font-black text-ink">اختيار النطاق التنظيمي</h2><p className="text-xs text-muted">اختار المحافظة ثم المركز ثم الأمانة المحلية لعرض الوحدات التابعة ليها</p></div></div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { key: "governorate", label: "المحافظة", list: governorates },
            { key: "center", label: "المركز", list: centers },
            { key: "secretariat", label: "الأمانة المحلية", list: secretariats },
          ].map(({ key, label, list }) => (
            <Field key={key} label={label}>
              <div className="relative"><select className={inputClass + " appearance-none pl-9"} value={selection[key]} onChange={(e) => selectLevel(key, e.target.value)}><option value="">اختار {label}</option>{list.map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}</select><ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /></div>
            </Field>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-lg bg-page px-3 py-1.5">{governorates.find(x=>String(x.id)===selection.governorate)?.name_ar || "لم يتم اختيار محافظة"}</span><span>←</span><span className="rounded-lg bg-page px-3 py-1.5">{selectedCenter?.name_ar || "المركز"}</span><span>←</span><span className="rounded-lg bg-page px-3 py-1.5">{selectedSecretariat?.name_ar || "الأمانة المحلية"}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {currentLists.map(({ level, title, items, parent, icon: Icon }) => (
          <section key={level} className={"overflow-hidden rounded-3xl border bg-white shadow-xs " + (selection[level] ? "border-gold/40" : "border-line")}>
            <header className="flex items-center justify-between gap-2 border-b border-line p-4">
              <div className="flex min-w-0 items-center gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-tint text-gold-dark"><Icon className="size-5" /></span><div className="min-w-0"><h3 className="text-sm font-black text-ink">{title}</h3><p className="text-[11px] text-muted">{items.length} عنصر</p></div></div>
              <button type="button" disabled={!parent} onClick={() => openEditor(level)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gold-gradient px-3 py-2 text-xs font-black text-ink shadow-2xs transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-4" /> إضافة</button>
            </header>
            <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
              {!parent ? <p className="rounded-xl bg-page p-4 text-center text-xs text-muted">اختار المستوى الأعلى الأول</p> :
              items.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted">مفيش عناصر مضافة هنا لسه</p> :
              items.map((item) => (
                <div key={item.id} className={"rounded-2xl border p-3 transition " + (String(item.id)===selection[level] ? "border-gold/50 bg-gold-tint/50" : "border-slate-100 hover:border-slate-200")}>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => selectLevel(level, String(item.id))} className="min-w-0 flex-1 text-right">
                      <span className="block truncate text-sm font-bold text-slate-800">{item.name_ar}</span>
                      <span className={"mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold " + (item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{item.is_active ? "نشط" : "معطل"}</span>
                    </button>
                    <button type="button" onClick={() => openEditor(level, item)} title="تعديل" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-gold-dark"><Pencil className="size-4" /></button>
                    <button type="button" onClick={() => toggleLevel(level, item)} title={item.is_active ? "تعطيل" : "تفعيل"} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-gold-dark"><Power className="size-4" /></button>
                    <button type="button" onClick={() => setDeleteTarget({ level, item })} title="حذف" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-xs">
        <header className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-gold-tint text-gold-dark"><Users className="size-5" /></span><div><h2 className="text-sm font-black text-ink">قيادات ومسؤولو الوحدة الحزبية</h2><p className="text-xs text-muted">{selectedUnit?.name_ar || "اختار وحدة حزبية لعرض الأشخاص المرتبطين بيها"}</p></div></div>
          <div className="flex flex-wrap gap-2">
            <div className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="بحث بالاسم أو المنصب..." className={inputClass+" w-full pr-9 sm:w-56"} /></div>
            <button type="button" disabled={!selection.unit} onClick={() => { setPersonEditor({ full_name: "", position_title: "", details: "", sort_order: String(people.length), is_published: false, member_id: null }); setMemberQuery(""); }} className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-4 py-2.5 text-xs font-black text-ink disabled:opacity-40"><Plus className="size-4" /> إضافة مسؤول</button>
          </div>
        </header>
        {!selection.unit ? <EmptyState icon={Users} title="اختار وحدة حزبية" description="بعد اختيار الوحدة هتقدر تدير المسؤولين والقيادات المرتبطين بيها." className="m-4" /> :
        filteredPeople.length === 0 ? <EmptyState icon={UserRound} title="مفيش مسؤولين مسجلين" description="ابدأ بإضافة قيادات ومسؤولي الوحدة الحزبية." action={<button type="button" onClick={()=>setPersonEditor({full_name:"",position_title:"",details:"",sort_order:"0",is_published:false,member_id:null})} className="rounded-xl bg-gold-gradient px-4 py-2 text-xs font-bold text-ink">إضافة أول مسؤول</button>} className="m-4" /> :
        <div className="divide-y divide-slate-100">
          {filteredPeople.map((person) => (
            <article key={person.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold-tint text-gold-dark"><UserRound className="size-5" /></span><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">{person.full_name}</h3><p className="text-xs font-semibold text-gold-dark">{person.position_title}</p>{person.details && <p className="mt-1 line-clamp-2 text-xs text-muted">{person.details}</p>}<div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted"><span>{person.member_id ? "عضو مرتبط" : "إضافة يدوية"}</span><span>•</span><span className={person.is_published ? "text-emerald-700" : "text-slate-500"}>{person.is_published ? "منشور" : "مسودة"}</span></div></div></div>
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto"><button type="button" onClick={()=>setPersonEditor({...person, sort_order:String(person.sort_order ?? 0)})} className="rounded-xl border border-line p-2 text-muted hover:border-gold hover:text-gold-dark" title="تعديل"><Pencil className="size-4" /></button><button type="button" onClick={()=>togglePerson(person)} className="rounded-xl border border-line p-2 text-muted hover:border-gold hover:text-gold-dark" title={person.is_published ? "إخفاء" : "نشر"}><Power className="size-4" /></button><button type="button" onClick={()=>deletePerson(person)} className="rounded-xl border border-rose-100 p-2 text-rose-500 hover:bg-rose-50" title="حذف"><Trash2 className="size-4" /></button></div>
            </article>
          ))}
        </div>}
      </section>

      {editor && <Modal title={(editor.item ? "تعديل " : "إضافة ") + editor.config.singular} onClose={()=>!busy && setEditor(null)}>
        <form onSubmit={saveLevel} className="space-y-4">
          <Field label="اسم العنصر"><input autoFocus required maxLength={160} className={inputClass} value={editor.form.name_ar} onChange={(e)=>setEditor((p)=>({...p,form:{...p.form,name_ar:e.target.value}}))} placeholder={"اكتب اسم "+editor.config.singular} /></Field>
          <Field label="ترتيب الظهور"><input type="number" min="-32768" max="32767" className={inputClass} value={editor.form.sort_order} onChange={(e)=>setEditor((p)=>({...p,form:{...p.form,sort_order:e.target.value}}))} /></Field>
          {editor.item && <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={editor.form.is_active} onChange={(e)=>setEditor((p)=>({...p,form:{...p.form,is_active:e.target.checked}}))} /> نشط ويظهر في البحث العام</label>}
          <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" onClick={()=>setEditor(null)} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted">إلغاء</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2 text-xs font-black text-ink disabled:opacity-50"><Save className="size-4" />{busy?"جارٍ الحفظ...":"حفظ"}</button></div>
        </form>
      </Modal>}

      {personEditor && <Modal title={personEditor.id ? "تعديل بيانات المسؤول" : "إضافة مسؤول جديد"} onClose={()=>!busy && setPersonEditor(null)}>
        <form onSubmit={savePerson} className="space-y-4">
          <div className="rounded-xl border border-gold/20 bg-gold-tint/60 p-3 text-xs leading-6 text-gold-dark">تقدر تربط المسؤول بعضو نشط موجود في قاعدة بيانات الحزب، أو تضيف بياناته يدويًا.</div>
          {!personEditor.id && <Field label="البحث عن عضو نشط"><input className={inputClass} value={memberQuery} onChange={(e)=>{setMemberQuery(e.target.value);setPersonEditor((p)=>({...p,member_id:null,full_name:""}));}} placeholder="اكتب اسم العضو (حرفين على الأقل)" />{memberLoading && <span className="text-xs text-muted">جاري البحث...</span>}{memberResults.length>0 && <div className="max-h-36 overflow-y-auto rounded-xl border border-line">{memberResults.map((m)=><button type="button" key={m.id} onClick={()=>{setPersonEditor((p)=>({...p,member_id:m.id,full_name:m.full_name}));setMemberQuery(m.full_name);setMemberResults([]);}} className="block w-full border-b border-line px-3 py-2 text-right text-xs hover:bg-gold-tint"><span className="font-bold">{m.full_name}</span><span className="mr-2 text-muted">{m.governorate_name}</span></button>)}</div>}</Field>}
          {(!personEditor.member_id) && <Field label="الاسم بالكامل"><input required className={inputClass} value={personEditor.full_name || ""} onChange={(e)=>setPersonEditor((p)=>({...p,full_name:e.target.value}))} placeholder="اسم المسؤول" /></Field>}
          {personEditor.member_id && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span>تم اختيار العضو: <b>{personEditor.full_name}</b></span><button type="button" onClick={()=>{setPersonEditor((p)=>({...p,member_id:null,full_name:""}));setMemberQuery("");}} className="font-bold underline">فك الربط</button></div>}
          <Field label="المنصب"><input required maxLength={200} className={inputClass} value={personEditor.position_title} onChange={(e)=>setPersonEditor((p)=>({...p,position_title:e.target.value}))} placeholder="مثال: أمين الوحدة الحزبية" /></Field>
          <Field label="تفاصيل إضافية"><textarea rows={3} maxLength={2000} className={inputClass+" resize-y"} value={personEditor.details || ""} onChange={(e)=>setPersonEditor((p)=>({...p,details:e.target.value}))} placeholder="نبذة أو تفاصيل عن المسؤول (اختياري)" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="ترتيب الظهور"><input type="number" className={inputClass} value={personEditor.sort_order} onChange={(e)=>setPersonEditor((p)=>({...p,sort_order:e.target.value}))} /></Field><label className="flex items-end gap-2 pb-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={personEditor.is_published} onChange={(e)=>setPersonEditor((p)=>({...p,is_published:e.target.checked}))} /> نشر على الموقع العام</label></div>
          <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" onClick={()=>setPersonEditor(null)} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted">إلغاء</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2 text-xs font-black text-ink disabled:opacity-50"><Save className="size-4" />{busy?"جارٍ الحفظ...":"حفظ المسؤول"}</button></div>
        </form>
      </Modal>}

      {deleteTarget && <Modal title="تأكيد الحذف النهائي" onClose={()=>!busy && setDeleteTarget(null)}>
        <div className="space-y-4"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900"><p>هل أنت متأكد من حذف {LEVELS.find(x=>x.key===deleteTarget.level)?.singular}:</p><b>«{deleteTarget.item.name_ar}»</b><p className="mt-1 text-xs">مش هينفع الحذف لو العنصر مرتبط بعناصر تابعة.</p></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setDeleteTarget(null)} className="rounded-xl border border-line px-4 py-2 text-xs font-bold">إلغاء</button><button type="button" disabled={busy} onClick={confirmDelete} className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{busy?"جارٍ الحذف...":"تأكيد الحذف"}</button></div></div>
      </Modal>}
    </div>
  );
}
