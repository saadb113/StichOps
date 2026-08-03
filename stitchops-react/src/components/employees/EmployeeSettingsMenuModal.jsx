import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import CredentialsModal from './CredentialsModal';

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
    <>
      <div className="modal-head"><h3>Are you sure?</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body"><p style={{ fontSize: '13.5px', margin: 0 }}>You're deleting this <strong>"{name}"</strong> employee. This can't be undone — their salary slip history will remain on record, but they'll no longer appear in Employees.</p></div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={handleDelete}>Delete</button>
      </div>
    </>
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
    openModal(<CredentialsModal title="Login credentials regenerated" name={res.name} email={res.email} tempPw={res.tempPw} />, { dismissible: false });
  }

  return (
    <>
      <div className="modal-head"><h3>Settings</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body" style={{ padding: '10px 12px' }}>
        {hasLogin && <div className="btn" style={{ width: '100%', textAlign: 'left', border: 'none', padding: '10px 12px' }} onClick={handleRegenerate}>Regenerate login credentials</div>}
        <div className="btn btn-danger-text" style={{ width: '100%', textAlign: 'left', border: 'none', padding: '10px 12px' }} onClick={() => openModal(<ConfirmDeleteEmployeeModal employeeId={employeeId} name={e.name} />)}>Delete employee</div>
      </div>
    </>
  );
}
