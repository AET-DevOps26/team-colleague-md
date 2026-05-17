/* global React */
const { useState } = React;

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
const I = {
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/* Atoms                                                              */
/* ------------------------------------------------------------------ */
function Wordmark({ size = 'sm' }) {
  const big = size === 'lg';
  return (
    <div style={{
      fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500,
      fontSize: big ? 24 : 22, letterSpacing: '-0.02em', color: 'var(--text-primary)',
      lineHeight: 1,
    }}>Verita</div>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [['login','Log in'], ['signup','Sign up']];
  return (
    <div style={{
      display: 'flex', gap: 28, marginTop: 22,
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {tabs.map(([k, label]) => {
        const on = active === k;
        return (
          <button key={k} onClick={() => onChange?.(k)}
            style={{
              padding: '0 0 11px',
              fontSize: 13.5,
              fontWeight: on ? 600 : 500,
              color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 120ms ease-out',
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Label({ children, right }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
      marginBottom: 6,
    }}>
      <span>{children}</span>
      {right}
    </div>
  );
}

function Field({
  label, type = 'text', placeholder, value, error, hint, hasShow, rightLink, focused, prefix,
}) {
  const [show, setShow] = useState(false);
  const realType = hasShow && show ? 'text' : type;
  const ring = focused
    ? { borderColor: 'var(--accent)', background: '#fff', boxShadow: '0 0 0 4px rgba(10,10,10,0.06)' }
    : error
    ? { borderColor: 'var(--danger)', background: '#fff' }
    : {};
  return (
    <div style={{ marginBottom: 14 }}>
      <Label right={rightLink}>{label}</Label>
      <div style={{
        height: 44, borderRadius: 8,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 14px',
        transition: 'border-color 120ms, background 120ms, box-shadow 120ms',
        ...ring,
      }}>
        {prefix && <span style={{ color: 'var(--text-tertiary)', fontSize: 13.5 }}>{prefix}</span>}
        <input
          type={realType}
          placeholder={placeholder}
          defaultValue={value}
          style={{
            flex: 1, background: 'none', border: 0, outline: 0,
            font: '400 13.5px var(--font-sans)', color: 'var(--text-primary)',
            minWidth: 0,
          }}
        />
        {hasShow && (
          <button onClick={() => setShow(s => !s)}
            style={{ color: 'var(--text-tertiary)', display: 'grid', placeItems: 'center', padding: 2 }}>
            {I.eye}
          </button>
        )}
      </div>
      {error && (
        <div style={{
          marginTop: 6, fontSize: 11.5, color: 'var(--danger)',
          display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500,
        }}>
          {I.alert}
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-tertiary)' }}>{hint}</div>
      )}
    </div>
  );
}

function CTA({ children, disabled }) {
  return (
    <button disabled={disabled}
      style={{
        width: '100%', height: 44, borderRadius: 8,
        background: disabled ? 'var(--border-default)' : 'var(--accent)',
        color: '#fff', fontSize: 13.5, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms',
        marginTop: 4,
      }}>
      {children}
    </button>
  );
}

function SwitchLink({ prompt, action, onClick }) {
  return (
    <div style={{
      marginTop: 16, fontSize: 12.5, color: 'var(--text-secondary)',
      textAlign: 'center',
    }}>
      {prompt}{' '}
      <button onClick={onClick} style={{
        color: 'var(--text-primary)', fontWeight: 600,
        borderBottom: '1px solid var(--text-primary)', paddingBottom: 1,
      }}>{action}</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal shell                                                        */
/* ------------------------------------------------------------------ */
function ModalShell({ children, width = 380, dismissible = true }) {
  return (
    <div style={{
      width,
      background: '#fff',
      borderRadius: 14,
      boxShadow: '0 24px 60px -12px rgba(0,0,0,0.32), 0 4px 12px -4px rgba(0,0,0,0.12)',
      padding: '24px 28px 26px',
      position: 'relative',
    }}>
      {dismissible && (
        <button style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: 7,
          color: 'var(--text-tertiary)',
          display: 'grid', placeItems: 'center',
          transition: 'background 120ms, color 120ms',
        }}>{I.close}</button>
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                             */
/* ------------------------------------------------------------------ */
function LoginPanel({ error }) {
  return (
    <>
      <Wordmark />
      <Tabs active="login" />
      <div style={{ marginTop: 22 }}>
        <Field label="Email" type="email" placeholder="you@domain.com" value="alex@verita.app" />
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          value="abc12345"
          hasShow
          error={error}
          rightLink={
            <button style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Forgot password?
            </button>
          }
        />
        <CTA>Log in</CTA>
        <SwitchLink prompt="No account?" action="Sign up" />
      </div>
    </>
  );
}

function SignupPanel({ usernameError }) {
  return (
    <>
      <Wordmark />
      <Tabs active="signup" />
      <div style={{ marginTop: 22 }}>
        <Field
          label="Username"
          placeholder="3–20 chars, letters / numbers / _"
          value="alex_chen"
          error={usernameError}
        />
        <Field label="Email" type="email" placeholder="you@domain.com" value="alex@verita.app" />
        <Field
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value="strongpass"
          hasShow
          hint="Use 8 or more characters with a mix of letters and numbers."
        />
        <CTA>Create account</CTA>
        <div style={{
          marginTop: 12, fontSize: 11.5, lineHeight: 1.55,
          color: 'var(--text-tertiary)', textAlign: 'center',
        }}>
          By signing up you agree to our{' '}
          <span style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Terms</span>{' '}and{' '}
          <span style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</span>.
        </div>
        <SwitchLink prompt="Already have an account?" action="Log in" />
      </div>
    </>
  );
}

function ForgotPanel() {
  return (
    <>
      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500,
        marginBottom: 18,
      }}>
        {I.back}<span>Back to log in</span>
      </button>
      <Wordmark />
      <div style={{
        marginTop: 20,
        fontSize: 17, fontWeight: 600, color: 'var(--text-primary)',
        letterSpacing: '-0.01em',
      }}>Reset your password</div>
      <div style={{
        marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)',
        lineHeight: 1.55,
      }}>
        Enter your account email and we'll send a link to reset your password.
      </div>
      <div style={{ marginTop: 20 }}>
        <Field label="Email" type="email" placeholder="you@domain.com" value="" focused />
        <CTA>Send reset link</CTA>
      </div>
    </>
  );
}

function SentPanel() {
  return (
    <>
      <Wordmark />
      <div style={{
        marginTop: 24,
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--bg-elevated)',
        display: 'grid', placeItems: 'center',
        color: 'var(--text-primary)',
      }}>{I.mail}</div>
      <div style={{
        marginTop: 16, fontSize: 17, fontWeight: 600,
        letterSpacing: '-0.01em',
      }}>Check your email</div>
      <div style={{
        marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)',
        lineHeight: 1.55,
      }}>
        We sent a password reset link to{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>alex@verita.app</span>.
        The link expires in 30 minutes.
      </div>
      <div style={{ marginTop: 20 }}>
        <CTA>Open email app</CTA>
      </div>
      <div style={{
        marginTop: 14, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
      }}>
        Didn't get it?{' '}
        <button style={{
          color: 'var(--text-primary)', fontWeight: 600,
          borderBottom: '1px solid var(--text-primary)', paddingBottom: 1,
        }}>Resend in 47s</button>
      </div>
    </>
  );
}

function OtpPanel() {
  const digits = ['4','2','9','1','',''];
  return (
    <>
      <Wordmark />
      <div style={{
        marginTop: 22, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
      }}>Verify your email</div>
      <div style={{
        marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55,
      }}>
        Enter the 6-digit code we sent to{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>alex@verita.app</span>.
      </div>
      <div style={{
        marginTop: 22,
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8,
      }}>
        {digits.map((d, i) => {
          const filled = !!d;
          const cursor = i === 4;
          return (
            <div key={i} style={{
              height: 52, borderRadius: 8,
              background: filled ? '#fff' : 'var(--bg-elevated)',
              border: cursor ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
              boxShadow: cursor ? '0 0 0 4px rgba(10,10,10,0.06)' : 'none',
              display: 'grid', placeItems: 'center',
              font: '500 22px var(--font-mono)',
              color: 'var(--text-primary)',
              position: 'relative',
            }}>
              {d || (cursor && (
                <span style={{
                  width: 1.5, height: 22, background: 'var(--accent)',
                  animation: 'caret 1s steps(2) infinite',
                }} />
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 22 }}>
        <CTA disabled>Verify</CTA>
      </div>
      <div style={{
        marginTop: 14, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
      }}>
        Didn't get a code?{' '}
        <button style={{
          color: 'var(--text-primary)', fontWeight: 600,
          borderBottom: '1px solid var(--text-primary)', paddingBottom: 1,
        }}>Resend</button>
      </div>
    </>
  );
}

/* Alt visual treatment — serif headline + small wordmark */
function LoginPanelAlt() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <Wordmark />
      </div>
      <div style={{
        marginTop: 18,
        fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500,
        fontSize: 28, letterSpacing: '-0.015em', textAlign: 'center',
        color: 'var(--text-primary)', lineHeight: 1.1,
      }}>Welcome back.</div>
      <div style={{
        marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)',
        textAlign: 'center', lineHeight: 1.55,
      }}>
        Pick up where you left off — your feed is waiting.
      </div>
      <Tabs active="login" />
      <div style={{ marginTop: 22 }}>
        <Field label="Email" type="email" placeholder="you@domain.com" value="alex@verita.app" />
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          value="abc12345"
          hasShow
          rightLink={
            <button style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Forgot password?
            </button>
          }
        />
        <CTA>Log in</CTA>
        <SwitchLink prompt="No account?" action="Sign up" />
      </div>
    </>
  );
}

function SignupPanelAlt() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <Wordmark />
      </div>
      <div style={{
        marginTop: 18,
        fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500,
        fontSize: 28, letterSpacing: '-0.015em', textAlign: 'center',
        color: 'var(--text-primary)', lineHeight: 1.1,
      }}>Join the conversation.</div>
      <div style={{
        marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)',
        textAlign: 'center', lineHeight: 1.55,
      }}>
        Read, post, and follow the AI work that actually matters.
      </div>
      <Tabs active="signup" />
      <div style={{ marginTop: 22 }}>
        <Field label="Username" placeholder="3–20 chars" value="alex_chen" />
        <Field label="Email" type="email" placeholder="you@domain.com" value="alex@verita.app" />
        <Field label="Password" type="password" placeholder="At least 8 characters" value="strongpass" hasShow />
        <CTA>Create account</CTA>
        <div style={{
          marginTop: 12, fontSize: 11.5, lineHeight: 1.55,
          color: 'var(--text-tertiary)', textAlign: 'center',
        }}>
          By signing up you agree to our{' '}
          <span style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Terms</span>{' '}and{' '}
          <span style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</span>.
        </div>
        <SwitchLink prompt="Already have an account?" action="Log in" />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Scene — modal over dimmed home backdrop                            */
/* ------------------------------------------------------------------ */
function Scene({ children, variant = 'default' }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <HomeBackdrop />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,10,10,0.36)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid', placeItems: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

function HomeBackdrop() {
  // Cheap stylized rendering of the home page so the modal has context
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'grid', gridTemplateColumns: '180px 1fr',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 18px' }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: 'var(--accent)',
          }} />
          <div style={{ height: 14, width: 60, borderRadius: 3, background: 'var(--border-default)' }} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', marginBottom: 2,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--border-default)' }} />
            <div style={{ height: 8, width: 70, borderRadius: 2, background: 'var(--border-default)' }} />
          </div>
        ))}
      </div>
      <div style={{ padding: '18px 22px' }}>
        <div style={{
          height: 40, borderRadius: 10,
          background: 'var(--bg-elevated)', marginBottom: 14,
        }} />
        <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
          {['All','Research','Models','Tools','Essays'].map((t, i) => (
            <div key={i} style={{
              height: 10, width: 36 + i * 4, borderRadius: 2,
              background: i === 0 ? 'var(--text-primary)' : 'var(--border-default)',
            }} />
          ))}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        }}>
          {[160, 220, 180, 200, 150, 240].map((h, i) => (
            <div key={i} style={{
              height: h, borderRadius: 10,
              background: '#fff', border: '1px solid var(--border-subtle)',
              padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{
                aspectRatio: '3 / 2', borderRadius: 6,
                background: i % 2 ? 'var(--bg-elevated)' : '#ECE6DE',
              }} />
              <div style={{ height: 9, borderRadius: 2, background: 'var(--border-default)', width: '80%' }} />
              <div style={{ height: 7, borderRadius: 2, background: 'var(--border-subtle)', width: '100%' }} />
              <div style={{ height: 7, borderRadius: 2, background: 'var(--border-subtle)', width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Export panels by name so the canvas file can pick one              */
/* ------------------------------------------------------------------ */
Object.assign(window, {
  Scene, ModalShell,
  LoginPanel, SignupPanel,
  ForgotPanel, SentPanel, OtpPanel,
  LoginPanelAlt, SignupPanelAlt,
});
