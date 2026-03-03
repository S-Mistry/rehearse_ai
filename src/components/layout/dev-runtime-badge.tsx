"use client";

import { useEffect, useState } from "react";

const buildMarker = new Date().toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function DevRuntimeBadge() {
  const [origin, setOrigin] = useState<string>("");
  const [marker, setMarker] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin.replace(/^https?:\/\//, ""));
    setMarker(buildMarker);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="rounded-full border border-grey-5/80 bg-white/75 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-grey-4">
      DEV
      {origin ? ` · ${origin}` : ""}
      {marker ? ` · ${marker}` : ""}
    </div>
  );
}
