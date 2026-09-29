# قرارداد API سینک

> این سند قرارداد منطقی MVP است. جزئیات framework، ORM و روش احراز هویت باید بدون تغییر semantics در implementation ثبت شوند.

## قواعد عمومی

- Base URL نسخه‌دار است، مانند `/api/v1`.
- پاسخ خطا دارای `code`، `message` و `requestId` است.
- `userId` از هویت درخواست استخراج می‌شود و از body پذیرفته نمی‌شود.
- payloadها JSON و تاریخ‌ها ISO 8601 هستند.
- تمام endpointهای داده‌ای idempotency یا cursor semantics مشخص دارند.

## GET `/health`

برای health check سرویس استفاده می‌شود و نباید داده کاربر برگرداند.

نمونه پاسخ موفق:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## POST `/sync/push`

برای ارسال batch mutationهای محلی.

نمونه درخواست:

```json
{
  "mutations": [
    {
      "id": "mutation-uuid",
      "idempotencyKey": "mutation-uuid",
      "entityType": "TASK",
      "entityId": "task-uuid",
      "operation": "UPDATE",
      "baseVersion": 1,
      "payloadType": "PARTIAL",
      "payload": { "title": "عنوان جدید" },
      "fieldTimestamps": {
        "title": "2026-09-29T10:00:00.000Z"
      },
      "createdAt": "2026-09-29T10:00:00.000Z"
    }
  ]
}
```

پاسخ باید برای هر mutation یک نتیجه مستقل با `status` یکی از `APPLIED`، `ALREADY_APPLIED`، `CONFLICT_MERGED`، `REJECTED` یا `RETRYABLE_ERROR` برگرداند.

## GET `/sync/pull`

پارامترها:

- `cursor`: cursor آخرین pull موفق، برای pull اولیه خالی.
- `limit`: تعداد محدود تغییرات.

نمونه پاسخ:

```json
{
  "changes": [],
  "nextCursor": "cursor-value",
  "hasMore": false
}
```

کلاینت فقط بعد از ذخیره موفق `changes` باید `nextCursor` را ثبت کند.

## خطاها

| کد                     | معنی                   | رفتار کلاینت                              |
| ---------------------- | ---------------------- | ----------------------------------------- |
| `VALIDATION_ERROR`     | payload نامعتبر        | mutation را failed و قابل اصلاح نمایش دهد |
| `UNAUTHORIZED`         | هویت نامعتبر           | session را بررسی کند                      |
| `FORBIDDEN`            | دسترسی ناکافی          | retry خودکار نکند                         |
| `IDEMPOTENCY_CONFLICT` | کلید با payload متفاوت | mutation را متوقف و diagnostics ثبت کند   |
| `RATE_LIMITED`         | محدودیت درخواست        | با backoff retry کند                      |
| `INTERNAL_ERROR`       | خطای موقت سرور         | با backoff retry کند                      |
