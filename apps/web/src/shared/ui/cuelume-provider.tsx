"use client";

import { useEffect } from "react";

import { startCuelume } from "@/shared/lib/cuelume";

/** Binds Cuelume once. Delegated listeners cover later route/DOM changes. */
export function CuelumeProvider() {
  useEffect(() => {
    startCuelume();
  }, []);
  return null;
}
