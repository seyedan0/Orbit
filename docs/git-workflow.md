# راهبرد Git و مدیریت کار Orbit

## 1. هدف

این سند قرارداد مشترک انسان‌ها و Agentها برای branch، commit، pull request، issue و release است. وضعیت فازها در `PROGRESS.md` و تصمیم‌های معماری در `docs/decisions.md` نگهداری می‌شوند.

## 2. Branchهای اصلی

| Branch | کاربرد | قانون ورود |
| --- | --- | --- |
| `main` | نسخه پایدار و قابل انتشار | فقط از `develop` با PR تاییدشده |
| `develop` | integration فاز جاری | فقط از feature/fix/docs با PR |
| `feature/*` | قابلیت جدید یا vertical slice | از `develop` ساخته شود |
| `fix/*` | رفع باگ عادی | از `develop` ساخته شود |
| `hotfix/*` | اصلاح فوری production | از `main` ساخته و بعد به `main` و `develop` merge شود |
| `docs/*` | تغییر مستندات مستقل | از `develop` ساخته شود |
| `chore/*` | tooling، CI و نگهداری | از `develop` ساخته شود |
| `release/*` | آماده‌سازی نسخه | از `develop` ساخته و فقط برای release metadata استفاده شود |

### Branchهای موجود

- `main`: پایه پایدار فعلی
- `develop`: integration فعلی
- `feature/web-foundation`: کار فعال Web و اولین کلاینت محصول

Branchهای مربوط به Pomodoro، analytics، Android و Desktop تا شروع واقعی کار ساخته نمی‌شوند. الگوی ساخت آن‌ها:

```powershell
git switch develop
git pull --ff-only
git switch -c feature/pomodoro-web
git push -u origin feature/pomodoro-web
```

## 3. قوانین branch

- نام branch با حروف کوچک و kebab-case باشد.
- هر branch یک هدف واحد و یک issue/task مشخص داشته باشد.
- branch بیشتر از چند روز بدون handoff یا PR باز نماند.
- مستقیم روی `main` و `develop` commit نکنید.
- قبل از شروع، branch را از پایه به‌روز کنید:

```powershell
git switch develop
git pull --ff-only
git switch -c feature/<short-name>
```

- قبل از PR:

```powershell
git fetch origin
git rebase origin/develop
git status
npm ci
npm run typecheck
```

- force push روی branch مشترک ممنوع است. روی branch شخصی فقط با `--force-with-lease` مجاز است.

## 4. Conventional Commits

فرمت commit:

```text
<type>(<scope>): <imperative summary>
```

typeهای مجاز:

- `feat`: قابلیت جدید
- `fix`: رفع باگ
- `docs`: مستندات
- `refactor`: تغییر ساختار بدون تغییر رفتار
- `test`: تست
- `chore`: tooling یا نگهداری
- `ci`: pipeline
- `perf`: بهبود عملکرد
- `build`: build و dependency

نمونه:

```text
feat(web): add task capture shell
fix(sync): preserve cursor after retry
```

Commit باید کوچک، buildable و قابل توضیح باشد. commitهای موقت مانند `wip` فقط پیش از squash در branch شخصی مجازند.

## 5. Issue و task management

هر task باید این فیلدها را داشته باشد:

- **ID:** شناسه issue یا task
- **Stage:** فاز `project-plan.md`
- **Type:** feature، bug، docs، chore یا research
- **Owner:** انسان یا Agent مسئول
- **Scope:** فایل‌ها/پکیج‌های مجاز
- **Acceptance:** معیار قابل تست
- **Dependencies:** وابستگی‌ها و blockerها
- **Branch:** branch کاری
- **Validation:** دستورها و تست‌های لازم
- **Handoff:** ادامه کار و وضعیت باقی‌مانده

وضعیت‌های مجاز:

`Backlog` -> `Ready` -> `In Progress` -> `In Review` -> `Validated` -> `Done`

اگر blocker وجود دارد، وضعیت `Blocked` و دلیل دقیق آن ثبت شود؛ کار silently متوقف نمی‌شود.

## 6. Pull Request

هر PR باید:

- به یک issue/task وصل باشد.
- یک هدف و scope مشخص داشته باشد.
- تست یا دلیل عدم امکان تست را اعلام کند.
- تغییرات migration/API/ADR را لینک کند.
- تغییرات خارج از scope را شامل نکند.
- `npm run typecheck` و تست مرتبط را پاس کرده باشد.
- برای تغییر رفتار، معیار پذیرش و روش بررسی دستی داشته باشد.

ترتیب merge:

1. `feature/*` به `develop`
2. `develop` به `main` برای release
3. `hotfix/*` به `main` و سپس back-merge به `develop`

روش پیش‌فرض merge، squash merge با یک Conventional Commit معتبر است.

## 7. نقش Agentها

هر Agent قبل از کار:

1. `PROGRESS.md`، `docs/project-plan.md` و سند تخصصی را بخواند.
2. branch موجود و وضعیت Git را بررسی کند.
3. task و acceptance را مشخص کند.
4. از branch کاری دیگر Agentها استفاده نکند.

هر Agent بعد از کار:

1. validation را اجرا کند.
2. فایل‌ها و تصمیم‌های تغییرکرده را ثبت کند.
3. `PROGRESS.md` را با branch، commit/PR، validation و handoff به‌روزرسانی کند.
4. اگر کار ناتمام است، branch را پاک نکند و blocker را ثبت کند.

## 8. Release و tag

- نسخه‌ها از `main` با Semantic Versioning tag می‌شوند: `vMAJOR.MINOR.PATCH`.
- `MAJOR`: breaking change در API یا data contract.
- `MINOR`: قابلیت backward-compatible.
- `PATCH`: bugfix یا تغییر مستندات بدون تغییر قرارداد.
- release notes باید migration، تغییر API، known issue و rollback را ذکر کند.

## 9. ممنوعیت‌ها

- commit کردن secret، token، database dump یا داده واقعی کاربر.
- merge کردن کد بدون validation.
- تغییر مستقیم `PROGRESS.md` برای پنهان‌کردن blocker.
- ساخت branch بلندمدت برای قابلیت‌هایی که هنوز در roadmap فعال نشده‌اند.
- تغییر قرارداد عمومی بدون ADR، تست مصرف‌کننده و migration/compatibility plan.
