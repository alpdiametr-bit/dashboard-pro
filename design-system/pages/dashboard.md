# Page Override — Dashboard / Firma ko'rinishi

> Master qoidalari (`design-system/MASTER.md`) ustun. Bu fayl faqat shu sahifaga
> xos chetlanish va qo'shimchalarni belgilaydi.
> Skill stillari: **#28 Data-Dense Dashboard**, **#30 Executive Dashboard**,
> **#36 Financial Dashboard**, **#53 Bento Grid**.

---

## 1. Layout

- **Sidebar** (chap, navy `#0F172A`, kengligi 240px, dark): logo + navigatsiya.
  - `Element3` Dashboard
  - `Building` Firmalar
  - `DocumentUpload` Hisobot yuklash
  - `DocumentDownload` Eksport / generatsiyalar
  - pastda: admin profili + `Lock` chiqish
- **Topbar** (56px): sahifa sarlavhasi, global qidiruv (`SearchNormal1`),
  sana/davr tanlagich, dark-mode toggle, admin avatar.
- **Content**: 12-ustunli grid, gap 16px, padding 16–24px.
- Mobil: sidebar drawer'ga aylanadi (375/768/1024/1440 breakpoint).

---

## 2. Dashboard (executive ko'rinish — #30)

**KPI qatori (Bento, 4–6 karta, count-up animatsiya):**
Excel `Баланс` / `Молиявий_натижалар` dan:
- **Jami aktivlar** (kod 120) — masalan 134 273 750 ming so'm
- **Jami majburiyatlar** (kod 280)
- **Jami kapital** (kod 360)
- **Sof foyda** (kod 350/1200) — trend strelka, yashil/qizil
- **Kredit portfeli (sof)** (kod 52) + qarzdorlar soni
- **Muddati o'tgan qarz** (aging 91-180/181+) — warning/red

Har KPI karta: katta raqam (tabular-nums), trend strelka (`StatusUp`/`StatusDown`),
sparkline, status rangi (profit/loss semantik ranglar).

**Grafiklar (skill #36 Financial + chart tavsiyalari):**
- Aktiv/Majburiyat/Kapital tarkibi → **donut / stacked bar**
- Foyda-zarar dinamikasi → **line / area** (oylar bo'yicha, `СВОД хизматлар`)
- Kredit portfeli aging (1-30/31-90/91-180/181+) → **stacked bar**
- Firmalar taqqoslash → **bar** (comparative #33)
- Pul oqimi → **waterfall** (ijobiy/manfiy bar)

> Real-time emas — kunlik snapshot. "Updated: <sana>" ko'rsatkichi.

---

## 3. Firma ichki sahifasi (data-dense — #28)

Tablar yoki bo'limlar (Excel sheetlariga mos):
1. **Umumiy** — KPI + balans qisqacha
2. **Schotlar / Konsolidatsiya** (`Консолидирован`, 531 qator) — dense jadval:
   h/v, nomi, boshlang'ich qoldiq (D/K), oborot (D/K), oxirgi qoldiq (D/K)
3. **Kredit portfeli** (`Кредит портфели`, 2500–7000 qator) — jadval:
   qarzdor, JSHSHIR, summa, qoldiq, foiz, sana, qaytarish, aging
4. **Jalb etilgan mablag'lar** (`жалб этилган`) — kreditorlar (banklar)
5. **Normativlar** (`Нормативлар`) — koeffitsentlar (kapital yetarliligi vs meyor)
6. **Yuklangan fayllar** — sana, status (tasdiqlangan/kutilmoqda), yuklagan admin

**Jadval qoidalari (#28):**
- Sticky header, qator balandligi 36px, font 13px, minimal padding 8–12px
- Saralash (ustun bosish), qatorga hover highlight
- Summa ustunlari o'ng tekislash + tabular-nums + ming ajratgich
- "Jami" qatori `--trust-accent` (#003366) qalin
- Har qatorda amallar: `Eye` ko'rish, `Edit2` change, `DocumentText` izoh

---

## 4. Funksional talablar (UX)

- **Qidiruv**: har jadval ustida, debounce 300ms, server-side
- **Pagination**: 25/50/100 qator, `ArrowDown2` sahifa tanlash
- **Filter**: sana oralig'i, firma, kredit turi, aging bucket, status
- **Eksport / generatsiya** (`DocumentDownload`): Excel (.xlsx) va PDF;
  "umumiy" belgilansa to'liq paket yuklab olish
- **Description/izoh**: har amaliyot/qatorga izoh qo'shish (audit trail ko'rinishi)
- **Change**: tahrir modali + o'zgarish tarixi
- **Tasdiqlash oqimi**: yuklashda umumiy info modal → tasdiq → DB ga save;
  sana qoidasi (masalan 14.06 yuklasa "kechagi" deb belgilanadi)

---

## 5. Holatlar (states)

- **Loading**: skeleton kartalar + jadval skeleton (spinner emas, dense uchun)
- **Empty**: "Hisobot yuklanmagan" + `DocumentUpload` CTA
- **Error**: red banner + qayta urinish
- **Success**: yashil toast (`TickCircle`), 5s
- **Pending tasdiqlash**: amber badge (`InfoCircle`)

---

## 6. Eslatma (banking must_have)

- Pul ko'rsatkichlari aniq: birlik "ming so'm", `Intl.NumberFormat('uz')`
- Xavfsizlik: faqat tasdiqlangan admin kiradi; har amaliyot audit'da
- AI purple/pink gradient YO'Q; o'ynoqi animatsiya YO'Q
