# Project Progress

> این فایل منبع اصلی وضعیت پروژه است. هر AI باید قبل و بعد از کار آن را به‌روزرسانی کند.

## وضعیت کلی

- **مرحله:** فاز یک، monorepo و Web-first foundation
- **آخرین به‌روزرسانی:** 2026-09-29
- **آخرین عامل:** GitHub Copilot
- **درصد تقریبی پیشرفت:** 26%

## هدف فعلی

تبدیل Orbit به یک محصول کامل شبیه TickTick با مسیر اجرایی مشخص از هسته local-first تا Pomodoro، عادت‌ها، تحلیل‌ها و انتشار production.

## کارهای در حال انجام

- [ ] بازبینی و تایید سند مهندسی MVP
- [ ] انتخاب دیتابیس محلی بین SQLite و WatermelonDB
- [ ] پیاده‌سازی اولین vertical slice سینک
- [ ] ایجاد اسکلت `apps/web` و اتصال آن به قراردادهای مشترک

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
- **انجام‌شده:** تکمیل vision، تعریف معماری، مدل داده، پروتکل سینک، امنیت، تست، عملیات، roadmap، واژه‌نامه و API
- **فایل‌ها:** `docs/vision.md`، `docs/architecture.md`، `docs/data-model.md`، `docs/sync-protocol.md`، `docs/security.md`، `docs/testing.md`، `docs/operations.md`، `docs/roadmap.md`، `docs/glossary.md` و `docs/api/README.md`
- **اعتبارسنجی:** اجرای `git diff --check` بدون خطا؛ بررسی سازگاری نام فیلدها و وضعیت‌های سینک در اسناد
- **گام بعدی:** بازبینی مالک محصول و ایجاد monorepo حداقلی با `shared-types`

### 2026-09-29 | ایجاد monorepo و قراردادهای هسته

- **عامل:** GitHub Copilot
- **هدف:** شروع implementation با یک workspace قابل typecheck و قرارداد مستقل از دیتابیس
- **انجام‌شده:** ایجاد workspaceهای npm، تنظیم TypeScript، مدل‌های `TaskEntity` و mutation، و portهای `LocalStore`/`SyncTransport`
- **فایل‌ها:** `package.json`، `tsconfig.json`، `tsconfig.base.json`، `packages/shared-types/`، `packages/sync-engine/` و `apps/*/README.md`
- **اعتبارسنجی:** `npm install` موفق، `npm run typecheck` موفق، audit با صفر آسیب‌پذیری گزارش‌شده
- **گام بعدی:** طراحی schema محلی و انتخاب SQLite یا WatermelonDB، سپس پیاده‌سازی queue واقعی

### 2026-09-29 | برنامه جامع محصول و قابلیت‌ها

- **عامل:** GitHub Copilot
- **هدف:** مشخص‌کردن مسیر کامل پروژه و جلوگیری از فراموش‌شدن قابلیت‌های محصولی مهم
- **انجام‌شده:** ایجاد برنامه فازبندی‌شده از کشف محصول تا production و کاتالوگ قابلیت‌های کامل شامل تقویم، reminder، recurrence، Focus/Pomodoro، habit، analytics، collaboration و integration
- **فایل‌ها:** `docs/project-plan.md`، `docs/feature-catalog.md`، `docs/roadmap.md` و پیوندهای README
- **اعتبارسنجی:** بررسی وجود دروازه خروج برای هر فاز و ثبت مرحله ورود برای قابلیت‌های Pomodoro و تحلیل‌ها
- **گام بعدی:** بازبینی مالک محصول، سپس schema محلی فاز ۲ و تصمیم دیتابیس

### 2026-09-29 | تغییر اولویت به Web-first

- **عامل:** GitHub Copilot
- **هدف:** تنظیم مسیر توسعه بر اساس اولویت نسخه تحت وب
- **انجام‌شده:** اضافه‌کردن Web به معماری، تغییر ترتیب توسعه به Web سپس Desktop و Android، و ثبت ADR-005
- **فایل‌ها:** `docs/project-plan.md`، `docs/architecture.md`، `docs/feature-catalog.md`، `docs/roadmap.md`، `docs/decisions.md`
- **اعتبارسنجی:** بررسی سازگاری مرحله‌بندی و ثبت معیار خروج Web در برنامه
- **گام بعدی:** ایجاد اسکلت `apps/web` و تعریف adapter storage مرورگر

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
