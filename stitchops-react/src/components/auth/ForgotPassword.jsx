import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

export default function ForgotPassword() {
  const { submitForgotPassword, submitAdminRecovery } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  // Admins have no one to approve their own reset request and no email
  // delivery to send one to, so they get a recovery-code form instead —
  // the code lives in the server's own environment (ADMIN_RECOVERY_CODE).
  const [adminRecovery, setAdminRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recovered, setRecovered] = useState(false);

  async function handleSubmit() {
    const res = await submitForgotPassword(email.trim().toLowerCase());
    if (!res.ok) { setError(res.error); return; }
    setError('');
    if (res.adminRecovery) { setAdminRecovery(true); return; }
    if (res.emailSent) { setEmailSent(true); return; }
    setSent(true);
  }

  async function handleRecover() {
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    const res = await submitAdminRecovery(email.trim().toLowerCase(), code.trim(), password);
    if (!res.ok) { setError(res.error); return; }
    setError('');
    setRecovered(true);
  }

  return (
    <div className="elg-auth-wrap">
      <div className="elg-auth-card">
        {recovered ? (
          <>
            <div className="elg-auth-title">Password Reset</div>
            <div className="elg-auth-sub">Your password has been reset — log in with your new password.</div>
            <button className="elg-btn" onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : emailSent ? (
          <>
            <div className="elg-auth-title">Check Your Email</div>
            <div className="elg-auth-sub">We've sent a password reset link to {email}. It expires in 1 hour — open it to set a new password.</div>
            <button className="elg-btn" onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : sent ? (
          <>
            <div className="elg-auth-title">Request Sent</div>
            <div className="elg-auth-sub">Request sent. Your admin will review it and issue a new temporary password — you'll use the same email to log in once it's approved.</div>
            <button className="elg-btn" onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : adminRecovery ? (
          <>
            <div className="elg-auth-title">Admin Recovery</div>
            <div className="elg-auth-sub">Admin accounts reset with the recovery code set on the server (ADMIN_RECOVERY_CODE), not an email or an approval request.</div>
            {error && <div className="elg-auth-error">{error}</div>}
            <div className="elg-field">
              <label>Recovery Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Recovery code"
              />
            </div>
            <div className="elg-field">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                onKeyDown={(e) => { if (e.key === 'Enter') handleRecover(); }}
              />
            </div>
            <button className="elg-btn elg-btn-primary" onClick={handleRecover}>Reset Password</button>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button type="button" className="elg-auth-link" onClick={() => navigate('/login')}>Back to Login</button>
            </div>
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
