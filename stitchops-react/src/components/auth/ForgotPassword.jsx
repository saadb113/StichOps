import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

export default function ForgotPassword() {
  const { submitForgotPassword } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const res = await submitForgotPassword(email.trim().toLowerCase());
    if (!res.ok) { setError(res.error); return; }
    setError('');
    setSent(true);
  }

  return (
    <div className="elg-auth-wrap">
      <div className="elg-auth-card">
        {sent ? (
          <>
            <div className="elg-auth-title">Request Sent</div>
            <div className="elg-auth-sub">Request sent. Your admin will review it and issue a new temporary password — you'll use the same email to log in once it's approved.</div>
            <button className="elg-btn" onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : (
          <>
            <div className="elg-auth-title">Forget Password</div>
            <div className="elg-auth-sub">Enter your account email — your admin will approve a new temporary password.</div>
            {error && <div className="elg-auth-error">{error}</div>}
            <div className="elg-field">
              <label>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. you@company.com"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>
            <button className="elg-btn elg-btn-primary" onClick={handleSubmit}>Send Request</button>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button type="button" className="elg-auth-link" onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
