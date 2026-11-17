"use client";

import { useState } from "react";
import JoinModal from "@/components/Home/ui/JoinModal";
import { governoratesList, membershipTypes } from "@/data/mock/membership";

export default function JoinButton({ className, style }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.currentTarget.focus();
          setOpen(true);
        }}
        className={className}
        style={style}
      >
        انضم للحزب
      </button>
      {open ? (
        <JoinModal
          open={open}
          onClose={() => setOpen(false)}
          types={membershipTypes}
          governorates={governoratesList}
        />
      ) : null}
    </>
  );
}
