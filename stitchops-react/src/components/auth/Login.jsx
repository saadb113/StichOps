import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { EyeIcon, EyeOffIcon } from '../icons/Icon';

const elegantsLogo = '/images/elegant-design-icon.png';

export default function Login() {
  const { attemptLogin } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
    <div className="elg-auth-wrap">
      <div className="elg-auth-card">
        <div className="elg-auth-logo"><img src={elegantsLogo} alt="The Elegants Design" /></div>
        <div className="elg-auth-title">Welcome back! <span>👋</span></div>
        <div className="elg-auth-sub">Login to your account</div>
        {error && <div className="elg-auth-error">{error}</div>}
        <div className="elg-field">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. you@company.com"
            onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('login_password').focus(); }}
          />
        </div>
        <div className="elg-field">
          <label>Password</label>
          <div className="elg-password-field">
            <input
              id="login_password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
            <button type="button" className="elg-password-toggle" onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <div className="elg-auth-row">
          <label className="elg-auth-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed-in
          </label>
          <Link to="/forgot-password" className="elg-auth-link">Forgot password?</Link>
        </div>
        <button className="elg-btn elg-btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Logging in…' : 'Login'}</button>
        <div className="elg-auth-hint">Demo accounts — Admin: admin@stitchops.com / admin123. </div>
      </div>
    </div>
  );
}
