import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

// Landing page for the link emailed by /forgot-password (admin accounts
// with SMTP configured) — token travels as a query param, same as any
// emailed reset link.
export default function ResetPassword() {
  const { submitResetPassword } = useAppState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    const res = await submitResetPassword(token, password);
    if (!res.ok) { setError(res.error); return; }
    setError('');
    setDone(true);
  }

  return (
    <div className="elg-auth-wrap">
      <div className="elg-auth-card">
        {!token ? (
          <>
            <div className="elg-auth-title">Invalid Link</div>
            <div className="elg-auth-sub">This reset link is missing its token — request a new one from the Forgot Password page.</div>
            <button className="elg-btn" onClick={() => navigate('/forgot-password')}>Forgot Password</button>
          </>
        ) : done ? (
          <>
            <div className="elg-auth-title">Password Reset</div>
            <div className="elg-auth-sub">Your password has been reset — log in with your new password.</div>
            <button className="elg-btn" onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : (
          <>
            <div className="elg-auth-title">Set a New Password</div>
            <div className="elg-auth-sub">Choose a new password for your account.</div>
            {error && <div className="elg-auth-error">{error}</div>}
            <div className="elg-field">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>
            <button className="elg-btn elg-btn-primary" onClick={handleSubmit}>Reset Password</button>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button type="button" className="elg-auth-link" onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
