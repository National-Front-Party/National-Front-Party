"use client";

import ModalShell from "@/components/Home/ui/ModalShell";

export default function SecretariatsModal({
  open,
  onClose,
  title,
  items,
  footnote,
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-[800px]"
    >
      <div dir="rtl" className="mt-5 text-right">
        <ul>
          {items.map((item, index) => (
            <li
              key={item.name}
              className={
                index < items.length - 1 ? "border-b border-line" : undefined
              }
            >
              <div className="flex min-w-0 flex-col gap-1 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-gold-tint sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <h3 className="min-w-0 break-words text-lg font-extrabold text-ink">
                  {item.name}
                </h3>
                <p className="min-w-0 break-words text-sm text-muted sm:text-left">
                  {item.head}
                  {item.source ? (
                    <span className="text-xs text-gray-500">
                      {" "}
                      ({item.source})
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-2 border-t border-line pt-4 text-xs text-gray-500">
          {footnote}
        </p>
      </div>
    </ModalShell>
  );
}
