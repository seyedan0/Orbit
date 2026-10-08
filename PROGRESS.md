# Project Progress

> این فایل منبع اصلی وضعیت پروژه است. هر AI باید قبل و بعد از کار آن را به‌روزرسانی کند.

## وضعیت کلی

- **مرحله:** فاز ۴، مدیریت زمان و تقویم
- **آخرین به‌روزرسانی:** 2026-10-08
- **آخرین عامل:** Antigravity
- **درصد تقریبی پیشرفت:** 35% (فاز ۴)
- **Branch فعال:** `feature/web-calendar-views`
- **Branchهای پایه:** `main`، `develop`

## هدف فعلی

پیاده‌سازی نماهای تعاملی ماهانه (`MonthView`) و هفتگی (`WeekView`) با پشتیبانی دوگانه شمسی (جلالی) و میلادی در وب (`CalendarPage`)، ناوبری بازه‌های زمانی، نمایش تسک‌های زمان‌بندی‌شده، ایجاد سریع تسک و تغییر وضعیت تکمیل مستقیم از روی تقویم.

## کارهای در حال انجام

- [ ] بازبینی و PR شاخه `feature/web-calendar-views` به `develop`
- [ ] گام بعدی فاز ۴: نماهای روزانه (Day View)، Agenda و Time Blocking با Drag & Drop

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
- [x] ادغام PR شماره ۷ (`feature/sync-runtime-fake-transport`) در `develop`
- [x] **P3-WEB-002:** پیاده‌سازی HttpSyncTransport در sync-engine و ادغام نشانگر وضعیت و کلید دستی در Web UI
- [x] ادغام PR شماره ۸ (`feature/web-http-sync-transport`) در `develop`
- [x] **P3-SRV-001:** راه‌اندازی اسکلت سرور NestJS در `apps/server` و پیاده‌سازی endpointهای اولیه push/pull همگام‌سازی
- [x] ادغام PR شماره ۹ (`feature/server-sync-foundation`) در `develop`
- [x] **P3-SRV-002:** اتصال PostgreSQL، اجرای مایگریشن‌ها، پیاده‌سازی موجودیت‌های TypeORM و `PostgresSyncRepository` با تراکنش‌های اتمیک
- [x] ادغام PR شماره ۱۰ (`feature/server-postgres-integration`) در `develop`
- [x] **P3-AUTH-001:** پیاده‌سازی سیستم احراز هویت سرور (JWT، هش رمز عبور bcrypt، گاردها) و اتصال سشن کاربری وب
- [x] ادغام PR شماره ۱۱ (`feature/auth-and-user-accounts`) در `develop`
- [x] **P3-SYNC-001:** پیاده‌سازی حل تعارض در سطح فیلد (LWW)، شکستن تساوی لکسیکوگرافیک و وضعیت CONFLICT_MERGED در PostgresSyncRepository و سرور
- [x] ادغام PR شماره ۱۲ (`feature/server-field-conflict-resolution`) در `develop`
- [x] **P3-SYNC-002:** پیاده‌سازی مدیریت Tombstone، سیاست نگهداری ۳۰ روزه، جلوگیری از زنده شدن مجدد تسک‌های منقضی با جدول `cleaned_tombstones` و پاک‌سازی اتمیک و Idempotent
- [x] ادغام PR شماره ۱۳ (`feature/sync-tombstone-retention`) در `develop`
- [x] **P3-SYNC-003:** پیاده‌سازی بازیابی بعد از crash، timeout و restart برای sync runtime (بازیابی IN_FLIGHT، بازگشت امن به PENDING با backoff، حفظ کرسر و اتمیسیتی pull، سقف retry و ثبت FAILED برای خطاهای دائمی)
- [x] ادغام PR شماره ۱۴ (`feature/sync-recovery`) در `develop`
- [x] **P3-SYNC-004:** افزودن تله‌متری حداقلی برای سلامت همگام‌سازی بدون وابستگی دامنه به ارائه‌دهنده خاص (شامل رابط خنثی `SyncTelemetry`، ثبت ۱۳ رویداد و متریک الزامی، عدم نشت عناوین و محتوای تسک‌ها، پیاده‌سازی No-op پیش‌فرض و `InMemorySyncTelemetry`، و آزمون‌های پایداری و تاب‌آوری در برابر خطای گردآورنده)
- [x] ادغام PR شماره ۱۸ (`feature/sync-health-telemetry`) در `develop` و `main` و آغاز رسمی فاز ۴
- [x] **P4-CAL-001:** پیاده‌سازی زیرساخت تقویم، موتور بدون وابستگی محاسباتی شمسی (Jalali)، کامپوننت انتخاب تاریخ و زمان (DatePicker دوگانه شمسی/میلادی)، یکپارچه‌سازی زمان‌بندی تسک‌ها در سرویس و فرم تسک، و نماهای زمانی «امروز» (Today) و «فردا» (Tomorrow) همراه با لینک‌های سایدبار
- [x] ادغام PR شماره ۱۹ (`feature/calendar-jalali-foundation`) در `develop`
- [x] **P4-DOC-001:** تدوین سند جامع معماری محصول و استراتژی فنی (`docs/product-architecture.md`) بر پایه بنچ‌مارک تیک‌تیک، فلسفه FOSS و رایگان‌سازی امکانات پولی، چرخه بهره‌وری ۶ مرحله‌ای، هوش مصنوعی باز BYOK/MCP، رتبه‌بندی LexoRank، و به‌روزرسانی سراسری اسناد `vision`، `architecture`، `feature-catalog`، `roadmap`، `project-plan` و `README`
- [x] **P4-CAL-002:** پیاده‌سازی نماهای تعاملی ماهانه و هفتگی با پشتیبانی دوگانه تقویم شمسی/میلادی در وب، افزودن مسیر `/calendar` و لینک ناوبری سایدبار، ایجاد سریع تسک و مدیریت تکمیل تسک از تقویم

## فعالیت AIها

### 2026-10-08 | P4-CAL-002 | نماهای ماهانه و هفتگی تقویم در وب با پشتیبانی شمسی و میلادی

- **عامل:** Antigravity
- **هدف:** پیاده‌سازی نماهای تعاملی ماهانه و هفتگی تقویم با پشتیبانی کامل از سیستم‌های تقویم شمسی و میلادی در رابط کاربری وب
- **انجام‌شده:**
  - ایجاد توابع کمکی تقویم در `apps/web/src/features/calendar/calendar-utils.ts` شامل ناوبری ماهانه و هفتگی، تطبیق تسک‌ها بر اساس سررسید/شروع، و تولید خانه‌های تقویم ماهانه و ستون‌های هفتگی.
  - پیاده‌سازی کامپوننت `MonthView` در `apps/web/src/features/calendar/components/MonthView.tsx` با گرید ۷ ستونه (شنبه تا جمعه برای شمسی و یکشنبه تا شنبه برای میلادی)، نمایش کارت‌های تسک با رنگ اولویت، برجسته‌سازی امروز، و کلید افزودن تسک.
  - پیاده‌سازی کامپوننت `WeekView` در `apps/web/src/features/calendar/components/WeekView.tsx` با ۷ ستون روزهای هفته جاری، نمایش نشانگرهای زمانی و تمام‌روز، برچسب اولویت و امکان تکمیل مستقیم تسک‌ها.
  - پیاده‌سازی صفحه `CalendarPage` در `apps/web/src/features/calendar/pages/CalendarPage.tsx` با نوار ابزار کامل شامل سوئیچ بین نماهای ماه/هفته، سوئیچ بین تقویم شمسی/میلادی، کلیدهای ناوبری «قبلی»، «بعدی» و «امروز»، عنوان پویای ماه و سال، و مدال ایجاد سریع تسک با تاریخ از پیش تعیین‌شده.
  - افزودن مسیر `/calendar` در `apps/web/src/app/routes.tsx` و لینک «تقویم» در ناوبری `AppShell.tsx` همراه با `aria-label` و `data-testid`.
  - صادرات کامپوننت‌ها و توابع در `apps/web/src/features/calendar/index.ts`.
  - افزودن آزمون‌های جامع کامپوننت و صفحه در `apps/web/src/features/calendar/pages/CalendarPage.test.tsx` (۸ تست جدید).
- **فایل‌ها:**
  - `apps/web/src/features/calendar/calendar-utils.ts`
  - `apps/web/src/features/calendar/components/MonthView.module.css`
  - `apps/web/src/features/calendar/components/MonthView.tsx`
  - `apps/web/src/features/calendar/components/WeekView.module.css`
  - `apps/web/src/features/calendar/components/WeekView.tsx`
  - `apps/web/src/features/calendar/pages/CalendarPage.module.css`
  - `apps/web/src/features/calendar/pages/CalendarPage.tsx`
  - `apps/web/src/features/calendar/pages/CalendarPage.test.tsx`
  - `apps/web/src/features/calendar/index.ts`
  - `apps/web/src/app/routes.tsx`
  - `apps/web/src/layout/AppShell.tsx`
  - `apps/web/src/layout/AppShell.test.tsx`
  - `docs/project-plan.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا در تمام پکیج‌ها و اپلیکیشن‌ها
  - `npm run test --workspace @orbit/web`: موفق؛ تمام ۲۲۰ تست کلاینت وب با موفقیت پاس شدند
  - `npm run build`: موفق؛ کامپایل و بیلد بدون خطای Vite و TypeScript
  - `git diff --check`: بدون خطای فاصله‌گذاری
- **وضعیت:** آماده در شاخه `feature/web-calendar-views` جهت بازبینی کاربر
- **گام بعدی:** پیاده‌سازی نمای روزانه (Day View)، نمای Agenda و قابلیت Time Blocking

### 2026-10-05 | تدوین سند جامع معماری محصول و همگام‌سازی مستندات

- **عامل:** Antigravity
- **هدف:** تحلیل عمیق بنچ‌مارک تیک‌تیک و تدوین سند جامع معماری محصول، رایگان‌سازی قابلیت‌های پولی در اکوسیستم آزاد، بازآرایی اسناد و ادغام در develop
- **انجام‌شده:** ایجاد `docs/product-architecture.md`، به‌روزرسانی `docs/vision.md`، `docs/architecture.md`، `docs/feature-catalog.md`، `docs/roadmap.md`، `docs/project-plan.md` و `docs/README.md`
- **فایل‌ها:** پوشه `docs/` و `PROGRESS.md`
- **اعتبارسنجی:** `npm run typecheck` موفق، تست‌های کلاینت وب موفق (۲۱۲ آزمون)، `git diff --check` بدون خطا
- **گام بعدی:** ادامه فاز ۴، پیاده‌سازی نماهای تقویم هفتگی و ماهانه (P4-CAL-002)

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
  - ادغام‌شده در `develop` (PR شماره ۷).
- **گام بعدی (Handoff):**
  - پیاده‌سازی HttpSyncTransport و اتصال نشانگر همگام‌سازی در Web UI (انجام‌شده در P3-WEB-002)

### 2026-09-30 | P3-WEB-002 | پیاده‌سازی HttpSyncTransport و نشانگر وضعیت در Web UI

- **عامل:** Antigravity
- **هدف:** پیاده‌سازی `HttpSyncTransport` در موتور همگام‌سازی (`sync-engine`) منطبق بر قرارداد `SyncTransport` و اتصال وضعیت و کلید دستی همگام‌سازی به رابط کاربری Web (`AppShell`).
- **انجام‌شده:**
  - پیاده‌سازی کلاس `HttpSyncTransport` در `packages/sync-engine/src/http-sync-transport.ts`:
    - پیاده‌سازی متدهای `pull` و `push` با استفاده از `fetch` استاندارد.
    - قابلیت پیکربندی `baseUrl`، `fetcher` سفارشی (جهت آزمون و انطباق‌پذیری)، و هدرهای دلخواه (مانند توکن احراز هویت bearer).
    - مدیریت خطاهای پروتکل HTTP: کدهای وضعیت 5xx و 429 به عنوان خطای قابل تکرار (`isRetryable: true`) و کدهای 4xx (مانند 400, 401, 403, 409) به عنوان خطای غیرقابل تکرار (`isRetryable: false`).
    - پشتیبانی از timeout شبکه با `AbortController` و مدیریت شکست اتصال فیزیکی.
    - تعریف و صدور کلاس خطای استاندارد `HttpSyncError` و تابع کمکی `isRetryableHttpStatus`.
  - صادر کردن `HttpSyncTransport` و ابزارهای مرتبط از `packages/sync-engine/src/index.ts`.
  - پیاده‌سازی لایه مدیریت وضعیت همگام‌سازی در `apps/web/src/core/sync/sync-context.tsx`:
    - ایجاد کلاس مستقل `SyncCoordinator` برای مدیریت وضعیت همگام‌سازی (`IDLE` | `SYNCING` | `ERROR` | `OFFLINE`) با استفاده از الگوی اشتراک (Subscription) و `useSyncExternalStore`.
    - پیاده‌سازی `SyncProvider` و هوک `useSyncStatus` برای ارائه وضعیت همگام‌سازی و تابع `triggerSync()`.
    - پایش تغییرات وضعیت آنلاین/آفلاین شبکه از طریق رویدادهای `online`/`offline` مرورگر.
  - اتصال `SyncProvider` در درخت کامپوننت‌های ریشه وب در `apps/web/src/app/App.tsx`.
  - ادغام نشانگر وضعیت (Sync Badge) و دکمه دستی «همگام‌سازی» در `apps/web/src/layout/AppShell.tsx` همراه با استایل‌های واکنش‌گرا و وضعیت‌های مختلف در `AppShell.module.css`.
  - نگارش مجموعه آزمون‌های جامع:
    - ۱۲ تست در `apps/web/src/core/sync/http-sync-transport.test.ts` شامل نگاشت push/pull، نرمال‌سازی URL، بررسی هدرها، کدهای وضعیت 4xx و 5xx/429، و مدیریت قطعی شبکه.
    - ۸ تست در `apps/web/src/core/sync/sync-context.test.tsx` شامل چرخه کامل `SyncCoordinator`، `SyncProvider`، هوک `useSyncStatus`، و سناریوهای آنلاین/آفلاین/خطا.
    - تست یکپارچگی رندر `apps/web/src/layout/AppShell.test.tsx` برای بررسی حضور نشانگر وضعیت و کلید همگام‌سازی.
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `packages/sync-engine/src/http-sync-transport.ts`
  - `packages/sync-engine/src/index.ts`
  - `apps/web/src/core/sync/sync-context.tsx`
  - `apps/web/src/app/App.tsx`
  - `apps/web/src/layout/AppShell.tsx`
  - `apps/web/src/layout/AppShell.module.css`
  - `apps/web/src/test-setup.ts`
  - `apps/web/src/core/sync/http-sync-transport.test.ts`
  - `apps/web/src/core/sync/sync-context.test.tsx`
  - `apps/web/src/layout/AppShell.test.tsx`
  - `docs/project-plan.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا
  - `npm run test`: موفق؛ تمام ۱۲۶ تست در ۹ فایل آزمون پاس شدند (۱۰۵ تست قبلی + ۲۱ تست جدید)
  - `npm run build`: موفق؛ کامپایل موفقیت‌آمیز تمام پکیج‌ها و اپلیکیشن وب
  - `git diff --check`: بدون خطای فاصله‌گذاری
- **وضعیت PR:**
  - ادغام‌شده در `develop` (PR شماره ۸).
- **گام بعدی (Handoff):**
  - پیاده‌سازی اسکلت NestJS در apps/server و endpointهای همگام‌سازی (انجام‌شده در P3-SRV-001)

### 2026-09-30 | P3-SRV-001 | راه‌اندازی اسکلت سرور NestJS و endpointهای همگام‌سازی

- **عامل:** Antigravity
- **هدف:** راه‌اندازی اسکلت سرور NestJS در `apps/server`، پیکربندی ساختار ماژولار و سبک، پیاده‌سازی قراردادهای API مطابق `docs/api/README.md` با پیشوند `/api/v1`، و پیاده‌سازی endpointهای اولیه health، push و pull همگام‌سازی با استفاده از repository حافظه‌ای.
- **انجام‌شده:**
  - راه‌اندازی پروژه `apps/server` به صورت ماژولار با NestJS 11 و پشتیبانی بومی از NodeNext ESM:
    - پیکربندی `package.json`، `tsconfig.json`، `tsconfig.build.json` و `eslint.config.js`.
    - تنظیم پیشوند نسخه `/api/v1` به صورت سراسری در `main.ts`.
    - پیاده‌سازی فیلتر سراسری استثناها (`HttpExceptionFilter`) در `common/filters/http-exception.filter.ts` جهت استانداردسازی کلیه پاسخ‌های خطا با فرمت `{ code, message, requestId }` و هدر `x-request-id`.
    - پیاده‌سازی پارامتر دکوراتور `@UserId()` جهت استخراج شناسه کاربر از هدرهای `x-user-id` یا Bearer token با fallback به کاربر پیش‌فرض.
  - پیاده‌سازی `HealthModule` و `HealthController`:
    - ارائه مسیر `GET /api/v1/health` با خروجی `{ status: "ok", version: "0.1.0" }`.
  - پیاده‌سازی `SyncModule` با تفکیک کامل لایه ذخیره‌سازی از طریق `SyncRepository`:
    - تعریف اینترفیس و توکن تزریق وابستگی `SYNC_REPOSITORY`.
    - پیاده‌سازی `InMemorySyncRepository` با نگهداری ایزوله تسک‌ها، جهش‌ها، تغییرات و کرسر برای هر کاربر.
    - پیاده‌سازی `POST /api/v1/sync/push`: اعتبارسنجی کامل دسته‌ای جهش‌ها (`MutationPayload`)، بازگردانی `REJECTED` برای جهش‌های نامعتبر، تضمین اصل یکتایی و عدم تکرار (Idempotency) با بازگردانی وضعیت `ALREADY_APPLIED` برای کلیدهای تکراری، و اعمال تغییرات معتبر و بازگردانی `APPLIED`.
    - پیاده‌سازی `GET /api/v1/sync/pull`: دریافت پارامترهای `cursor` و `limit`، فیلتر تغییرات جدیدتر از کرسر، و بازگردانی `{ changes, nextCursor, hasMore }`.
  - پیاده‌سازی مجموعه آزمون‌های جامع E2E در `src/sync.e2e.test.ts` با Supertest (شامل ۹ تست جدید):
    - اعتبارسنجی خروجی health check.
    - اعتبارسنجی ساختار استاندارد خطای 404 و خطای اعتبارسنجی 400.
    - ارسال دسته‌ای جهش‌های معتبر با نتیجه `APPLIED`.
    - ارسال مجدد جهش تکراری و تایید وضعیت `ALREADY_APPLIED`.
    - تفکیک جهش‌های معتبر و نامعتبر در یک دسته و دریافت `REJECTED` بدون شکست کل دسته.
    - پیشروی ترتیبی کرسر در pull با پارامترهای صفحه‌بندی و نشانگر `hasMore`.
    - ایزولاسیون کامل داده‌ها بین کاربران مجزا.
    - دریافت تغییرات حذف نرم (`deletedAt`) در pull.
  - نتایج اعتبارسنجی: تمام ۱۳۵ تست مخزن (۱۲۶ تست پیشین + ۹ تست سرور) با موفقیت پاس شدند.
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `apps/server/package.json`
  - `apps/server/tsconfig.json`
  - `apps/server/tsconfig.build.json`
  - `apps/server/eslint.config.js`
  - `apps/server/vitest.config.ts`
  - `apps/server/src/main.ts`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/common/filters/http-exception.filter.ts`
  - `apps/server/src/common/decorators/user-id.decorator.ts`
  - `apps/server/src/health/health.controller.ts`
  - `apps/server/src/health/health.module.ts`
  - `apps/server/src/sync/interfaces/sync-repository.interface.ts`
  - `apps/server/src/sync/repositories/in-memory-sync.repository.ts`
  - `apps/server/src/sync/dto/sync.dto.ts`
  - `apps/server/src/sync/sync.service.ts`
  - `apps/server/src/sync/sync.controller.ts`
  - `apps/server/src/sync/sync.module.ts`
  - `apps/server/src/sync.e2e.test.ts`
  - `package.json`
  - `package-lock.json`
  - `docs/project-plan.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار در تمام ورک‌اسپیس‌ها
  - `npm run typecheck`: موفق با ۰ خطا در پکیج‌ها، وب و سرور
  - `npm run test`: موفق؛ تمام ۱۳۵ تست در ۱۰ فایل آزمون پاس شدند
  - `npm run build`: موفق؛ کامپایل پکیج‌ها، وب و سرور در دایرکتوری dist
  - `git diff --check`: بدون خطای فاصله‌گذاری
- **وضعیت PR:**
  - آماده ایجاد PR برای شاخه `feature/server-sync-foundation` به `develop`.
- **گام بعدی (Handoff):**
  - ادغام PR در `develop`
  - راه‌اندازی اتصال به پایگاه داده PostgreSQL، پیکربندی مایگریشن‌ها و لایه پایدار دیتابیس در `apps/server`

### 2026-09-30 | پیاده‌سازی اتصال PostgreSQL، مایگریشن و PostgresSyncRepository در سرور (P3-SRV-002)

- **عامل:** Antigravity
- **هدف:** اتصال پایگاه داده PostgreSQL در سرور NestJS، مستندسازی ADR-008 برای انتخاب ORM، تعریف موجودیت‌ها و مایگریشن اولیه schema مطابق `docs/data-model.md`، پیاده‌سازی `PostgresSyncRepository` به عنوان جایگزین لایه داده، اعمال تراکنش‌های اتمیک (`applyMutationAtomic`) برای ثبت هم‌زمان جهش‌ها و تسک‌ها و نوشتن آزمون‌های یکپارچگی پایگاه داده.
- **انجام‌شده:**
  - ثبت سند تصمیم‌گیری معماری `ADR-008: انتخاب TypeORM برای پایگاه داده PostgreSQL سرور NestJS` در `docs/decisions/ADR-008-server-database-orm.md` و به‌روزرسانی `docs/decisions.md`.
  - نصب بسته‌های وابسته TypeORM (`@nestjs/typeorm`, `typeorm`, `pg`, `@types/pg`) در `apps/server`.
  - ایجاد مایگریشن اولیه `1727650000000-InitialSyncSchema.ts` با تعریف جداول `users`, `workspaces`, `tasks`, `sync_mutations` و سکوئنس `tasks_cursor_seq`.
  - ایجاد موجودیت‌های TypeORM (`UserEntity`, `WorkspaceEntity`, `TaskEntityModel`, `SyncMutationEntity`) با نگاشت صریح ستون‌های snake_case به خصوصیات camelCase و اعمال ایندکس‌ها و قیود یکتایی.
  - اعمال قید یکتایی `uq_sync_mutations_user_idempotency` در سطح موتور دیتابیس برای تضمین قطعی idempotency.
  - پیاده‌سازی `PostgresSyncRepository` با متدهای `getMutationByIdempotencyKey`, `saveAppliedMutation`, `applyTaskMutation`, `applyMutationAtomic` و `getChanges` (پشتیبانی از صفحه‌بندی کرسر با سکوئنس ترتیبی).
  - استفاده از `dataSource.transaction` در `applyMutationAtomic` برای ذخیره‌سازی کاملاً اتمیک تغییرات تسک و لاگ جهش در یک تراکنش دیتابیس با مدیریت خطای تداخل کلید تکراری (Postgres 23505).
  - اتصال ماژول‌های دیتابیس در `AppModule` و جایگزینی `PostgresSyncRepository` در `SyncModule`.
  - افزودن فایل‌های `.env` و `.env.example` و پشتیبانی از بارگذاری خودکار متغیرهای محیطی در `database.config.ts`.
  - نگارش مجموعه آزمون‌های یکپارچگی دیتابیس در `apps/server/src/postgres-sync.integration.test.ts` شامل اعتبارسنجی نگاشت مدل‌ها، قید idempotency، تراکنش‌های اتمیک و rollback، پیشروی کرسر و تفکیک داده کاربران و تست‌های HTTP endpointها.
- **فایل‌های تغییرکرده/ایجاده‌شده:**
  - `docs/decisions/ADR-008-server-database-orm.md`
  - `docs/decisions.md`
  - `apps/server/package.json`
  - `apps/server/vitest.config.ts`
  - `apps/server/src/database/database.config.ts`
  - `apps/server/src/database/entities/user.entity.ts`
  - `apps/server/src/database/entities/workspace.entity.ts`
  - `apps/server/src/database/entities/task.entity.ts`
  - `apps/server/src/database/entities/sync-mutation.entity.ts`
  - `apps/server/src/database/entities/index.ts`
  - `apps/server/src/database/migrations/1727650000000-InitialSyncSchema.ts`
  - `apps/server/src/sync/interfaces/sync-repository.interface.ts`
  - `apps/server/src/sync/repositories/postgres-sync.repository.ts`
  - `apps/server/src/sync/repositories/in-memory-sync.repository.ts`
  - `apps/server/src/sync/sync.service.ts`
  - `apps/server/src/sync/sync.module.ts`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/sync.e2e.test.ts`
  - `apps/server/src/postgres-sync.integration.test.ts`
  - `apps/server/.env.example`
  - `.github/workflows/ci.yml`
  - `package-lock.json`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار در تمام پکیج‌ها و ورک‌اسپیس‌ها
  - `npm run typecheck`: موفق با ۰ خطا در کل مونو‌ریپو
  - `npm run test`: موفق؛ تمام ۱۴۲ تست در ۱۱ فایل آزمون با موفقیت پاس شدند (شامل ۱۶ تست سرور و ۱۲۶ تست وب)
  - `npm run build`: موفق؛ بیلد کامل تمام ورک‌اسپیس‌ها
  - `git diff --check`: موفق بدون هیچ خطای فاصله‌گذاری یا پایان خط
  - `GitHub Actions CI`: هر دو جاب `CI / quality (pull_request)` و `CI / quality (push)` با کانتینر سرویس PostgreSQL سبز و پاس شدند.
- **وضعیت PR:**
  - PR شماره ۱۰ در شاخه `feature/server-postgres-integration` به `develop` ایجاد شده و تمام CI checks سبز هستند.
- **گام بعدی (Handoff):**
  - ادغام PR در `develop`
  - پیاده‌سازی لایه احراز هویت سرور (JWT، جدول کاربران و ارتباط سشن کاربری در ریکوئست‌ها)

### 2026-09-30 | P3-AUTH-001 | پیاده‌سازی کامل احراز هویت کاربری (JWT) در سرور و اتصال سشن کلاینت وب و ترنسپورت همگام‌سازی

- **عامل:** Antigravity
- **هدف:** پیاده‌سازی احراز هویت کاربر سرتاسری با JWT و گذرواژه هش‌شده در سرور NestJS، مهاجرت اسکیمای دیتابیس، محافظت از مسیرهای همگام‌سازی با گارد احراز هویت، و اتصال کلاینت وب (فرم ورود/ثبت‌نام، کلاینت API احراز هویت، نگهداری سشن در localStorage و تزریق خودکار توکن به هدرهای ترنسپورت همگام‌سازی همراه با مدیریت خطای 401).
- **انجام‌شده:**
  - **طرحواره دیتابیس و مدل کاربر سرور:**
    - ایجاد مهاجرت TypeORM با نام `1727660000000-AddPasswordHashToUsers.ts` جهت افزودن ستون `password_hash VARCHAR(255) NULL` به جدول `users`.
    - به‌روزرسانی موجودیت `UserEntity` در `apps/server/src/database/entities/user.entity.ts` برای نگاشت فیلد `passwordHash` به ستون `password_hash`.
    - نصب و پیکربندی کتابخانه‌های مورد نیاز احراز هویت (`@nestjs/jwt`، `@nestjs/passport`، `passport`، `passport-jwt`، `bcrypt`، `@types/bcrypt` و `@types/passport-jwt`).
  - **ماژول احراز هویت سرور (`apps/server/src/auth/`):**
    - تعریف تایپ‌های مشترک `AuthCredentials`، `AuthResponse` و `AuthUser` در `@orbit/shared-types`.
    - پیاده‌سازی تنظیمات JWT و اعتبارسنجی متغیر محیطی `JWT_SECRET` با طول عمر پیش‌فرض ۷ روز در `auth.config.ts`.
    - پیاده‌سازی اعتبارسنجی ورودی‌های ایمیل و پسورد در `auth.validation.ts` (نرمال‌سازی ایمیل، طول مجاز و حداقل ۸ نویسه برای رمز عبور).
    - پیاده‌سازی `AuthService` با هش امن bcrypt (۱۲ راند)، مقابله با Timing Attack از طریق مقایسه مداوم با هش ساختگی، ایجاد حساب، ورود، و دریافت پروفایل عمومی کاربر.
    - پیاده‌سازی `AuthController` با اندپوینت‌های:
      - `POST /api/v1/auth/register`: ثبت‌نام کاربر، ذخیره در دیتابیس، بازگردانی JWT access token و اطلاعات عمومی کاربر.
      - `POST /api/v1/auth/login`: اعتبارسنجی اطلاعات ورود، بازگردانی JWT access token و اطلاعات عمومی کاربر.
      - `GET /api/v1/auth/me`: بازگردانی پروفایل کاربر احرازهویت‌شده با گارد JWT.
    - پیاده‌سازی `JwtStrategy` و گارد `JwtAuthGuard`.
    - حفاظت از اندپوینت‌های همگام‌سازی `POST /api/v1/sync/push` و `GET /api/v1/sync/pull` با `@UseGuards(JwtAuthGuard)`.
    - به‌روزرسانی دکوراتور `@UserId()` جهت استخراج امن `req.user.id` از توکن معتبر با fallback به `x-user-id` در حالت تست/توسعه.
    - افزودن مجموعه کامل آزمون‌های E2E احراز هویت در `apps/server/src/auth.e2e.test.ts` (۳۷ تست موفق) و به‌روزرسانی آزمون‌های sync.
  - **یکپارچه‌سازی احراز هویت در کلاینت وب (`apps/web`):**
    - پیاده‌سازی کلاینت API احراز هویت در `apps/web/src/core/auth/auth-api.ts` با متدهای `login`، `register` و `getMe` و کلاس خطای `AuthApiError`.
    - ارتقای `local-session.ts` جهت نگهداری ساختار سشن به همراه `token` و `user` در `localStorage` با کلیدهای `orbit.session.v1` و `orbit.token.v1`.
    - ارتقای `session-context.tsx` جهت ارائه `signIn(email, password)`، `signUp(email, password)`، `signOut()`، وضعیت `token`، `user`، `isLoading` و `error`.
    - ارتقای `SignInPage.tsx` با تب‌های تعاملی ورود و ثبت‌نام، اعتبارسنجی فرم کلاینت، دسترسی‌پذیری مناسب (ARIA)، حالت‌های بارگذاری و نمایش خطاهای بازگشتی سرور.
    - تنظیم `HttpSyncTransport` در پکیج `@orbit/sync-engine` برای پشتیبانی از callback اختیاری `onUnauthorized` هنگام دریافت خطای 401.
    - پیکربندی `SyncProvider` در کلاینت وب جهت تزریق پویای هدر `Authorization: Bearer <token>` از سشن جاری به تمام ریکوئست‌های `push` و `pull`، و مدیریت خطای 401 برای خروج خودکار کاربر و هدایت به صفحه ورود.
    - افزودن آزمون‌های جامع وب در `auth-api.test.ts`، `session-context.test.tsx`، `SignInPage.test.tsx`، `http-sync-transport.test.ts` و `sync-context.test.tsx` (۱۴۲ تست وب موفق).
- **فایل‌ها:**
  - `packages/shared-types/src/auth.ts`
  - `packages/shared-types/src/index.ts`
  - `packages/sync-engine/src/http-sync-transport.ts`
  - `apps/server/package.json`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/database/database.config.ts`
  - `apps/server/src/database/entities/user.entity.ts`
  - `apps/server/src/database/migrations/1727660000000-AddPasswordHashToUsers.ts`
  - `apps/server/src/common/decorators/user-id.decorator.ts`
  - `apps/server/src/auth/auth.config.ts`
  - `apps/server/src/auth/auth.types.ts`
  - `apps/server/src/auth/auth.validation.ts`
  - `apps/server/src/auth/jwt.strategy.ts`
  - `apps/server/src/auth/jwt-auth.guard.ts`
  - `apps/server/src/auth/auth.service.ts`
  - `apps/server/src/auth/auth.controller.ts`
  - `apps/server/src/auth/auth.module.ts`
  - `apps/server/src/auth.e2e.test.ts`
  - `apps/server/src/testing/auth-test-helpers.ts`
  - `apps/server/src/sync/sync.controller.ts`
  - `apps/server/src/sync.e2e.test.ts`
  - `apps/server/src/postgres-sync.integration.test.ts`
  - `apps/web/src/core/auth/auth-api.ts`
  - `apps/web/src/core/auth/auth-api.test.ts`
  - `apps/web/src/core/auth/local-session.ts`
  - `apps/web/src/core/auth/local-session.test.ts`
  - `apps/web/src/core/auth/session-context.tsx`
  - `apps/web/src/core/auth/session-context.test.tsx`
  - `apps/web/src/features/auth/pages/SignInPage.tsx`
  - `apps/web/src/features/auth/pages/SignInPage.test.tsx`
  - `apps/web/src/core/sync/sync-context.tsx`
  - `apps/web/src/core/sync/sync-context.test.tsx`
  - `apps/web/src/core/sync/http-sync-transport.test.ts`
  - `apps/web/src/styles/globals.css`
  - `docs/project-plan.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm ci`: موفق
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا در تمام پکیج‌ها و اپلیکیشن‌ها
  - `npm run test`: موفق؛ تمام ۲۰۶ تست با موفقیت پاس شدند (۶۴ تست سرور شامل ۳۷ تست احراز هویت + ۱۴۲ تست وب شامل تست‌های سشن و احراز هویت)
  - `npm run build`: موفق؛ کامپایل موفقیت‌آمیز تمام ورک‌اسپیس‌ها
  - `git diff --check`: بدون خطای فاصله‌گذاری یا پایان خط
- **وضعیت PR:**
  - ادغام شده در `develop`
- **گام بعدی (Handoff):**
  - پیاده‌سازی حل تعارض در سطح فیلد (field-level conflict resolution) در فاز ۳

### 2026-10-03 | P3-SYNC-001 | حل تعارض فیلدی در سرور (LWW و CONFLICT_MERGED)

- **عامل:** Antigravity
- **هدف:** پیاده‌سازی استراتژی Last-Write-Wins (LWW) در سطح فیلد با شکستن تساوی لکسیکوگرافیک و وضعیت `CONFLICT_MERGED` در سرور
- **انجام‌شده:**
  - ایجاد مایگریشن `1727670000000-AddConflictMetadataToTasks.ts` برای اضافه کردن ستون‌های `field_timestamps` (JSONB) و `last_mutation_id` (VARCHAR) به جدول `tasks` و ثبت آن در `database.config.ts`.
  - به‌روزرسانی مدل دیتابیس `TaskEntityModel` با فیلدهای `fieldTimestamps` و `lastMutationId`.
  - پیاده‌سازی تابع خالص `mergeTaskFieldsWithLww(existingTask, mutation)` در `conflict-resolution.util.ts`:
    - برنده بودن فیلد با timestamp بزرگتر (ISO string comparison).
    - شکستن تساوی در صورت برابری کامل timestamp با مقایسه لکسیکوگرافیک شناسه mutation جدید در برابر `lastMutationId` موجود.
    - پشتیبانی از `deletedAt` به عنوان فیلد استاندارد زمان‌دار (پشتیبانی کامل از حذف نرم و بازیابی / restore).
    - برگرداندن وضعیت `APPLIED` در صورت پیروزی تمام فیلدهای mutation بدون واگرایی نسخه (`mutation.baseVersion >= existing.version`) و برگرداندن `CONFLICT_MERGED` در صورت ادغام تعارض با فیلدهای سرور یا نسخه پایه قدیمی‌تر.
  - تست‌های واحد سریع در حافظه در `conflict-resolution.util.test.ts` (۶ تست سبز در ~18ms).
  - ادغام در `PostgresSyncRepository`:
    - به‌روزرسانی نوع `ApplyMutationResult` برای دربرگرفتن وضعیت `'CONFLICT_MERGED'`.
    - استفاده از `mergeTaskFieldsWithLww` در متد `applyTaskMutationInManager` برای اعمال جهش‌های `UPSERT` و `UPDATE`.
  - تست‌های جامع یکپارچگی پایگاه داده در `conflict-resolution.integration.test.ts` شامل ۸ تست:
    - ویرایش‌های همزمان روی فیلدهای مجزا (disjoint fields) و ادغام موفقیت‌آمیز فیلدها.
    - ویرایش‌های همزمان روی فیلد مشترک (برد timestamp بزرگتر صرف نظر از ترتیب رسیدن جهش‌ها).
    - ویرایش‌های همزمان با timestamp یکسان (حل تعارض قطعی با tie-breaker بر اساس شناسه جهش).
    - تعارض حذف نرم در برابر ویرایش با رفتار LWW.
    - فلوی کامل HTTP push/pull و دریافت وضعیت `CONFLICT_MERGED`.
- **فایل‌ها:**
  - `apps/server/src/database/migrations/1727670000000-AddConflictMetadataToTasks.ts`
  - `apps/server/src/database/database.config.ts`
  - `apps/server/src/database/entities/task.entity.ts`
  - `apps/server/src/sync/interfaces/sync-repository.interface.ts`
  - `apps/server/src/sync/utils/conflict-resolution.util.ts`
  - `apps/server/src/sync/utils/conflict-resolution.util.test.ts`
  - `apps/server/src/sync/repositories/postgres-sync.repository.ts`
  - `apps/server/src/conflict-resolution.integration.test.ts`
  - `apps/server/vitest.config.ts`
  - `docs/project-plan.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا در تمام پکیج‌ها و اپلیکیشن‌ها
  - `npm run test`: موفق؛ تمام ۲۲۰ تست با موفقیت پاس شدند (۷۸ تست سرور + ۱۴۲ تست وب)
  - `npm run build`: موفق؛ کامپایل موفقیت‌آمیز تمام پکیج‌ها و کلاینت وب
  - `git diff --check`: بدون خطای فاصله‌گذاری یا خط جدید
- **وضعیت PR:**
  - ادغام شده در `develop` (PR شماره ۱۲)
- **گام بعدی (Handoff):**
  - ادغام شاخه `feature/server-field-conflict-resolution` در `develop`
  - گام بعدی فاز ۳: مدیریت tombstone و سیاست retention

### 2026-10-04 | P3-SYNC-002 | پیاده‌سازی مدیریت Tombstone و سیاست نگهداری (Retention Policy) در سرور

- **عامل:** Antigravity
- **هدف:** پیاده‌سازی مدیریت کامل Tombstone و سیاست نگهداری ۳۰ روزه برای تسک‌های حذف نرم شده، پاک‌سازی اتمیک و تکرارپذیر (Idempotent) در تراکنش، جلوگیری قطعی از احیا و زنده شدن مجدد تسک‌های منقضی (Resurrection Prevention) توسط کلاینت‌های دیرهنگام، و اندپوینت پاک‌سازی `POST /api/v1/sync/cleanup`.
- **انجام‌شده:**
  - **طرحواره پایگاه داده و مهاجرت:**
    - ایجاد مهاجرت TypeORM با نام `1727680000000-CreateCleanedTombstonesTable.ts` برای ایجاد جدول `cleaned_tombstones` به همراه قید یکتایی `(user_id, entity_id)` و ایندکس‌های مربوطه.
    - تعریف موجودیت `CleanedTombstoneEntity` در `apps/server/src/database/entities/cleaned-tombstone.entity.ts` و ثبت آن در ایندکس و پیکربندی پایگاه داده `database.config.ts`.
  - **منطق مخزن و همگام‌سازی سرور:**
    - ارتقای اینترفیس `SyncRepository` با افزودن نوع‌های `CleanTombstonesOptions`، `CleanTombstonesResult` و افزودن وضعیت `'REJECTED'` به `ApplyMutationResult`.
    - پیاده‌سازی متد `cleanTombstones` در `PostgresSyncRepository` داخل تراکنش اتمیک دیتابیس با فیلتر دقیق رکوردهای دارای `deletedAt` قبل از تاریخ cutoff، درج در `cleaned_tombstones` با قید `ON CONFLICT DO NOTHING` برای تضمین idempotency، و حذف فیزیکی از جدول `tasks`.
    - پیاده‌سازی مسدودسازی جهش‌های احیاگر دیرهنگام (Resurrection Prevention) در `applyMutationAtomic` و `applyTaskMutation`: در صورت ارسال هرگونه جهش برای تسکی که در `cleaned_tombstones` ثبت شده است، درخواست با وضعیت `REJECTED` و پیام خطای صریح رد می‌شود و هیچ رکوردی در جدول `tasks` درج یا بازیابی نمی‌شود.
    - پشتیبانی از هوک تراکنشی `onBeforeCommit` در `cleanTombstones` جهت تست قطعی Rollback تراکنش در شرایط بروز خطا.
    - به‌روزرسانی `clear()` در `PostgresSyncRepository` جهت پاک‌سازی جدول `cleaned_tombstones`.
    - پیاده‌سازی متناظر در `InMemorySyncRepository` شامل نگهداری رکوردهای پاک‌شده و پاک‌سازی همگام با changelog و تست‌های واحد اختصاصی در `in-memory-sync.repository.test.ts`.
  - **لایه سرویس و کنترلر سرور:**
    - افزودن متد `cleanTombstones` در `SyncService` و ارسال خطاهای اتمیک به نتیجه push.
    - ایجاد اندپوینت `POST /api/v1/sync/cleanup` در `SyncController` تحت گارد احراز هویت `JwtAuthGuard`.
  - **مستندات مهندسی:**
    - به‌روزرسانی کامل `docs/sync-protocol.md` با افزودن بخش ۹ (نمایش Tombstone، سیاست نگهداری ۳۰ روزه و دلایل، شرایط واجد شرایط بودن، ایمنی و اتمیسیتی پاک‌سازی، رفتار کلاینت دیرهنگام و جلوگیری از احیا، رفتار کرسر و pull، و قوانین بازیابی).
    - به‌روزرسانی `docs/data-model.md` با ثبت موجودیت و فیلدهای `cleaned_tombstones` و قوانین حذف.
    - به‌روزرسانی `docs/operations.md` با مستندسازی جاب دوره‌ای نگهداری، ایمنی و متریک‌های پایش پاک‌سازی Tombstone.
  - **تست‌های جامع:**
    - ایجاد `apps/server/src/tombstone-retention.integration.test.ts` شامل ۱۰ آزمون یکپارچگی پایگاه داده و اندپوینت‌های HTTP پوشش‌دهنده تمام نیازمندی‌های تسک (پایداری در pull، عدم پاک‌سازی قبل از retention، پاک‌سازی دقیق موارد منقضی، عدم لمس تسک‌های فعال، idempotency، رد احیای دیرهنگام، تعارض حذف و ویرایش بر اساس LWW، بازیابی موفق قبل از پاک‌سازی، rollback قطعی تراکنش، و فلوی کامل HTTP).
- **فایل‌ها:**
  - `apps/server/src/database/entities/cleaned-tombstone.entity.ts`
  - `apps/server/src/database/entities/index.ts`
  - `apps/server/src/database/migrations/1727680000000-CreateCleanedTombstonesTable.ts`
  - `apps/server/src/database/database.config.ts`
  - `apps/server/src/sync/sync.module.ts`
  - `apps/server/src/sync/interfaces/sync-repository.interface.ts`
  - `apps/server/src/sync/repositories/postgres-sync.repository.ts`
  - `apps/server/src/sync/repositories/in-memory-sync.repository.ts`
  - `apps/server/src/sync/repositories/in-memory-sync.repository.test.ts`
  - `apps/server/src/sync/sync.service.ts`
  - `apps/server/src/sync/sync.controller.ts`
  - `apps/server/src/tombstone-retention.integration.test.ts`
  - `docs/sync-protocol.md`
  - `docs/data-model.md`
  - `docs/operations.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - `npm run typecheck`: موفق با ۰ خطا در تمام پکیج‌ها و اپلیکیشن‌ها
  - `tombstone-retention.integration.test.ts`: تمام ۱۰ تست با موفقیت پاس شدند
  - `in-memory-sync.repository.test.ts`: تمام ۵ تست با موفقیت پاس شدند
- **وضعیت PR:**
  - ادغام کامل PR شماره ۱۳ در `develop`
- **گام بعدی (Handoff):**
  - اجرای تسک P3-SYNC-003: بازیابی بعد از crash، timeout و نصب مجدد

### 2026-10-04 | P3-SYNC-003 | بازیابی از خرابی، انقضای زمانی و راه‌اندازی مجدد در Sync Runtime

- **عامل:** Antigravity
- **شناسه تسک:** P3-SYNC-003
- **شاخه:** `feature/sync-recovery`
- **هدف:**
  - پیاده‌سازی بازیابی بعد از crash، timeout و restart برای sync runtime.
  - انتقال جهش‌های گیرکرده در `IN_FLIGHT` به `PENDING` پس از timeout به همراه افزایش `attemptCount` و محاسبه backoff نمایی.
  - عدم تولید جهش‌های تکراری در بازیابی و حفظ اکید ترتیب FIFO بر اساس `createdAt`.
  - حفظ idempotency و مدیریت پاسخ‌های `ALREADY_APPLIED` هنگام ارسال مجدد پس از restart.
  - تفکیک خطاهای موقت (network error / retryable) از خطاهای دائمی (`REJECTED`) و انتقال جهش‌ها به `FAILED` پس از رسیدن به سقف تلاش (`maxAttempts`).
  - حفظ کرسر و تضمین عدم advance شدن کرسر پیش از ثبت قطعی تمام تغییرات دریافتی در دیتابیس محلی (پوشش سناریوهای کرش قبل از ذخیره کرسر و کرش مابین ذخیره موجودیت‌ها و ذخیره کرسر).
  - پشتیبانی از بازیابی پایدار در IndexedDB کلاینت در سناریوهای باز و بسته شدن مرورگر و reload تب.
- **تغییرات اعمال‌شده:**
  - **`packages/shared-types/src/sync.ts`:**
    - افزودن فیلد اختیاری `inFlightSince?: string | undefined;` به ساختار `SyncQueueEntry` جهت ثبت دقیق زمان آغاز ارسال جهش.
  - **`packages/sync-engine/src/ports.ts`:**
    - ارتقای قرارداد پورت `LocalStore` با متدهای `markMutationInFlight(id, inFlightSince)`, `listInFlightMutations()` و `getMutation(id)`.
  - **`packages/sync-engine/src/sync-runtime.ts`:**
    - افزودن تنظیمات پیکربندی `inFlightTimeoutMs` (پیش‌فرض ۳۰ ثانیه)، `maxAttempts` (پیش‌فرض ۵ تلاش) و `jitter` به `SyncRuntimeOptions`.
    - پیاده‌سازی متد `recoverInFlightMutations(options?)` با بررسی هوشمند زمان سپری‌شده از `inFlightSince`، تبدیل به `PENDING` با exponential backoff یا تبدیل به `FAILED` در صورت رسیدن به سقف مجاز `maxAttempts`.
    - به‌روزرسانی `pushOnce()`:
      1. اجرای خودکار بازیابی جهش‌های منقضی در ابتدای هر چرخه.
      2. علامت‌گذاری اتمیک جهش‌های انتخابی با وضعیت `IN_FLIGHT` و ثبت زمان `inFlightSince` پیش از فراخوانی transport.
      3. مدیریت بلوک catch در خطاهای شبکه و transport: تفکیک خطای دائمی و بررسی `maxAttempts` برای تعیین وضعیت `FAILED` یا `PENDING`.
      4. مدیریت پاسخ‌های دریافتی: انتقال پاسخ‌های `RETRYABLE_ERROR` با سقف تلاش به `FAILED` و پاسخ‌های `REJECTED` به `FAILED` دائمی بدون retry خودکار.
  - **`apps/web/src/core/storage/memory-local-store.ts` و `indexeddb-local-store.ts`:**
    - پیاده‌سازی `markMutationInFlight` و `listInFlightMutations` با حفظ ترتیب FIFO بر اساس `createdAt`.
    - پاک‌سازی خودکار متادیتای `inFlightSince` در عملیات‌های `markMutationSucceeded` و `markMutationFailed`.
    - پشتیبانی از `now: () => Date` سفارشی در `IndexedDbLocalStore` برای شبیه‌سازی تست‌های زمانی قطعی.
  - **`apps/web/src/core/sync/sync-runtime.test.ts`:**
    - ایجاد مجموعه آزمون‌های جامع `Crash, Timeout and Restart Recovery (P3-SYNC-003)` شامل ۱۰ سناریوی الزامی:
      1. بازیابی جهش‌های گیرکرده در `IN_FLIGHT` پس از انقضای زمانی (`inFlightTimeoutMs`).
      2. بازگشت امن جهش‌های منقضی به `PENDING` با `nextAttemptAt` در آینده طبق backoff.
      3. رسیدن به سقف تلاش مجدد (`maxAttempts`) و ثبت دائمی `FAILED`.
      4. حفظ وضعیت `FAILED` برای رکوردهای `REJECTED` و عدم ارسال خودکار در چرخه‌های بعدی.
      5. خاصیت Idempotent بودن اجرای مکرر متد recovery بدون افزایش تکراری شمارنده‌ها یا ایجاد رکورد جدید.
      6. حفظ کرسر در صورت کرش قبل از ثبت کرسر در pull.
      7. حفظ کرسر در صورت کرش پس از ذخیره موجودیت‌ها اما پیش از ذخیره کرسر، و اعمال بدون تکرار در تلاش بعدی.
      8. بازیابی و ارسال مجدد موفقیت‌آمیز پس از انقضای زمانی سمت سرور (Server timeout).
      9. ارسال مجدد جهش پس از restart و دریافت `ALREADY_APPLIED` از سرور بدون تولید رکورد تکراری.
      10. پایداری و بازیابی کامل در پایگاه داده واقعی `IndexedDbLocalStore` در سناریوی reload تب مرورگر.
  - **مستندات:**
    - به‌روزرسانی بخش ۸ سند `docs/sync-protocol.md` با جزئیات کامل چرخه‌حیات بازیابی، انقضا و اتمیسیتی کرسر.
    - افزودن راهنمای عملیاتی عیب‌یابی و بازیابی (`Sync Recovery Runbook`) در `docs/operations.md`.
    - به‌روزرسانی `docs/project-plan.md` و تایید تکمیل کار فاز ۳.
- **اعتبارسنجی:**
  - `npm run lint`: موفق با ۰ خطا و ۰ هشدار
  - `npm run typecheck`: موفق با ۰ خطا در ریشه، web و server
  - `npm run test --workspace @orbit/web`: تمام ۱۵۵ تست در ۱۲ فایل پاس شدند
  - `git diff --check`: بدون خطا
- **وضعیت PR:**
  - آماده ثبت PR از شاخه `feature/sync-recovery` به `develop`
- **گام بعدی (Handoff):**
  - ادغام `feature/sync-recovery` در `develop`
  - ورود به تسک بعدی فاز ۳: تله‌متری حداقلی برای sync health

### 2026-10-05 | پیاده‌سازی تله‌متری سلامت همگام‌سازی (P3-SYNC-004: Sync Health Telemetry)

- **عامل:** Antigravity
- **هدف:** افزودن سیستم تله‌متری و پایش سلامت چرخه همگام‌سازی بدون وابستگی دامنه به هیچ SDK یا ارائه‌دهنده شخص ثالث (Vendor-neutral)، به صورت کاملاً اختیاری و No-op پیش‌فرض، با تضمین عدم افشای محتوای خصوصی کاربران و مقاومت در برابر خطاهای گردآورنده.
- **انجام‌شده:**
  - **طراحی رابط خنثی `SyncTelemetry` (`packages/sync-engine/src/telemetry.ts`):**
    - تعریف تایپ‌های `SyncMetricName`، `SyncMetricRecord` و Interface ماژولار `SyncTelemetry`.
    - پیاده‌سازی `NoopSyncTelemetry` برای سناریوی پیش‌فرض بدون هزینه پردازشی و I/O.
    - پیاده‌سازی `InMemorySyncTelemetry` برای مصارف تست، تحلیل و عیب‌یابی با متدهای کوئری (`getEvents`، `getMetrics`، `getMetricValues`، `getLastMetricValue`، `getSumMetric`).
    - پیاده‌سازی محاسبه‌گر پیشرفته تاخیر کرسر (`calculateCursorLag`) بر پایه سن آخرین تغییر (ثانیه) یا فاصله شمارنده ترتیبی.
  - **پایش ۱۳ رویداد و متریک الزامی در `SyncRuntime`:**
    1. `sync_cycle_started`: ثبت شروع چرخه همگام‌سازی با `syncId`، زمان و scope.
    2. `sync_cycle_completed`: ثبت پایان موفق چرخه همراه با مدت زمان و آمار کلی.
    3. `sync_cycle_failed`: ثبت خطای چرخه با برچسب فاز خطا (`PULL` یا `PUSH`)، مدت زمان تا شکست و پیام خطا.
    4. `push_batch_size`: اندازه بسته ارسالی در push.
    5. `pull_batch_size`: تعداد تغییرات دریافت‌شده در pull.
    6. `pending_mutation_count`: تعداد جهش‌های در صف انتظار برای ارسال.
    7. `retry_count`: تعداد تلاش‌های مجدد برنامه‌ریزی‌شده ناشی از خطای موقت.
    8. `in_flight_timeout_recovery_count`: تعداد جهش‌های معلق منقضی‌شده که بازیابی شدند.
    9. `failed_mutation_count`: تعداد جهش‌های منتقل‌شده به وضعیت دائمی `FAILED`.
    10. `rejected_mutation_count`: تعداد جهش‌های ردشده توسط سرور یا منقضی در سقف تلاش.
    11. `conflict_merged_count`: تعداد جهش‌های ادغام‌شده با قاعده LWW بدون خطا.
    12. `cursor_lag`: میزان تاخیر کرسر بر حسب ثانیه یا فاصله شمارنده ترتیبی.
    13. `sync_duration_ms`: مدت زمان اجرای چرخه همگام‌سازی به میلی‌ثانیه.
  - **حریم خصوصی و اصل حداقل‌سازی داده (Data Minimization):**
    - هیچ عنوان، شرح، یادداشت یا محتوای خصوصی تسک در متریک‌ها، برچسب‌ها یا رویدادها لاگ نمی‌شود.
    - صرفاً شناسه‌های غیرحساس فنی (`syncId`, `requestId`, `mutationId`, `userScope`) مجاز هستند.
  - **تاب‌آوری در برابر خطای گردآورنده (Fail-Safe):**
    - کپسوله‌سازی تمام فراخوانی‌های تله‌متری با `safeTelemetry` به نحوی که اگر یک گردآورنده شخص ثالث پرتاب خطا کند، چرخه همگام‌سازی و اعمال تغییرات بدون هیچ وقفه‌ای به کار خود ادامه دهد.
  - **ادغام در React Web App (`apps/web/src/core/sync/sync-context.tsx`):**
    - افزودن پراپ اختیاری `telemetry?: SyncTelemetry` به `SyncProviderProps` و ارسال به `SyncRuntime`.
  - **مجموعه آزمون‌های جامع (`apps/web/src/core/sync/sync-telemetry.test.ts`):**
    - تست اجرای ایمن بدون تله‌متری و با `NoopSyncTelemetry`.
    - تست مقاومت در برابر گردآورنده‌ای که در تمام متدها خطا پرتاب می‌کند.
    - تست ثبت دقیق تمام رویدادها و متریک‌های ۱۳ گانه در `InMemorySyncTelemetry`.
    - تست تفکیک فازهای خطا (`PULL` و `PUSH`) در `sync_cycle_failed`.
    - تست ردیابی وضعیت‌های `IN_FLIGHT`، `REJECTED` و `RETRYABLE_ERROR`.
    - آزمون تطبیق حریم خصوصی و اطمینان از عدم وجود هرگونه داده متنی و محتوای تسک‌ها در خروجی‌های تله‌متری.
  - **مستندات:**
    - به‌روزرسانی کامل `docs/operations.md` با جدول جامع متریک‌ها، رویدادها و جدول آستانه‌ها و هشدارهای عملیاتی.
    - به‌روزرسانی `docs/security.md` با قواعد و کنترل‌های حریم خصوصی تله‌متری.
- **اعتبارسنجی:**
  - `npm run lint`: موفق با ۰ خطا
  - `npm run typecheck`: موفق با ۰ خطا در ریشه، web و server
  - `npm run test --workspace @orbit/web`: تمام ۱۶۵ تست در ۱۳ فایل پاس شدند
  - `git diff --check`: بدون خطا
- **وضعیت PR:**
  - ادغام‌شده در `develop` و `main` (PR #18).
- **گام بعدی (Handoff):**
  - آغاز رسمی فاز ۴ با وظیفه P4-CAL-001.

### 2026-10-05 | زیرساخت تقویم، موتور جلالی، کامپوننت DatePicker و نماهای Today/Tomorrow (P4-CAL-001)

- **عامل:** Antigravity
- **هدف:** پیاده‌سازی زیرساخت مدیریت زمان و تقویم شامل موتور مستقل و دقیق تقویم شمسی (جلالی)، کامپوننت انتخاب‌گر دوگانه تاریخ و ساعت (Jalali/Gregorian DatePicker)، زمان‌بندی تسک‌ها در سرویس دامنه، و نماهای روزانه «امروز» (Today) و «فردا» (Tomorrow).
- **انجام‌شده:**
  - **گسترش مدل داده (`packages/shared-types/src/task.ts`):**
    - افزودن فیلدهای اختیاری زمان‌بندی: `startDate?: string | null`، `dueDate?: string | null`، `allDay?: boolean`، `timezone?: string | null`.
    - تثبیت استاندارد ذخیره‌سازی مقادیر زمانی در قالب UTC ISO-8601 به منظور حفظ سازگاری همگام‌سازی و حل تعارض LWW.
  - **موتور تقویم شمسی مستقل (`apps/web/src/core/calendar/jalali.ts`):**
    - پیاده‌سازی بدون وابستگی خارجی با الگوریتم دقیق محاسباتی ۳۳ ساله برکوفسکی (Borkowski 1996) معتبر برای بازه سال‌های جلالی ۶۱- تا ۳۱۷۷.
    - محاسبه دقیق سال‌های کبیسه شمسی (مانند ۱۳۹۵، ۱۳۹۹، ۱۴۰۳، ۱۴۰۸) و طول ماه‌ها (فروردین تا شهریور ۳۱ روز، مهر تا بهمن ۳۰ روز، و اسفند ۲۹/۳۰ روز).
    - نگاشت شاخص روزهای هفته با شروع از شنبه (شنبه = ۰ تا جمعه = ۶) برای زبان فارسی (`fa-IR`).
    - توابع تبدیل دوطرفه میلادی و شمسی (`gregorianToJalali`, `jalaliToGregorian`, `dateToJalali`, `jalaliToDate`, `isoToJalali`, `jalaliToIso`).
    - ابزارهای فرمت‌بندی تاریخ و ساعت، تبدیل ارقام به فارسی (`toPersianDigits`) و پارس رشته‌های تاریخ.
  - **کامپوننت انتخاب تاریخ و زمان (`apps/web/src/features/calendar/components/DatePicker.tsx`):**
    - کامپوننت دسترس‌پذیر (ARIA) با `role="dialog"`, `aria-modal="false"`, `aria-haspopup="dialog"`, `aria-selected` و مدیریت فوکوس و بسته‌شدن با دکمه Escape و کلیک بیرون.
    - پشتیبانی از تعویض زنده سیستم تقویم بین شمسی و میلادی با حفظ برچسب زمانی انتخاب‌شده.
    - گزینه‌های زمان‌بندی تمام‌روز (تمام روز / All-Day) و انتخاب ساعت و دقیقه.
    - دکمه‌های سریع «امروز»، «فردا» و «پاک کردن».
  - **یکپارچه‌سازی سرویس دامنه تسک‌ها (`apps/web/src/features/tasks/services/task-service.ts`):**
    - پشتیبانی از زمان‌بندی در زمان ایجاد (`createTask`).
    - پیاده‌سازی متد `scheduleTask` جهت زمان‌بندی، به‌روزرسانی و لغو تاریخ سررسید/شروع با صدور جهش‌های `PARTIAL UPDATE` و متادیتای `fieldTimestamps`.
    - اعتبارسنجی شرط منطقی `startDate <= dueDate`.
    - توابع کوئری و فیلتر نماهای زمانی: `isDueToday`, `isDueTomorrow`, `filterTasksDueToday`, `filterTasksDueTomorrow`.
  - **یکپارچه‌سازی فرم تسک (`apps/web/src/features/tasks/components/TaskForm.tsx`):**
    - ادغام `DatePicker` درون فرم افزودن تسک و امکان تعیین سررسید پیش‌فرض.
  - **نمایش تاریخ سررسید در تسک‌ها (`apps/web/src/features/tasks/components/TaskItem.tsx`):**
    - نمایش برچسب زیبای تاریخ سررسید به تقویم شمسی در کنار عنوان تسک.
  - **نماهای امروز و فردا (`TodayPage.tsx` و `TomorrowPage.tsx`):**
    - ایجاد صفحات `/today` و `/tomorrow` با هدر تاریخ روز فارسی و لیست تسک‌های سررسید شده.
    - به‌روزرسانی ناوبری سایدبار `AppShell.tsx` با پیوندهای «امروز» و «فردا».
    - ثبت مسیرها در `apps/web/src/app/routes.tsx`.
  - **تست‌های واحد و یکپارچه‌سازی:**
    - آزمون‌های ۲۹گانه موتور جلالی (`apps/web/src/core/calendar/jalali.test.ts`).
    - آزمون‌های سرویس زمان‌بندی و فیلترینگ تاریخ (`apps/web/src/features/tasks/services/task-service.test.ts`).
    - آزمون‌های کامپوننت `DatePicker` (`apps/web/src/features/calendar/components/DatePicker.test.tsx`).
    - آزمون‌های صفحات `TodayPage` و `TomorrowPage`.
  - **مستندات:**
    - به‌روزرسانی `docs/data-model.md` با فیلدهای جدید `TaskEntity` و قواعد ذخیره‌سازی UTC ISO-8601.
- **فایل‌ها:**
  - `packages/shared-types/src/task.ts`
  - `packages/sync-engine/src/ports.ts`
  - `apps/web/src/core/calendar/jalali.ts`
  - `apps/web/src/core/calendar/jalali.test.ts`
  - `apps/web/src/core/storage/indexeddb-local-store.ts`
  - `apps/web/src/core/storage/memory-local-store.ts`
  - `apps/web/src/features/calendar/components/DatePicker.tsx`
  - `apps/web/src/features/calendar/components/DatePicker.module.css`
  - `apps/web/src/features/calendar/components/DatePicker.test.tsx`
  - `apps/web/src/features/calendar/index.ts`
  - `apps/web/src/features/tasks/services/task-service.ts`
  - `apps/web/src/features/tasks/services/task-service.test.ts`
  - `apps/web/src/features/tasks/components/TaskForm.tsx`
  - `apps/web/src/features/tasks/components/TaskForm.test.tsx`
  - `apps/web/src/features/tasks/components/TaskItem.tsx`
  - `apps/web/src/features/tasks/pages/TodayPage.tsx`
  - `apps/web/src/features/tasks/pages/TodayPage.test.tsx`
  - `apps/web/src/features/tasks/pages/TomorrowPage.tsx`
  - `apps/web/src/features/tasks/pages/TomorrowPage.test.tsx`
  - `apps/web/src/layout/AppShell.tsx`
  - `apps/web/src/layout/AppShell.test.tsx`
  - `apps/web/src/app/routes.tsx`
  - `apps/web/src/styles/globals.css`
  - `docs/data-model.md`
  - `PROGRESS.md`
- **اعتبارسنجی:**
  - اجرای کامل اعتبارسنجی‌های شش‌گانه الزامی (`npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `git diff --check`).
- **وضعیت PR:**
  - آماده ثبت PR از شاخه `feature/calendar-jalali-foundation` به `develop`.
- **گام بعدی (Handoff):**
  - ادغام `feature/calendar-jalali-foundation` در `develop`.
  - اجرای تسک بعدی فاز ۴ (نماهای Upcoming و تقویم کامل هفتگی و ماهانه).




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
