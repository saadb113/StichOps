import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { PencilIcon } from '../icons/Icon';
import AddEmailModal from './AddEmailModal';
import EditEmailModal from './EditEmailModal';

function ConfirmDeleteEmailModal({ email }) {
  const { removeCompanyEmail } = useAppState();
  const { closeModal, toast } = useUi();

  async function handleDelete() {
    const res = await removeCompanyEmail(email);
    if (!res.ok) { toast(res.error); return; }
    toast('Email removed.');
    closeModal();
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 420 }}>
      <div className="elg-modal-body" style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--elg-ink)', margin: 0, lineHeight: 1.5 }}>
          Delete <strong>{email}</strong> from the email pool? This can&apos;t be undone.
        </p>
      </div>
      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn" style={{ width: 'auto', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }} onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}

export default function AssignedEmailsTab() {
  const { companyEmails, employees } = useAppState();
  const { openModal } = useUi();

  function ownerOf(em) {
    return employees.find((e) => e.emails && e.emails.includes(em));
  }

  return (
    <div className="elg-settings-card">
      <div className="elg-settings-card-title"><h2>Assigned Emails</h2></div>

      <div className="elg-table-wrap" style={{padding: "10px", border: '1px solid var(--elg-line)', borderRadius: 8, marginBottom: 16 }}>
        <table className="elg-table">
          <thead><tr><th>Emails</th><th>Assigned to</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {companyEmails.length === 0 && <tr><td colSpan={3} className="elg-empty">No emails in the pool yet.</td></tr>}
            {companyEmails.map((em) => {
              const owner = ownerOf(em);
              return (
                <tr key={em}>
                  <td>{em}</td>
                  <td>{owner ? owner.name : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button className="elg-icon-sq" title="Edit" onClick={() => openModal(<EditEmailModal email={em} employeeId={owner ? owner.id : null} />, { variant: 'elegant' })}>
                        <img src='/images/edit.svg' />
                      </button>
                      <button className="elg-icon-sq" title="Delete" onClick={() => openModal(<ConfirmDeleteEmailModal email={em} />, { variant: 'elegant' })}>
                        <img src="/images/redX.png" alt="" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'right' }}>
        <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6 }} onClick={() => openModal(<AddEmailModal />, { variant: 'elegant' })}>
          + Add Email
        </button>
      </div>
    </div>
  );
}
