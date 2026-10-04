# عملیات و انتشار

## محیط‌ها

- **Local:** توسعه‌دهنده با سرویس‌های محلی و داده آزمایشی.
- **Test:** اجرای migration و تست integration روی دیتابیس جدا.
- **Staging:** نزدیک به production برای تست end-to-end.
- **Production:** داده واقعی، backup و monitoring اجباری.

## اجرای سرویس

هر سرویس باید health check داشته باشد. وضعیت healthy فقط زمانی اعلام می‌شود که dependencyهای ضروری، مخصوصاً PostgreSQL، آماده باشند.

## Migration

- migration در CI روی دیتابیس خالی و نسخه موجود آزمایش شود.
- migration production قبل از deploy application اجرا یا به‌صورت backward-compatible rollout شود.
- rollback destructive خودکار نیست و باید runbook داشته باشد.

## مشاهده‌پذیری و تله‌متری سلامت همگام‌سازی (Sync Health Telemetry)

موتور همگام‌سازی دارای رابط تله‌متری استاندارد و خنثی از ارائه‌دهنده (`SyncTelemetry`) است که رفتار پیش‌فرض آن بدون هزینه و بدون I/O (`NoopSyncTelemetry`) بوده و به هیچ ارائه‌دهنده یا SDK شخص ثالث وابسته نیست.

### جدول متریک‌های سلامت همگام‌سازی

| نام متریک | نوع | محدوده | شرح و کارکرد |
|---|---|---|---|
| `sync_cycle_started` | Counter | Runtime | تعداد چرخه‌های همگام‌سازی آغازشده. |
| `sync_cycle_completed` | Counter | Runtime | تعداد چرخه‌های همگام‌سازی که با موفقیت پایان یافته‌اند. |
| `sync_cycle_failed` | Counter | Runtime | تعداد چرخه‌های همگام‌سازی ناموفق (دارای برچسب `phase: PULL \| PUSH \| SYNC`). |
| `sync_duration_ms` | Histogram | Runtime | مدت زمان اجرای چرخه همگام‌سازی بر حسب میلی‌ثانیه. |
| `push_batch_size` | Gauge / Histogram | Runtime / API | تعداد جهش‌های ارسال‌شده در بسته push. |
| `pull_batch_size` | Gauge / Histogram | Runtime / API | تعداد تغییرات دریافت‌شده در پاسخ pull. |
| `pending_mutation_count` | Gauge | Local Queue | تعداد جهش‌های در صف انتظار برای ارسال. |
| `retry_count` | Counter | Runtime | تعداد تلاش‌های مجدد زمان‌بندی‌شده ناشی از خطای موقت شبکه یا سرور. |
| `in_flight_timeout_recovery_count` | Counter | Runtime | تعداد جهش‌های معلق در `IN_FLIGHT` که پس از timeout بازیابی شدند. |
| `failed_mutation_count` | Counter | Runtime | تعداد جهش‌هایی که به وضعیت دائمی `FAILED` منتقل شدند (سقف تلاش یا رد قطعی). |
| `rejected_mutation_count` | Counter | Runtime / API | تعداد جهش‌های ردشده توسط سرور (خطای ساختار، اعتبارسنجی یا انقضای tombstone). |
| `conflict_merged_count` | Counter | Runtime / Repository | تعداد جهش‌های ادغام‌شده با قاعده LWW در سطح فیلد بدون خطا. |
| `cursor_lag` | Gauge | Replication | تاخیر همگام‌سازی کرسر بر حسب ثانیه (عمر آخرین تغییر) یا فاصله شمارنده کرسر. |

### رویدادهای ساختاریافته (Structured Events)

علاوه بر متریک‌های عددی، رویدادهای زیر برای گردآورنده‌های تحلیلی ارسال می‌شوند:
- `sync_cycle_started`: شامل `syncId`، زمان آغاز، `userScope` و `requestId`.
- `sync_cycle_completed`: شامل خلاصه تمام شمارنده‌ها، مدت زمان و تاخیر کرسر.
- `sync_cycle_failed`: شامل شناسه، مدت زمان تا شکست، فاز خطا (`PULL` یا `PUSH`) و پیام خطا.
- `push_batch`: شامل اندازه بسته، تعداد موفق، ردشده، با تلاش مجدد، شناسه‌های جهش‌ها (`mutationIds`).
- `pull_batch`: شامل اندازه بسته، کرسر قبلی و جدید، پرچم `hasMore` و تاخیر کرسر.
- `in_flight_recovery`: شامل تعداد بازیابی‌شده‌ها، شکست‌خورده‌ها و دست‌نخورده‌ها.

### حریم خصوصی و امنیت لاگ‌ها و متریک‌ها

- **عدم ثبت محتوای کاربر:** عناوین تسک‌ها (`title`)، یادداشت‌ها، محتویات آیتم‌ها، چک‌لیست‌ها و payloadهای خام موجودیت‌ها اکیداً نباید در متریک‌ها، تگ‌ها یا لاگ‌های تله‌متری ثبت شوند.
- **شناسه‌های مجاز:** صرفاً شناسه‌های فنی غیرحساس شامل `syncId`، `requestId` (correlation ID)، `mutationId` (UUID یکتا) و `userScope` (شناسه غیرحساس یا هش‌شده کاربر) مجاز هستند.
- **تحمل خطای گردآورنده (Fail-Safe):** بروز هرگونه استثنا یا شکست در لایه تله‌متری توسط `SyncRuntime` مهار می‌شود و هرگز چرخه همگام‌سازی را متوقف یا با شکست مواجه نمی‌سازد.

### آستانه‌ها و هشدارهای عملیاتی (Operational Alert Thresholds)

| شناسه هشدار | شرط فعال‌سازی | سطح اهمیت | اقدام عملیاتی |
|---|---|---|---|
| `SyncHighFailureRate` | نرخ خطای چرخه > ۱۰٪ در ۵ دقیقه | بحرانی (Critical) | بررسی وضعیت سرویس سرور، اتصالات دیتابیس و شبکه کلاینت‌ها. |
| `SyncInFlightStall` | `in_flight_timeout_recovery_count > 10 / min` | اخطار (Warning) | بررسی کیفیت اتصال شبکه، پهنای باند و timeoutهای کلاینت. |
| `SyncMutationPermanentFailure` | `failed_mutation_count > 0` | اطلاع‌رسانی / اخطار | بررسی علت خطای دائمی در صف محلی یا کنسول پشتیبانی. |
| `SyncHighRejectionRate` | `rejected_mutation_count > 5 / min` | اخطار (Warning) | بررسی ناهماهنگی نسخه پروتکل، خطای اعتبارسنجی فرم‌ها یا باگ کلاینت. |
| `SyncCursorLagHigh` | `cursor_lag > 300s` | اخطار (Warning) | بررسی کندی pull در کلاینت یا حجم بالای تغییرات معوق سرور. |
| `SyncHighLatency` | `sync_duration_ms (p95) > 5000ms` | اخطار (Warning) | بهینه‌سازی کوئری‌های سرور، ایندکس‌های PostgreSQL یا اندازه دسته‌ها. |


## Backup و بازیابی

- PostgreSQL باید backup زمان‌بندی‌شده و تست restore داشته باشد.
- retention و RPO/RTO پیش از production تعیین شوند.
- backup شامل secret خام یا logهای حساس نباشد.

## نگهداری و پاک‌سازی Tombstone (Tombstone Retention & Maintenance)

- **سیاست نگهداری (Retention Period):** پیش‌فرض ۳۰ روز است تا دستگاه‌های با قطع موقت ارتباط بتوانند تغییرات حذف را همگام کنند.
- **اجرای دوره‌ای:** جاب نگهداری سرور (Cron یا Worker زمان‌بندی‌شده) باید به صورت روزانه متد `cleanTombstones` یا اندپوینت `POST /api/v1/sync/cleanup` را اجرا کند.
- **ایمنی و تراکنش:** فرآیند پاک‌سازی اتمیک و کاملاً Idempotent است؛ در صورت بروز هرگونه قطعی یا خطا در حین اجرای جاب، تراکنش به طور کامل Rollback می‌شود و اجرای مجدد آن هیچ تداخل یا خطایی ایجاد نمی‌کند.
- **متریک‌های پایش نگهداری:**
  - `tombstones_cleaned_count`: تعداد رکوردهای پاک‌شده در هر چرخه.
  - `cleanup_duration_ms`: مدت زمان اجرای تراکنش پاک‌سازی.
  - `resurrection_rejected_count`: تعداد جهش‌های نامعتبر ردشده که قصد احیای تسک منقضی داشته‌اند.

## راهنمای عملیاتی بازیابی همگام‌سازی (Sync Recovery Runbook)

### سناریو ۱: جهش‌های گیرکرده در وضعیت IN_FLIGHT
- **علت محتمل:** بسته شدن مرورگر در حین ارسال، کرش تب، قطع ناگهانی اینترنت، یا قطعی سمت شبکه.
- **رفتار خودکار سیستم:**
  - موتور `SyncRuntime` در آغاز چرخه push بعدی یا در آغاز کار، جهش‌های با عمر بیش از ۳۰ ثانیه (`inFlightTimeoutMs`) را شناسایی می‌کند.
  - این جهش‌ها با افزایش `attemptCount` و محاسبه backoff نمایی مجدداً به وضعیت `PENDING` برگردانده می‌شوند.
- **اقدام عملیاتی در صورت بروز اشکال مداوم:**
  - بررسی لاگ‌های کلاینت برای اطمینان از مقداردهی صحیح `inFlightSince`.
  - اجرای دستی `recoverInFlightMutations({ force: true })` از طریق کنسول یا ابزار عیب‌یابی کلاینت.

### سناریو ۲: جهش‌های با وضعیت FAILED (سقف تلاش یا رد شده)
- **علت محتمل:** خطای اعتبارسنجی payload، نقض محدودیت‌های امنیتی، تلاش برای احیای یک tombstone منقضی‌شده (`cleaned_tombstones`)، یا بیش از ۵ بار تلاش ناموفق پیاپی.
- **رفتار سیستم:**
  - جهش‌های `FAILED` هرگز به صورت خودکار دوباره ارسال نمی‌شوند تا از طوفان ترافیک روی سرور جلوگیری شود.
- **اقدام اپراتور/پشتیبانی:**
  - فیلد `lastError` در صف محلی بررسی شود.
  - در صورت موقت بودن علت و رفع آن، جهش می‌تواند به صورت دستی با ریست `status: 'PENDING'` و `attemptCount: 0` مجدداً در صف قرار گیرد.

### سناریو ۳: کرش در میانه چرخه Pull کلاینت
- **رفتار تضمین‌شده:**
  - ذخیره‌سازی کرسر (`saveCursor`) آخرین مرحله چرخه pull است.
  - در صورت قطع یا کرش قبل از ذخیره کرسر، کرسر روی موقعیت قبلی حفظ می‌شود. در pull بعدی، تغییرات دوباره دریافت و به علت ماهیت Upsert/LWW موجودیت‌ها، با ایمنی کامل و بدون دوگانگی اعمال می‌شوند.

### سناریو ۴: ارسال تکراری پس از راه‌اندازی مجدد سرور یا کلاینت
- **رفتار تضمین‌شده:**
  - تمامی جهش‌ها دارای `idempotencyKey` یکتا هستند.
  - در صورت دریافت جهشی که پیش‌تر روی سرور اعمال شده، سرور بدون تکرار تغییرات، پاسخ `ALREADY_APPLIED` برمی‌گرداند و کلاینت رکورد صف را به `SUCCEEDED` تغییر می‌دهد.

### متریک‌ها و آستانه‌های هشدار بازیابی (Recovery Metrics & Alerts)
- `sync_in_flight_timeout_count > 10 / min`: هشدار کندی شدید شبکه یا افتادن پکت‌ها.
- `sync_mutation_max_attempts_exceeded_total`: پایش جهش‌های شکست‌خورده نیازمند بررسی انسانی.
- `sync_cursor_lag_seconds > 300`: هشدار تاخیر غیرعادی در پیشروی کرسر کلاینت.

## Release checklist

- تست‌ها و typecheck موفق
- migration بررسی‌شده
- تغییرات API مستند
- متغیرهای محیطی در secret manager حاضر
- rollback plan آماده
- smoke test push/pull اجراشده
- به‌روزرسانی `PROGRESS.md` و changelog
