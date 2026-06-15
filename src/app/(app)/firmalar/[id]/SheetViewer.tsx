"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { Pager } from "@/components/ui/Pager";

type SheetMeta = {
  id: number;
  name: string;
  rowCount: number;
  colCount: number;
};

const SIZE = 50;

export function SheetViewer({
  reportId,
  sheets,
}: {
  reportId: number;
  sheets: SheetMeta[];
}) {
  const [activeId, setActiveId] = useState<number | null>(sheets[0]?.id ?? null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<string[][]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    fetch(`/api/reports/${reportId}/sheet?sheetId=${activeId}&page=${page}&size=${SIZE}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [activeId, page, reportId]);

  function isNumeric(s: string) {
    return /^-?[\d\s.,]+$/.test(s.trim()) && /\d/.test(s);
  }

  return (
    <div className="space-y-4">
      {/* Varaq tanlash */}
      <div className="flex flex-wrap gap-1.5">
        {sheets.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setActiveId(s.id);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-colors border",
              activeId === s.id
                ? "bg-[var(--trust-blue)] text-white border-[var(--trust-blue)]"
                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-2)]",
            )}
            title={`${s.rowCount} qator × ${s.colCount} ustun`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50"
                  >
                    <td className="px-2 py-1.5 text-[var(--text-muted)] tnum text-right bg-[var(--surface-2)]/40 sticky left-0 w-12">
                      {(page - 1) * SIZE + ri + 1}
                    </td>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "px-2 py-1.5 whitespace-nowrap max-w-[280px] truncate",
                          isNumeric(cell)
                            ? "text-right tnum text-[var(--text)]"
                            : "text-[var(--text)]",
                        )}
                        title={cell}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-8 text-center text-[var(--text-muted)]">
                      {loading ? "Yuklanmoqda..." : "Bo'sh varaq"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--border)] px-4">
            <Pager
              page={page}
              total={total}
              pageSize={SIZE}
              onChange={setPage}
              label="qator"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
