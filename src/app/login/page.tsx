import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { ShieldTick } from "iconsax-reactjs";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Chap — brend paneli */}
      <div className="hidden lg:flex flex-col justify-between bg-[var(--navy)] text-white p-12">
        <div className="flex items-center gap-2">
          <div className="grid place-items-center h-10 w-10 rounded-[10px] bg-[var(--gold)]">
            <ShieldTick size={22} variant="Bold" color="#fff" />
          </div>
          <span className="text-lg font-semibold">Dashboard Pro</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">
            Mikromoliya tashkilotlari
            <br /> hisobot va analitika tizimi
          </h1>
          <p className="mt-4 text-white/70 max-w-md leading-relaxed">
            Kunlik moliyaviy hisobotlarni firmalar bo&apos;yicha yuklang,
            tasdiqlang va to&apos;liq dashboard, jadval, qidiruv va eksport
            imkoniyatlari bilan boshqaring.
          </p>
        </div>
        <p className="text-white/40 text-sm">
          © {new Date().getFullYear()} Dashboard Pro
        </p>
      </div>

      {/* O'ng — login forma */}
      <div className="flex items-center justify-center p-6 bg-[var(--background)]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="grid place-items-center h-10 w-10 rounded-[10px] bg-[var(--gold)]">
              <ShieldTick size={22} variant="Bold" color="#fff" />
            </div>
            <span className="text-lg font-semibold text-[var(--text)]">
              Dashboard Pro
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text)]">
            Tizimga kirish
          </h2>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Administrator login va parolingizni kiriting
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
          <div className="mt-6 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <ShieldTick size={15} color="currentColor" />
            Ulanish himoyalangan. Har bir amaliyot qayd etiladi.
          </div>
        </div>
      </div>
    </div>
  );
}
