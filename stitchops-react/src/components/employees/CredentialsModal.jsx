import { useUi } from '../../store/UiContext';
import { copyToClipboard } from '../../lib/clipboard';
import { CloseIcon, CopyIcon, KeyIcon } from '../icons/Icon';

export default function CredentialsModal({request, title, name, email, tempPw }) {
  const { closeModal, toast } = useUi();
  function copy(text, label) { copyToClipboard(text, label, toast); }

  return (
    <div className="credentials" style={{ width : "100%"}}>
      <div className="elg-modal-head-plain">
        

          <h3 >{title}</h3>
       
        <button className='elg-modal-close' style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" />
        </button>
      </div>

      <div className="elg-modal-body credentialModal">
        {
          request ?
          <p className='sharetext'>
            Share these temporary login credentials with <strong style={{color : "var(--elg-ink)"}}>{name}</strong> so he can sign in and reset his password.
          </p> :
          <p className='sharetext'>
              Share these credentials with <strong style={{color : "var(--elg-ink)"}}>{name}</strong> He'll be asked to set his password on first login..
          </p>
        }

        <div className="generatedCredentials">
          <div>
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

      <div className="elg-modal-foot">
        <button className="elg-btn elg-btn-primary" style={{ width: 'max-content !important' }} onClick={closeModal}>
          Done
        </button>
      </div>
    </div>
  );
}
