# Sistema iPhones

Sistema de gestión para un negocio de iPhones: ventas financiadas y al contado, cobro de cuotas, reparaciones, inventario, caja diaria y reportes.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- PostgreSQL (Supabase) + Prisma 7
- NextAuth (Credentials)
- Tailwind CSS 4
- Twilio (WhatsApp) y Resend
- Vercel + Axiom (logs)

## Requisitos

- Node.js 20.9 o superior (recomendado Node 22)
- Una base PostgreSQL accesible (Supabase u otra)
- Credenciales de Twilio si se van a enviar mensajes de WhatsApp

## Instalación

```bash
npm ci
```

Creá un archivo `.env` en la raíz con las variables de la sección siguiente.

> `.env` está ignorado por git. Nunca commitees credenciales.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL usada por la app (pooler en modo transacción). |
| `DIRECT_URL` | Conexión directa (modo sesión), usada por Prisma CLI para migraciones. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase. |
| `SUPABASE_SECRET_KEY` | Clave secreta de Supabase (solo servidor). |
| `NEXTAUTH_SECRET` | Secreto para firmar la sesión de NextAuth. |
| `NEXTAUTH_URL` | URL pública de la app (ej. `https://tu-dominio.com`). |
| `NEXT_PUBLIC_URL` | URL pública usada por la app. |
| `TWILIO_ACCOUNT_SID` | SID de la cuenta de Twilio. |
| `TWILIO_AUTH_TOKEN` | Token de autenticación de Twilio. |
| `TWILIO_WHATSAPP_NUMBER` | Número de WhatsApp remitente (`whatsapp:+...`). |
| `CRON_SECRET` | Token que protege el endpoint de recordatorios. |

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000`. |
| `npm run build` | Genera el cliente Prisma y compila la app para producción. |
| `npm run start` | Levanta el build de producción. |
| `npm run lint` | Ejecuta ESLint. |
| `npx tsc --noEmit` | Verificación de tipos sin emitir archivos. |
| `npm run backfill:fase1` | Script de backfill de la Fase 1. |
| `npm run test:e2e` | Build + script E2E (`prisma/scripts/e2e-unificado.ts`). |

## Base de datos y migraciones

- El esquema vive en `prisma/schema.prisma` y las migraciones en `prisma/migrations/`.
- Para generar el cliente: `npx prisma generate` (lo hace también `npm run build`).
- En producción, las migraciones se aplican con:

```bash
npx prisma migrate deploy
```

> **Importante:** nunca ejecutes `prisma migrate dev` contra la base de producción. Ese comando está pensado para desarrollo y puede reiniciar o borrar datos. Contra producción usá siempre `prisma migrate deploy`.

## CI

El workflow `.github/workflows/ci.yml` corre en cada push y pull request:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build` (con variables de entorno ficticias, sin base de datos)

## Healthcheck

`GET /api/health` responde `{ "ok": true }` sin consultar la base de datos. Es una ruta pública y sirve para monitoreo.
