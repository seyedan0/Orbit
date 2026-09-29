# نقشه مستندات Orbit

این پوشه منبع دانش پایدار پروژه است. وضعیت روزانه و گزارش AIها در `PROGRESS.md` قرار می‌گیرد؛ تصمیم‌ها، قراردادها و قواعدی که باید در طول زمان قابل ارجاع باشند در این پوشه ثبت می‌شوند.

## اسناد اصلی

- [vision.md](vision.md): چشم‌انداز، محدوده MVP، نیازمندی‌ها و معیارهای پذیرش
- [architecture.md](architecture.md): معماری کلان، مرز سرویس‌ها و جریان داده
- [data-model.md](data-model.md): مدل داده و invariantهای موجودیت‌ها
- [sync-protocol.md](sync-protocol.md): قرارداد صف و پروتکل همگام‌سازی
- [decisions.md](decisions.md): تصمیم‌های معماری و فنی (ADR)
- [security.md](security.md): تهدیدها و کنترل‌های امنیتی
- [testing.md](testing.md): راهبرد تست و دروازه‌های کیفیت
- [operations.md](operations.md): محیط‌ها، استقرار، مشاهده‌پذیری و بازیابی
- [roadmap.md](roadmap.md): فازها و backlog محصول
- [project-plan.md](project-plan.md): برنامه کامل از کشف محصول تا انتشار production
- [feature-catalog.md](feature-catalog.md): کاتالوگ قابلیت‌های task manager، Pomodoro، عادت و تحلیل
- [glossary.md](glossary.md): واژه‌های مشترک دامنه و سینک
- [api/README.md](api/README.md): قرارداد HTTP API

## وضعیت سندها

| سند           | وضعیت        | مالک تصمیم  |
| ------------- | ------------ | ----------- |
| vision        | مبنا         | مالک محصول  |
| architecture  | در حال تثبیت | مالک فنی    |
| data-model    | پیشنهادی     | مالک فنی    |
| sync-protocol | پیشنهادی     | مالک فنی    |
| security      | پایه MVP     | مالک فنی    |
| testing       | پایه MVP     | تیم توسعه   |
| operations    | پایه MVP     | تیم زیرساخت |

## قواعد نگهداری

- هر سند یک موضوع، دامنه و وضعیت مشخص داشته باشد.
- تصمیم‌های پرهزینه یا برگشت‌ناپذیر در `decisions.md` ثبت شوند.
- تغییر قرارداد داده یا API باید هم‌زمان مستندات و تست‌های مربوط را به‌روزرسانی کند.
- اطلاعات موقت، کارهای روزانه و گزارش AIها فقط در `PROGRESS.md` ثبت شوند.
- اطلاعات محرمانه، token، password و داده واقعی کاربر در مخزن ثبت نشود.
- اصطلاحات فنی، نام فیلدها و وضعیت‌ها در همه اسناد دقیقاً یکسان نوشته شوند.
