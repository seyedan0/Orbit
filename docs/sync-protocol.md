# پروتکل همگام‌سازی

## 1. هدف

این سند قرارداد رفتار local-first بین کلاینت و سرور را تعریف می‌کند. transport می‌تواند در آینده HTTP یا WebSocket باشد، اما semantics این سند مستقل از transport است.

## 2. Mutation

هر mutation شامل این اطلاعات است:

```json
{
  "id": "mutation-uuid",
  "idempotencyKey": "mutation-uuid",
  "entityType": "TASK",
  "entityId": "task-uuid",
  "operation": "UPDATE",
  "baseVersion": 4,
  "payloadType": "PARTIAL",
  "payload": {
    "title": "عنوان جدید"
  },
  "fieldTimestamps": {
    "title": "2026-09-29T10:00:00.000Z"
  },
  "createdAt": "2026-09-29T10:00:00.000Z"
}
```

`idempotencyKey` باید در scope کاربر یکتا باشد. ارسال دوباره همان mutation باید همان نتیجه منطقی را برگرداند.

## 3. وضعیت‌های queue

- `PENDING`: آماده ارسال
- `IN_FLIGHT`: ارسال‌شده و منتظر پاسخ
- `SUCCEEDED`: با موفقیت تاییدشده
- `FAILED`: پس از خطای دائمی یا عبور از سقف retry

خطای موقت queue را به `PENDING` برمی‌گرداند و `nextAttemptAt` را با backoff افزایش می‌دهد. خطای اعتبارسنجی یا مجوز، دائمی فرض می‌شود و نیاز به اقدام کاربر دارد.

## 4. ترتیب و backoff

- ترتیب پایه FIFO بر اساس `createdAt` است.
- mutationهای یک entity نباید بدون policy مشخص از ترتیب منطقی خود عبور کنند.
- backoff نمایی با jitter استفاده می‌شود.
- سقف تلاش و سقف تأخیر باید configurable باشد.
- retry نباید mutation جدید تولید کند.

## 5. Push

درخواست push یک batch محدود از mutationهاست. سرور برای هر mutation یکی از پاسخ‌های زیر را برمی‌گرداند:

- `APPLIED`: اعمال شد.
- `ALREADY_APPLIED`: قبلاً با همان idempotency key اعمال شده بود.
- `CONFLICT_MERGED`: با قواعد field-level merge ادغام شد.
- `REJECTED`: payload یا مجوز نامعتبر است.
- `RETRYABLE_ERROR`: خطای موقت سرور.

## 6. Pull

درخواست pull شامل `cursor` و `limit` است. پاسخ باید شامل `changes`، `nextCursor` و `hasMore` باشد. کلاینت فقط پس از ذخیره موفق همه changes، cursor را commit می‌کند.

## 7. حل تعارض

- merge در سطح فیلد انجام می‌شود، نه با جایگزینی کل entity.
- برای هر فیلد قابل تعارض timestamp آن فیلد مقایسه می‌شود.
- timestamp جدیدتر برنده است؛ در برابری timestamp، شناسه mutation به‌عنوان tie-breaker ثابت استفاده می‌شود.
- حذف رکورد باید مانند یک تغییر دارای timestamp رفتار کند.
- merge باید deterministic و مستقل از ترتیب رسیدن پیام‌ها باشد.

## 8. بازیابی

- crash پیش از commit cursor نباید باعث از دست‌رفتن change شود؛ دریافت تکراری باید بی‌خطر باشد.
- mutation گیرکرده در `IN_FLIGHT` پس از timeout به `PENDING` برمی‌گردد.
- خطای دائمی باید در diagnostics محلی نگه داشته شود و قابل retry دستی باشد.
- پاک‌سازی tombstone فقط بعد از policy نگهداری و اطمینان از دریافت همه کلاینت‌های معتبر انجام می‌شود.
