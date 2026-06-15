"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { User, Lock1, Eye, EyeSlash, InfoCircle } from "iconsax-reactjs";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kirishda xatolik");
        return;
      }
      const next = params.get("next") || "/dashboard";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="login">Login</Label>
        <div className="relative">
          <User
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            id="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            className="pl-10"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password">Parol</Label>
        <div className="relative">
          <Lock1
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)]"
            aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
          >
            {show ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
          <InfoCircle size={16} />
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Tekshirilmoqda..." : "Kirish"}
      </Button>
    </form>
  );
}
