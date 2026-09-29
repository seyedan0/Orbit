# Project Progress

> این فایل منبع اصلی وضعیت پروژه است. هر AI باید قبل و بعد از کار آن را به‌روزرسانی کند.

## وضعیت کلی

- **مرحله:** فاز ۲، هسته دامنه و storage محلی Web
- **آخرین به‌روزرسانی:** 2026-09-30
- **آخرین عامل:** Antigravity
- **درصد تقریبی پیشرفت:** 38%
- **Branch فعال:** `feature/web-inbox-task-creation`
- **Branchهای پایه:** `main`، `develop`

## هدف فعلی

پیاده‌سازی vertical slice اول: ایجاد task در Inbox با IndexedDB به‌عنوان storage دائم و domain service مستقل از زیرساخت.

## کارهای در حال انجام

- [ ] بازبینی و merge نهایی PR از `feature/web-inbox-task-creation` به `develop` (PR شماره ۱ باز شده؛ منتظر ادغام مالک)
- [ ] P2-WEB-003: بازسازی feature-oriented ساختار Web (بعد از merge؛ branch: `refactor/web-feature-structure`)
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

## محدودیت‌های باقی‌مانده

- **اسناد فقط روی `feature/web-foundation`:** `docs/git-workflow.md`، `CONTRIBUTING.md`، قالب‌های issue/PR و ADR-006 روی این branch وجود ندارند و چون آن branch merge نمی‌شود، باید در یک PR جداگانه‌ی docs (مثلاً `docs/*` با cherry-pick فقط اسناد) به develop منتقل شوند. تا آن زمان `docs/git-workflow.md` روی develop وجود ندارد.
- **تاریخچه `PROGRESS.md`:** ورودی‌های P1-WEB-001 و تاریخچه‌ی تفصیلی قبلی در این branch خلاصه شده‌اند؛ متن کامل روی `feature/web-foundation` باقی است.
- **commit محلی `a903efa`:** روی `feature/web-foundation` (push نشده) پیاده‌سازی IndexedDB دوم دارد؛ حذف یا نگه‌داشتن آن با مالک پروژه است.

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
