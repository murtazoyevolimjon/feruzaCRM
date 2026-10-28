# EduCoin LMS (Najot Ta'lim) — o'quv markazi CRM/LMS

Bitta papkada ikki qism: `backend/` (NestJS 11 + Prisma 7 + PostgreSQL) va `frontend/` (React 18 + Vite + Tailwind).

## Ishga tushirish

```bash
# 1. Postgres va Redis
docker compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env        # JWT_SECRET (>=32 belgi), SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD ni to'ldiring
npm ci
npx prisma migrate deploy
npm run start:dev           # Swagger: http://localhost:3000/api

# 3. Frontend
cd ../frontend
cp .env.example .env
npm ci
npm run dev                 # http://localhost:5173
```

To'liq stek (production): `backend/.env` ni to'ldirib, `docker compose up -d --build`. App `8002` portda.

## Seed
Ilova ishga tushganda `SUPERADMIN_EMAIL` bilan foydalanuvchi yo'q bo'lsa yaratiladi. `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` bo'sh bo'lsa ilova **ishga tushmaydi** (standart parol yo'q). Qo'lda: `npm run db:seed` (build'dan keyin).

## Rollar
| Panel | Rollar |
|---|---|
| `/admin` | SUPERADMIN, ADMIN, ADMINSTRATOR, MANAGEMENT |
| `/teacher` | TEACHER |
| `/student` | STUDENT |

`ADMINSTRATOR` — spetsifikatsiyadagi yozilishi bo'yicha saqlangan. Yozish huquqi: faqat SUPERADMIN/ADMIN; MANAGEMENT/ADMINSTRATOR xodimlar, o'qituvchilar va statistikani o'qiy oladi (xodimni tahrirlash — rol/status/parolsiz).

## To'lov oqimi
- **KYN:** `POST /payments/create` → shlyuzga so'rov → `paymentUrl` ga redirect → shlyuz `POST /payments/webhook` (HMAC-SHA256 imzo, `KYN_SECRET_KEY`; kalit bo'sh bo'lsa hamma webhook rad etiladi).
- **CARD:** to'liq karta raqami serverga yuborilmaydi (faqat oxirgi 4 raqam, muddat, telefon). Server 6 xonali OTP (`crypto.randomInt`) yaratadi, Redis'da 3 daqiqa saqlaydi, SMS yuboradi (`SMS_PROVIDER=mock` da logga yoziladi, productionda yuborilmaydi). `POST /payments/confirm-card-otp` — 5 ta noto'g'ri urinishdan keyin sessiya bekor.

## Xavfsizlik eslatmalari
- JWT frontendda `localStorage` da saqlanadi — XSS bo'lsa o'g'irlanishi mumkin. Productionda qat'iy CSP qo'llang yoki httpOnly cookie'ga o'ting. Access token muddati `JWT_EXPIRES_IN` (standart 8h); refresh token yo'q.
- `helmet`, `@nestjs/throttler` (login: 5/daqiqa, to'lov: 10/daqiqa) yoqilgan. Javoblarda `password` chiqmaydi.
- Yangi talabaning parolini admin belgilaydi va emailga yuboriladi; talaba `mustChangePassword` bayrog'i bilan kiradi (`POST /auth/change-password`).

## Testlar
`cd backend && npm test` — auth, guard'lar, xona bandligi, uyga vazifa ko'rinishlari/ball, webhook imzosi, OTP.

## Deploy
Backend: GitHub Actions (`.github/workflows/deploy.yml`, secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`). Frontend: Vercel (`frontend/vercel.json` SPA rewrite), `VITE_API_URL` ni backend `/api` manziliga qo'ying.
