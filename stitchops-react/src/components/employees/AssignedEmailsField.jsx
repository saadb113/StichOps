import { useAppState } from '../../store/AppStateContext';
import { PlusIcon, TrashIcon } from '../icons/Icon';

export default function AssignedEmailsField({ value, onChange }) {
  const { companyEmails } = useAppState();
  const rows = value.length ? value : [''];

  function setRow(idx, em) {
    const next = rows.slice();
    next[idx] = em;
    onChange(next);
  }

  function removeRow(idx) {
    const next = rows.slice();
    next.splice(idx, 1);
    onChange(next.length ? next : ['']);
  }

  function addRow() {
    onChange([...rows, '']);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {rows.map((em, idx) => {
          // An email already assigned to another employee can still show up
          // here — the same inbox can be shared by more than one person.
          // Only exclude an email this same employee has already picked in
          // another row, so it isn't listed twice for them.
          const options = companyEmails.filter((ce) => ce === em || !rows.includes(ce));
          return (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="elg-select" style={{ flex: 1 }} value={em} onChange={(ev) => setRow(idx, ev.target.value)}>
                <option value="">Select an email</option>
                {options.map((ce) => <option key={ce} value={ce}>{ce}</option>)}
              </select>
              <button
                type="button"
                className="elg-icon-sq assEmailAddEmployee" 
                style={{ color: 'var(--elg-red-ink)', flexShrink: 0 }}
                onClick={() => removeRow(idx)}
                title="Remove Email"
              >
                <img src="/images/cancel-x-mark.svg" alt="" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="elg-btn elg-btn-ghost"
        style={{fontWeight : "400", width: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', gap: 4 }}
        onClick={addRow}
      >
        <PlusIcon width={15} height={15} /> Add Email
      </button>
    </div>
  );
}
