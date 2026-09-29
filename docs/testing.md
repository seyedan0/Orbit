# راهبرد تست

## هرم تست

### Unit

برای `shared-types` و `sync-engine`:

- اعتبارسنجی kind و priority
- invariantهای TaskEntity
- تولید mutation
- FIFO و وضعیت‌های queue
- exponential backoff و jitter
- idempotency
- merge سطح فیلد
- soft delete و tombstone

### Integration

- migration از دیتابیس خالی
- ذخیره اتمیک entity و queue
- push و pull با PostgreSQL
- retry بعد از قطع شبکه
- تکرار safe یک mutation
- advance شدن cursor فقط بعد از commit

### End-to-end

- ایجاد TASK، NOTE و CHECKLIST آفلاین
- ویرایش روی دو کلاینت و ادغام
- تکمیل checklist در یک دستگاه و تغییر title در دستگاه دیگر
- حذف آفلاین و مشاهده حذف در دستگاه دیگر
- restart برنامه در میانه sync

## سناریوهای حداقلی پذیرش

1. کاربر بدون شبکه یک TASK ایجاد می‌کند؛ پس از اتصال رکورد دقیقاً یک‌بار در سرور ثبت می‌شود.
2. یک mutation در پاسخ timeout می‌گیرد؛ retry آن duplicate ایجاد نمی‌کند.
3. دو کلاینت title و completion را هم‌زمان تغییر می‌دهند؛ هر دو تغییر باقی می‌مانند.
4. pull وسط دریافت crash می‌کند؛ اجرای مجدد از cursor قبلی داده‌ای را از دست نمی‌دهد.
5. priority نامعتبر، timezone نامعتبر و dueDate قبل از startDate رد می‌شوند.

## دروازه کیفیت

قبل از merge هر تغییر مرتبط با هسته باید typecheck، lint، unit test و تست مرتبط integration را پاس کند. تغییر قرارداد عمومی بدون تست مصرف‌کننده پذیرفته نیست.
