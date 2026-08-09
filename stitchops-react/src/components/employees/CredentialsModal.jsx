import { useUi } from '../../store/UiContext';
import { copyToClipboard } from '../../lib/clipboard';
import { CloseIcon, CopyIcon, KeyIcon } from '../icons/Icon';

export default function CredentialsModal({ title, name, email, tempPw }) {
  const { closeModal, toast } = useUi();
  function copy(text, label) { copyToClipboard(text, label, toast); }

  return (
    <div className="elg-modal" style={{ maxWidth: 460 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: 'var(--elg-primary)', display: 'flex', alignItems: 'center' }}>
            <KeyIcon width={20} height={20} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--elg-ink)' }}>{title}</div>
        </div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--elg-ink)', margin: 0 }}>
          Share these login credentials with <strong>{name}</strong>. They will be prompted to change their password upon initial sign in.
        </p>

        <div style={{ background: 'var(--elg-page-bg)', border: '1px solid var(--elg-line)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
            <span style={{ color: 'var(--elg-ink-3)' }}>Email</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ color: 'var(--elg-ink)' }}>{email}</strong>
              <button
                className="elg-btn elg-btn-ghost elg-btn-sm"
                style={{ width: 28, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => copy(email, 'Email')}
                title="Copy Email"
              >
                <CopyIcon />
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--elg-line)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
            <span style={{ color: 'var(--elg-ink-3)' }}>Temp Password</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--elg-primary)', background: 'var(--elg-surface)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--elg-line-strong)' }}>
                {tempPw}
              </code>
              <button
                className="elg-btn elg-btn-ghost elg-btn-sm"
                style={{ width: 28, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => copy(tempPw, 'Temp password')}
                title="Copy Temp Password"
              >
                <CopyIcon />
              </button>
            </div>
          </div>
        </div>

        <button
          className="elg-btn"
          style={{ width: '100%', display: 'inline-flex' }}
          onClick={() => copy(`Email: ${email}\nTemp password: ${tempPw}`, 'Email and temp password')}
        >
          <CopyIcon /> Copy Both Credentials
        </button>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>
          Done
        </button>
      </div>
    </div>
  );
}
