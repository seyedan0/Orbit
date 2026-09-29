# Project Progress

> این فایل منبع اصلی وضعیت پروژه است. هر AI باید قبل و بعد از کار آن را به‌روزرسانی کند.

## وضعیت کلی

- **مرحله:** فاز ۲، هسته دامنه و storage محلی Web
- **آخرین به‌روزرسانی:** 2026-09-30
- **آخرین عامل:** Claude Sonnet 4.6 (Zed Agent)
- **درصد تقریبی پیشرفت:** 38%
- **Branch فعال:** `feature/web-inbox-task-creation`
- **Branchهای پایه:** `main`، `develop`

## هدف فعلی

پیاده‌سازی vertical slice اول: ایجاد task در Inbox با IndexedDB به‌عنوان storage دائم و domain service مستقل از زیرساخت.

## کارهای در حال انجام

- [ ] PR از `feature/web-inbox-task-creation` به `develop`
- [ ] بررسی دستی در مرورگر
- [ ] تنظیم ESLint و افزودن به CI

## کارهای انجام‌شده

- [x] ایجاد فایل مرکزی پیشرفت پروژه
- [x] ایجاد پوشه مستندات
- [x] تعریف قرارداد ثبت فعالیت AIها
- [x] تعریف محدوده MVP و نیازمندی‌های functional/non-functional
- [x] ثبت معماری کلان و مرز اجزای سیستم
- [x] تعریف مدل داده و invariantهای هسته
- [x] تعریف پروتکل mutation، push/pull و conflict resolution
- [x] ایجاد مستندات امنیت، تست، عملیات، roadmap و API
- [x] ایجاد workspace ریشه و تنظیمات TypeScript
- [x] ایجاد قراردادهای اولیه `shared-types`
- [x] ایجاد interfaceهای storage و transport در `sync-engine`
- [x] ایجاد اسکلت مستنداتی سه اپلیکیشن
- [x] ایجاد برنامه جامع اجرای پروژه از فاز ۰ تا انتشار
- [x] ایجاد کاتالوگ قابلیت‌های task، تقویم، Pomodoro، عادت و تحلیل
- [x] ثبت Web به‌عنوان اولین کلاینت و مرجع رفتاری محصول
- [x] ایجاد اسکلت `apps/web` با routing، auth boundary محلی و adapter حافظه‌ای
- [x] **P2-WEB-002:** اتصال IndexedDB و اولین vertical slice ایجاد task در Inbox

## فعالیت AIها

### 2026-09-29 | راه‌اندازی اولیه مستندات

- **عامل:** GitHub Copilot
- **هدف:** ایجاد ساختار اولیه برای ثبت پیشرفت و نگهداری مستندات
- **انجام‌شده:** ایجاد `README.md`، `PROGRESS.md` و مستندات پایه در `docs/`
- **اعتبارسنجی:** بررسی ساختار فایل‌ها
- **گام بعدی:** تکمیل چشم‌انداز و انتخاب فناوری‌ها

### 2026-09-29 | ایجاد سند مهندسی MVP

- **عامل:** GitHub Copilot
- **هدف:** تبدیل محدوده محصول به مستندات قابل استفاده برای طراحی و پیاده‌سازی
- **انجام‌شده:** تکمیل vision، معماری، مدل داده، پروتکل سینک، امنیت، تست، عملیات، roadmap، واژه‌نامه و API
- **فایل‌ها:** `docs/` (همه اسناد پایه)
- **اعتبارسنجی:** `git diff --check` بدون خطا
- **گام بعدی:** ایجاد monorepo حداقلی با `shared-types`

### 2026-09-29 | ایجاد monorepo و قراردادهای هسته

- **عامل:** GitHub Copilot
- **هدف:** شروع implementation با workspace قابل typecheck
- **انجام‌شده:** workspaceهای npm، TypeScript، `TaskEntity`، mutation، `LocalStore`/`SyncTransport`
- **فایل‌ها:** `package.json`، `tsconfig*.json`، `packages/shared-types/`، `packages/sync-engine/`
- **اعتبارسنجی:** `npm install` موفق، `npm run typecheck` موفق
- **گام بعدی:** schema محلی و انتخاب SQLite یا WatermelonDB

### 2026-09-29 | برنامه جامع محصول و قابلیت‌ها

- **عامل:** GitHub Copilot
- **هدف:** مشخص‌کردن مسیر کامل پروژه
- **انجام‌شده:** `docs/project-plan.md`، `docs/feature-catalog.md`، `docs/roadmap.md`
- **اعتبارسنجی:** بررسی دروازه خروج هر فاز
- **گام بعدی:** schema محلی فاز ۲ و تصمیم دیتابیس

### 2026-09-29 | تغییر اولویت به Web-first و راه‌اندازی Git

- **عامل:** GitHub Copilot
- **هدف:** تنظیم مسیر توسعه و Git workflow
- **انجام‌شده:** ADR-005، `docs/git-workflow.md`، `CONTRIBUTING.md`، `.github/` templates، CI پایه، branchهای `develop` و `feature/web-foundation`
- **اعتبارسنجی:** بررسی سازگاری مرحله‌بندی
- **گام بعدی:** اسکلت `apps/web`

### 2026-09-30 | P2-WEB-002 | IndexedDB و ایجاد task در Inbox

- **عامل:** Claude Sonnet 4.6 (Zed Agent)
- **Stage:** فاز ۲
- **Branch:** `feature/web-inbox-task-creation`
- **هدف:** اتصال storage دائم IndexedDB و اولین vertical slice ایجاد task
- **انجام‌شده:**
  - افزودن `AtomicTaskStore` و `listTasks` به `packages/sync-engine/src/ports.ts`
  - صادر کردن `AtomicTaskStore` از `packages/sync-engine/src/index.ts`
  - اسکلت کامل `apps/web` (Vite + React + react-router-dom + idb)
  - `IndexedDbLocalStore` (پیاده‌سازی `AtomicTaskStore` با IndexedDB و تراکنش اتمیک)
  - `MemoryLocalStore` به‌روزشده با `listTasks` و `saveTaskWithMutation`
  - `StoreProvider` / `useStore` context
  - `createTask` domain service (مستقل از IndexedDB، قابل تست با هر `AtomicTaskStore`)
  - `InboxPage` با فرم ایجاد task، نمایش لیست، empty state و اعتبارسنجی عنوان
  - CI (`ci.yml`) با مراحل typecheck، test و build
- **فایل‌ها:**
  - `packages/sync-engine/src/ports.ts`، `packages/sync-engine/src/index.ts`
  - `apps/web/package.json`، `apps/web/tsconfig.json`، `apps/web/vite.config.ts`، `apps/web/index.html`
  - `apps/web/src/test-setup.ts`، `apps/web/src/main.tsx`، `apps/web/src/styles.css`
  - `apps/web/src/auth/local-session.ts`، `apps/web/src/auth/local-session.test.ts`، `apps/web/src/auth/session-context.tsx`
  - `apps/web/src/storage/memory-local-store.ts`، `apps/web/src/storage/memory-local-store.test.ts`
  - `apps/web/src/storage/indexeddb-local-store.ts`، `apps/web/src/storage/indexeddb-local-store.test.ts`
  - `apps/web/src/storage/store-context.tsx`
  - `apps/web/src/tasks/task-service.ts`، `apps/web/src/tasks/task-service.test.ts`
  - `apps/web/src/app/App.tsx`، `apps/web/src/app/AppShell.tsx`، `apps/web/src/app/pages.tsx`
  - `.github/workflows/ci.yml`، `package.json`، `package-lock.json`
- **اعتبارسنجی:**
  - `npm run typecheck` موفق (packages + web)
  - `npm run test` موفق: ۵۳ تست در ۴ فایل (auth، memory-store، indexeddb-store، task-service)
  - `npm run build --workspace @orbit/web` موفق (272 kB gzip 86 kB)
  - `npm audit` صفر آسیب‌پذیری
  - `git diff --check` بدون خطا
  - بررسی دستی در مرورگر انجام نشده

## محدودیت‌های باقی‌مانده

- **بررسی دستی مرورگر:** InboxPage در مرورگر واقعی تست نشده.
- **ESLint:** lint در مخزن نیست؛ CI فاقد مرحله lint است.
- **`INBOX_PROJECT_ID = 'inbox'`:** placeholder تا فاز ۳ (حساب کاربری). پس از account system باید به list ID واقعی کاربر تغییر کند.
- **`MemoryLocalStore` اتمیکیتی واقعی:** JS single-thread آن را ایمن می‌کند اما تراکنش واقعی ندارد. فقط برای تست است.
- **تکمیل/حذف task:** هنوز پیاده‌سازی نشده (فاز ۲، بعدی).
- **port gap:** `LocalStore` هنوز برای sync engine نیاز به `saveTaskWithMutation` atomic دارد که با `AtomicTaskStore` جداگانه حل شد.
- **allowScripts (esbuild):** npm هشدار postinstall می‌دهد؛ build موفق است ولی سیاست تایید اسکریپت نیاز به تصمیم دارد.

## تصمیم‌های مهم

تصمیم‌های معماری و فنی در [docs/decisions.md](docs/decisions.md) ثبت می‌شوند.

## قالب ثبت فعالیت

```md
### YYYY-MM-DD | عنوان فعالیت

- **عامل:** نام AI یا فرد
- **هدف:** چه چیزی قرار بود انجام شود
- **انجام‌شده:** چه تغییراتی انجام شد
- **فایل‌ها:** فایل‌های مهم تغییرکرده
- **اعتبارسنجی:** تست‌ها، بررسی‌ها یا دستورهای اجراشده
- **گام بعدی:** پیشنهاد مشخص برای ادامه
```
