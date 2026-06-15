# Design System — MASTER (Global Source of Truth)

> Manba: **UI UX Pro Max** skill (`nextlevelbuilder/ui-ux-pro-max-skill`).
> Loyiha: **dashboard-pro** — Mikromoliya tashkilotlari (MFO) uchun moliyaviy
> hisobot / BI-analitika dashboard'i.
> Tanlangan reasoning qoidasi: **#67 Banking/Traditional Finance** + **#10 Fintech (Banking)**.
> Bu fayl — global qoidalar. Sahifaga xos chetlanishlar `pages/<page>.md` da.

---

## 1. Pattern & Style (skill reasoning #67)

- **Pattern**: Trust & Authority + Feature-Rich Showcase
- **Asosiy stil**: **Minimalism / Swiss Modernism 2.0** + **Accessible & Ethical**
- **Dashboard stillari**: #28 Data-Dense Dashboard, #30 Executive Dashboard,
  #36 Financial Dashboard, #53 Bento Grid (KPI kartalar uchun)
- **Majburiy (must_have)**: `security-first`, `accessibility`
- **Dashboard sahifalarida**: dark mode qo'llab-quvvatlash (`if_dashboard: use-dark-mode`)

### ❌ Anti-patterns (qat'iy taqiqlangan — banking)
- O'ynoqi (playful) dizayn: Claymorphism, Neubrutalism, Memphis, Y2K, Vibrant blocks
- **AI binafsha/pushti gradientlar** (purple/pink AI gradients)
- Emoji'lardan ikon sifatida foydalanish → faqat SVG ikonlar
- Noaniq raqamlar / pul ko'rsatkichlari, xavfsizlik indikatorlarisiz UX
- Past kontrast, harsh/keskin animatsiyalar

---

## 2. Ranglar (Banking palette #44 + Financial #36)

### Light mode (default)
| Rol | Hex | Izoh |
|-----|-----|------|
| Primary (navy) | `#0F172A` | Asosiy brend, sidebar, sarlavhalar |
| Primary alt | `#0A1628` | Eng to'q navy (header/sidebar fon) |
| Secondary (trust blue) | `#1E3A8A` | Havolalar, faol holat, tugmalar |
| Accent / CTA (gold) | `#CA8A04` | Asosiy harakat tugmasi, urg'u |
| Background | `#F8FAFC` | Sahifa foni |
| Surface (card) | `#FFFFFF` | Kartalar, panellar |
| Text | `#020617` | Asosiy matn |
| Text muted | `#475569` | Ikkilamchi matn |
| Border | `#E2E8F0` | Chegaralar, ajratgichlar |

### Moliyaviy semantik ranglar (#36)
| Holat | Hex | Ishlatish |
|-------|-----|-----------|
| Profit / o'sish (+) | `#22C55E` | Daromad, ijobiy delta, "sof foyda" |
| Loss / pasayish (−) | `#EF4444` | Zarar, manfiy delta, muddati o'tgan |
| Warning / variance | `#F59E0B` | Byudjet og'ishi, ogohlantirish (aging 31-90) |
| Neutral | `#6B7280` | O'zgarishsiz, info |
| Trust accent | `#003366` | Jami/yakuniy qatorlar |

### Dark mode (dashboard)
| Rol | Hex |
|-----|-----|
| Background | `#020617` |
| Surface | `#0F172A` |
| Border | `#1E293B` |
| Text | `#F8FAFC` |
| Text muted | `#94A3B8` |
| Accent (gold) | `#EAB308` |

> Kontrast: barcha matn uchun **WCAG AA 4.5:1** (moliyaviy ko'rsatkichlar — AAA 7:1 ga intiling).

---

## 3. Tipografiya (skill #31 Financial Trust)

- **Asosiy shrift**: **IBM Plex Sans** — "trust va professionallikni ifodalaydi,
  ma'lumot (raqamlar) uchun a'lo".
- **Zaxira (accessibility)**: Lexend / Source Sans 3 (Corporate Trust #16).
- **Raqamlar/jadval**: tabular-nums (`font-variant-numeric: tabular-nums`) — ustunlar tekis turishi uchun.
- Krill (o'zbek) qo'llab-quvvatlanishi shart → IBM Plex Sans krillni qo'llab-quvvatlaydi.

```
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
```

```js
// tailwind.config — fontFamily
fontFamily: { sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'] }
```

| Token | Hajm | Weight |
|-------|------|--------|
| Display / KPI raqam | 28–40px (clamp) | 600–700 |
| H1 sahifa sarlavhasi | 24px | 600 |
| H2 bo'lim | 18–20px | 600 |
| Body | 14px | 400 |
| Jadval / dense | 13px | 400–500 |
| Caption / label | 12px | 500 |

---

## 4. Spacing, radius, shadow (Minimalism + Soft UI Evolution)

```
--base-unit: 8px;
--space: 4 / 8 / 12 / 16 / 24 / 32 / 48px;
--radius-sm: 6px;     /* inputs, badges */
--radius-md: 10px;    /* cards, buttons */
--radius-lg: 16px;    /* bento kartalar */
--border: 1px solid #E2E8F0;

/* Soft, professional — neumorphism EMAS */
--shadow-sm: 0 1px 2px rgba(2,6,23,0.06);
--shadow-md: 0 4px 6px rgba(2,6,23,0.08);
--shadow-lg: 0 10px 20px rgba(2,6,23,0.10);
```

- Dense jadvallarda padding kichik: 8–12px (skill #28).
- KPI kartalar: Bento grid, radius 16px, `--shadow-md`, hover `translateY(-2px)`.

---

## 5. Animatsiya & interaksiya

- O'tishlar: **150–300ms ease** (smooth, harsh emas).
- Raqam animatsiyalari: count-up KPI va summalar uchun (skill banking: "Smooth number animations").
- Hover: barcha bosiladigan elementlarda `cursor: pointer` + smooth transition.
- `prefers-reduced-motion` hurmat qilinsin.
- Holat o'tishlari (yuklash → muvaffaqiyat/xato) silliq.

---

## 6. Ikonlar — **Iconsax** (loyiha talabi)

> Skill standarti Lucide tavsiya qiladi, lekin loyiha talabi bo'yicha **Iconsax**
> (`iconsax-react`/`iconsax-reactjs`) ishlatiladi. Skill anti-pattern'i saqlanadi:
> **emoji EMAS, faqat SVG ikon.**

- Stil: **Outline** (asosiy), faol holat uchun **Bold/Bulk**.
- O'lcham: 20px (sidebar/inline), 24px (sarlavha), 16px (jadval inline).
- Rang: `currentColor` (matn rangiga moslashadi).
- Mos misollar: `Element3` (dashboard), `Building`/`Bank` (firmalar),
  `DocumentText`/`DocumentUpload` (yuklash), `Chart`/`StatusUp` (analitika),
  `SearchNormal1` (qidiruv), `Filter`, `ArrowDown2` (pagination), `Eye`,
  `Edit2`, `Trash`, `DocumentDownload` (eksport), `Calendar`, `TickCircle`,
  `InfoCircle`, `Lock`/`ShieldTick` (xavfsizlik indikatorlari).

---

## 7. Komponent qoidalari (security-first + accessibility)

- **Login**: minimal, markazlashgan karta, xavfsizlik indikatori (qulf ikon),
  aniq xato holatlari, fokus halqasi 3px. Parol bcrypt bilan hash (UI emas, backend).
- **Tugmalar**: Primary = gold CTA; Secondary = navy outline; Destructive = red.
  Min balandlik 40px, fokus ko'rinadi, disabled holati aniq.
- **Inputlar**: balandlik 40–44px, `:focus` halqa (3px), label bog'langan,
  xato matni rangli (red) + ikon.
- **Jadvallar**: sticky header, zebra striping ixtiyoriy, saralash, qatorga hover,
  tabular-nums, summa o'ng tekislash, jami qatori `--trust-accent`.
- **KPI karta**: katta raqam (count-up), trend strelka (+yashil / −qizil), sparkline.
- **Modal (tasdiqlash)**: yuklashdan oldin umumiy info ko'rsatib tasdiq so'raydi.
- **Description/izoh**: har amaliyotga izoh maydoni (audit ko'rinishi).

---

## 8. Pre-delivery checklist (skill majburiy)

- [ ] Emoji ikon sifatida YO'Q (faqat SVG / Iconsax)
- [ ] Barcha bosiladigan elementda `cursor-pointer`
- [ ] Hover holatlari silliq o'tish bilan (150–300ms)
- [ ] Light mode matn kontrasti ≥ 4.5:1 (moliyaviy ≥ 7:1)
- [ ] Klaviatura navigatsiyasi uchun fokus holatlari ko'rinadi
- [ ] `prefers-reduced-motion` hurmat qilingan
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Xavfsizlik indikatorlari mavjud (banking must_have)
- [ ] AI purple/pink gradient YO'Q, playful stil YO'Q
- [ ] Pul/summalar to'g'ri formatlangan (Intl.NumberFormat, ming ajratgich, "so'm")
