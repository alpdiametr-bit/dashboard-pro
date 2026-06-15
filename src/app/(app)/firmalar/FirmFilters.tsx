"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import { UZ_REGIONS } from "@/lib/constants";
import { Location, ArrangeVertical } from "iconsax-reactjs";

const SORTS = [
  { value: "pinned", label: "Standart (qadalgan)" },
  { value: "name", label: "Nomi (A→Z)" },
  { value: "assets_desc", label: "Aktivlar (ko'pdan)" },
  { value: "assets_asc", label: "Aktivlar (kamdan)" },
  { value: "loans_desc", label: "Kreditlar soni (ko'pdan)" },
  { value: "reports_desc", label: "Hisobotlar (ko'pdan)" },
  { value: "date_desc", label: "So'nggi hisobot (yangi)" },
];

export function FirmFilters({ regions }: { regions: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const region = params.get("region") || "";
  const sort = params.get("sort") || "pinned";

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  // Bazadagi mavjud hududlar + standart 14 ta ro'yxat (takrorlanmasdan)
  const regionOptions = [
    { value: "", label: "Barcha hududlar" },
    ...Array.from(new Set([...regions, ...UZ_REGIONS])).map((r) => ({
      value: r,
      label: r,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        size="sm"
        className="w-52"
        icon={<Location size={16} />}
        placeholder="Hudud"
        searchable
        options={regionOptions}
        value={region}
        onChange={(v) => setParam("region", v)}
      />
      <Dropdown
        size="sm"
        className="w-56"
        icon={<ArrangeVertical size={16} />}
        options={SORTS}
        value={sort}
        onChange={(v) => setParam("sort", v)}
      />
    </div>
  );
}
