import { useState } from "react";

const STORAGE_KEY = "portfolio-v2:github-clone-protocol";

export function useRepoCloneProtocol() {
  const [protocol, setProtocol] = useState<"cli" | "https" | "ssh">(() => {
    if (typeof window === "undefined") {
      return "https";
    }

    const storedProtocol = window.localStorage.getItem(STORAGE_KEY);
    if (storedProtocol === "cli" || storedProtocol === "https" || storedProtocol === "ssh") {
      return storedProtocol;
    }

    return "https";
  });

  const updateProtocol = (value: string) => {
    const nextProtocol = value === "cli" || value === "ssh" ? value : "https";
    setProtocol(nextProtocol);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextProtocol);
    }
  };

  return [protocol, updateProtocol] as const;
}
