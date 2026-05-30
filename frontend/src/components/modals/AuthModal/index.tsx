import React, { useState, useRef, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import styles from './AuthModal.module.css';

type AuthScreen = 'login' | 'signup' | 'forgot' | 'otp';

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v4M12 16h.01"/>
  </svg>
);

const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

function Wordmark() {
  return (
    <div className={styles.wordmark} data-testid="auth-wordmark">
      <span className={styles.wordmarkLead}>V</span>erita
    </div>
  );
}

export default function AuthModal() {
  const { isOpen, activeTab, close, open } = useAuthModal();
  const { login, signup } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [otpFocus, setOtpFocus] = useState(-1);
  const otpRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  function resetAll() {
    setScreen('login');
    setEmail('');
    setPassword('');
    setUsername('');
    setShowPassword(false);
    setError('');
    setForgotEmail('');
    setOtpDigits(Array(6).fill(''));
    setOtpFocus(-1);
  }

  function handleOpenChange(o: boolean) {
    if (o) {
      resetAll();
      setScreen(activeTab);
    } else {
      close();
      resetAll();
    }
  }

  function switchTo(s: AuthScreen) {
    setError('');
    setScreen(s);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      close();
      resetAll();
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(username, email, password);
      close();
      resetAll();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const next = [...otpDigits];
    next[i] = char;
    setOtpDigits(next);
    if (i < 5) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...otpDigits];
      if (next[i]) {
        next[i] = '';
        setOtpDigits(next);
      } else if (i > 0) {
        next[i - 1] = '';
        setOtpDigits(next);
        otpRefs.current[i - 1]?.focus();
      }
    }
  }

  function renderTabs(active: 'login' | 'signup') {
    return (
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${active === 'login' ? styles.activeTab : ''}`}
          data-testid="tab-login"
          onClick={() => { open('login'); switchTo('login'); }}
        >
          Log in
        </button>
        <button
          className={`${styles.tab} ${active === 'signup' ? styles.activeTab : ''}`}
          data-testid="tab-signup"
          onClick={() => { open('signup'); switchTo('signup'); }}
        >
          Sign up
        </button>
      </div>
    );
  }

  function renderLogin() {
    return (
      <div data-testid="login-screen">
        <Wordmark />
        {renderTabs('login')}
        <form onSubmit={handleLogin} className={styles.formBody}>
          <div className={styles.field}>
            <div className={styles.fieldHeader}><span>Email</span></div>
            <div className={styles.fieldBox}>
              <input
                className={styles.fieldInput}
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <span>Password</span>
              <button
                type="button"
                data-testid="forgot-link"
                style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => switchTo('forgot')}
              >
                Forgot password?
              </button>
            </div>
            <div className={`${styles.fieldBox} ${error ? styles.fieldBoxError : ''}`}>
              <input
                className={styles.fieldInput}
                type={showPassword ? 'text' : 'password'}
                data-testid="password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.fieldEye}
                data-testid="toggle-password"
                tabIndex={-1}
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {error && (
              <div className={styles.fieldError}>
                <WarnIcon />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button className={styles.cta} type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>

          <div className={styles.switchLink}>
            No account?{' '}
            <button
              type="button"
              className={styles.switchLinkBtn}
              data-testid="switch-to-signup"
              onClick={() => { open('signup'); switchTo('signup'); }}
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderSignup() {
    return (
      <div data-testid="signup-screen">
        <Wordmark />
        {renderTabs('signup')}
        <form onSubmit={handleSignup} className={styles.formBody}>
          <div className={styles.field}>
            <div className={styles.fieldHeader}><span>Username</span></div>
            <div className={styles.fieldBox}>
              <input
                className={styles.fieldInput}
                type="text"
                placeholder="3–20 chars, letters / numbers / _"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                minLength={3}
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}><span>Email</span></div>
            <div className={styles.fieldBox}>
              <input
                className={styles.fieldInput}
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}><span>Password</span></div>
            <div className={styles.fieldBox}>
              <input
                className={styles.fieldInput}
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className={styles.fieldHint}>
              Use 8 or more characters with a mix of letters and numbers.
            </div>
          </div>

          {error && (
            <div className={styles.fieldError}>
              <WarnIcon />
              <span>{error}</span>
            </div>
          )}

          <button className={styles.cta} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div className={styles.terms} data-testid="signup-terms">
            By signing up you agree to our{' '}
            <span className={styles.termsLink}>Terms</span> and{' '}
            <span className={styles.termsLink}>Privacy Policy</span>.
          </div>

          <div className={styles.switchLink}>
            Already have an account?{' '}
            <button
              type="button"
              className={styles.switchLinkBtn}
              data-testid="switch-to-login"
              onClick={() => { open('login'); switchTo('login'); }}
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderForgot() {
    return (
      <div data-testid="forgot-screen">
        <button
          className={styles.backLink}
          data-testid="back-to-login"
          onClick={() => switchTo('login')}
        >
          <BackArrow />
          Back to log in
        </button>
        <Wordmark />
        <div className={styles.forgotTitle}>Reset your password</div>
        <div className={styles.forgotDesc}>
          Enter your account email and we'll send a link to reset your password.
        </div>
        <form style={{ marginTop: '20px' }} onSubmit={(e) => { e.preventDefault(); switchTo('otp'); }}>
          <div className={styles.field}>
            <div className={styles.fieldHeader}><span>Email</span></div>
            <div className={styles.fieldBox}>
              <input
                className={styles.fieldInput}
                type="email"
                placeholder="you@domain.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <button
            className={styles.cta}
            type="submit"
            data-testid="send-reset-btn"
            disabled={!forgotEmail}
          >
            Send reset link
          </button>
        </form>
      </div>
    );
  }

  function renderOtp() {
    return (
      <div data-testid="otp-screen">
        <Wordmark />
        <div className={styles.otpTitle}>Verify your email</div>
        <div className={styles.otpDesc}>
          Enter the 6-digit code we sent to{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{forgotEmail}</span>.
        </div>
        <div className={styles.otpGrid}>
          {otpDigits.map((digit, i) => (
            <div
              key={i}
              className={`${styles.otpCell} ${otpFocus === i ? styles.otpFocused : ''}`}
              data-testid="otp-cell"
            >
              {otpFocus === i && !digit && <div className={styles.otpCaret} />}
              <input
                ref={(el) => { otpRefs.current[i] = el; }}
                className={`${styles.otpInput} ${digit ? styles.otpInputFilled : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onFocus={() => setOtpFocus(i)}
                onBlur={() => setOtpFocus(-1)}
                onChange={(e) => handleOtpInput(i, e)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <div className={styles.otpActions}>
          <button
            className={styles.cta}
            onClick={() => { close(); resetAll(); }}
          >
            Verify
          </button>
        </div>
        <div className={styles.otpResend}>
          Didn't get a code?{' '}
          <button className={styles.switchLinkBtn}>Resend</button>
        </div>
      </div>
    );
  }

  const screenMap: Record<AuthScreen, () => React.JSX.Element> = {
    login: renderLogin,
    signup: renderSignup,
    forgot: renderForgot,
    otp: renderOtp,
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className={styles.srOnly}>
            {screen === 'login' ? 'Log in to Verita' :
             screen === 'signup' ? 'Create a Verita account' :
             screen === 'forgot' ? 'Forgot password' :
             'Email verification'}
          </Dialog.Title>

          {screenMap[screen]()}

          <Dialog.Close className={styles.closeBtn} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
