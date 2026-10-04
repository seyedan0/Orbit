import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../core/auth/session-context.js';

type AuthMode = 'signIn' | 'signUp';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function SignInPage() {
  const { session, signIn, signUp, isLoading, error: sessionError, clearError } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/inbox';

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (session !== undefined) {
    return <Navigate to={from} replace />;
  }

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('لطفاً ایمیل خود را وارد کنید.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setLocalError('فرمت ایمیل نامعتبر است.');
      return;
    }
    if (!password) {
      setLocalError('لطفاً رمز عبور را وارد کنید.');
      return;
    }

    if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
      return;
    }

    try {
      if (mode === 'signIn') {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(trimmedEmail, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
      if (msg.includes('already exists') || msg.includes('EMAIL_ALREADY_REGISTERED')) {
        setLocalError('این ایمیل قبلاً ثبت نام شده است.');
      } else if (msg.includes('Invalid email or password') || msg.includes('Unauthorized')) {
        setLocalError('ایمیل یا رمز عبور اشتباه است.');
      } else {
        setLocalError(msg);
      }
    }
  };

  const displayedError = localError || sessionError;

  return (
    <section className="card" aria-labelledby="auth-title">
      <h1 id="auth-title">Orbit</h1>

      <div className="auth-tabs" role="tablist" aria-label="انتخاب وضعیت ورود یا ثبت‌نام">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signIn'}
          className={`auth-tab ${mode === 'signIn' ? 'active' : ''}`}
          onClick={() => handleModeChange('signIn')}
          data-testid="tab-signin"
        >
          ورود
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signUp'}
          className={`auth-tab ${mode === 'signUp' ? 'active' : ''}`}
          onClick={() => handleModeChange('signUp')}
          data-testid="tab-signup"
        >
          ثبت‌نام
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {displayedError && (
          <div className="error-msg" role="alert" data-testid="auth-error">
            {displayedError}
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="auth-email" className="auth-label">
            ایمیل
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            required
            data-testid="input-email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password" className="auth-label">
            رمز عبور
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="••••••••"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            disabled={isLoading}
            required
            data-testid="input-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="auth-submit-btn"
          data-testid="auth-submit"
        >
          {isLoading
            ? mode === 'signIn'
              ? 'در حال ورود...'
              : 'در حال ثبت‌نام...'
            : mode === 'signIn'
              ? 'ورود به حساب'
              : 'ایجاد حساب کاربری'}
        </button>
      </form>
    </section>
  );
}
