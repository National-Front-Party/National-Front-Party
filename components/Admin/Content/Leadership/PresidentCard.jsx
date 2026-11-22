"use client";

import { useState } from "react";
import Image from "next/image";
import { Crown, Edit3, Shield, User, Plus, CheckCircle2 } from "lucide-react";

export default function PresidentCard({
  president,
  onEdit,
  onCreate,
  canManage = true,
}) {
  const [imgError, setImgError] = useState(false);

  if (!president) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-dashed border-amber-300 bg-linear-to-br from-amber-50/60 to-white p-6 sm:p-8 text-center shadow-xs">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-3 shadow-xs">
          <Crown className="size-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          لم يتم تحديد رئيس للحزب بعد
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          بيانات رئيس الحزب تظهر في أعلى عمود الأمانات المركزية بالصفحة الرئيسية مع صورته وكلمته الافتتاحية.
        </p>
        {canManage && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-[0.99] transition-all"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>إضافة وتحديد رئيس الحزب</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const hasPhoto = Boolean(president.photo_url) && !imgError;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-linear-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-8 shadow-card">
      {/* Background Decorative Accent */}
      <div
        className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-gold/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -right-12 size-48 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Avatar & Details */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-right">
          {/* Avatar Container */}
          <div className="relative size-24 sm:size-28 shrink-0 rounded-2xl border-2 border-gold/40 p-1 bg-slate-800 shadow-md">
            <div className="relative size-full overflow-hidden rounded-xl bg-slate-700/80">
              {hasPhoto ? (
                <Image
                  src={president.photo_url}
                  alt={president.full_name || "رئيس الحزب"}
                  fill
                  sizes="112px"
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-slate-800 text-gold/60">
                  <User className="size-12" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Crown Badge */}
            <span
              className="absolute -bottom-2 -left-2 flex size-7 items-center justify-center rounded-full bg-gold-gradient text-ink shadow-md"
              title="رئيس الحزب"
            >
              <Crown className="size-4" aria-hidden="true" />
            </span>
          </div>

          {/* Info Details */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3 py-0.5 text-[11px] font-bold text-gold">
                <Shield className="size-3" aria-hidden="true" />
                <span>رئيس الحزب • القيادة العليا</span>
              </span>

              {president.badge_label && (
                <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
                  {president.badge_label}
                </span>
              )}

              {president.is_published && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  <span>معروض بالصفحة الرئيسية</span>
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {president.full_name}
            </h3>

            <p className="text-xs sm:text-sm font-medium text-slate-300">
              {president.role_title || "رئيس الحزب"}
            </p>

            <p className="text-[11px] text-slate-400">
              يظهر هذا الحساب والصورة في أعلى عمود الأمانات المركزية بالموقع العام.
            </p>
          </div>
        </div>

        {/* Right Side: Action Button */}
        {canManage && (
          <div className="flex shrink-0 justify-center md:justify-end border-t border-slate-700/60 pt-4 md:border-0 md:pt-0">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-[0.99] transition-all"
            >
              <Edit3 className="size-4" aria-hidden="true" />
              <span>تعديل بيانات رئيس الحزب</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
