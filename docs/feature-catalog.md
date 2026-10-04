# کاتالوگ قابلیت‌های Orbit

این سند فهرست محصول است و برای جلوگیری از فراموش‌شدن قابلیت‌های یک task manager کامل نوشته شده. وجود قابلیت در این فهرست به معنی ورود آن به MVP نیست؛ ستون مرحله تعیین می‌کند چه زمانی طراحی و پیاده‌سازی شود.

## 1. هسته task و note

| قابلیت             | مرحله | توضیح                                 |
| ------------------ | ----- | ------------------------------------- |
| TASK               | 2     | عنوان، توضیح، وضعیت، اولویت و زمان    |
| NOTE               | 2     | محتوای آزاد بدون الزام completion     |
| CHECKLIST          | 2     | task با itemهای مرتب و قابل تکمیل     |
| Subtask            | 2     | شکستن کار به فرزندان و نمایش progress |
| Inbox              | 2     | محل capture سریع و پیش‌فرض            |
| List و Folder      | 2     | سازمان‌دهی سلسله‌مراتبی               |
| complete/reopen    | 2     | تکمیل، بازگشایی و timestamp تکمیل     |
| archive/trash      | 5     | جداسازی داده فعال از حذف‌شده          |
| duplicate/template | 5     | ایجاد task از نمونه                   |
| attachment         | 9     | فایل، تصویر، لینک و policy حجم        |
| comments/activity  | 9     | همکاری و audit trail                  |

## 2. زمان، تقویم و reminder

| قابلیت                  | مرحله | توضیح                                   |
| ----------------------- | ----- | --------------------------------------- |
| start/due date          | 2     | تاریخ شروع و سررسید مستقل               |
| duration                | 4     | زمان برنامه‌ریزی‌شده برای time blocking |
| all-day                 | 2     | task بدون ساعت محلی                     |
| timezone                | 2     | ذخیره IANA و تست DST                    |
| تقویم شمسی (Jalali)     | 4     | پشتیبانی کامل از تاریخ و ماه‌های شمسی، شروع هفته از شنبه و سوئیچ با میلادی |
| Jalali Date/Time Picker | 4     | کامپوننت انتخاب تاریخ و ساعت شمسی با طراحی مدرن و واکنش‌گرا |
| recurrence              | 4     | RRULE، exception، occurrence و تطبیق با ماه‌های شمسی |
| reminder                | 4     | زمان‌بندی reminder قابل sync            |
| smart date input        | 4     | تفسیر عبارات فارسی و انگلیسی (فردا، شنبه، tomorrow) |
| Today/Tomorrow/Upcoming | 4     | نماهای زمانی آماده                      |
| calendar day/week/month | 4     | مشاهده و جابه‌جایی زمانی در تقویم شمسی/میلادی |
| agenda                  | 4     | فهرست زمانی فشرده                       |
| location reminder       | 10    | فقط پس از ارزیابی محدودیت پلتفرم        |

## 3. سازمان‌دهی و جست‌وجو

| قابلیت             | مرحله | توضیح                                     |
| ------------------ | ----- | ----------------------------------------- |
| priority 0/1/3/5   | 2     | نگاشت سازگار با TickTick                  |
| tags               | 5     | برچسب task و note                         |
| tag groups         | 5     | دسته‌بندی برچسب‌ها                        |
| filters            | 5     | ترکیب شرط‌های وضعیت، زمان، priority و tag |
| smart lists        | 5     | فهرست ذخیره‌شده بر اساس query             |
| full-text search   | 5     | title، content، list، tag و date          |
| sort/group         | 5     | مرتب‌سازی و گروه‌بندی قابل تنظیم          |
| bulk actions       | 5     | تغییر چند رکورد هم‌زمان                   |
| Eisenhower matrix  | 5     | نمایش بر اساس اهمیت و فوریت               |
| calendar filters   | 4     | محدودکردن رویدادهای قابل نمایش            |
| quick capture      | 2     | ایجاد سریع از هر کلاینت                   |
| keyboard shortcuts | 11    | بهره‌وری Desktop                          |

## 4. Focus و Pomodoro

| قابلیت                  | مرحله | توضیح                                       |
| ----------------------- | ----- | ------------------------------------------- |
| focus از task           | 6     | شروع timer با context مشخص                  |
| work interval           | 6     | طول قابل تنظیم کار                          |
| short break             | 6     | استراحت کوتاه بین intervalها                |
| long break              | 6     | استراحت دوره‌ای پس از چند interval          |
| cycle count             | 6     | شمارش چرخه‌های کامل                         |
| pause/resume/skip/reset | 6     | کنترل کامل timer                            |
| background timer        | 6     | رفتار مشخص در minimize و sleep              |
| sound/notification      | 6     | هشدار پایان interval                        |
| focus mode              | 6     | نمایش context و کاهش distraction            |
| session history         | 6     | ثبت started، completed، skipped و cancelled |
| session sync            | 6     | sync با idempotency و عدم double count      |
| focus by task/list/tag  | 8     | گزارش زمان تمرکز                            |
| daily focus goal        | 8     | هدف اختیاری بدون جریمه                      |

## 5. عادت‌ها

| قابلیت             | مرحله | توضیح                         |
| ------------------ | ----- | ----------------------------- |
| daily/weekly habit | 7     | هدف تکرارشونده                |
| completion و skip  | 7     | ثبت رخداد با policy مشخص      |
| streak             | 7     | زنجیره بر اساس timezone کاربر |
| completion rate    | 7     | درصد انجام در بازه            |
| heatmap            | 7     | نمایش روزهای انجام‌شده        |
| habit reminder     | 7     | reminder مستقل از task        |
| habit-task link    | 7     | ارتباط اختیاری با task        |

## 6. تحلیل و گزارش

| قابلیت                    | مرحله | توضیح                                     |
| ------------------------- | ----- | ----------------------------------------- |
| task completed trend      | 8     | روند تکمیل در زمان                        |
| overdue trend             | 8     | تغییرات کارهای عقب‌افتاده                 |
| completion rate           | 8     | completed / due یا created با فرمول مستند |
| time to complete          | 8     | فاصله ایجاد تا تکمیل                      |
| planned vs actual         | 8     | duration برنامه‌ریزی‌شده در برابر focus   |
| focus duration            | 8     | مجموع زمان sessionهای معتبر               |
| pomodoro count            | 8     | چرخه‌های کامل و ناقص                      |
| productivity by hour/day  | 8     | با timezone انتخابی                       |
| list/folder/tag breakdown | 8     | توزیع کار و تمرکز                         |
| priority breakdown        | 8     | تعادل urgency و importance                |
| habit streak/report       | 8     | روند استمرار                              |
| weekly review             | 8     | خلاصه قابل اقدام، نه امتیاز مبهم          |
| CSV/JSON export           | 8     | خروجی قابل بررسی کاربر                    |
| privacy controls          | 8     | حذف یا محدودکردن analytics                |

## 7. تجربه کاربری و پلتفرم

| قابلیت                | مرحله | توضیح                               |
| --------------------- | ----- | ----------------------------------- |
| Web                   | 1/11  | اولین کلاینت و مرجع رفتاری          |
| Windows/Linux Desktop | 1/11  | پس از تثبیت Web با Tauri + React    |
| Android               | 1/11  | پس از تثبیت Web با React Native     |
| responsive layout     | 1/11  | ابتدا برای Web و سپس سایر کلاینت‌ها |
| dark/light theme      | 11    | تنظیم قابل sync                     |
| localization          | 11    | فارسی، انگلیسی و localeهای بعدی     |
| accessibility         | 1/11  | ابتدا Web، سپس parity پلتفرم‌ها     |
| widget                | 10    | quick capture و Today               |
| notification          | 4/6   | reminder و focus                    |
| share/quick action    | 10    | ورود سریع محتوا                     |
| offline indicator     | 3     | وضعیت sync قابل فهم                 |
| import/export         | 5/10  | جلوگیری از قفل‌شدن داده             |

## 8. همکاری و اتصال

| قابلیت            | مرحله | توضیح                    |
| ----------------- | ----- | ------------------------ |
| account/session   | 3     | هویت امن                 |
| shared list       | 9     | همکاری چندکاربره         |
| roles/permissions | 9     | کنترل دسترسی             |
| assignment        | 9     | مسئول task               |
| activity log      | 9     | تاریخچه تغییرات          |
| CalDAV            | 10    | تقویم شخص ثالث           |
| MCP               | 10    | اتصال عامل‌های AI        |
| CLI               | 10    | automation و power users |
| API token/webhook | 10    | اتصال سرویس‌ها           |
| URL Scheme        | 10    | deep link و automation   |

## 9. قواعد اضافه‌کردن قابلیت

هر ردیف پیش از implementation باید این موارد را داشته باشد:

- user story و دلیل محصولی
- مالک و فاز هدف
- تغییرات model و migration
- API یا event contract
- حالت آفلاین و رفتار sync
- permission و privacy impact
- تست و معیار پذیرش
- تصمیم درباره analytics و retention
