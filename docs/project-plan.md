# برنامه جامع اجرای Orbit

این سند منبع اصلی برنامه‌ریزی پروژه است. هر عامل انسانی یا AI باید پیش از شروع کار، بخش «مرحله فعلی» را بخواند و فقط کاری را شروع کند که در همان مرحله یا دروازه بعدی تعریف شده است.

## 1. روش اجرای پروژه

### چرخه هر کار

1. **Read:** خواندن `PROGRESS.md`، این سند و سند تخصصی مرتبط.
2. **Plan:** تعریف هدف، فرض‌ها، فایل‌های درگیر و معیار پذیرش.
3. **Implement:** کوچک‌ترین تغییر قابل تست.
4. **Validate:** اجرای نزدیک‌ترین تست، typecheck، lint یا بررسی قرارداد.
5. **Record:** ثبت عامل، تغییرات، اعتبارسنجی و گام بعد در `PROGRESS.md`.
6. **Handoff:** مشخص‌کردن کاری که عامل بعدی می‌تواند بدون ابهام ادامه دهد.

### قواعد عبور بین مراحل

- هیچ فازی با «تقریباً آماده» تمام نمی‌شود؛ معیارهای خروج باید قابل بررسی باشند.
- قابلیت جدید بدون نیازمندی، مدل داده، API، تست و معیار پذیرش وارد implementation نمی‌شود.
- تغییر در قرارداد عمومی باید با ADR و migration یا سازگاری backward-compatible همراه باشد.
- قابلیت‌های خارج از مرحله فعلی در backlog می‌مانند و وارد scope تصادفی نمی‌شوند.

## 2. مرحله فعلی

- **مرحله:** فاز ۳، sync و حساب کاربری
- **وضعیت:** در حال انجام (راه‌اندازی اسکلت سرور NestJS در apps/server و endpointهای اولیه push/pull همگام‌سازی - P3-SRV-001)
- **اولویت کلاینت:** Web به‌عنوان اولین محصول قابل استفاده و مرجع رفتاری
- **خروجی اخیر:** راه‌اندازی سرور NestJS در apps/server با پیشوند نسخه /api/v1، فیلتر خطای استاندارد، پیاده‌سازی InMemorySyncRepository و endpointهای /health، /sync/push (همراه با اعتبارسنجی و idempotency) و /sync/pull (با پیشروی کرسر) و آزمون‌های E2E (۱۳۵ تست سبز - P3-SRV-001)
- **خروجی بعدی:** راه‌اندازی اتصال واقعی PostgreSQL، مایگریشن‌های اسکیما و سیستم احراز هویت سرور
- **مسئول پیش‌فرض:** عامل اجرایی بعدی
- **مانع شناخته‌شده:** بررسی دستی در مرورگر فیزیکی و انتخاب بین SQLite و WatermelonDB برای دسکتاپ و اندروید در فازهای بعد

## 3. فازهای کامل پروژه

### فاز 0: کشف محصول و تصمیم‌های پایه

**هدف:** تبدیل ایده به دامنه قابل ساخت.

**خروجی‌ها:**

- چشم‌انداز و PRD
- persona و user journey
- فهرست قابلیت‌ها و اولویت MoSCoW
- محدوده MVP، post-MVP و non-goals
- ADRهای پلتفرم، زبان، package manager و سیاست نسخه‌ها
- تعریف معیارهای موفقیت محصول

**دروازه خروج:** هر قابلیت مهم مالک، اولویت، معیار پذیرش و وضعیت دارد؛ تناقضی بین vision، feature catalog و roadmap نیست.

### فاز 1: قراردادها و monorepo

**هدف:** ایجاد پایه‌ای که Web به‌عنوان کلاینت اول و همه اپ‌های آینده از یک قرارداد استفاده کنند.

**کارها:**

- workspace ریشه و TypeScript strict
- `shared-types` برای entity، API، event و sync
- portهای مستقل از دیتابیس برای storage و transport
- اسکلت Web، Server و قراردادهای قابل استفاده برای Desktop/Mobile
- پیاده‌سازی Web shell با routing، layout، auth boundary و local-first adapter
- CI پایه برای install، typecheck، lint و test
- conventions مربوط به branch، commit، migration و release

**دروازه خروج:** نسخه Web قابل اجراست، clean install و typecheck از ریشه موفق است و هر package قرارداد عمومی خود را صادر می‌کند.

### فاز 2: هسته دامنه و storage محلی

**هدف:** تجربه اصلی بدون شبکه.

**کارها:**

- انتخاب SQLite یا WatermelonDB با ADR و benchmark
- انتخاب storage مناسب Web، با ترجیح IndexedDB از طریق adapter مستقل
- migration نسخه 1 برای user، folder، list، task، tag و settings
- Inbox پیش‌فرض، Folder و List
- TASK، NOTE، CHECKLIST، subtask و ترتیب آیتم‌ها
- priority، status، archive و soft delete
- تاریخ، timezone، all-day، duration و recurrence پایه
- repository و transactionهای اتمیک

**دروازه خروج:** ایجاد، ویرایش، تکمیل، جابه‌جایی و حذف آفلاین بدون از دست‌رفتن داده تست می‌شود.

### فاز 3: sync و حساب کاربری

**هدف:** همگام‌سازی پایدار بین دستگاه‌ها.

**کارها:**

- authentication و session امن
- PostgreSQL schema و migration
- mutation queue، idempotency و retry
- push، pull و cursor
- field-level conflict resolution
- tombstone و retention policy
- recovery بعد از crash، timeout و نصب مجدد
- telemetry حداقلی برای sync health

**دروازه خروج:** سناریوی دو دستگاه آفلاین/آنلاین بدون duplicate یا از دست‌رفتن تغییرات قبول می‌شود.

### فاز 4: مدیریت زمان و تقویم

**هدف:** تبدیل task manager به برنامه‌ریز روزانه.

**کارها:**

- Today، Tomorrow، Upcoming و calendar views
- day/week/month/agenda
- start date، due date، duration و timezone
- reminder در زمان مشخص و reminder بر اساس location در صورت امکان پلتفرم
- recurrence با RRULE و exception برای یک occurrence
- natural language date parsing
- drag-and-drop و time blocking
- time zone و DST test suite

**دروازه خروج:** یک task تکرارشونده و یک task بازه‌ای در timezoneهای مختلف درست نمایش داده و sync می‌شوند.

### فاز 5: سازمان‌دهی و بازیابی اطلاعات

**هدف:** پیدا کردن و مرتب‌کردن سریع اطلاعات.

**کارها:**

- tags و tag groups
- filters و smart lists
- saved searches
- search در title، content، tag، list و date
- فیلتر priority، status، assignee، due state و location
- sort و grouping
- bulk edit، bulk complete و bulk move
- archive و trash قابل بازیابی
- import/export کنترل‌شده

**دروازه خروج:** queryهای اصلی با dataset بزرگ پاسخ‌گو هستند و نتیجه در همه clientها consistent است.

### فاز 6: تمرکز و Pomodoro

**هدف:** کمک به اجرای کار، نه فقط ثبت آن.

**کارها:**

- شروع focus session از یک task
- timer قابل توقف، ادامه، skip و reset
- work interval و short/long break قابل تنظیم
- چرخه‌های متوالی و شمارنده pomodoro
- انتخاب صدای پایان و notification هر پلتفرم
- focus mode و جلوگیری از distraction در UI
- ثبت session کامل، ناقص، لغوشده و مدت واقعی
- اتصال هر session به task، list، tag و timestamp
- رفتار restart، background، sleep و قطع شبکه
- گزارش زمان تمرکز و pomodoro به تفکیک روز، task، list و tag

**دروازه خروج:** timer در background و restart رفتار مشخص دارد؛ session دوباره شمرده نمی‌شود و داده focus قابل sync و تحلیل است.

### فاز 7: عادت‌ها و روتین‌ها

**هدف:** پوشش routineهای تکرارشونده کنار taskها.

**کارها:**

- habit با هدف روزانه/هفتگی
- streak، completion rate و skip
- یادآوری habit
- تقویم زنجیره و heatmap
- ارتباط اختیاری habit با task و focus
- timezone و reset روزانه
- جلوگیری از ثبت completion دوباره

**دروازه خروج:** تغییر timezone، روز ناقص و completion آفلاین نتیجه قابل پیش‌بینی دارند.

### فاز 8: تحلیل‌ها و گزارش‌ها

**هدف:** تبدیل داده خام به بینش قابل عمل.

**داشبوردها:**

- تعداد task ایجادشده، تکمیل‌شده، عقب‌افتاده و لغوشده
- completion rate روزانه، هفتگی، ماهانه و روند آن
- overdue trend و aging task
- توزیع task بر اساس list، folder، tag، priority و kind
- زمان برنامه‌ریزی‌شده در برابر زمان واقعی focus
- تعداد و مدت Pomodoro
- deep work در بازه‌های زمانی
- streak و completion habit
- میانگین زمان تا تکمیل
- throughput و lead time
- مقایسه planned vs completed بدون ایجاد فشار یا امتیاز اجباری

**اصول تحلیل:**

- همه metricها تعریف، فرمول، timezone و منبع داده مستند دارند.
- داده خام و aggregation از هم جدا هستند.
- کاربر می‌تواند بازه، فیلتر و timezone گزارش را انتخاب کند.
- گزارش بدون داده کافی به‌صورت شفاف empty state نشان می‌دهد.
- خروجی CSV/JSON و حذف داده تحلیلی در scope privacy تعریف می‌شود.

**دروازه خروج:** هر نمودار با داده آزمایشی قابل بازتولید است و فرمول آن در مستند analytics ثبت شده است.

### فاز 9: collaboration و اشتراک‌گذاری

**هدف:** همکاری امن، پس از تثبیت تجربه شخصی.

**کارها:**

- workspace و shared list
- دعوت، نقش و permission
- assign task و مشاهده تغییرات
- comment و activity log
- conflict policy برای چند کاربر
- notification قابل تنظیم

**دروازه خروج:** تست authorization برای هر عملیات و تست حذف دسترسی وجود دارد.

### فاز 10: یکپارچه‌سازی و اتوماسیون

**هدف:** اتصال Orbit به اکوسیستم کاربر.

**کارها:**

- calendar از طریق CalDAV یا providerهای مجاز
- import/export استاندارد
- MCP و CLI
- URL Scheme و x-callback-url
- webhook و API token
- widget و quick capture
- share extension و deep link

**دروازه خروج:** هر integration قرارداد versionدار، rate limit، revoke و failure recovery دارد.

### فاز 11: انتشار و کیفیت production

**هدف:** محصول قابل اعتماد برای استفاده واقعی.

**کارها:**

- performance و memory profiling در هر سه پلتفرم
- accessibility و localization
- crash reporting و observability
- backup و disaster recovery
- security review و dependency audit
- beta channel، feature flag و staged rollout
- installer/signing برای Windows، Linux و Android
- privacy policy، export و حذف حساب
- runbook پشتیبانی و incident response

**دروازه خروج:** release checklist، rollback plan، restore تست‌شده و smoke test سه پلتفرم کامل است.

## 3.1 راهبرد پلتفرم‌ها

### ترتیب قطعی توسعه

1. **Web:** اولین کلاینت قابل استفاده، محل اعتبارسنجی UX، domain flow، analytics و Pomodoro.
2. **Desktop:** پس از تثبیت Web و قراردادها؛ Tauri برای Windows و Linux با reuse حداکثری domain و UI.
3. **Android:** پس از تثبیت رفتار sync و مدل زمان؛ React Native با adapter محلی و notification بومی.

### قانون انتقال قابلیت

قابلیت جدید ابتدا در Web طراحی و تست می‌شود، مگر اینکه ذاتاً native باشد. پس از عبور Web از معیار پذیرش، قرارداد مشترک آن در `shared-types` تثبیت و سپس برای Desktop/Mobile adapter نوشته می‌شود. هیچ کلاینت جدیدی نباید semantics متفاوتی برای task، Pomodoro، habit یا analytics ایجاد کند.

## 4. ترتیب اولویت محصول

### Must have

هسته task، سازمان‌دهی، تاریخ، reminder، offline-first، sync، search، recurrence پایه و Pomodoro پایه.

### Should have

calendar پیشرفته، tags، smart lists، analytics پایه، habit tracker، widget و import/export.

### Could have

collaboration، CalDAV، MCP، CLI، automation، location reminder و analytics پیشرفته.

### Won't have در MVP

قابلیت‌های اجتماعی گسترده، marketplace، AI assistant مستقل، اتوماسیون پیچیده و هر feature بدون معیار پذیرش.

## 5. قالب کار برای Agentها

```md
### Task: [شناسه] عنوان

- Stage: [فاز فعلی]
- Owner: [نام عامل]
- Inputs: [اسناد و قراردادهای خوانده‌شده]
- Scope: [فایل‌ها و رفتارهای مجاز]
- Acceptance: [معیارهای قابل بررسی]
- Validation: [دستورها و تست‌ها]
- Handoff: [گام بعد و مانع باقی‌مانده]
```

هر agent باید قبل از شروع `PROGRESS.md` را بررسی کند، از scope فاز خارج نشود و بعد از پایان همین قالب را در گزارش فعالیت ثبت کند.
