# Project Progress

> این فایل منبع اصلی وضعیت پروژه است. هر AI باید قبل و بعد از کار آن را به‌روزرسانی کند.

## وضعیت کلی

- **مرحله:** فاز ۳، sync و حساب کاربری
- **آخرین به‌روزرسانی:** 2026-09-30
- **آخرین عامل:** Antigravity
- **درصد تقریبی پیشرفت:** 70%
- **Branch فعال:** `feature/sync-runtime-fake-transport`
- **Branchهای پایه:** `main`، `develop`

## هدف فعلی

طراحی و پیاده‌سازی اولین برش عمودی موتور همگام‌سازی (`SyncRuntime`) مستقل از React و IndexedDB با استفاده از قراردادهای موجود `LocalStore` و `SyncTransport`، پیاده‌سازی `FakeSyncTransport` قطعی، حفظ ترتیب FIFO و idempotency، پشتیبانی از pull/push، به‌روزرسانی وضعیت جهش‌ها (SUCCEEDED، PENDING برای خطای موقت، FAILED برای رد دائمی) و جلوگیری از retry خودکار موارد rejected.

## کارهای در حال انجام

- [ ] بازبینی و PR شاخه `feature/sync-runtime-fake-transport` به `develop`
- [ ] شروع گام‌های بعدی فاز ۳ (احراز هویت و APIهای سینک سرور)

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
- [x] ادغام PR شماره ۱ (`feature/web-inbox-task-creation`) در `develop`
- [x] **P2-WEB-003:** بازسازی ساختار Web به صورت feature-oriented بدون تغییر رفتار
- [x] ادغام PR شماره ۲ (`refactor/web-feature-structure`) در `develop`
- [x] افزودن ESLint با کانفیگ Flat به `apps/web` و افزودن به CI
- [x] ادغام PR شماره ۳ (`chore/web-eslint-and-docs`) در `develop`
- [x] همگام‌سازی مستندات پروژه (`docs/git-workflow.md`، `CONTRIBUTING.md`، قالب‌ها و ADRها)
- [x] **P2-WEB-004:** پیاده‌سازی رفتار تکمیل و بازگشایی تسک (`complete/reopen`) در دامنه، کنترل‌های UI و اعتبارسنجی اتمیک
- [x] ادغام PR شماره ۴ (`feature/web-task-completion`) در `develop`
- [x] **P2-WEB-005:** پیاده‌سازی حذف نرم و بازیابی تسک (`delete/restore`) در دامنه و رابط کاربری Inbox
- [x] ادغام PR شماره ۵ و ۶ (`feature/web-task-delete-restore`) در `develop`
- [x] **P3-WEB-001:** طراحی و پیاده‌سازی اولین برش عمودی sync runtime با fake transport قطعی

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

### 2026-09-30 | همگام‌سازی branch با develop و آماده‌سازی PR

- **عامل:** Claude Sonnet 4.6 (Zed Agent)
- **Branch:** `feature/web-inbox-task-creation` (branch کانونی؛ `feature/web-foundation` عمداً merge نمی‌شود چون پیاده‌سازی IndexedDB تکراری دارد)
- **هدف:** همگام‌سازی با `origin/develop` پیش از PR
- **نتیجه همگام‌سازی:** `git merge origin/develop` پاسخ «Already up to date» داد. `origin/develop` (`076c47c`) جد مستقیم branch است و branch دقیقاً یک commit جلوتر است (`12d118d`). commit merge ساخته نشد و تعارضی وجود نداشت.
- **بررسی محتوا:** P2-WEB-002 کامل در `12d118d` است: قرارداد `AtomicTaskStore`، `listTasks`، `saveTaskWithMutation`، `IndexedDbLocalStore`، `createTask`، `InboxPage` و چهار فایل تست.
- **commitها:** پایه develop = `076c47c`؛ کار P2-WEB-002 = `12d118d`
- **اعتبارسنجی (روی همین branch):** `npm ci` موفق؛ `npm run typecheck` موفق؛ `npm run test` و `npm run test --workspace @orbit/web` هر دو ۵۳ تست در ۴ فایل موفق؛ `npm run build --workspace @orbit/web` موفق (۴۹ ماژول، JS ‏272 kB / gzip ‏86.9 kB)؛ `npm audit` صفر آسیب‌پذیری؛ `git diff --check` بدون خطا
- **فایل‌ها:** فقط `PROGRESS.md`
- **گام بعدی:** merge شدن PR، سپس ساخت `refactor/web-feature-structure` از develop به‌روز و شروع P2-WEB-003

### 2026-09-30 | بازبینی و اعتبارسنجی همگام‌سازی با develop و وضعیت PR

- **عامل:** Antigravity
- **Branch:** `feature/web-inbox-task-creation` (شاخه کانونی؛ عدم ادغام `feature/web-foundation` به دلیل پیاده‌سازی تکراری IndexedDB)
- **هدف:** اجرای همگام‌سازی و اعتبارسنجی با `origin/develop` پیش از اقدام به PR و آماده‌سازی refactor فاز ۲
- **نتیجه همگام‌سازی و حل تعارض:** `origin/develop` با شناسه `076c47cd1db29af0a0cf03636b9a05261721bcac` جد مستقیم شاخه `feature/web-inbox-task-creation` است. دستور `git merge origin/develop` وضعیت «Already up to date» داد و هیچ تعارضی وجود نداشت (صفر تعارض). مستندات مشترک، قرارداد `AtomicTaskStore`، `IndexedDbLocalStore`، `listTasks`، سرویس `createTask`، `InboxPage` و تمام تست‌ها کاملاً حفظ شده‌اند.
- **تایید P2-WEB-002:** تایید شد که P2-WEB-002 به طور کامل در `feature/web-inbox-task-creation` قرار دارد.
- **شناسه‌های دقیق Commitها:**
  - پایه `origin/develop`: `076c47cd1db29af0a0cf03636b9a05261721bcac`
  - پیاده‌سازی P2-WEB-002: `12d118d62a3081b612992bd5944f3fe60db1e382`
  - بررسی پیشین شاخه: `1a4bdeb18391a4d3dad0bc6fb79e4a3ce9b25e22`
- **اعتبارسنجی کامل:**
  - `npm ci`: موفق (۹۴ بسته، صفر آسیب‌پذیری)
  - `npm run typecheck`: موفق بدون هیچ خطایی (هسته monorepo و `@orbit/web`)
  - `npm run test`: موفق؛ ۵۳ تست در ۴ فایل (`local-session.test.ts`, `memory-local-store.test.ts`, `task-service.test.ts`, `indexeddb-local-store.test.ts`)
  - `npm run test --workspace @orbit/web`: موفق؛ ۵۳ تست پاس شد
  - `npm run build --workspace @orbit/web`: موفق؛ ۴۹ ماژول بیلد شدند (HTML: 0.40 kB, CSS: 1.66 kB, JS: 272.09 kB / gzip: 86.90 kB)
  - `git diff --check`: بدون خروجی و خطا
- **محدودیت‌های باقی‌مانده:**
  - تست دستی در مرورگر هنوز انجام نشده است
  - پیکربندی ESLint هنوز در پروژه انجام نشده و در CI نیست
  - شناسه `INBOX_PROJECT_ID = 'inbox'` موقت بوده و تا فاز ۳ (سیستم حساب کاربری) جایگزین خواهد شد
  - مستندات اختصاصی `feature/web-foundation` (`docs/git-workflow.md`، `CONTRIBUTING.md` و ADR-006) در PR جداگانه مستندات منتقل خواهند شد
- **وضعیت PR:** Pull Request شماره ۱ با عنوان `feat(web): add local-first inbox task creation` برای ادغام `feature/web-inbox-task-creation` به `develop` در گیت‌هاب باز است.
- **گام بعدی:** منتظر تایید و ادغام PR شماره ۱ در `develop` توسط کاربر/مالک مخزن، سپس ساخت شاخه `refactor/web-feature-structure` از `develop` به‌روزرسانی‌شده و شروع بازسازی ساختار Web (P2-WEB-003).

### 2026-09-30 | P2-WEB-003 | بازسازی ساختار Web به صورت Feature-oriented

- **عامل:** Antigravity
- **Task ID:** P2-WEB-003
- **Branch:** `refactor/web-feature-structure`
- **هدف:** بازآرایی ساختار `apps/web/src` از ساختار یکپارچه/صفحه‌محور (`pages.tsx`) به معماری تمیز و مبتنی بر قابلیت (Feature-oriented) با حفظ ۱۰۰٪ رفتار قبلی.
- **انجام‌شده:**
  - تایید ادغام کامل PR شماره ۱ (`feature/web-inbox-task-creation`) در `develop`
  - ساخت و آماده‌سازی شاخه `refactor/web-feature-structure` از آخرین نسخه `develop`
  - انتقال زیرساخت‌های متقاطع (`auth` و `storage`) به `apps/web/src/core/`
  - انتقال `AppShell.tsx` به `apps/web/src/layout/AppShell.tsx` و ایجاد استایل‌های تفکیک‌شده `AppShell.module.css`
  - انتقال استایل‌های مشترک و reset کلی به `apps/web/src/styles/globals.css` و به‌روزرسانی `main.tsx`
  - ایجاد کامپوننت‌های مستقل دامنه تسک در `apps/web/src/features/tasks/components/`:
    - `TaskForm.tsx` (فرم ورود تسک، مدیریت خطا و وضعیت)
    - `TaskItem.tsx` (نمایش هر آیتم تسک)
    - `TaskList.tsx` (لیست تسک‌ها)
    - `EmptyState.tsx` (پیام حالت خالی)
  - ایجاد صفحه اینباکس ماژولار `apps/web/src/features/tasks/pages/InboxPage.tsx`
  - انتقال سرویس و تست‌های تسک به `apps/web/src/features/tasks/services/`
  - ایجاد صفحات مستقل `features/auth/pages/SignInPage.tsx` و `features/settings/pages/SettingsPage.tsx`
  - ایجاد کامپوننت روتینگ `app/routes.tsx` و صفحه `app/NotFoundPage.tsx`
  - ساده‌سازی `app/App.tsx` و محدود کردن آن به Providerها و ترکیب Routeها
  - حذف کامل فایل تک‌فایلی `pages.tsx`
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `apps/web/src/core/auth/` (`local-session.ts`, `local-session.test.ts`, `session-context.tsx`)
  - `apps/web/src/core/storage/` (`indexeddb-local-store.ts`, `indexeddb-local-store.test.ts`, `memory-local-store.ts`, `memory-local-store.test.ts`, `store-context.tsx`)
  - `apps/web/src/features/tasks/` (`services/task-service.ts`, `services/task-service.test.ts`, `components/TaskForm.tsx`, `components/TaskItem.tsx`, `components/TaskList.tsx`, `components/EmptyState.tsx`, `pages/InboxPage.tsx`)
  - `apps/web/src/features/auth/pages/SignInPage.tsx`
  - `apps/web/src/features/settings/pages/SettingsPage.tsx`
  - `apps/web/src/layout/` (`AppShell.tsx`, `AppShell.module.css`)
  - `apps/web/src/styles/globals.css`
  - `apps/web/src/app/` (`App.tsx`, `routes.tsx`, `NotFoundPage.tsx`)
  - `apps/web/src/main.tsx`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق (۰ آسیب‌پذیری)
  - `npm run typecheck`: موفق بدون هیچ خطایی
  - `npm run test`: موفق؛ ۵۳ تست در ۴ فایل پاس شد
  - `npm run test --workspace @orbit/web`: موفق؛ ۵۳ تست پاس شد
  - `npm run build --workspace @orbit/web`: موفق؛ ۵۸ ماژول بیلد شدند (HTML: 0.40 kB, CSS: 1.69 kB, JS: 272.48 kB / gzip: 87.06 kB)
  - `git diff --check`: کاملاً پاک و بدون خطای فاصله‌گذاری
  - **نتیجه بررسی دستی مرورگر:** به دلیل خطای Playwright در دانلود درایور ویندوز در محیط ایجنت (`404` در دانلود درایور از CDN رسمی)، ساب‌ایجنت مرورگر نتوانست اجرا شود. تمام رفتارهای دامنه و ذخیره‌سازی توسط تست‌های خودکار تایید شده‌اند و بررسی دستی روی مرورگر واقعی توسط کاربر توصیه می‌شود.
- **محدودیت‌های باقی‌مانده:**
  - بررسی دستی در مرورگر فیزیکی
  - نبود ESLint در مخزن و CI
  - `INBOX_PROJECT_ID = 'inbox'` موقت تا فاز ۳
  - انتقال اسناد (`docs/git-workflow.md`, `CONTRIBUTING.md` و ADR-006) در PR مستقل
- **گام بعدی (Handoff):**
  - ایجاد Pull Request از `refactor/web-feature-structure` به `develop`
  - افزودن ESLint و CI lint step
  - شروع پیاده‌سازی complete/reopen و delete/restore task

### 2026-09-30 | افزودن ESLint به Web و همگام‌سازی مستندات پروژه

- **عامل:** Antigravity
- **Branch:** `chore/web-eslint-and-docs`
- **هدف:** راه‌اندازی ESLint با کانفیگ Flat برای `apps/web`، اضافه کردن گام lint به CI و اعتبارسنجی ریشه، و انتقال فایل‌های مدیریت پروژه (`docs/git-workflow.md`، `CONTRIBUTING.md`، قالب‌های Issue و PR) و ثبت ADR-006 و ADR-007.
- **انجام‌شده:**
  - نصب پکیج‌های `eslint`، `@eslint/js` و `typescript-eslint` در `apps/web`
  - ایجاد کانفیگ Flat در `apps/web/eslint.config.js` با قوانین سبک و هوشمند TypeScript (`@typescript-eslint/no-unused-vars` با ignore پیشوند `_`)
  - افزودن اسکریپت `"lint": "eslint ."` به `apps/web/package.json`
  - اتصال دستور ریشه `"lint": "npm run lint --workspaces --if-present"` به ورک‌اسپیس‌ها
  - افزودن گام Lint به اکشن GitHub Actions در `.github/workflows/ci.yml`
  - انتقال و ایجاد فایل‌های مدیریت پروژه بدون کد تکراری IndexedDB:
    - `docs/git-workflow.md` (راهنمای شاخه‌ها، کامیت‌های استاندارد و فرآیند انتشار)
    - `CONTRIBUTING.md` (راهنمای مشارکت‌کنندگان و چک‌لیست قبل از شروع کار)
    - `.github/PULL_REQUEST_TEMPLATE.md` (قالب استاندارد Pull Request)
    - `.github/ISSUE_TEMPLATE/bug.yml` و `.github/ISSUE_TEMPLATE/feature.yml`
  - ثبت تصمیم‌های معماری در `docs/decisions.md`:
    - `ADR-006`: پشته Web شامل Vite، React و React Router
    - `ADR-007`: پیاده‌سازی storage پایدار با IndexedDB و قرارداد `AtomicTaskStore`
  - به‌روزرسانی فاز فعلی در `docs/project-plan.md` و `docs/roadmap.md` به فاز ۲
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `apps/web/package.json`، `apps/web/eslint.config.js`، `package-lock.json`
  - `.github/workflows/ci.yml`
  - `docs/git-workflow.md`، `CONTRIBUTING.md`
  - `.github/PULL_REQUEST_TEMPLATE.md`، `.github/ISSUE_TEMPLATE/bug.yml`، `.github/ISSUE_TEMPLATE/feature.yml`
  - `docs/decisions.md`، `docs/project-plan.md`، `docs/roadmap.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق (۰ آسیب‌پذیری)
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق بدون هیچ خطایی
  - `npm run test`: موفق؛ ۵۳ تست پاس شد
  - `npm run build`: موفق؛ تمامی ورک‌اسپیس‌ها با موفقیت بیلد شدند
  - `git diff --check`: بدون خطای فاصله‌گذاری
- **محدودیت‌های باقی‌مانده:**
  - بررسی دستی در مرورگر فیزیکی (ایجاد، رفرش، تنظیمات و خروج)
  - `INBOX_PROJECT_ID = 'inbox'` موقت تا فاز ۳ (حساب کاربری)
- **گام بعدی (Handoff):**
  - ادغام PR شماره ۳ (`chore/web-eslint-and-docs`) در `develop`
  - شروع پیاده‌سازی P2-WEB-004 (تکمیل و بازگشایی تسک)

### 2026-09-30 | P2-WEB-004 | پیاده‌سازی رفتار تکمیل و بازگشایی تسک‌ها در Inbox Web

- **عامل:** Antigravity
- **Task ID:** P2-WEB-004
- **Branch:** `feature/web-task-completion`
- **هدف:** پیاده‌سازی کامل رفتار تکمیل (`completeTask`) و بازگشایی (`reopenTask`) برای موجودیت‌های نوع `TASK` در کلاینت Web و Inbox با ذخیره‌سازی اتمیک، ثبت جهش‌های UPDATE در صف همگام‌سازی، تفکیک رفتاری از نوع `NOTE` و به‌روزرسانی آنی و بازگشت‌پذیر رابط کاربری.
- **انجام‌شده:**
  - ارتقای مدل داده با افزودن فیلد اختیاری `completedAt?: string | null` و تابع کمکی `isTaskCompleted` به `packages/shared-types` و مستندات `docs/data-model.md`
  - توسعه سرویس‌های دامنه `completeTask` و `reopenTask` در `apps/web/src/features/tasks/services/task-service.ts`:
    - بررسی نوع موجودیت و ممانعت از تکمیل یادداشت‌ها (`InvalidTaskKindError`)
    - حفظ رفتار idempotent (در صورت فراخوانی مکرر، تسک موجود بدون تولید جهش اضافی یا تغییر زمان بازگردانده می‌شود)
    - تنظیم فیلد `completedAt` به صورت اتمیک و به‌روزرسانی `updatedAt`
    - ایجاد جهش جزئی `UPDATE` با `fieldTimestamps` برای سازگاری با حل تعارض LWW در پروتکل سینک
    - حفظ وضعیت `localStatus` (در صورتی که محلی ایجاد شده باشد `CREATED` باقی می‌ماند و در صورت سینک بودن به `UPDATED` تغییر می‌کند)
    - ذخیره‌سازی اتمیک با `saveTaskWithMutation` در `AtomicTaskStore`
  - ارتقای کامپوننت `TaskItem`:
    - افزودن کنترل چک‌باکس با دسترس‌پذیری (`aria-label`) و تست‌پذیری (`data-testid`)
    - عدم رندر چک‌باکس برای موجودیت‌های نوع `NOTE`
    - افزودن کلاس و استایل‌های بصری برای تسک‌های تکمیل‌شده (خط روی عنوان و شفافیت مناسب)
  - ارتقای کامپوننت `TaskList` و اتصال پروپ‌های کنترلی
  - ارتقای صفحه `InboxPage`:
    - به‌روزرسانی آنی UI (Optimistic Update)
    - فراخوانی سرویس دامنه بدون تماس مستقیم با IndexedDB
    - بازگردانی وضعیت به نسخه پیشین (Rollback) در صورت شکست ذخیره‌سازی برای جلوگیری از ناهمگونی رابط کاربری
  - افزودن استایل‌های وضعیت تکمیل به `apps/web/src/styles/globals.css`
  - نگارش تست‌های جامع:
    - ۳۵ تست در `task-service.test.ts` (شامل پوشش کامل complete، reopen، جهش UPDATE، idempotency، رد NOTE، عدم تغییر وضعیت در خطای دیتابیس)
    - تست بقای داده پس از رفرش شبیه‌سازی‌شده مرورگر در `indexeddb-local-store.test.ts`
    - ۵ تست کامپوننت `TaskItem.test.tsx` برای بررسی رندر چک‌باکس، رد NOTE و فعال‌سازی callback
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `packages/shared-types/src/task.ts`، `packages/shared-types/src/index.ts`
  - `docs/data-model.md`
  - `apps/web/src/features/tasks/services/task-service.ts`
  - `apps/web/src/features/tasks/services/task-service.test.ts`
  - `apps/web/src/features/tasks/components/TaskItem.tsx`
  - `apps/web/src/features/tasks/components/TaskItem.test.tsx`
  - `apps/web/src/features/tasks/components/TaskList.tsx`
  - `apps/web/src/features/tasks/pages/InboxPage.tsx`
  - `apps/web/src/core/storage/indexeddb-local-store.test.ts`
  - `apps/web/src/styles/globals.css`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا
  - `npm run test`: موفق؛ تمام ۷۵ تست در ۵ فایل تست پاس شدند (۵۳ تست قبلی + ۲۲ تست جدید)
  - `npm run build --workspace @orbit/web`: موفق (۵۸ ماژول بیلد شدند)
  - `git diff --check`: بدون خطای فاصله‌گذاری
  - **بررسی مرورگر:** اجرای ساب‌ایجنت مرورگر به دلیل خطای شبکه در دریافت درایور ویندوز Playwright (پاسخ ۴۰۴ از CDN رسمی) در دسترس نبود؛ تمام سناریوهای پایداری پس از رفرش، رفتار کنترلی کامپوننت و اتمیسیتی توسط تست‌های خودکار در سطح IndexedDB و سرویس اعتبارسنجی شده‌اند.
- **محدودیت‌های باقی‌مانده:**
  - بررسی دستی در مرورگر فیزیکی توسط کاربر
  - حذف نرم (soft delete) و بازیابی تسک (در مرحله بعدی فاز ۲)
  - `INBOX_PROJECT_ID = 'inbox'` موقت تا فاز ۳ (حساب کاربری)
- **وضعیت PR:**
  - Pull Request شماره ۴ با موفقیت در شاخه `develop` ادغام شد.
- **گام بعدی (Handoff):**
  - ادغام کامل شد؛ آغاز پیاده‌سازی P2-WEB-005 (حذف نرم و بازیابی تسک).

### 2026-09-30 | P2-WEB-005 | پیاده‌سازی حذف نرم و بازیابی تسک‌ها در Inbox Web

- **عامل:** Antigravity
- **Task ID:** P2-WEB-005
- **Branch:** `feature/web-task-delete-restore`
- **هدف:** پیاده‌سازی حذف نرم (`deleteTask`) با تنظیم `deletedAt` و بازیابی تسک (`restoreTask`) با بازنشانی آن به `null` بدون حذف فیزیکی تسک از IndexedDB، تولید جهش `UPDATE` به صورت اتمیک، مستثنی‌کردن تسک‌های حذف‌شده از لیست پیش‌فرض Inbox و بازگشت امن در صورت خطا در رابط کاربری (Optimistic Rollback).
- **انجام‌شده:**
  - به‌روزرسانی رفتار `listTasks` در `IndexedDbLocalStore` و `MemoryLocalStore` به‌گونه‌ای که به طور پیش‌فرض رکوردهای دارای `deletedAt != null` فیلتر شوند و آپشن اختیاری `{ includeDeleted?: boolean }` برای دسترسی به همه تسک‌ها در صورت نیاز فراهم باشد.
  - پیاده‌سازی سرویس‌های دامنه `deleteTask` و `restoreTask` در `apps/web/src/features/tasks/services/task-service.ts`:
    - بررسی idempotency: در صورتی که تسک قبلاً حذف یا بازیابی شده باشد، بدون تولید جهش اضافی یا تغییر زمان همان تسک بازگردانده می‌شود.
    - پشتیبانی از تمام انواع موجودیت (`TASK`، `NOTE` و `CHECKLIST`).
    - تنظیم فیلد `deletedAt` (مقدار ISO timestamp هنگام حذف و `null` هنگام بازیابی).
    - به‌روزرسانی `updatedAt` به زمان جاری.
    - به‌روزرسانی وضعیت همگام‌سازی محلی `localStatus` به `'DELETED'` هنگام حذف، و در صورت بازیابی بازگشت به `'CREATED'` (برای تسک‌های با ورژن ۰) یا `'UPDATED'`.
    - ایجاد جهش جزئی `UPDATE` شامل `fieldTimestamps.deletedAt` برای همسویی با الگوریتم LWW در پروتکل سینک.
    - ذخیره‌سازی اتمیک با `store.saveTaskWithMutation`.
  - ارتقای کامپوننت `TaskItem`:
    - افزودن دکمه‌های حذف (`btn-delete` با `aria-label="حذف تسک"`) و بازیابی (`btn-restore` با `aria-label="بازیابی تسک"`).
    - تفکیک وضعیت نمایش بر اساس مقدار `deletedAt`.
  - ارتقای کامپوننت `TaskList` و اتصال callbackهای `onDelete` و `onRestore`.
  - ارتقای صفحه `InboxPage`:
    - پیاده‌سازی `handleDelete` با به‌روزرسانی آنی UI (حذف بلافاصله از لیست) و ذخیره تسک در حافظه undo.
    - نمایش بنر تعاملی Undo با امکان بازگردانی سریع (`banner-undo`).
    - پیاده‌سازی `handleRestore` با به‌روزرسانی آنی و بازگرداندن تسک به لیست.
    - پیاده‌سازی کامل Rollback در صورت بروز خطای پایگاه داده در هر دو عملیات delete و restore جهت حفظ یکپارچگی حالت UI با حافظه دائم.
  - به‌روزرسانی استایل‌ها در `apps/web/src/styles/globals.css`:
    - استایل‌های دکمه حذف و بازیابی با هاور و فیدبک مناسب.
    - استایل بنر Undo با چیدمان راست‌به‌چپ (RTL).
  - نگارش تست‌های خودکار جامع:
    - ۱۵ تست جدید در `task-service.test.ts` (مجموعاً ۵۰ تست دامنه شامل soft delete، restore، idempotency، جهش UPDATE، پشتیبانی از انواع موجودیت و rollback در خطا).
    - تست بقای داده پس از رفرش شبیه‌سازی‌شده در `indexeddb-local-store.test.ts` (مجموعاً ۱۹ تست).
    - تست فیلترینگ `includeDeleted` در `memory-local-store.test.ts` (مجموعاً ۱۳ تست).
    - تست‌های تعاملی کامپوننت در `TaskItem.test.tsx` (مجموعاً ۷ تست).
    - مجموع کل تست‌های پروژه: ۹۴ تست کاملاً سبز.
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `apps/web/src/core/storage/indexeddb-local-store.ts`
  - `apps/web/src/core/storage/indexeddb-local-store.test.ts`
  - `apps/web/src/core/storage/memory-local-store.ts`
  - `apps/web/src/core/storage/memory-local-store.test.ts`
  - `apps/web/src/features/tasks/services/task-service.ts`
  - `apps/web/src/features/tasks/services/task-service.test.ts`
  - `apps/web/src/features/tasks/components/TaskItem.tsx`
  - `apps/web/src/features/tasks/components/TaskItem.test.tsx`
  - `apps/web/src/features/tasks/components/TaskList.tsx`
  - `apps/web/src/features/tasks/pages/InboxPage.tsx`
  - `apps/web/src/styles/globals.css`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا
  - `npm run test`: موفق؛ تمام ۹۴ تست در ۵ فایل تست پاس شدند
  - `npm run build --workspace @orbit/web`: موفق بدون خطا
  - `git diff --check`: بدون خطای فاصله‌گذاری
- **محدودیت‌های باقی‌مانده:**
  - بررسی دستی در مرورگر فیزیکی توسط کاربر
  - `INBOX_PROJECT_ID = 'inbox'` موقت تا فاز ۳ (حساب کاربری)
- **وضعیت PR:**
  - Pull Request شماره ۵ و شماره ۶ برای شاخه `feature/web-task-delete-restore` با موفقیت در شاخه `develop` ادغام شدند (کامیت ادغام: `03f01d5`).
- **گام بعدی (Handoff):**
  - ادغام کامل شد؛ آغاز فاز ۳ با تسک P3-WEB-001 (پیاده‌سازی sync runtime با fake transport).

### 2026-09-30 | P3-WEB-001 | پیاده‌سازی اولین برش عمودی SyncRuntime با Fake Transport

- **عامل:** Antigravity
- **Task ID:** P3-WEB-001
- **Branch:** `feature/sync-runtime-fake-transport`
- **هدف:** طراحی و پیاده‌سازی سرویس زمان اجرای همگام‌سازی (`SyncRuntime`) مستقل از React و IndexedDB بر اساس قراردادهای `LocalStore` و `SyncTransport`، پیاده‌سازی `FakeSyncTransport` قطعی برای آزمون‌ها، حفظ ترتیب FIFO و idempotency، پشتیبانی از pull/push، و مدیریت چرخه‌حیات وضعیت‌های جهش (SUCCEEDED، PENDING با backoff، و FAILED برای خطاهای غیرقابل بازگشت بدون retry خودکار).
- **انجام‌شده:**
  - ارتقای قرارداد `LocalStore` در `packages/sync-engine/src/ports.ts` با پشتیبانی از پارامتر اختیاری `status?: QueueStatus` در `markMutationFailed` جهت پشتیبانی از خطاهای دائمی.
  - به‌روزرسانی آداپترهای ذخیره‌سازی محلی `MemoryLocalStore` و `IndexedDbLocalStore` برای اعمال پارامتر `status` (پیش‌فرض `'PENDING'` و قابلیت ثبت وضعیت `'FAILED'`) به همراه متد کمکی `getMutation(id)` برای بررسی مستقیم در تست‌ها.
  - طراحی و پیاده‌سازی سرویس `SyncRuntime` در `packages/sync-engine/src/sync-runtime.ts`:
    - کاملاً مستقل از React و دیتابیس‌های خاص (IndexedDB).
    - `pullOnce`: دریافت تغییرات سرور، ذخیره تک‌تک تغییرات در `LocalStore`، و اعمال/ثبت کرسر جدید (`saveCursor`) صرفاً پس از ذخیره‌سازی موفقیت‌آمیز تمام تغییرات (جلوگیری قطعی از advance شدن کرسر در صورت بروز خطا در ذخیره‌سازی).
    - `pushOnce`: استخراج جهش‌های صف در صف FIFO بر اساس زمان ایجاد، ارسال به transport، علامت‌گذاری وضعیت‌های موفق (`APPLIED`، `ALREADY_APPLIED`، `CONFLICT_MERGED`) به `SUCCEEDED`، محاسبه exponential backoff و بازگرداندن خطاهای موقت سرور (`RETRYABLE_ERROR`) به وضعیت `PENDING` با `nextAttemptAt` در آینده، و علامت‌گذاری جهش‌های ردشده (`REJECTED`) به `FAILED` تا هرگز به صورت خودکار مجدداً ارسال نشوند.
    - `syncOnce`: اجرای زنجیره‌ای pull و سپس push به عنوان یک چرخه همگام‌سازی کامل.
  - طراحی و پیاده‌سازی ترنسپورت قطعی `FakeSyncTransport` در `packages/sync-engine/src/fake-sync-transport.ts`:
    - شبیه‌سازی کامل حافظه سرور، صف وقایع و تولید کرسرهای ترتیبی قطعی (`c_1`, `c_2`, ...).
    - ره‌گیری و لاگ تمام دسته‌های ارسالی (`pushedBatches`) جهت اعتبارسنجی ترتیب FIFO.
    - پشتیبانی از idempotency key و بازگردانی پاسخ `ALREADY_APPLIED`.
    - قابلیت اعمال خطاهای اجباری وضعیت (`forcedPushStatuses`) و شبیه‌سازی خطای شبکه در push و pull.
  - صادر کردن (Export) کلاس‌ها و تایپ‌های جدید از `packages/sync-engine/src/index.ts`.
  - نگارش مجموعه آزمون‌های جامع در `apps/web/src/core/sync/sync-runtime.test.ts` (شامل ۱۱ تست جدید):
    - ذخیره‌سازی تغییرات و کرسر در عملیات pull.
    - عدم پیشروی کرسر در صورت شکست ذخیره‌سازی داده‌های pull.
    - ارسال دسته‌ای جهش‌ها در push با حفظ اکید ترتیب زمانی FIFO.
    - تغییر وضعیت جهش موفق به `SUCCEEDED`.
    - بازگشت جهش دارای خطای موقت (`RETRYABLE_ERROR`) به `PENDING` همراه با تنظیم زمان تلاش بعدی در آینده.
    - تغییر وضعیت جهش ردشده (`REJECTED`) به `FAILED` و عدم retry خودکار آن در فراخوانی‌های بعدی push.
    - اثبات idempotency در ارسال مجدد جهش تکراری با کلید یکسان.
    - اجرای صحیح چرخه کامل `syncOnce`.
    - بازگردانی تمام جهش‌ها به وضعیت `PENDING` در صورت بروز خطای سطح شبکه در transport.
    - آزمون‌های یکپارچگی اختصاصی با `IndexedDbLocalStore` برای تایید استقلال کامل runtime از نوع پیاده‌سازی storage.
  - نتایج اعتبارسنجی: تمام ۱۰۵ تست پروژه (۹۴ تست پیشین + ۱۱ تست جدید) با موفقیت پاس شدند.
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `packages/sync-engine/src/ports.ts`
  - `packages/sync-engine/src/sync-runtime.ts`
  - `packages/sync-engine/src/fake-sync-transport.ts`
  - `packages/sync-engine/src/index.ts`
  - `apps/web/src/core/storage/memory-local-store.ts`
  - `apps/web/src/core/storage/indexeddb-local-store.ts`
  - `apps/web/src/core/sync/sync-runtime.test.ts`
  - `docs/project-plan.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا
  - `npm run test`: موفق؛ تمام ۱۰۵ تست در ۶ فایل تست پاس شدند
  - `npm run build --workspace @orbit/web`: موفق بدون خطا
  - `npm run build`: موفق؛ تمامی پکیج‌ها و اپلیکیشن‌ها بیلد شدند
  - `git diff --check`: بدون خطای فاصله‌گذاری
- **محدودیت‌های باقی‌مانده:**
  - فراخوانی‌های شبکه واقعی (HTTP/WebSocket) هنوز متصل نشده‌اند (مربوط به گام‌های بعدی فاز ۳).
  - احراز هویت سرور و پایگاه داده PostgreSQL هنوز پیاده‌سازی نشده‌اند (مربوط به گام‌های بعدی فاز ۳).
  - `INBOX_PROJECT_ID = 'inbox'` موقت تا راه‌اندازی ماژول کاربر و حساب کاربری.
- **وضعیت PR:**
  - آماده ایجاد PR برای شاخه `feature/sync-runtime-fake-transport` به `develop`.
- **گام بعدی (Handoff):**
  - ادغام PR در `develop`
  - آغاز طراحی احراز هویت و APIهای سینک سرور در فاز ۳

## محدودیت‌های باقی‌مانده

- **بررسی دستی مرورگر:** InboxPage در مرورگر واقعی تست نشده.
- **`INBOX_PROJECT_ID = 'inbox'`:** placeholder تا فاز ۳ (حساب کاربری). پس از account system باید به list ID واقعی کاربر تغییر کند.
- **`MemoryLocalStore` اتمیکیتی واقعی:** JS single-thread آن را ایمن می‌کند اما تراکنش واقعی ندارد. فقط برای تست است.
- **حذف دائمی (Hard delete/Purge):** در فاز ۲ فقط soft delete با `deletedAt` پیاده‌سازی شده؛ پروتکل پاک‌سازی قطعی در کلاینت یا سرور در فازهای بعدی مشخص خواهد شد.
- **allowScripts (esbuild):** npm هشدار postinstall می‌دهد؛ build موفق است ولی سیاست تایید اسکریپت نیاز به تصمیم دارد.
- **port gap:** `LocalStore` هنوز برای sync engine نیاز به `saveTaskWithMutation` atomic دارد که با `AtomicTaskStore` جداگانه حل شد.

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
