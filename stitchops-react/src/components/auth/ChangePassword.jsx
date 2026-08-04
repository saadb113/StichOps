import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { EyeIcon, EyeOffIcon } from '../icons/Icon';

export default function ChangePassword() {
  const { currentEmployee, submitNewPassword } = useAppState();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    try {
      await submitNewPassword(pw);
    } catch (e) {
      setError(e.message);
      return;
    }
    setError('');
    navigate('/');
  }

  return (
    <div className="elg-auth-wrap">
      <div className="elg-auth-card">
        <div className="elg-auth-title">Add New Password</div>
        <div className="elg-auth-sub">Welcome{currentEmployee ? ', ' + currentEmployee.name : ''} — set a new password to continue</div>
        {error && <div className="elg-auth-error">{error}</div>}
        <div className="elg-field">
          <label>New Password</label>
          <div className="elg-password-field">
            <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" />
            <button type="button" className="elg-password-toggle" onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <div className="elg-field">
          <label>Confirm Password</label>
          <div className="elg-password-field">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
            <button type="button" className="elg-password-toggle" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <button className="elg-btn elg-btn-primary" onClick={handleSubmit}>Set Password &amp; Continue</button>
      </div>
    </div>
  );
}
