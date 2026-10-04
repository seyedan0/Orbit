# Orbit Web

اولین کلاینت قابل اجرای Orbit و مرجع رفتاری محصول (ADR-005). پشته: Vite + React + TypeScript + IndexedDB.

## دستورها

از ریشه مخزن:

```powershell
npm install
npm run dev --workspace @orbit/web
npm run typecheck
npm run test
npm run build
```

## ساختار

- `src/app/` — routing، layout (`AppShell`) و صفحه‌های پایه.
- `src/auth/` — نشست محلی موقت و `RequireSession` به‌عنوان auth boundary. احراز هویت واقعی فاز ۳ است.
- `src/storage/` — adapter IndexedDB که پورت `AtomicTaskStore` را پیاده‌سازی می‌کند. `MemoryLocalStore` فقط برای تست است.
- `src/tasks/` — domain service برای ایجاد task. هیچ وابستگی مستقیمی به IndexedDB یا DOM ندارد.

## قواعد

- domain service نباید مستقیماً به IndexedDB یا `window` وابسته شود؛ از `AtomicTaskStore` استفاده کند.
- `userId` نشست محلی قابل اعتماد سرور نیست.
- `INBOX_PROJECT_ID` تا فاز ۳ (حساب کاربری) placeholder است.
