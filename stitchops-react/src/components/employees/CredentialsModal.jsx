import { useUi } from '../../store/UiContext';
import { copyToClipboard } from '../../lib/clipboard';

export default function CredentialsModal({ title, name, email, tempPw }) {
  const { closeModal, toast } = useUi();
  function copy(text, label) { copyToClipboard(text, label, toast); }

  return (
    <>
      <div className="modal-head"><h3>{title}</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body">
        <p style={{ fontSize: '13.5px' }}>Share these credentials with <strong>{name}</strong> — they'll be asked to set their own password on first login.</p>
        <div className="kv">
          <div className="kv-row">
            <span className="k">Email</span>
            <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {email} <button className="btn btn-sm btn-ghost" title="Copy Email" onClick={() => copy(email, 'Email')} style={{ padding: '3px 7px' }}>&#128203;</button>
            </span>
          </div>
          <div className="kv-row">
            <span className="k">Temp password</span>
            <span className="v" style={{ fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {tempPw} <button className="btn btn-sm btn-ghost" title="Copy Temp password" onClick={() => copy(tempPw, 'Temp password')} style={{ padding: '3px 7px' }}>&#128203;</button>
            </span>
          </div>
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => copy(`Email: ${email}\nTemp password: ${tempPw}`, 'Email and temp password')}>&#128203; Copy both</button>
      </div>
      <div className="modal-foot"><button className="btn btn-primary" onClick={closeModal}>Done</button></div>
    </>
  );
}
