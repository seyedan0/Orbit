# نقشه راه

## فاز صفر: قرارداد و مستندات

- [x] تعریف محدوده MVP
- [x] تعریف اصول معماری
- [x] تعریف مدل داده و پروتکل سینک
- [x] تعریف راهبرد امنیت، تست و عملیات
- [ ] بازبینی و تایید مالک محصول

## فاز یک: monorepo حداقلی

- [ ] package manager و workspace
- [ ] TypeScript پایه و quality scripts
- [ ] `packages/shared-types`
- [ ] interfaceهای storage و transport
- [ ] اسکلت server، desktop و mobile

## فاز دو: هسته local-first

- [ ] انتخاب SQLite یا WatermelonDB
- [ ] schema و migration محلی
- [ ] `sync_queue` و `sync_cursor`
- [ ] queue state machine و retry
- [ ] تست unit و integration

## فاز سه: سرور سینک

- [ ] PostgreSQL schema
- [ ] API push/pull
- [ ] idempotency
- [ ] field-level conflict resolution
- [ ] health check و observability

## فاز چهار: تجربه محصول

- [ ] Inbox، List و Folder
- [ ] مدیریت TASK، NOTE و CHECKLIST
- [ ] اولویت و تاریخ
- [ ] UI مشترک و accessibility
- [ ] تست end-to-end روی سه پلتفرم

## بعد از MVP

- [ ] TickTick MCP و CLI
- [ ] CalDAV
- [ ] x-callback-url و URL Scheme
- [ ] recurrence پیشرفته
- [ ] attachment و قابلیت‌های اشتراکی
