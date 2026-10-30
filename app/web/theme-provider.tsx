"use client";

import { useEffect } from "react";

export const WEB_THEME_KEY = "fudge-web-theme";
export type WebTheme = "light" | "dark" | "system";

function applyTheme(preference: WebTheme) {
  const resolved = preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.webTheme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function setWebTheme(preference: WebTheme) {
  localStorage.setItem(WEB_THEME_KEY, preference);
  applyTheme(preference);
  window.dispatchEvent(new CustomEvent("fudge-web-theme-change", { detail: preference }));
}

export default function WebThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const load = () => {
      const preference = (localStorage.getItem(WEB_THEME_KEY) || "system") as WebTheme;
      applyTheme(preference);
    };
    const onPreferenceChange = (event: Event) => applyTheme((event as CustomEvent<WebTheme>).detail);
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    load();
    system.addEventListener("change", load);
    window.addEventListener("storage", load);
    window.addEventListener("fudge-web-theme-change", onPreferenceChange);
    return () => {
      system.removeEventListener("change", load);
      window.removeEventListener("storage", load);
      window.removeEventListener("fudge-web-theme-change", onPreferenceChange);
    };
  }, []);

  return children;
}
