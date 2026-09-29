import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../core/auth/session-context';

export function SignInPage() {
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/inbox';

  if (session !== undefined) return <Navigate to={from} replace />;

  return (
    <section className="card">
      <h1>ورود به Orbit</h1>
      <p>احراز هویت واقعی در فاز ۳ اضافه می‌شود. فعلاً یک نشست محلی در همین مرورگر ساخته می‌شود.</p>
      <button
        type="button"
        onClick={() => {
          signIn();
          navigate(from, { replace: true });
        }}
      >
        شروع با نشست محلی
      </button>
    </section>
  );
}
