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

- **مرحله:** فاز ۴، مدیریت زمان و تقویم
- **وضعیت:** در حال انجام (پیاده‌سازی Time Blocking و Drag & Drop در تقویم وب - P4-CAL-004)
- **اولویت کلاینت:** Web به‌عنوان اولین محصول قابل استفاده و مرجع رفتاری
- **خروجی اخیر:** پیاده‌سازی مسدودسازی زمان (Time Blocking)، کشیدن و رها کردن (Drag & Drop) در نماهای ماهانه و روزانه، تغییر مدت‌زمان تسک‌ها (Duration Resizing)، به‌روزرسانی خوش‌بینانه (<50ms) با بازگشت امن در صورت خطا و ذخیره‌سازی اتمیک با جهش‌های LWW (P4-CAL-004)
- **خروجی بعدی:** موتور تکرار تسک‌ها (Recurrence با قوانین ماه‌های شمسی و RRULE) یا یادآورها (Reminders)
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

- [x] authentication و session امن (سرور JWT، پاسپورت، مهاجرت رمز عبور، کلاینت وب و ارتباط سشن در هدرهای همگام‌سازی)
- [x] PostgreSQL schema و migration (مهاجرت‌های TypeORM، جداول کاربران، تسک‌ها و جهش‌ها)
- [x] mutation queue، idempotency و retry (پروتکل همگام‌سازی و جهش‌های اتمیک)
- [x] push، pull و cursor (اندپوینت‌های همگام‌سازی و کلاینت HTTP)
- [x] field-level conflict resolution (حل تعارض در سطح فیلد با استراتژی LWW و tie-breaker و وضعیت CONFLICT_MERGED)
- [x] tombstone و retention policy (نگهداری ۳۰ روزه، پاک‌سازی اتمیک و جلوگیری قطعی از احیای تسک در cleaned_tombstones)
- [x] recovery بعد از crash، timeout و نصب مجدد (بازیابی جهش‌های IN_FLIGHT، بازگشت امن به PENDING با backoff، حفظ کرسر و اتمیسیتی pull، سقف retry و ثبت FAILED برای خطاهای دائمی)
- telemetry حداقلی برای sync health

**دروازه خروج:** سناریوی دو دستگاه آفلاین/آنلاین بدون duplicate یا از دست‌رفتن تغییرات قبول می‌شود.

### فاز 4: مدیریت زمان و تقویم

**هدف:** تبدیل task manager به برنامه‌ریز روزانه با پشتیبانی کامل از تقویم شمسی و میلادی.

**کارها:**

- [x] پشتیبانی دوگانه از تقویم شمسی (Jalali / Solar Hijri) و میلادی (Gregorian) با امکان انتخاب پیش‌فرض در تنظیمات
- [x] تطبیق تقویم شمسی: شروع هفته از شنبه، نام ماه‌ها و روزهای فارسی، و مبدأ زمانی دقیق
- [x] ذخیره‌سازی داده‌های زمانی در سطح مدل و همگام‌سازی بر اساس استاندارد UTC / ISO-8601 و تبدیل بدون خطا در لایه کلاینت
- [x] کامپوننت‌های بصری تقویم و انتخاب‌گر تاریخ شمسی (Jalali Date/Time Picker) با تجربه کاربری روان (P4-CAL-001)
- [x] نماهای زمانی آماده: Today، Tomorrow، Upcoming و تقویم کامل
- [x] نماهای چندگانه تقویم: day / week / month / agenda با پشتیبانی از هر دو سیستم تقویمی (نماهای ماهانه، هفتگی، تایم‌لاین ساعتی روزانه و جریان ترتیبی دستورکار - P4-CAL-002 و P4-CAL-003)
- [x] start date، due date، duration و timezone در سطح مدل و سرویس‌های زمان‌بندی
- reminder در زمان مشخص و reminder بر اساس location در صورت امکان پلتفرم
- [x] موتور recurrence با استاندارد RRULE و پشتیبانی از قوانین تکرار ماه‌های شمسی (نظیر روز خاص در ماه شمسی، سال‌های کبیسه، روزهای کاری و چرخه تکمیل - P4-REC-001)
- natural language date parsing برای هر دو زبان فارسی و انگلیسی (عباراتی نظیر «فردا»، «شنبه بعد»، «tomorrow»)
- [x] drag-and-drop و time blocking برای جابه‌جایی و بلوک‌بندی زمانی تسک‌ها روی گرید تقویم (P4-CAL-004)
- [x] آزمون‌های جامع تبدیل تقویم، leap year (کبیسه شمسی و میلادی)، timezone و DST test suite (P4-CAL-001 و P4-REC-001)

**دروازه خروج:** یک task تکرارشونده و یک task بازه‌ای در هر دو تقویم شمسی و میلادی و در timezoneهای مختلف به درستی نمایش داده شده، ویرایش و sync می‌شوند.

### فاز 5: سازمان‌دهی، فیلترها و نماهای پیشرفته

**هدف:** پیدا کردن، اولویت‌بندی و مشاهده منعطف کارها در نماهای چندگانه.

**کارها:**

- tags و tag groups
- موتور فیلترهای هوشمند مبتنی بر JSON Rule DSL (ارزیابی ترکیبات پیچیده شرطی به صورت خنثی)
- smart lists نامحدود بر پایه فیلترهای هوشمند
- ماتریس آیزنهاور (Eisenhower Matrix) ۴ خانه به صورت Derived View بر پایه اولویت و سررسید
- تایم‌لاین و مینی‌گانت سبک (Timeline View) برای نمایش و تنظیم افقی مدت‌زمان تسک‌ها
- رتبه‌بندی کسری (LexoRank / Fractional Indexing) برای جابه‌جایی Drag & Drop بدون سنگین کردن تراکنش‌ها
- saved searches و تاریخچه جست‌وجو
- search چندفیلدی در title، content، tag، list و date
- فیلتر priority، status، assignee، due state و location
- sort و grouping پویا
- bulk edit، bulk complete و bulk move
- archive و trash قابل بازیابی
- import/export کنترل‌شده (پشتیبانی از فرمت‌های Todoist و TickTick)

**دروازه خروج:** نماهای ماتریس و تایم‌لاین بدون وابستگی به دیتابیس جداگانه و بر اساس مدل تسک رندر می‌شوند؛ queryهای فیلترهای هوشمند در هر سه کلاینت یکسان عمل می‌کنند.

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

### فاز 6.5: بازبینی جامع قابلیت‌ها، ارتقای دیزاین سیستم و بازطراحی UI/UX

**هدف:** تثبیت و پولیش محصول پس از تکمیل ۶ فاز اولیه، بازخورد کاربر، ایجاد دیزاین سیستم یکپارچه و بازطراحی بصری فرانت‌اند پیش از ورود به فازهای تحلیلی و عادت‌ها.

**کارها:**

- بازبینی سراسری تجربه کاربری (UX Audit) و جریان تعامل در تمام قابلیت‌های ساخته‌شده (Task, Sync, Calendar, Search, Pomodoro)
- تدوین Design System جامع Orbit (پالت رنگ‌های سازگار HSL، توکن‌های فاصله‌گذاری، تایپوگرافی مدرن فارسی و انگلیسی)
- پیاده‌سازی رسمی تم دارک و لایت (Dark & Light Mode) با تغییر آنی و ذخیره پایدار انتخاب کاربر
- پیاده‌سازی افکت‌های مدرن بصری (Glassmorphism، پس‌زمینه‌های بلورین و کنتراست ارگونومیک)
- بازطراحی و بازآرایی کامپوننت‌های بصری: سایدبار ناوبری، کارت‌های تسک، گرید تقویم، ویجت پومودورو، پنجره‌های مودال و پاپ‌اورها
- افزودن میکروانیمیشن‌های روان برای بازخورد تعاملی (تکمیل تسک، بازگشایی، درگ‌وان‌دراپ، سوئیچ بین نماها)
- ارتقای دسترس‌پذیری کامل (A11y: کنتراست WCAG، ناوبری کامل با کیبورد، برچسب‌های ARIA برای تمامی کنترل‌ها)
- بهینه‌سازی چیدمان و ریسپانسیو بودن در انواع ابعاد نمایشگر (دسکتاپ، لپ‌تاپ، تبلت و موبایل وب)

**دروازه خروج:** کلاینت وب دارای ظاهر بسیار مدرن و چشم‌نواز، پشتیبانی بدون باگ از تم تاریک/روشن، دسترسی‌پذیری کامل و رابط کاربری یکدست در تمام قابلیت‌های ۶ فاز اول است.

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
- ماژول بازبینی روزانه (Daily Review) برای مرور وضعیت شبانه و انتخاب اولویت‌های فردا
- ماژول بازبینی هفتگی (Weekly Review) برای تحلیل دستاوردها و تراز بار کاری هفته بعد
- شاخص بدهی بهره‌وری (Task Debt): تشخیص و پیشنهاد اقدام برای تسک‌هایی با بیش از ۳ بار جابه‌جایی
- هشدار برنامه‌ریزی صادقانه (Honest Capacity Warning): آگاه‌سازی کاربر در صورت چیدن کار فراتر از ساعت‌های آزاد تقویم

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

### فاز 10: یکپارچه‌سازی، هوش مصنوعی متن‌باز و اتوماسیون

**هدف:** اتصال Orbit به اکوسیستم ابزارها و تجهیز به هوش مصنوعی باز، آزاد و کارآمد.

**کارها:**

- calendar دوطرفه از طریق استانداردهای باز (CalDAV و iCal subscription)
- درگاه هوش مصنوعی BYOK (Bring Your Own Key): اتصال به Gemini، OpenAI، Groq و OpenRouter در کلاینت بدون تحمیل هزینه سروری به پروژه
- پشتیبانی از هوش مصنوعی محلی آفلاین: اتصال کلاینت دسکتاپ/وب به Ollama / LM Studio برای پردازش محلی حریم‌خصوصی‌محور
- AI Brain Dump: تبدیل یادداشت‌های متنی یا صوتی ساختارنیافته به تسک با استخراج تاریخ، اولویت و تگ
- AI Weekly Planner: پیشنهاد زمان‌بندی هفتگی متوازن در تقویم بر اساس تسک‌های عقب‌افتاده با تایید کاربر
- سرور داخلی MCP (Model Context Protocol): تعامل دوجانبه با عامل‌های دسکتاپ نظیر Claude Desktop و Cursor
- import/export استاندارد
- CLI و اتوماسیون برای Power Users
- URL Scheme و x-callback-url
- webhook و API token
- widget و quick capture
- share extension و deep link

**دروازه خروج:** هر integration قرارداد versionدار، rate limit، revoke و failure recovery دارد؛ موتور AI با تایید کاربر عمل کرده و بدون اینترنت یا کلید خارجی نیز اختلالی در عملکرد نرم‌افزار ایجاد نمی‌کند.

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
