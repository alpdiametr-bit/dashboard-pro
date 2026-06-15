import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { ShieldTick } from "iconsax-reactjs";
import { LogoMark } from "@/components/Logo";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Chap — brend paneli */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden text-white p-12">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 80% -10%, #1c2f63 0%, #0f172a 48%, #070d1c 100%)",
          }}
        />
        {/* ambient glow + grid */}
        <div
          className="pointer-events-none absolute -right-24 top-10 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "rgba(234,179,8,0.14)" }}
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "rgba(47,83,196,0.22)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(80% 80% at 60% 30%, #000 20%, transparent 75%)",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <LogoMark size={42} />
          <div className="leading-tight">
            <span className="text-lg font-semibold">
              Dashboard <span className="text-[var(--gold-soft)]">Pro</span>
            </span>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
              MFO Analytics
            </div>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight">
            Mikromoliya tashkilotlari
            <br /> hisobot va{" "}
            <span className="gradient-text">analitika</span> tizimi
          </h1>
          <p className="mt-5 text-white/65 max-w-md leading-relaxed">
            Kunlik moliyaviy hisobotlarni firmalar bo&apos;yicha yuklang,
            tasdiqlang va to&apos;liq dashboard, jadval, qidiruv va eksport
            imkoniyatlari bilan boshqaring.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: "36+", v: "Hisobot varaqlari" },
              { k: "Real-time", v: "Dashboard" },
              { k: "Excel", v: "Eksport" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-[14px] bg-white/[0.05] ring-1 ring-inset ring-white/10 px-3.5 py-3 backdrop-blur-sm"
              >
                <div className="text-[15px] font-semibold text-[var(--gold-soft)]">
                  {s.k}
                </div>
                <div className="text-[11px] text-white/55 mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/40 text-sm">
          © {new Date().getFullYear()} Dashboard Pro
        </p>
      </div>

      {/* O'ng — login forma */}
      <div className="relative flex items-center justify-center p-6 bg-[var(--background)] app-ambient">
        <div className="relative z-[1] w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <LogoMark size={38} />
            <span className="text-lg font-semibold text-[var(--text)]">
              Dashboard <span className="text-[var(--gold)]">Pro</span>
            </span>
          </div>
          <h2 className="text-[26px] font-semibold tracking-tight text-[var(--text)]">
            Tizimga kirish
          </h2>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Administrator login va parolingizni kiriting
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
          <div className="mt-6 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <ShieldTick size={15} color="currentColor" variant="Bold" />
            Ulanish himoyalangan. Har bir amaliyot qayd etiladi.
          </div>
        </div>
      </div>
    </div>
  );
}
