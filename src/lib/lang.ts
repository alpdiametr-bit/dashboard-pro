// Server tomonda joriy tilni cookie'dan o'qish.
import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get("dp_lang")?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}
