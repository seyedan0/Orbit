import { useSession } from '../../../core/auth/session-context';

export function SettingsPage() {
  const { session } = useSession();
  return (
    <section>
      <h1>تنظیمات</h1>
      <p>شناسه نشست محلی: {session?.userId}</p>
    </section>
  );
}
