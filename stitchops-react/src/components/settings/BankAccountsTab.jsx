import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM } from '../../lib/constants';
import { PencilIcon } from '../icons/Icon';
import AddAccountModal from './AddAccountModal';

function ConfirmDeleteAccountModal({ account }) {
  const { deleteBankAccount } = useAppState();
  const { closeModal, toast } = useUi();

  async function handleDelete() {
    try {
      await deleteBankAccount(account.id);
      toast('Account deleted.');
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 420 }}>
      <div className="elg-modal-body" style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--elg-ink)', margin: 0, lineHeight: 1.5 }}>
          Delete the <strong>{account.currency} Account</strong>? This can&apos;t be undone.
        </p>
      </div>
      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn" style={{ width: 'auto', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }} onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}

function BankAccountCard({ account }) {
  const { updateBankAccount } = useAppState();
  const { openModal, toast } = useUi();
  const [editing, setEditing] = useState(false);
  const [accountNo, setAccountNo] = useState(account.accountNo);
  const [name, setName] = useState(account.accountName);
  const [currency, setCurrency] = useState(account.currency);

  function startEdit() {
    setAccountNo(account.accountNo);
    setName(account.accountName);
    setCurrency(account.currency);
    setEditing(true);
  }

  async function handleSave() {
    try {
      await updateBankAccount(account.id, { accountNo: accountNo.trim(), accountName: name.trim(), currency });
      toast('Account updated.');
      setEditing(false);
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-account-card">
      <div className="elg-account-card-head">
        <div className="elg-account-card-title">
          {account.currency} Account
          {editing ? (
            <img src='/images/edit.svg' />
          ) : (
            <span className="elg-ccy-tag">{account.currency} {SYM[account.currency] || ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing && (
            <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6 }} onClick={startEdit}>
              <img src='/images/edit.svg' /> Edit
            </button>
          )}
          <button className="elg-icon-sq" title="Delete" style={{border : 0,background : "none"}} onClick={() => openModal(<ConfirmDeleteAccountModal account={account} />, { variant: 'elegant' })}>
            <img src="/images/redX.png" alt="" />
          </button>
        </div>
      </div>

      <div className="elg-field">
        <label>Account No.</label>
        <input value={editing ? accountNo : account.accountNo} onChange={(e) => setAccountNo(e.target.value)} disabled={!editing} />
      </div>
      <div className="elg-field" style={{ marginBottom: editing ? 16 : 0 }}>
        <label>Name</label>
        <input value={editing ? name : account.accountName} onChange={(e) => setName(e.target.value)} disabled={!editing} />
      </div>

      {editing && (
        <>
          <div className="elg-field" style={{ marginBottom: 16 }}>
            <label>Currency</label>
            <select className="elg-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc} {SYM[cc]}</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'right', marginLeft : "auto", width : "max-content"}}>
            <button className="elg-btn elg-btn-primary" style={{padding : "7.5px 13px", width: 'auto' }} onClick={handleSave}>Save Changes</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function BankAccountsTab() {
  const { bankAccounts } = useAppState();
  const { openModal } = useUi();

  return (
    <div className="elg-settings-card">
      <div className="elg-settings-card-title"><h2>Bank Accounts</h2></div>

      {bankAccounts.map((a) => <BankAccountCard key={a.id} account={a} />)}

      <div style={{ textAlign: 'right', marginTop: bankAccounts.length ? 16 : 0 }}>
        <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6, padding : "7.5px 13px" }} onClick={() => openModal(<AddAccountModal />, { variant: 'elegant' })}>
          + Add Account
        </button>
      </div>
    </div>
  );
}
