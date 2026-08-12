import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import CredentialsModal from './CredentialsModal';
import { CloseIcon, KeyIcon, TrashIcon, WarningIcon } from '../icons/Icon';

function ConfirmDeleteEmployeeModal({ employeeId, name }) {
  const { deleteEmployee } = useAppState();
  const { closeModal, toast } = useUi();
  const navigate = useNavigate();

  async function handleDelete() {
    try {
      await deleteEmployee(employeeId);
      closeModal();
      toast('Employee deleted.');
      navigate('/employees');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 560 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 300, color: 'var(--elg-ink)', fontFamily : 'var(--elg-font-serif)' }}>Are you sure?</div>
        </div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 32, height: 32,background :"none", border : 0, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: '#5C5C5C', margin: 0, lineHeight: 1.5 }}>
          You're deleting the employee <b style={{fontWeight : 500, color : "var(--elg-ink)"}}>"Shaheer Baig."</b> This action can't be undone. Their salary slip history will remain on record, but they'll no longer appear in the Employees list.
        </p>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'max-content !important' }} onClick={closeModal}>
          Cancel
        </button>
        <button
          className="elg-btn"
          style={{ width: 'max-content !important', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }}
          onClick={handleDelete}
        >
          Delete Employee
        </button>
      </div>
    </div>
  );
}

export default function EmployeeSettingsMenuModal({ employeeId }) {
  const { getEmployee, regenerateCredentials } = useAppState();
  const { closeModal, openModal, toast } = useUi();
  const e = getEmployee(employeeId);
  const hasLogin = !!e?.hasLogin;

  async function handleRegenerate() {
    let res;
    try {
      res = await regenerateCredentials(employeeId);
    } catch (err) {
      toast(err.message);
      closeModal();
      return;
    }
    if (!res) { toast('This employee has no login yet.'); closeModal(); return; }
    openModal(<CredentialsModal request={false} title="Login credentials regenerated" name={res.name} email={res.email} tempPw={res.tempPw} />, { variant: 'elegant', dismissible: false });
  }

  return (
    <div className="elg-modal" >
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--elg-ink)' }}>Employee Options</div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 30, height: 30,border: 0,background : "none", padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hasLogin && (
          <button
            className="elg-btn elg-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', fontSize: 14, color: 'var(--elg-ink)' }}
            onClick={handleRegenerate}
          >
            <KeyIcon /> Regenerate Login Credentials
          </button>
        )}
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', fontSize: 14, color: 'var(--elg-delete-red)' }}
          onClick={() => openModal(<ConfirmDeleteEmployeeModal employeeId={employeeId} name={e?.name} />, { variant: 'elegant' })}
        >
           Delete Employee
        </button>
      </div>
    </div>
  );
}
