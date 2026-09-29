# امنیت

## محدوده MVP

احراز هویت کامل هنوز باید در ADR جداگانه تصویب شود، اما تمام APIها باید از ابتدا طوری طراحی شوند که `userId` از هویت معتبر درخواست بیاید و از payload قابل اعتماد نباشد.

## تهدیدهای اصلی

- دسترسی کاربر به داده user دیگر
- replay کردن mutation
- افشای token در log یا مخزن
- payload مخرب یا بیش از حد بزرگ
- دست‌کاری local store یا backup
- حمله به endpointهای push/pull

## کنترل‌های الزامی

- ارتباط production فقط روی TLS.
- اعتبارسنجی schema برای تمام ورودی‌های API.
- محدودیت اندازه batch و payload.
- idempotency برای جلوگیری از replay اثرگذار.
- rate limit روی push و pull.
- جداسازی tenant بر اساس user identity در queryهای سرور.
- عدم ثبت secret، token و محتوای حساس در log.
- مدیریت secret با environment یا secret manager، نه فایل commit‌شده.
- migrationها با حداقل دسترسی اجرا شوند.
- خطاهای API جزئیات داخلی دیتابیس را افشا نکنند.

## داده محلی

داده local store ممکن است شامل محتوای شخصی باشد. رمزنگاری در حالت استراحت، مخصوصاً برای Android و backup دسکتاپ، باید قبل از release production ارزیابی و در ADR ثبت شود.

## بررسی امنیتی پیش از انتشار

- تست مجوز برای دسترسی cross-user.
- بررسی replay و idempotency.
- بررسی logها برای secret و محتوای حساس.
- dependency audit.
- بررسی backup و حذف امن داده.
