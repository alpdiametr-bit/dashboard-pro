import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Splash } from "@/components/Splash";
import { I18nProvider } from "@/components/I18nProvider";
import { getLang } from "@/lib/lang";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const lang = await getLang();

  return (
    <I18nProvider lang={lang}>
      <div className="app-ambient flex min-h-screen bg-[var(--background)]">
        <Splash />
        <Sidebar />
        <div className="relative z-[1] flex-1 min-w-0 flex flex-col">
          <Topbar adminName={session.name ?? session.login} />
          <main className="flex-1 p-4 sm:p-6 lg:p-7">{children}</main>
        </div>
      </div>
    </I18nProvider>
  );
}
