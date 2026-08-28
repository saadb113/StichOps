import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';
import AssignedEmailsField from './AssignedEmailsField';

export default function AssignedEmailsModal({ employee }) {
  const { updateEmployee } = useAppState();
  const { closeModal, toast } = useUi();

  const [emails, setEmails] = useState(employee.emails && employee.emails.length ? employee.emails : ['']);

  async function handleSave() {
    const cleaned = emails.map((em) => em.trim()).filter(Boolean);
    try {
      await updateEmployee(employee.id, { emails: cleaned });
      toast('Assigned emails updated.');
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>
      <div className="elg-modal-head-plain">
        <h3>Assigned Emails</h3>
      </div>
      <div className="elg-modal-body assignmentEmailModal">
        <div className="elg-field" style={{marginBottom : 0}}>

          <AssignedEmailsField employeeId={employee.id} value={emails} onChange={setEmails} />
        </div>
      </div>
      <div className="elg-modal-foot right-btns-fixed">
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>Save Changes</button>
      </div>
    </>
  );
}
