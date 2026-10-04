# مدل داده و قرارداد دامنه

## 1. قواعد عمومی

- همه شناسه‌ها UUIDv4 و به‌صورت string ذخیره می‌شوند.
- زمان‌ها ISO 8601 با timezone صریح هستند؛ `timeZone` از IANA استفاده می‌کند.
- حذف رکورد soft delete است و با `deletedAt` مشخص می‌شود.
- رکوردهای حذف‌شده تا پایان پنجره tombstone (پیش‌فرض ۳۰ روز) برای سینک قابل مشاهده‌اند و پس از آن در تراکنش اتمیک پاک‌سازی می‌شوند.
- شناسه‌های پاک‌سازی‌شده در `cleaned_tombstones` ثبت می‌شوند تا امکان زنده شدن مجدد (resurrection) با جهش‌های دیرهنگام مسدود شود.
- `version` نسخه سروری رکورد است؛ نسخه محلی نباید جایگزین ترتیب mutation شود.

## 2. TaskEntity

```ts
export type TaskKind = "TASK" | "NOTE" | "CHECKLIST";
export type TaskPriority = 0 | 1 | 3 | 5;
export type LocalStatus = "SYNCED" | "CREATED" | "UPDATED" | "DELETED";

export interface SubTaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface TaskEntity {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content?: string;
  desc?: string;
  kind: TaskKind;
  priority: TaskPriority;
  isAllDay: boolean;
  allDay?: boolean;
  startDate?: string | null;
  dueDate?: string | null;
  timeZone: string;
  timezone?: string | null;
  repeatFlag?: string;
  reminders: string[];
  items: SubTaskItem[];
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  deletedAt?: string | null;
}
```

### قواعد زمان‌بندی و نگهداری Timestampها (P4-CAL-001)

- **استاندارد واحد ذخیره‌سازی و همگام‌سازی:** تمام مقادیر زمانی (`dueDate`، `startDate`، `createdAt`، `updatedAt`، `completedAt`، `deletedAt`) به صورت رشته‌های استاندارد UTC ISO-8601 (مانند `2026-10-05T14:30:00.000Z`) ذخیره و در سطح شبکه جابه‌جا می‌شوند تا سازگاری کامل همگام‌سازی و حل تعارض LWW حفظ شود.
- **پاک‌کردن تاریخ و زمان:** لغو یا پاک‌کردن تاریخ سررسید یا تاریخ شروع با مقدار صریح `null` در موجودیت و در payload جهش‌های جزئی (PARTIAL UPDATE) ثبت می‌شود (`{ dueDate: null }`) و دارای برچسب زمانی فیلد (`fieldTimestamps.dueDate`) است.
- **تسک‌های تمام‌روز (allDay / isAllDay):** در صورت فعال بودن `isAllDay`، ساعت و دقیقه بر روی بامداد (00:00:00) نرمال می‌شوند.
- **جداسازی نمایش تقویم از ذخیره‌سازی:** نمایش تاریخ‌ها در سیستم تقویم شمسی (جلالی / هجری خورشیدی) یا میلادی منحصراً در لایه رابط کاربری انجام می‌پذیرد و هیچ تغییری در فرمت ذخیره‌سازی زمان UTC ایجاد نمی‌کند.

## 3. ساختار سازمانی

- هر کاربر یک `Inbox` پیش‌فرض دارد.
- `Folder` فقط گروه‌بندی `List`هاست.
- `List` والد مستقیم task است و در `projectId` ذخیره می‌شود.
- انتقال task بین listها یک mutation تغییر `projectId` است.
- حذف folder یا list نباید بدون policy مشخص باعث حذف ضمنی task شود؛ این policy باید پیش از implementation در ADR ثبت شود.

## 4. invariantها

- `id`، `userId`، `projectId` و `title` در رکورد معتبر الزامی‌اند.
- `priority` فقط یکی از `0`، `1`، `3` و `5` است.
- `dueDate` نمی‌تواند از نظر زمانی قبل از `startDate` باشد، مگر اینکه policy اصلاح خودکار تصویب شود.
- `timeZone` باید نام معتبر IANA باشد.
- `items.order` در یک task باید قابل مرتب‌سازی و بدون وابستگی به ترتیب آرایه باشد.
- `completedAt` برای تسک‌های تکمیل‌شده حاوی زمان ISO 8601 است و برای تسک‌های باز null یا غایب است؛ موجودیت‌های `NOTE` فاقد این فیلد هستند.
- `deletedAt` برای رکورد `DELETED` الزامی و برای رکورد فعال null/غایب است.
- `updatedAt` باید برابر یا بعد از `createdAt` باشد.

## 5. موجودیت‌های زیرساختی MVP

### `sync_queue`

| فیلد             | توضیح                                           |
| ---------------- | ----------------------------------------------- |
| `id`             | شناسه mutation                                  |
| `entityId`       | شناسه رکورد هدف                                 |
| `entityType`     | نوع موجودیت، فعلاً `TASK`                       |
| `operation`      | `CREATE`، `UPDATE` یا `DELETE`                  |
| `payload`        | full یا partial payload نسخه‌شده                |
| `status`         | `PENDING`، `IN_FLIGHT`، `SUCCEEDED` یا `FAILED` |
| `attemptCount`   | تعداد تلاش                                      |
| `nextAttemptAt`  | زمان مجاز تلاش بعدی                             |
| `idempotencyKey` | کلید یکتا برای جلوگیری از اعمال تکراری          |
| `createdAt`      | ترتیب FIFO                                      |
| `lastError`      | خطای قابل نمایش برای diagnostics                |

### `sync_cursor`

برای هر user و scope، آخرین cursor موفق pull نگهداری می‌شود. cursor فقط پس از ذخیره اتمیک تغییرات دریافتی advance می‌شود.

### `cleaned_tombstones`

| فیلد        | نوع         | توضیح                                                                |
| ----------- | ----------- | -------------------------------------------------------------------- |
| `id`        | UUIDv4      | شناسه رکورد پاک‌سازی                                                 |
| `userId`    | VARCHAR     | شناسه کاربر مالک                                                     |
| `entityId`  | VARCHAR     | شناسه موجودیت (تسک) پاک‌سازی‌شده                                     |
| `deletedAt` | VARCHAR(64) | زمان اصلی حذف نرم (ISO 8601)                                         |
| `purgedAt`  | TIMESTAMPTZ | زمان پاک‌سازی فیزیکی رکورد از پایگاه داده                            |

- زوج `(userId, entityId)` یکتا (`UNIQUE`) است.
- وجود رکورد در این جدول نشان می‌دهد تسک منقضی و پاک شده و جهش‌های آینده برای آن باید `REJECTED` شوند.

## 6. migration و نسخه‌بندی

هر تغییر schema باید migration شماره‌دار، قابل اجرای دوباره و قابل بررسی روی دیتابیس خالی داشته باشد. تغییرات destructive بدون مسیر مهاجرت و ADR پذیرفته نیستند.
