"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Element3,
  Building,
  DocumentUpload,
  ShieldTick,
} from "iconsax-reactjs";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Element3 },
  { href: "/firmalar", label: "Firmalar", icon: Building },
  { href: "/yuklash", label: "Hisobot yuklash", icon: DocumentUpload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[var(--navy)] text-white h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-14 border-b border-white/10">
        <div className="grid place-items-center h-9 w-9 rounded-[10px] bg-[var(--gold)]">
          <ShieldTick size={20} variant="Bold" color="#fff" />
        </div>
        <span className="font-semibold">Dashboard Pro</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-[8px] text-sm transition-colors",
                active
                  ? "bg-white/12 text-white font-medium"
                  : "text-white/65 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon size={20} variant={active ? "Bold" : "Outline"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 text-[11px] text-white/35 border-t border-white/10">
        MFO hisobot tizimi
      </div>
    </aside>
  );
}
