# syntax=docker/dockerfile:1

# ===========================================================================
# dashboard-pro — Next.js (App Router) + Prisma + MySQL
# Multi-stage build, Next.js "standalone" output uchun.
# ESLATMA: Hozircha ishlatilmaydi. Docker Desktop kerak bo'lganda quriladi.
# ===========================================================================

# ---- 1) deps: faqat bog'liqliklarni o'rnatish ----
FROM node:24-alpine AS deps
# Prisma engine uchun libc kerak bo'lishi mumkin
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# package fayllar + prisma schema (postinstall: prisma generate uchun)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- 2) builder: loyihani qurish ----
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client generatsiyasi (agar postinstall qilmagan bo'lsa)
RUN npx prisma generate

# Build vaqtida telemetry o'chirilgan
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 3) runner: minimal ishlash muhiti ----
FROM node:24-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# root bo'lmagan foydalanuvchi
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# public papka (agar bo'lsa)
COPY --from=builder /app/public ./public

# Next.js standalone chiqishi (next.config: output: 'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + migratsiyalar (entrypoint da migrate deploy uchun)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

# standalone server.js Next tomonidan yaratiladi
CMD ["node", "server.js"]
