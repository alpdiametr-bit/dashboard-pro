"use client";

import { createContext, useContext } from "react";
import { translate, DEFAULT_LANG, type Lang } from "@/lib/i18n";

const LangCtx = createContext<Lang>(DEFAULT_LANG);

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang(): Lang {
  return useContext(LangCtx);
}

/** t("nav.dashboard") — joriy tilga tarjima qiladi. */
export function useT(): (key: string) => string {
  const lang = useContext(LangCtx);
  return (key: string) => translate(lang, key);
}
