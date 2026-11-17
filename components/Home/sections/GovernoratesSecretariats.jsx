"use client";

export default function GovernoratesSecretariats({ data }) {
  return (
    <div
      className="min-h-64"
      data-governorate-count={data.items.length}
    >
      {/* TODO: Add the governorates accordion and officials list. */}
    </div>
  );
}
