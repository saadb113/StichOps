import { useUi } from '../../store/UiContext';
import { copyToClipboard } from '../../lib/clipboard';
import { CloseIcon, CopyIcon, KeyIcon } from '../icons/Icon';

export default function CredentialsModal({request, title, name, email, tempPw }) {
  const { closeModal, toast } = useUi();
  function copy(text, label) { copyToClipboard(text, label, toast); }

  return (
    <div className="credentials" style={{ width : "100%"}}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          <div style={{ fontSize: 20, fontWeight: 400, color: 'var(--elg-ink)', fontFamily :  'var(--elg-font-serif)', textTransform : "capitalize"}}>{title}</div>
        </div>
        <button className='elg-modal-close' style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {
          request ?
          <p style={{ fontSize: 16, color: '#5C5C5C', margin: 0 }}>
            Share these temporary login credentials with <strong style={{color : "var(--elg-ink)"}}>{name}</strong> so he can sign in and reset his password.
        </p> :
        <p style={{ fontSize: 16, color: '#5C5C5C', margin: 0 }}>
            Share these credentials with <strong style={{color : "var(--elg-ink)"}}>{name}</strong> He'll be asked to set his password on first login..
        </p>
        }

        <div style={{ border: '1px solid var(--elg-line)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
            <span style={{ color: '#5C5C5C' }}>Email</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ fontWeight : 500,color: 'var(--elg-ink)' }}>{email}</strong>
              <button
                className=""
                style={{background : "none", border : 0, outline : "none" }}
                onClick={() => copy(email, 'Email')}
                title="Copy Email"
              >
                <CopyIcon />
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--elg-line)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
            <span style={{ color: '#5C5C5C' }}>Temp Password</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{background : "none", border : 0, outline : "none", fontSize : 14, fontWeight : 500, color : "#191919"}}>
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
          style={{fontWeight : 500, width: '100%', display: 'inline-flex' }}
          onClick={() => copy(`Email: ${email}\nTemp password: ${tempPw}`, 'Email and temp password')}
        >
          <CopyIcon /> Copy Both
        </button>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="elg-btn elg-btn-primary" style={{ width: 'max-content !important' }} onClick={closeModal}>
          Done
        </button>
      </div>
    </div>
  );
}
