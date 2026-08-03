import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

export default function Login() {
  const { attemptLogin } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const res = await attemptLogin(email.trim(), password, remember);
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    setError('');
    navigate('/');
  }

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-brand">Stitch<span>Ops</span></div>
      <div className="auth-sub">Sign in to your account</div>
      {error && <div className="auth-error">{error}</div>}
      <div className="field">
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@stitchops.com"
          onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('login_password').focus(); }}
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          id="login_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '12.5px', color: 'var(--ink-2)', margin: '-4px 0 14px', cursor: 'pointer' }}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 'auto' }} /> Keep me signed in on this device
      </label>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</button>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Link to="/forgot-password" style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 600 }}>Forgot password?</Link>
      </div>
      <div className="auth-hint-box">Demo accounts — Admin: admin@stitchops.com / admin123. Salesperson (temp password, first login only): ayesha.khan@stitchops.com / Temp-7F2A. After activation, a salesperson signs in with their own password directly — no password reset or welcome screen again.</div>
    </div></div>
  );
}
