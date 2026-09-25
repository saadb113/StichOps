import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM, BANK_COUNTRIES, PAYMENT_ACCOUNTS } from '../../lib/constants';
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
    <div className="elg-modal">
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

function initialForm(account, countryDef) {
  const form = {
    accountName: account.accountName || '',
    accountHolder: account.accountHolder || '',
    paymentAccount: account.paymentAccount || '',
    address: account.address || ''
  };
  countryDef.fields.forEach((f) => { form[f.key] = account[f.key] || ''; });
  return form;
}

function BankAccountCard({ account }) {
  const { updateBankAccount } = useAppState();
  const { openModal, toast } = useUi();
  const [editing, setEditing] = useState(false);
  const countryDef = BANK_COUNTRIES.find((c) => c.country === account.country) || BANK_COUNTRIES[0];
  const [form, setForm] = useState(() => initialForm(account, countryDef));

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit() {
    setForm(initialForm(account, countryDef));
    setEditing(true);
  }

  async function handleSave() {
    try {
      await updateBankAccount(account.id, {
        accountName: form.accountName.trim(),
        accountHolder: form.accountHolder.trim(),
        paymentAccount: form.paymentAccount,
        address: form.address.trim(),
        ...Object.fromEntries(countryDef.fields.map((f) => [f.key, (form[f.key] || '').trim()]))
      });
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
          <span className="elg-ccy-tag">{account.currency} {SYM[account.currency] || ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing && (
            <button className="editaccount elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6 }} onClick={startEdit}>
              <img src='/images/edit.svg' /> Edit
            </button>
          )}
          <button className="elg-icon-sq" title="Delete" style={{ border: 0, background: "none" }} onClick={() => openModal(<ConfirmDeleteAccountModal account={account} />, { variant: 'elegant' })}>
            <img src="/images/cancel-x-mark.svg" alt="" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="elg-field" style={{ marginBottom: 16 }}>
          <label>Account Name</label>
          <input value={form.accountName} onChange={(e) => setField('accountName', e.target.value)} />
        </div>
      )}

      <div className="elg-field" style={{ marginBottom: 16 }}>
        <label>Account Holder</label>
        <input value={editing ? form.accountHolder : account.accountHolder} onChange={(e) => setField('accountHolder', e.target.value)} disabled={!editing} />
      </div>

      {countryDef.fields.map((f) => (
        <div className="elg-field" style={{ marginBottom: 16 }} key={f.key}>
          <label>{f.label}</label>
          {f.options ? (
            <select className="elg-select" value={editing ? form[f.key] : account[f.key]} onChange={(e) => setField(f.key, e.target.value)} disabled={!editing}>
              <option value="">Select</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={editing ? form[f.key] : account[f.key]} onChange={(e) => setField(f.key, e.target.value)} disabled={!editing} />
          )}
        </div>
      ))}

      <div className="elg-field" style={{ marginBottom: 16 }}>
        <label>Payment Account</label>
        <select className="elg-select" value={editing ? form.paymentAccount : account.paymentAccount} onChange={(e) => setField('paymentAccount', e.target.value)} disabled={!editing}>
          <option value="">Select</option>
          {PAYMENT_ACCOUNTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="elg-field" style={{ marginBottom: editing ? 16 : 0 }}>
        <label>Address</label>
        <input value={editing ? form.address : account.address} onChange={(e) => setField('address', e.target.value)} disabled={!editing} />
      </div>

      {editing && (
        <div style={{ textAlign: 'right', marginLeft: "auto", width: "max-content" }}>
          <button className="elg-btn elg-btn-primary" style={{ padding: "7.5px 13px", width: 'auto' }} onClick={handleSave}>Save Changes</button>
        </div>
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
        <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6, padding: "7.5px 13px" }} onClick={() => openModal(<AddAccountModal />, { variant: 'elegant' })}>
          <img alt="Add Order" src="/icons/add-icon-black.svg" />
          Add Account
        </button>
      </div>
    </div>
  );
}
