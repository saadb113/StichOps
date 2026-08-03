import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';

export default function CompanySettings() {
  const { company, companyEmails, employees, addCompanyEmail, removeCompanyEmail } = useAppState();
  const { toast } = useUi();
  const c = company;
  const [newEmail, setNewEmail] = useState('');

  async function handleAdd() {
    const em = newEmail.trim().toLowerCase();
    if (!em) { toast('Enter an email first.'); return; }
    const res = await addCompanyEmail(em);
    if (!res.ok) { toast(res.error); return; }
    setNewEmail('');
    toast('Email added to pool.');
  }
  async function handleRemove(em) {
    const res = await removeCompanyEmail(em);
    toast(res.ok ? 'Email removed from pool.' : res.error);
  }

  return (
    <>
      <div className="topbar"><div><div className="page-title">Company settings</div><div className="page-sub">Used on the invoice header and payment footer</div></div></div>
      <div className="panel">
        <div className="panel-head"><h3>Company details</h3></div>
        <div style={{ padding: 18 }}>
          <div className="field-row">
            <div className="field"><label>Company name</label><input value={c.name} disabled /></div>
            <div className="field"><label>Address</label><input value={c.address} disabled /></div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Bank accounts by currency</h3></div>
        <div style={{ padding: 18 }}>
          <div className="field"><label>GBP account</label><input value={c.accountGBP} disabled /></div>
          <div className="field"><label>USD account</label><input value={c.accountUSD} disabled /></div>
          <div className="field"><label>EUR account</label><input value={c.accountEUR} disabled /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>AUD account</label><input value={c.accountAUD} disabled /></div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Employee emails</h3></div>
        <div style={{ padding: '16px 18px' }}>
          <div className="hint" style={{ marginTop: 0, marginBottom: 12 }}>Add every inbox your team receives client leads on. An email shows <strong>Active</strong> once it's assigned to an employee, and <strong>Inactive</strong> if it's sitting unused in the pool.</div>
          <table>
            <thead><tr><th>Email</th><th>Status</th><th>Assigned to</th><th></th></tr></thead>
            <tbody>
              {companyEmails.map((em) => {
                const owner = employees.find((e) => e.emails && e.emails.includes(em));
                return (
                  <tr key={em}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '12.5px' }}>{em}</td>
                    <td><span className={`badge ${owner ? 'b-active' : 'b-inactive'}`}>{owner ? 'Active' : 'Inactive'}</span></td>
                    <td>{owner ? owner.name : '—'}</td>
                    <td><button className="btn btn-sm btn-ghost btn-danger-text" onClick={() => handleRemove(em)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <input
              placeholder="name@stitchops.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)' }}
            />
            <button className="btn btn-sm btn-primary" onClick={handleAdd}>+ Add email</button>
          </div>
        </div>
      </div>
      <div className="hint">In the full build, these fields will be editable and pulled from your actual invoice template.</div>
    </>
  );
}
