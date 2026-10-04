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

## مشاهده‌پذیری

حداقل metricها:

- تعداد mutationهای pending، failed و retry
- زمان آخرین sync موفق
- نرخ خطای push و pull
- اندازه batch و مدت پردازش
- تعداد conflict و rejected mutation
- lag مربوط به cursor

Logها باید دارای request id، user scope غیرحساس، mutation id و نتیجه باشند و محتوای خصوصی task را ثبت نکنند.

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

## Release checklist

- تست‌ها و typecheck موفق
- migration بررسی‌شده
- تغییرات API مستند
- متغیرهای محیطی در secret manager حاضر
- rollback plan آماده
- smoke test push/pull اجراشده
- به‌روزرسانی `PROGRESS.md` و changelog
